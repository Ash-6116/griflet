const { SlashCommandBuilder, EmbedBuilder } = require('discord.js'),
	date = require('date-and-time'),
	{ getAuthToken, writeSpreadsheetValues } = require('../../shared_classes/googleSheetsService.js');

async function sendToGSheet(values) {
	console.log(values);
	console.log("Trying to write data to sheet...");
	const spreadsheetId = process.env.serverInfoSheet,
		sheetName = "server_info",
		range = sheetName+"!A:I";
	try {
		const auth = await getAuthToken();
		writeSpreadsheetValues({
			spreadsheetId,
			sheetName,
			auth,
			values,
			range
		});
		console.log("Data written to sheet successfully!");
	} catch (error) {
		console.error(error.message, error.stack);
	}
	return;
}

async function serverinfo(interaction) {
	console.log(interaction.guild);
	const users = await interaction.guild.members.fetch(), // collect all Users
		owner = users.get(interaction.guild.ownerId), // collect the OwnerId
		roles = await interaction.guild.roles.fetch(), // collect all Roles
		channels = await interaction.guild.channels.fetch(), // collect all Channels
		textChannels = channels.filter(channel => channel.type === 0), // collect all Text Channels by type
		voiceChannels = channels.filter(channel => channel.type === 2), // collect all Voice Channels by type
		categoryChannels = channels.filter(channel => channel.type === 4), // collect all Category Channels by type
		bots = users.filter(user => user.user.bot === true), // filters for the number of BOTS
		people = users.filter(user => user.user.bot === false), // filters for the number of USERS
		embed = new EmbedBuilder()
			.setTitle(interaction.guild.name)
			.setImage(interaction.guild.iconURL())
	console.log(interaction.guild);
	let output = "**__" + interaction.guild.name + "__**\n",
		threadChannels = 0;
	channels.forEach(channel => {
		console.log(channel.type + ": " + channel.name); // ONLY TEXT CHANNELS CAN HAVE THREADS ATTACHED!!!
		if (channel.type == 0) {
			const threads = channel.threads.cache;
			if (threads.size != 0) { // found some Threads in a text channel
				console.log(threads.size);
				threadChannels += threads.size; // adding them to the threadChannels variable so they can be counted
			}
		}
	});
	// arranging the output to go into the embed
	embed.addFields({name: "Owner", value: owner.user.username, inline: false});
	embed.addFields({name: "Channels", value: channels.size.toString(), inline: false});
	embed.addFields({name: "Category", value: categoryChannels.size.toString(), inline: true});
	embed.addFields({name: "Voice", value: voiceChannels.size.toString(), inline: true});
	embed.addFields({name: "Text", value: textChannels.size.toString(), inline: true});
	embed.addFields({name: "Unlocked Threads", value: threadChannels.toString(), inline: true});
	embed.addFields({name: "Roles", value: roles.size.toString(), inline: false});
	embed.addFields({name: "Members", value: users.size.toString(), inline: false});
	embed.addFields({name: "People", value: people.size.toString(), inline: true});
	embed.addFields({name: "Bots", value: bots.size.toString(), inline: true});
	// sending this data, along with the date, to a gSheet so it can be tracked and measured
	sendToGSheet([[date.format(new Date(), 'YYYY.MM.DD'), owner.user.username, categoryChannels.size, voiceChannels.size, textChannels.size, threadChannels, roles.size, people.size, bots.size]]);
	//return output;
	interaction.editReply({ embeds: [embed] });
	return;
}

module.exports = { serverinfo, 
	data: new SlashCommandBuilder()
		.setName('serverinfo')
		.setDescription('Provides information about the server'),
	async execute(interaction) {
		await interaction.deferReply();
		//interaction.editReply(await serverinfo(interaction));
		serverinfo(interaction);
		console.log("Ran serverinfo command");
	},
};
