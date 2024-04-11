const { SlashCommandBuilder, EmbedBuilder } = require('discord.js'),
	outputStyle = process.env.outputStyle;

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
    if (outputStyle == "Legacy") {
    	let output = "__**" + migratory.length + " Blades Who Have Migrated From Discriminators:**__\n";
    	migratory.forEach(user => {
      		output += user + "\n";
    	});
    	if (migratory.length === 0) {
      		output += "None";
    	}
    	output += "__**" + nonMigratory.length + " Blades Who Have Not Migrated From Discriminators:**__\n";
    	nonMigratory.forEach(user => {
      		output += user + "\n";
    	});
    	if (nonMigratory.length === 0) {
      		output += "None";
    	}
    	interaction.editReply(output);
    } else if (outputStyle == "Embed") {
    	let migrationString = "", nonMigrationString = "";
    	migratory.forEach(user => {
    		migrationString += user + "\n";
    	});
    	if (migratory.length === 0) {
    		migrationString += "None";
    	}
    	nonMigratory.forEach(user => {
    		nonMigrationString += user + "\n";
    	});
    	if (nonMigratory.length === 0) {
    		nonMigrationString += "None";
    	}
    	const embed = new EmbedBuilder()
    		.setTitle("Results of Migration Check");
    	embed.addFields({name: "Migrated", value: migrationString, inline: false});
    	embed.addFields({name: "Legacy Discord Discriminators", value: nonMigrationString, inline: false});
    	interaction.editReply({embeds: [embed]});
    }
  },
};
