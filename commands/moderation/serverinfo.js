const { SlashCommandBuilder } = require('discord.js'),
  { testUser } = require('../snippets/user');

async function serverinfo(interaction) {
  const users = await interaction.guild.members.fetch(),
    owner = users.get(interaction.guild.ownerId),
    roles = await interaction.guild.roles.fetch(),
    channels = await interaction.guild.channels.fetch(),
    textChannels = channels.filter(channel => channel.type === 0),
    voiceChannels = channels.filter(channel => channel.type === 2),
    categoryChannels = channels.filter(channel => channel.type === 4),
    threadChannels = channels.filter(channel => channel.type === 11), // not functioning
    bots = users.filter(user => user.user.bot === true),
    people = users.filter(user => user.user.bot === false);
  let output = "**__" + interaction.guild.name + "__**\n";
  channels.forEach(channel => {
    console.log(channel.type + ": " + channel.name);
  });
  output += "Owner:\t\t" + testUser(owner.user) + "\n";
  output += "Channels:\t" + channels.size + "\n";
  output += "\tCategory:\t" + categoryChannels.size + "\n";
  output += "\tVoice:\t" + voiceChannels.size + "\n";
  output += "\tText:\t" + textChannels.size + "\n";
  //output += "\tThreads:\t" + threadChannels.size + "\n"; // TO DO - implement in future update
  output += "Roles:\t\t" + roles.size + "\n";
  output += "Members:\t\t" + users.size + "\n";
  output += "\tPeople:\t" + people.size + "\n";
  output += "\tBots:\t" + bots.size + "\n";
  return output;
}

module.exports = { serverinfo, 
  data: new SlashCommandBuilder()
    .setName('serverinfo')
    .setDescription('Provides information about the server'),
  async execute(interaction) {
    await interaction.deferReply();
    interaction.editReply(await serverinfo(interaction));
  },
};
