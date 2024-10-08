const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
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

function renderOutput(processedCategories, guildChannels, interaction) {
	const size = 20, period = interaction.options.getString('period');
	let categoriesPerEmbed = [], embedCollection = [];
	for (let i = 0; i < processedCategories.length; i+= size) {
		categoriesPerEmbed.push(processedCategories.slice(i, i+size));
	}
	for (let i=0; i < categoriesPerEmbed.length; i++) {
		const embed = new EmbedBuilder()
			.setTitle("Categories Output (" + (1+i) + "/" + categoriesPerEmbed.length + ")");
		categoriesPerEmbed[i].forEach(category => {
			let categoryString = " ", categoryTitle = category.name;
			const lastChannel = category.channels.slice(-1)[0];
			if (lastChannel != null) {
				if (lastChannel.lastMessage != null) {
					if (filterOnMonths(lastChannel.lastMessage.createdTimestamp, period)) {
						categoryString += "(Roles: " + lastChannel.roles.toString() + ")\n";
						categoryString += "Last message written by: " + lastChannel.lastMessage.author.username + "\non: " + resolveDate(lastChannel.lastMessage.createdTimestamp) + "\nin: " + lastChannel.name;
						if (category.created != null) {
							categoryTitle += "\n(Created: " + resolveDate(category.created) + ")";
						}
						embed.addFields({name: categoryTitle, value: categoryString, inline: false});
					}
				}
			}
		});
		embedCollection.push(embed);
	}
	mirror(undefined, interaction, embedCollection);
	return;
}

function sortByDate(a, b) {
	if (a.lastMessage == null && b.lastMessage == null) return 0;
	if (a.lastMessage != null && b.lastMessage == null) return 1;
	if (a.lastMessage == null && b.lastMessage != null) return -1;
	const dateA = new Date(a.lastMessage.createdTimestamp), dateB = new Date(b.lastMessage.createdTimestamp);
	if (dateA > dateB) return 1;
	if (dateB > dateA) return -1;
	return 0;
}

async function getLastMessage(guildChannels, guildRoles) {
	const guildTextChannels = guildChannels.filter(channel => channel.type === 0),
		channelKeys = Array.from(guildTextChannels.keys()),
		guildCategories = guildChannels.filter(channel => channel.type === 4);
	let categories = [];
	guildCategories.forEach(category => { // convert the guildCategories into a more useable object
		categories.push({ id: category.id, name: category.name, created: category.createdTimestamp, channels: []});
	});
	categories.push({ id: null, name: "Uncategorised Channels", created: null, channels: []});
	for (let c = 0; c < channelKeys.length; c++) {
		const channel = guildTextChannels.get(channelKeys[c]),
			lastMessage = await channel.messages.fetch({limit: 1}),
			lastArray = Array.from(lastMessage.keys());
		let output = { id: channel.id, name: channel.name, parent: channel.parentId}, roleArray = [];
		if (lastArray.length > 0) {
			output.lastMessage = lastMessage.get(lastArray[0]);
		} else {
			output.lastMessage = null;
		}
		guildRoles.forEach(role => {
			// todo - have an ignore array of role names to ignore?
			if (channel.permissionsFor(role.id).has(PermissionsBitField.Flags.ViewChannel)) {
				roleArray.push(role.name); // only adds if the role can view the channel
			}
		});
		output.roles = roleArray;
		categories.filter(category => category.id === channel.parentId)[0].channels.push(output);
	}
	return categories;
}

function sortChannelsForCategory(processedCategories) {
	processedCategories.forEach(category => {
		console.log(category.name);
		console.log("---	---");
		//category.channels = category.channels.sort(sortByDate); // error might've been here
		category.channels.sort(sortByDate);
		category.channels.forEach(channel => {
			if (channel.lastMessage != null) {
				console.log(channel.name + "	" + resolveDate(channel.lastMessage.createdTimestamp));
			}
		});
		console.log("---	---");
	});
	return processedCategories;
}

async function categories(interaction) {
	interaction.editReply('Fetching channels and roles...');
	const guildChannels = await interaction.guild.channels.fetch(), // need to filter out voice
		guildRoles = await interaction.guild.roles.fetch();
	interaction.editReply('Channels and roles fetched, parsing...');
	let processedCategories = await getLastMessage(guildChannels, guildRoles);
	processedCategories = sortChannelsForCategory(processedCategories);
	interaction.editReply('Channels parsed, rendering output...');
	renderOutput(processedCategories, guildChannels, interaction);
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
