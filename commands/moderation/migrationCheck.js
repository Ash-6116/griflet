const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('migration_check')
    .setDescription('Checks for users with Blades roles who have migrated their usernames to the new formatting'),
  async execute(interaction) {
    await interaction.deferReply();
    const users = await interaction.guild.members.fetch();
    const roles = await interaction.guild.roles.fetch();
    const bladesKey = Array.from(roles.filter(role => role.name === "Blades").keys())[0];
    console.log(bladesKey);
    const blades = users.filter(user => user._roles.includes(bladesKey));
    const bladesKeys = Array.from(blades.keys());
    let migratory = [], nonMigratory = [];
    bladesKeys.forEach(key => {
      const blade = blades.get(key).user;
      console.log(blade);
      if (blade.discriminator === undefined || blade.discriminator === "0") {
        migratory.push(blade.username);
      } else {
        nonMigratory.push(blade.username + "#" + blade.discriminator);
      }
    });
    let output = "__**Blades Who Have Migrated From Discriminators:**__\n";
    migratory.forEach(user => {
      output += user + "\n";
    });
    if (migratory.length === 0) {
      output += "None";
    }
    output += "__**Blades Who Have Not Migrated From Discriminators:**__\n";
    nonMigratory.forEach(user => {
      output += user + "\n";
    });
    if (nonMigratory.length === 0) {
      output += "None";
    }
    interaction.editReply(output);
  },
};
