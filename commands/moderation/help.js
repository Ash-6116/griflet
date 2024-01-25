const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('help')
		.setDescription('View a full list of commands'),
	async execute(interaction) {
		const helpEmbed = new EmbedBuilder()
			.setTitle('Available Commands')
			.setDescription('available commands for Griflet')
		interaction.client.commands.forEach(command => {
			let name = command.data.name;
			let value = command.data.description;
			if (command.data.options.length > 0) {
				value += "\n\n*Options*:";
				command.data.options.forEach(option => {
					value += "\n- " + option.name + ": " + option.description;
					if (option.required) {
						value += " (required)";
					}
				});
			} else {
			}
			helpEmbed.addFields({name: name, value: value, inline: false}); 
		});
		interaction.reply({ embeds: [helpEmbed] });
	}
}
