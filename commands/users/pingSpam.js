const { SlashCommandBuilder } = require('discord.js'),
	output = require('../snippets/output');

async function loop(targetChannel, finalTarget, duration) {
	for (i = 0; i < duration; i++) {
		output.specificMirror(["Hi <@" + finalTarget + ">!"], Array.from(targetChannel.values())[0]); 
		await new Promise(resolve => setTimeout(resolve, 15000));
	}
	return;
}

async function gatherMaterials(interaction) {
	const users = await interaction.guild.members.fetch(),
		channels = await interaction.guild.channels.fetch(),
		target = interaction.options.getString('user'),
		number = interaction.options.getString('number'),
		targetChannel = channels.filter(channel => channel.name === "viewing-area");
	console.log(targetChannel);
	if (users.filter(member => member.user.username === target).size > 0) {
		console.log("I have found the user to spam");
		const finalTarget = users.filter(member => member.user.username === target);
		console.log("Hi <@" + Array.from(finalTarget.keys())[0] + ">!");
		loop(targetChannel, Array.from(finalTarget.keys())[0], number);
	}
	return;
}

module.exports = {
	data: new SlashCommandBuilder()
		.setName('ping_spam')
		.setDescription('Spam specific user with designated number of pings in viewing-area')
		.addStringOption(option =>
			option.setName('user')
				.setDescription('the user to spam')
				.setRequired(true))
		.addStringOption(option =>
			option.setName('number')
				.setDescription('the number of times to ping')
				.setRequired(true)),
	async execute(interaction) {
		gatherMaterials(interaction);
		interaction.reply("Executing");
	},
};
