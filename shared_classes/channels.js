async function checkFilter(interaction) {
	const channels = await interaction.guild.channels.fetch(),
		null_keys = channels.filter(channel => channel === null).keys(); // this is catching channels that don't exist properly but are returned by Discord
	console.log(channels.size);
	null_keys.forEach(key => {
		channels.delete(key);
		console.log("Removed null channel with id: " + key);
	});
	console.log(channels.size);
	return channels;
}

module.exports = {checkFilter}
