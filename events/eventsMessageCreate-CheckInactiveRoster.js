const { Events } = require('discord.js');
const { getAllSpreadsheetValues } = require('../commands/moderation/downtimeSpend.js');
const { checkRosters } = require('./eventsGuildMemberRemove.js');

module.exports = {
	name: Events.MessageCreate,
	async execute(message) {
		// Wish to check if the message.author is in the Inactive roster, and ping bot-spam if they are
		const result_of_checks = await checkRosters(message.author);
		if (result_of_checks[2].length > 0) {
			const guildChannels = await message.guild.channels.fetch();
			// TO DO - limit the check if the message was not posted in a Blades channel (eg. viewing-area)
			let output = "Please move the following user from the __Inactive Roster__ to the __Active Roster__ as they have returned to the server:\n" + message.author.username + "\n";
			result_of_checks[2].forEach(blade => {
				output += "-  " + blade[2] + "\n";
			});
			guildChannels.find(channel => channel.name === "bot-stuff").send(output);
		}
	},
};
