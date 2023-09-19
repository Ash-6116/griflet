const { SlashCommandBuilder } = require('discord.js');
const wait = require('node:timers/promises').setTimeout;

module.exports = {
  cooldown: 10,
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Replies with Pong!'),
    async execute(interaction) {
      await interaction.deferReply(); // used to reply to a longer command, ie categories
      //await interaction.reply('Pong!');
      await wait(4000);
      await interaction.editReply('Pong!'); // alters the deferReply to a result
      await wait(5000);
      await interaction.followUp('Pong again!'); // follows up an earlier reply (ie categories)
      await wait(3000);
      await interaction.followUp('Pong one more time!'); // can be daisy chained, ie for categories
    },
};
