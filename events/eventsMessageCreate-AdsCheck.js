const { Events } = require('discord.js');

module.exports = {
	name: Events.MessageCreate,
	async execute(message) {
		if (message.guild.name.includes("Griflet Development Server") || message.guild.name.includes("A Castle in the Mist")) {
			if (message.channel.name.includes("ads-discussion") && message.content.toLowerCase().includes("title") && message.content.toLowerCase().includes("game")) { // 23.11 addition as serious, wait for a message in ads-discussion with two keywords and auto pin it.
				message.pin();
			}
		}
	},
};
