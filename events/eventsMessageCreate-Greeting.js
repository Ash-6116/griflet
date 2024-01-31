const { Events } = require('discord.js');
const standardResponses = require('./standardResponses.json');

module.exports = {
	name: Events.MessageCreate,
	async execute(message) {
		const secondResponseTriggers = ["how about you", "hbu", "how are things with you?"];
		// 23.11 addition as a joke, wait for a message from viewing-area including the word 'morning'
		if (message.guild.name.includes("Griflet Development Server") || message.guild.name.includes("A Castle in the Mist")) {
			if (message.channel.name.includes("viewing-area") && !message.author.username.toLowerCase().includes("griflet")) {
				if (message.content.toLowerCase().includes("mornin") || message.content.toLowerCase().includes("how are you")) {
					if (message.content.toLowerCase().includes("grif") || message.mentions.users.has('897148749267222649')) {
						if (message.content.toLowerCase().includes("mornin") && !message.content.toLowerCase().includes("how are you")) {
							await message.reply("morning <@" + message.author.id + ">, how are things with you?"); // reply to the user
						} else if (message.content.toLowerCase().includes("how are you") && !message.content.toLowerCase().includes("mornin")) {
							await message.reply("I'm doing pretty good thanks, how are things with you?");
						} else {
							await message.reply("morning <@" + message.author.id + ">, I'm doing pretty good thanks, how are things with you?");
						}
					}
				}
				for (i = 0; i < secondResponseTriggers.length; i++) {
					if (message.content.toLowerCase().includes(secondResponseTriggers[i]) && !message.content.toLowerCase().includes("mornin")) {
						await message.reply("I'm doing pretty good thanks.");
						break;
					} else if (message.mentions.repliedUser != null) {
						if (message.mentions.repliedUser.username.includes("Griflet") && message.content.toLowerCase().includes(secondResponseTriggers[i])) {
							await message.reply("I'm doing pretty good thanks.");
						}
						break;
					}
				}
			}
		}
		//console.log(standardResponses.giveawayAddendum);
	},
};
