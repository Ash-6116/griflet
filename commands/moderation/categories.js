const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { testUser } = require('../../shared_classes/user.js');
const { mirror } = require('../../shared_classes/output.js');
const roleTest = require('../../shared_classes/roleTest.js');
const outputStyle = process.env.outputStyle;

/**
 * Neph's recommended steps:
 * 1) Get a list of all category channels (filter guild.channels for type=ctageory)
 * 2) Create a function that, given a list of channels, returns the most recent "last posted" timestamp
 * 3) Call the function on the children of the first category
 * 4) When step 3 resolves, call the function on the next category in the list
 * 5) Repeat steps 3/4 until you get through all categories.
**/

function resolveDate(Timestamp) {
  // Still works in API v14 and requires no overhaul
  let d = new Date(Timestamp);
  return d.toDateString() + " " + d.getHours() + ":" + (d.getMinutes()<10?'0':'') + d.getMinutes();
}

async function messageFetch(channel) {
  // Still works in API v14 and requires no overhaul
  if (channel.lastMessageId != undefined) {  // deleted messages still have an ID but retrieve no data
    try {
      let message = await channel.messages.fetch(channel.lastMessageId);
      return message;
    } catch {
      return null;
    }
  }
}

function messageComparison(newestMessage, message) {
  // Want to return the newest of the two provided variables
  if (newestMessage === undefined) {
    return message;
  } else {
    if (new Date(message.createdTimestamp) > new Date(newestMessage.createdTimestamp)) { // need to compare the two
    return message;
    } else {
      return newestMessage;
    }
  }
}

async function lastMessage(channel) {
  // need to find the last message manually as channel.lastMessageId points to a deleted message
  // .fetch({limit: 1} will return a single message
  let message = await channel.messages.fetch({limit: 1}); // if this equals 0, no messages in channel
  if (message.size === 0) {
    console.log(`${channel.name} has 0 messages`);
    return null;
  } else {
    let listKeys = Array.from(message.keys());
    for (let index = 0; index < message.size; index++) {
      return message.get(listKeys[index]);
    }
  }
}

async function processChannel(channel, newestMessage) {
  let message = await messageFetch(channel);
  if (message != null) {
    newestMessage = messageComparison(newestMessage, message);
  } else {
    console.log(`Most recent message in ${channel.name} has already been deleted!`);
    message = await lastMessage(channel);
    if (message != null) {
      newestMessage = messageComparison(newestMessage, message);
    } else {
      console.log(`There are no messages in ${channel.name}`);
    }
  }
  return newestMessage;
}

async function v14messageLast(map) {
  const outputMap = new Map(); // going to be placing our output in here using category as a key
  const listKeys = Array.from( map.keys() );
  /**
   * What we're receiving is an unordered list of categories and associated channels
   * Want as output:
   * { "category": category_name,
   *   "message": message
   * }
  **/
  for (let index = 0; index < map.size; index++) {  // this loops per category
    let newestMessage; // storage for the newest message in the category
    let channelList = map.get(listKeys[index]); // we're receiving a list of text channels here for most instances
    for (let c = 0; c < channelList.length; c++) { // this loops per channel
      /**
       * this has to be this way
       * thanks to forEach not able to async
       * It really doesn't make my day
       * I'd prefer forEach to stay
      **/
      let channel = channelList[c];
      if (channel.type === undefined) { // may receive a LIST instead of a MAP if a channel has threads, need to test for that
        // only THREADS will end up here as a LIST object
        for (let t = 0; t < channel.length; t++) { // this loops per thread
          newestMessage = await processChannel(channel[t], newestMessage);
        } // end of thread loop
      } else { // only CHANNELS without THREADS will end up here
        newestMessage = await processChannel(channel, newestMessage);
      }
    } // end of channel loop
    if (newestMessage === undefined) {
      outputMap.set(listKeys[index], null);
    } else {
      outputMap.set(listKeys[index], [newestMessage, null]);
    }
  } // end of category loop
  return outputMap;
}

function threadCheck(channel, threadChannels) {
  let output = [];
  threadChannels.forEach(thread => {
    if (thread.parentId === channel.id) {
      output.push(thread);
    }
  });
  return output;
}

function childList(category, textChannels, threadChannels) {
  const listChannels = [];
  textChannels.forEach(channel => {
    if (category.id === channel.parentId) {
      console.log(`${category.name} includes the channel ${channel.name}.`);
      let threadResult = threadCheck(channel, threadChannels);
      if (threadResult.length > 0) {
        listChannels.push(threadResult);
      } else {
        listChannels.push(channel);
      }
    }
  });
  return listChannels;
}

async function categoryList(interaction) {
  const map = new Map();
  // A list of each CATEGORY
  /**
   * this used to be (channel =? channel.type === 'GUILD_CATEGORY') but Discord v14 uses numbers instead
   * and has removed the CHILDREN property of category channels that was used in Discord v13
   * CATEGORIES use type 4 and have a parentId of null
   * TEXT CHANNELS use type 0 and have a parentId pointing to their Category
   * VOICE CHANNELS use type 2 and have a parentId pointing to their Category
   * THREADS use type 11 and have a parentId pointing to their parent TEXT CHANNEL
  **/
  const channels = await interaction.guild.channels.fetch(); // collect ALL channels on a server
  const categoryChannels = channels.filter(channel => channel.type === 4); // filtering for only CATEGORY channels
  const textChannels = channels.filter(channel => channel.type === 0); // filtering for only TEXT channels
  const threadChannels = channels.filter(channel => channel.type === 11); // filtering for only THREAD channels
  // threadChannels isn't getting any channels - TO DO - fix in future update
  categoryChannels.forEach(category => {
    /**
     * WANT: a MAP containing a categories NAME as the key and each CHILD as the value
    **/
    map.set(category.name, childList(category, textChannels, threadChannels));
  });
  return map;
}

