const { Events } = require('discord.js');

module.exports = {
	name: Events.MessageCreate,
	async execute(message) {
		// 23.11 addition as a joke, wait for a message from viewing-area including the word 'morning'
		if (message.guild.name.includes("Griflet Development Server") || message.guild.name.includes("A Castle in the Mist")) {
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
			if (message.author.username.toLowerCase().includes("ash")) { // add in check to confirm it is in viewing-area only
				await message.reply("Hiya Lugh, just reminding you that your games need some love too!");
				console.log(message);
			}
		}
	},
};
