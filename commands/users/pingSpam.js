const { SlashCommandBuilder } = require('discord.js'),
	output = require('../snippets/output');

async function loop(targetChannel, finalTarget, duration, delay) {
	for (i = 0; i < duration; i++) {
		console.log("Attempt #" + i+1);
		output.specificMirror(["Hi <@" + finalTarget + ">!"], Array.from(targetChannel.values())[0]); 
		await new Promise(resolve => setTimeout(resolve, delay * 1000)); // this sets a delay in miliseconds.  1 second = 1000.
	}
	return;
}

async function gatherMaterials(interaction) {
	const users = await interaction.guild.members.fetch(),
		channels = await interaction.guild.channels.fetch(),
		target = interaction.options.getString('user'),
		number = interaction.options.getString('number'),
		target_channel_name = interaction.options.getString('channel'),
		delay = interaction.options.getString('delay')
		targetChannel = channels.filter(channel => channel.name === target_channel_name);
	if (users.filter(member => member.user.username === target).size > 0) { // triggers if Griflet found the user from the server member list
		console.log("I have found the user to spam");
		const finalTarget = users.filter(member => member.user.username === target);
		if (targertChannel != undefined) { // triggers if a channel that exists was entered
			loop(targetChannel, Array.from(finalTarget.keys())[0], number, delay);
		}
	}
	return;
}

module.exports = {
	data: new SlashCommandBuilder()
		.setName('ping_spam')
		.setDescription('Spam specific user with designated number of pings')
		.addStringOption(option =>
			option.setName('user') // collect a username 
				.setDescription('the user to spam')
				.setRequired(true))
		.addStringOption(option =>
			option.setName('number') // set the maximum number of pings
				.setDescription('the number of times to ping')
				.setRequired(true))
		.addStringOption(option =>
			option.setName('channel') // set the channel to ping
				.setDescription('the channel to send the pings to')
				.setRequired(true))
		.addStringOption(option =>
			option.setName('delay') // set a delay between pings
				.setDescription('the delay in seconds between each ping')
				.setRequired(true)),
	async execute(interaction) {
		await interaction.deferReply();
		interaction.editReply("Executing...");
		gatherMaterials(interaction);
		interaction.editReply("Execution Complete");
	},
};
