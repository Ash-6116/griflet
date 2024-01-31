const { Events } = require('discord.js');

module.exports = {
	name: Events.MessageCreate,
	async execute(message) {
		if (message.guild.name.includes("Griflet Development Server") || message.guild.name.includes("A Castle in the Mist")) {
			// 24.01 - monitor General Lounge for comments from Dyno containing the text 'absorbed'
			if (message.author.username.toLowerCase().includes("dyno")) { // Piggy backing off Dyno for logging
				// the check for 'absorbed by the mists' has been superceded by having Griflet check for events/GuildMemberRemove, allowing Griflet to know directly when someone leaves rather than piggybacking off Dyno and risking being tricked by the ?mists Dyno command run on the server
				if (message.content.toLowerCase().includes("welcome, ")) {
					joiningUser = message.mentions.users.get(message.content.split("<@")[1].split(">")[0].replace(/\D/g, "")); // Dyno will only ever tag a single user, so can use this to get the user ID from the message content and fetch the user's data
					console.log("NOTICE: " + joiningUser.username + " has joined the server with nickname " + joiningUser.globalName);
				}
				if (message.content.toLowerCase().includes("welcome to the blades!")) {
					joiningUser = message.mentions.users.get(message.content.split("<@")[1].split(">")[0].replace(/\D/g, "")); // .replace(/\D/g, "") is used to filter out anything that isn't a number from the substring
					console.log("NOTICE: " + joiningUser.username + "(" + joiningUser.globalName + ") has joined the Blades of Obsidian.");
				}
			}
		}
	},
};
