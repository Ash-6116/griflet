async function prompter(timeLimit, interaction) {
	console.log("Awaiting prompt response from " + interaction.user.username + "...");
	return new Promise (function (resolve, reject) {
		const collectorFilter = m => m.author.id == interaction.user.id,
			collector = interaction.channel.awaitMessages({ filter: collectorFilter, time: timeLimit, max: 1})
			.then(collected => {
				console.log("Response received:");
				const key = Array.from(collected.keys());
				resolve(collected.get(key[0]).content);
			}).catch(error => {
				console.error(error);
				resolve(null);
			});		
	});
}

module.exports = { prompter }