function filterOnMonths(timestamp, period) {
  let timestampDate = new Date(timestamp),
    today = new Date();
  if (period != null) {
    today.setMonth(today.getMonth() - period); // adjusts the date backwards
  } else {
    return true; // no period means we want ALL data
  }
  if (timestampDate < today) { // could this be replaced with return (timestampDate < today); ??
    return true;
  } else {
    return false;
  }
}

async function renderNGOutput(interaction, output) {
	const size = 25, categories = Array.from(output.keys()),
		channels = await interaction.guild.channels.fetch(),
		period = interaction.options.getString('period');
	let categoriesPerEmbed = [], embedCollection = [];
	for (let i=0; i < categories.length; i+= size) {
		categoriesPerEmbed.push(categories.slice(i, i+size));
	}
	for (let i=0; i < categoriesPerEmbed.length; i++) { // need to do it this way in order to get i of LENGTH in titles!
		const embed = new EmbedBuilder()
			.setTitle("Categories Output (" + (1+i) + "/" + categoriesPerEmbed.length + ")");
		categoriesPerEmbed[i].forEach(category => {
			let latestMessage = output.get(category);
			if (latestMessage === null) {
				console.log(`${category} contained no messages!`);
			} else if (latestMessage.length === 2) {
				let newest = latestMessage[0],
					channel = channels.get(newest.channelId),
					categoryString;
				if (filterOnMonths(newest.createdTimestamp, period)) {
					categoryString = `Last messaage written by: ${testUser(newest.author)}\n\ton: ${resolveDate(newest.createdTimestamp)}\n\tin: ${channel.name}`
				}
				if (categoryString != undefined) { // add as field
					embed.addFields({name: category, value: categoryString, inline: false});
				}
			}
		});
		embedCollection.push(embed);
	}
	mirror(undefined, interaction, embedCollection); // interaction was passed above as a variable
	return;
}

function renderOutput(interaction, output) {
  // output will be a MAP containing categories as a key and each categories' newest message if it exists, or null if the category has no messages
  /**
   * Going to fill finalOutput with string objects, one string per message.
   * Discord has a character limit of 2,000 characters per message.
  **/
  const finalOutput = [];
  const period = interaction.options.getString('period'); // places null if no option set
  let finalOutputString = "Report For Categories Containing Text Channels:\n"; // going to push this once it's full
  if (period != null) {
    finalOutputString += `\t*Channels with no activity in the last ${period} months*\n` 
  }
  const categories = Array.from(output.keys());
  const channels = interaction.guild.channels.cache; // collect ALL channels on a server // may need to be rewritten as await guild.channels.fetch()
  categories.forEach(category => {
    let categoryData = interaction.guild.channels.cache.filter(channel => channel.name === category);
    //console.log(categoryData.get(categoryData.lastKey()).guild.roles.cache);
    let latestMessage = output.get(category);
    if (latestMessage === null) {
      console.log(`${category} contained no messages!`);
    } else if (latestMessage.length === 2) {
      let newest = latestMessage[0],
        channel = channels.get(newest.channelId),
        categoryString;
      if (filterOnMonths(newest.createdTimestamp, period)) {
        categoryString = `Last message for category: ** ${category} **\n\tWritten by: ${testUser(newest.author)}\n\t\ton: ${resolveDate(newest.createdTimestamp)}\n\t\tin: ${channel.name}\n\n`;
      }
      if (categoryString != undefined) {
        if (finalOutputString.length + categoryString.length < 2000) {
          finalOutputString += categoryString;
        } else {
          // need to flush finalOutputString to finalOutput and then set it to equal categoryString
          finalOutput.push(finalOutputString);
          finalOutputString = categoryString;
        }
      }
    }
  });
  finalOutput.push(finalOutputString); // to catch any strings that are less than 2000 characters!!
  mirror(finalOutput, interaction);
  return;
}

async function categories(interaction) {
	const categoryMap = await categoryList(interaction).then(interaction.editReply('Categories list generated, proceeding with identifying last messages per category.  This might take a while for large servers with many channels!'));
	await v14messageLast(categoryMap).then(output => {
		interaction.editReply(`Each category now has a last message object, rendering output`);
		if (outputStyle == "Legacy") {
			renderOutput(interaction, output); // legacy output
		} else if (outputStyle == "Embed") {
			renderNGOutput(interaction, output); // embed output
		} else {
			console.log("Improper output style selected, must be either Legacy or Embed!!!");
		}
	});
	return;
}

module.exports = { categories, resolveDate,
  data: new SlashCommandBuilder()
    .setName('categories')
    .setDescription('Provides information about server categories')
    .addStringOption(option =>
      option.setName('period')
        .setDescription('Period of time in months a game should have no activity to appear on list')
        .setRequired(false)),
  async execute(interaction) {
    if (roleTest.roleTest(interaction)) {
      await interaction.deferReply();
      await categories(interaction);
    } else {
      roleTest.warnRole(interaction, "categories");
    }
  },
};
