const { SlashCommandBuilder, EmbedBuilder } = require('discord.js'),
  { rosterView, getData } = require('../moderation/downtimeSpend.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('roster')
		.setDescription("View a guildmember's information from the roster on Discord")
		.addStringOption(option => 
			option.setName('blade')
				.setDescription("Name of Blade to display")
				.setRequired(true)),
	async execute(interaction) {
		await interaction.deferReply();
		const users = await interaction.guild.members.fetch();
		let blade = interaction.options.getString('blade');
		let bladeData = await getData(blade);
		rosterView(bladeData, interaction); // this relies on commands/moderation/downtimeSpend, output needs to be formatted in that file!
	},
};
