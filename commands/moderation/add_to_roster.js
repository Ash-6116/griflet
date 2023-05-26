const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('add_to_roster')
    .setDescription('Adds a new Blade to the roster')
    .addStringOption(option =>
      option.setName('player')
        .setDescription('The player who owns the character.')
        .setRequired(true)),
  async execute(interaction) {
    // ... code goes here
  },
};
