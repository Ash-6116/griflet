const { Events } = require('discord.js');

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
			if (message.channel.name.includes("ads-discussion") && message.content.toLowerCase().includes("title") && message.content.toLowerCase().includes("game")) { // 23.11 addition as serious, wait for a message in ads-discussion with two keywords and auto pin it.
				message.pin();
			}
			// Add code to check if the author is Wookie and it is December 2/12/23 joke
			/**
			if (message.author.username.toLowerCase().includes("wookie")) {
				var datetime = new Date();
				if (datetime.getMonth() === 11 && datetime.getDate() < 26) { // if it is December and is before Christmas
					if (datetime.getDate() === 25) { // it is Christmas day
						await message.reply("Merry Christmas <@" + message.author.id + ">");
					} else if (datetime.getDate() === 24) { // it is Christmas Eve
						await message.reply("Only one more sleep til Christmas, <@" + message.author.id + ">");
					} else {
						difference = 25-datetime.getDate();
						await message.reply("Only " + difference + " days left until Christmas <@" + message.author.id + ">");
					}
				}
			}
			**/
			if (message.content.toLowerCase().includes("!fight")) {
				// Start the routine
			}
			// 24.01 - monitor General Lounge for comments from Dyno containing the text 'absorbed'
			if (message.author.username.toLowerCase().includes("dyno")) { // Piggy backing off Dyno for logging
				if (message.content.toLowerCase().includes("absorbed by the mists") && channel.name.includes("general-lounge")) {
					console.log("NOTICE: " + message.content.split(" was absorbed by the mists")[0] + " has left the server."); // split off most of the dyno message except the username of the person who left the guild
					// TODO - run checks on Google Sheet 'Guild Roster', checking sheets 'Roster' and 'Inactive' for the given username
				}
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