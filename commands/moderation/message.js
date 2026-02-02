const { SlashCommandBuilder } = require('discord.js'),
	roleTest = require('../../shared_classes/roleTest.js'),
	outputStyle = process.env.outputStyle,
	output = require('../../shared_classes/output.js');

function sendMessageByFiltering(channel, message, channels) {
	let target = "";
	if (channel.includes("#")) {
		target = channel.split("#")[1];
 	} else {
		target = channel;
	}
	const identifiedTargets = channels.filter(channelItem => channelItem.name.includes(target) && channelItem.type === 0 || channelItem.type === 11);
	if (identifiedTargets.size > 0) {
		const array = Array.from(identifiedTargets.keys());
		array.forEach(key => {
			output.specificMirror([message], channels.get(key));
		});
	}
	return;
}

async function sendMessage(interaction) {
	const channel = interaction.options.getString('channel'),
		message = interaction.options.getString('message'),
		channels = await interaction.guild.channels.fetch();
	if (channel.includes("<") && channel.includes(">")) { // does not have <> means not a channel!!
		const channelId = channel.split("<#")[1].split(">")[0];
		if (channels.has(channelId)) {
			output.specificMirror([message], channels.get(channelId));
		} else {
			console.log("No such channel");
		}
	} else {
		sendMessageByFiltering(channel, message, channels);
		console.log("Received a name, not a channel id");
	}
	return;
}

module.exports = {
	data: new SlashCommandBuilder()
		.setName('message')
		.setDescription('send a message from Griflet to a specific channel')
		.addStringOption(option =>
			option.setName('channel')
				.setDescription('the channel to send the message to')
				.setRequired(true))
		.addStringOption(option =>
			option.setName('message')
				.setDescription('the message to send')
				.setRequired(true)),
		async execute(interaction) {
			if (roleTest.roleTest(interaction)) {
				await interaction.deferReply();
				sendMessage(interaction);
				interaction.editReply('Message sent');
			} else {
				roleTest.warnRole(interaction, "message");
			}
		},
};
