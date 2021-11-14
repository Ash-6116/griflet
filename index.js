const Discord = require("discord.js");
//const config = require("./config.json");
const client = new Discord.Client({ intents: ["GUILDS", "GUILD_MESSAGES"] });
const prefix = "!";

/**
 * TO DO:
 * Remove obsolete functions
 * Upload
 **/

/**
 * Neph's recommended steps:
 * 1) Get a list of all category channels (filter guild.channels for type=category)
 * 2) Create a function that, given a list of channels, returns the most recent "last posted" timestamp
 * 3) Call the function on the children of the first category
 * 4) When step 3 resolves, call the function on the next category in the list
 * 5) Repeat steps 3/4 until you get through all categories.
**/

function channelData(message) {
  // Need to filter any channel that has type 'GUILD_VOICE' or 'GUILD_CATEGORY' out, leaving only
  // 'GUILD_TEXT' behind.
  console.log('Text Channels on Server: ');
  message.guild.channels.cache.filter(m => m.type === 'GUILD_TEXT').forEach((channel) => {
    retrieveLastPost(channel).then(message => {
      processLastPost(message, channel);
    });
  })
  return;
}

function resolveDate(Timestamp) {
  let d = new Date(Timestamp);
  return d.toDateString() + " " + d.getHours() + ":" + (d.getMinutes()<10?'0':'') + d.getMinutes();
}
  
function mirror(textString, message) {
  // Echoes strings to both a reply on Discord and the console log one after the other.
  console.log(textString);
  const allowedLength = 1750;
  let chunkedOutput = textString.match(/[\s\S]{1,allowedLength}/g); // Splits output into character chunks equal to allowedLength in size or smaller
  //chunkedOutput.forEach(chunk => {
  //  message.reply(chunk, message); // sends chunks as a reply to existing message
  //  //message.channel.send(textString); // sends output as unique message
  //});
  for (int i=0; i<chunkedOutput.length; i++) {
    message.reply(chunkedOutput[i], message);
  }
  return;
}

function ping(message) {
  const timeTaken = Date.now() - message.createdTimestamp;
  mirror(`Pong! This message has a latency of ${timeTaken}ms.`, message);
  return;
}

function messageFetch(channel) { // problem with deleted messages lives here
  return new Promise((resolve, reject) => {
    if (channel.lastMessageId != undefined) { // deleted messages still have an ID but retrieve no data
        channel.messages.fetch(channel.lastMessageId) // this is what throws the error
          .then(message => {
            resolve(message);
            }).catch(error => {
            reject(error);
          });
    }
  });
}

async function messageLast(map, returnMessage){
  const listKeys = Array.from( map.keys() );
  let outputString = "Report For Categories Containing Text Channels:\n";
  for (let index = 0; index < map.size; index++) {
    let channelList = map.get(listKeys[index]); // we're receiving our list here
    let newestMessageDate = new Date('16 March 2018'); // this was the date that Castle In The Mist had its first message
    let newestMessage; // storage for the newest message
    let newestChannel; // storage for the channel containing the newest message
    for (let y = 0; y < channelList.length; y++) {
      if (channelList[y].lastMessageId != undefined) {
        lastMessage = await messageFetch(channelList[y]).catch(err => console.error("Last Message Was Deleted"));
        if (lastMessage != undefined) {
          currentMessageDate = new Date(lastMessage.createdTimestamp);
          if (currentMessageDate > newestMessageDate) {
            newestMessageDate = currentMessageDate;
            newestMessage = lastMessage;
            newestChannel = channelList[y].name;
          }
        }
      }
    }
    if (newestMessageDate != undefined && newestMessage != undefined && newestChannel != undefined) {
      outputString += "Last Message for category: " + listKeys[index] + "\n\tWritten by: " + newestMessage.author.username + "#" + newestMessage.author.discriminator + "\n\t\ton: " + resolveDate(newestMessageDate) + "\n\t\tin: " + newestChannel + "\n";
      console.log(outputString);
    }
  }
  console.log("Size of outputString: " + outputString.length);
  mirror(outputString, returnMessage);
  return;
}

function childList(category) {
  const listChannels = [];
  category.children.forEach(child => {
    listChannels.push(child)
  });
  return listChannels;
}

function categoryList(message) {
  const map = new Map();
  // A list of each CATEGORY
  const categoryChannels = message.guild.channels.cache.filter(channel => channel.type === 'GUILD_CATEGORY');
  categoryChannels.forEach(category => {
    map.set(category.name, childList(category));
  });
  messageLast(map, message);
  return;
}

function rosterCheck(message) {
  return new Promise((resolve, reject) => {
    message.guild.channels.cache.filter(channel => channel.name === 'roster').forEach(channel => {
      channel.messages.fetch({ limit: 100 }).then(messages => {
        console.log(`Received ${messages.size} messages from #roster`);
        if (messages.size > 2) {
          console.log(`There are new sheets to be checked.`);
          resolve(messages.size);
        } else {
          console.log(`There are no sheets to be checked.`);
          resolve(null);
        }
      });
    });
  });
}

function questCheck(message) {
  return new Promise((resolve, reject) => {
    message.guild.channels.cache.filter(channel => channel.name === 'quest-board').forEach(channel => {
      channel.messages.fetch({ limit: 100 }).then(messages => {
        console.log(`There are currently ${messages.size} quests on the board\n`);
        messages.forEach(message => {
          //let reactions = message.reactions.cache.find(emoji => emoji.emoji.name == '⚔️');
          //let reactions = message.reactions.cache.find(emoji => emoji.emoji.name == '*');
          message.reactions.cache.map(async (reaction) => {
            let reactedUser = await reaction.users.fetch();
              reactedUser.map((user) => {
                console.log("Users reacting to " + message.content + "\n" + user.username + "#" + user.discriminator + "\nTotal Players: " + reactedUser.size + "\n");
              });
            console.log(reaction.count);
          });
        });
        resolve(null);
      });
    });
  });
}

function downtime(message) {
  /**
   * Wish to add a function to run routines done when applying weekly downtime.
   * 1) Check if there are any additional posts in #roster that need to be sorted out.
   * 2) Check if anyone has left the server in the last week with the command:
   *      from: Dyno in: general-lounge 'absorbed'
   * 3) Work out which quests are awaiting guildmates.
   * 4) Send a message to #announcements with the following format:
   *      @Blades the weekly downtime has been applied.  As a reminder you can only spend downtime or shop if
   *      you are not in a quest or if your quest has not left the guild hall.
   *      Please ask @Knights or @Squires for spending downtime, a document of suggested activities can be 
   *      found in gameplay-reference.
   *
   *      Quests Waiting For Guildmates:
   *      Tier 1: Impregnable Fortress
  **/
  // Step 1 - check for additional posts in #roster - spin this off into a Promise
  rosterCheck(message);
  // Step 2 - check if anyone has left the server in the last week with the command
  // Step 3 - Work out which quests are awaiting guildmates.
  questCheck(message);
  return;
}

client.on("messageCreate", function(message) {
  if (message.author.bot) return;
  if (!message.content.startsWith(prefix)) return;

  const commandBody = message.content.slice(prefix.length);
  const args = commandBody.split(' ');
  const command = args.shift().toLowerCase();

  switch (command) {
    case 'categories':
      categoryList(message);
      break;
    case 'downtime':
      downtime(message);
      break;
    case 'ping':
      ping(message);
      break;
    default:
      break;
  }
});

//client.login(config.BOT_TOKEN);
client.login(process.env.GRIFLET_TOKEN);
