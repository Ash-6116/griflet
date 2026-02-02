const {mirror} = require('./output.js'),
	{ EmbedBuilder } = require('discord.js'),
	outputStyle = process.env.outputStyle;

function warnRole(interaction, command) {
	if (outputStyle === "Legacy") {
  		mirror([`Unfortunately, the command **/${command}** is not available at this time.  It is currently restricted to Knights, Squires, or the Baroness.`], interaction);
  	} else if (outputStyle === "Embed") {
  		const embed = new EmbedBuilder()
  			.setTitle("Command Currently Unavailable")
  			.setDescription(`Unfortunately, the command **/${command}** is not available at this time.  It is currently restricted to Knights, Squires, or the Baroness`)
  		mirror(undefined, interaction, embed);
  	}
}

function roleTest(interaction) {
	// this function checks a user has a specific role - used for restricting commands on Castle In The Mist server
	console.log("This function is intended to test a user has a specific role before executing a command");
	let roles = interaction.member.roles.cache;
	if (roles.some(role => role.name === 'Knights') || roles.some(role => role.name === 'Squires') || roles.some(role => role.name === 'Baroness')) {
		console.log(`${interaction.user.username} has the Knights role, the Squires role, or the Baroness role`);
		return true;
	} else {
		console.log(`${interaction.user.username} does not have an applicable role`);
		return false;
	}
}

module.exports = {roleTest, warnRole}
