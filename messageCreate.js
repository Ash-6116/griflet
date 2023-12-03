async function messageCreateHandling(message) {
	// 23.11 addition as a joke, wait for a message from viewing-area including the word 'morning'
	//if (message.channelId === '473284658025594881' && message.author.id != '897148749267222649') { // message set to viewing-area and not by Griflet
	//if (message.guildId === '775705450338451478' && message.author.id != '897148749267222649') { // message sent on dev server and not by Griflet // need to include dev server
	if ((message.guildId === '775705450338451478' && message.author.id != '897148749267222649') || (message.channelId === '473284658025594881' && message.author.id != '897148749267222649')) {
		if (message.content.toLowerCase().includes("mornin")) { // if someone posts a message containing the word 'morning'
			await message.reply("morning <@" + message.author.id + ">, how are things with you?"); // reply to the user.
		} else if (message.content.toLowerCase().includes("how about you") || message.content.toLowerCase().includes("hbu") || message.content.toLowerCase().includes("how are things with you?") || (message.content.toLowerCase().includes("how are you") && message.content.toLowerCase().includes("grif"))) { // same as above, but uses specified phrases as the trigger
			await message.reply("I'm doing pretty good thanks.");
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
	}
	// 23.11 addition as serious, wait for a message in ads-discussion with three keywords and auto pin it.
	//if (message.guildId === '775705450338451478' && message.channelId === '1172549592345235466') { // on dev server in ads-discussion
	if (message.guildId === '473284658025594881' && message.channelId === '711238243676586023') {
		if (message.content.toLowerCase().includes("title") && message.content.toLowerCase().includes("game")) {
			message.pin(); // pin the message
		}
	}
	if (message.content.toLowerCase().includes("!fight")) {
		// Start the routine
	}
}

module.exports = { messageCreateHandling };
