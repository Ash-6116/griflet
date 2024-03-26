const { Events, EmbedBuilder } = require('discord.js'),
	{ getAllSpreadsheetValues } = require('../commands/moderation/downtimeSpend.js'),
	{ find_member } = require('../commands/moderation/misted.js'),
	outputStyle = "Legacy";

async function embedOutput(outputString, result_of_checks, message) {
	const outputEmbed = new EmbedBuilder()
		.setTitle('Returning Blade Notification')
		.setDescription(outputString)
		.setThumbnail(message.author.displayAvatarURL())
	let value = "";
	result_of_checks.forEach(blade => {
		value += blade[2] + "\n"
	});
	outputEmbed.addFields({name: message.author.username, value: value, inline: false});
	return outputEmbed;
}

function legacyOutput(outputString, result_of_checks, message) {
	outputString += "\n" + message.author.username + "\n";
	result_of_checks.forEach(blade => {
		outputString += "-  " + blade[2] + "\n";
	});
	return outputString;
}

module.exports = {
	name: Events.MessageCreate,
	async execute(message) {
		// Wish to check if the message.author is in the Inactive roster, and ping bot-spam if they are
		const result_of_checks = await find_member(await getAllSpreadsheetValues(process.env.spreadsheetId,  "Inactive"), message.author.username);
		if (result_of_checks.length > 0) {
			const guildChannels = await message.guild.channels.fetch(),
				postChannel = guildChannels.get(message.channelId).name,
				bladeChannels = ["viewing-area", "dice-tray", "blades-confessionals", "rec-room", "guild-hall", "courtyard", "sunroom", "shoppe", "library", "strathmore", "quest-caravan-1", "qc1-ooc", "quest-caravan-2", "qc2-ooc", "quest-caravan-3", "qc3-ooc", "quest-caravan-4", "qc4-ooc", "quest-caravan-5", "qc5-ooc", "quest-caravan-6", "qc6-ooc", "quest-caravan-7", "qc7-ooc", "quest-caravan-8", "qc8-ooc", "quest-caravan-9", "qc9-ooc", "quest-caravan-10", "qc10-ooc"];
			if (bladeChannels.includes(postChannel)) { // if the post was made in a blade channel, returns true
				let output = "Please move the following Blade from the __**Inactive Roster**__ to the __**Active Roster**__ as their player has returned to the server:";
				if (outputStyle == "Legacy") {
					guildChannels.find(channel => channel.name === "bot-stuff").send(legacyOutput(output, result_of_checks, message));
				} else if (outputStyle == "Embed") {
					const toSend = await embedOutput(output, result_of_checks, message);
					guildChannels.find(channel => channel.name === "bot-stuff").send({embeds: [toSend] });
				} else {
					console.log("Improper output style selected, must be either Legacy or Embed!!!");
				}
			}
		}
	},
};
