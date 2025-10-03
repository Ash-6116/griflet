const { SlashCommandBuilder, EmbedBuilder } = require('discord.js'),
  roleTest = require('../../shared_classes/roleTest.js'),
  outputStyle = process.env.outputStyle;

function removeRole(roles, roleToRemove, user) {
	let roleToRemoveId = -1;
	if (roleToRemove.includes("&")) {
		roleToRemoveId = roleToRemove.replace("<&", "").replace(">", "");
	} else {
		// Received a string, need to see if it is in the roles first and retrieve the ID of any matches
		const potentialRemoval = roles.filter(role => role.name === roleToRemove);
		if (potentialRemoval.size == 1) {
			potentialRemoval.forEach(removal => {
				roleToRemoveId = removal.id;
			});
		}
	}
	if (roles.has(roleToRemoveId)) {
		roles.get(roleToRemoveId).delete("Deleted by Griflet as per request from " + user);
		return true;
	}
	return false;
}

function removeCategoryChannels(guildChannels, categoryId, user) {
	const channelsToRemove = guildChannels.filter(channel => channel.parentId === categoryId);
	if (channelsToRemove.size > 0) {
		channelsToRemove.forEach(channel => {
			channel.delete("Deleted by Griflet as per request from " + user);
		});
	}
	return;	
}

function removeCategory(guildChannels, categoryToRemove, user) {
	const toRemove = guildChannels.filter(channel => channel.name === categoryToRemove);
	if (toRemove.size == 1) {
		toRemove.forEach(removal => {
			removeCategoryChannels(guildChannels, removal.id, user);
			guildChannels.get(removal.id).delete("Deleted by Griflet as per request from " + user);
		});
		return true;
	}
	return false;
}

async function removal(interaction) {
  	const game = interaction.options.getString('category'),
    	  role = interaction.options.getString('role');
  	// REMOVE THE ROLE FIRST, FOLLOWED BY ALL CHILD CHANNELS OF THE CATEGORY, FOLLOWED BY THE CATEGORY ITSELF
  	const roleResult = removeRole(await interaction.guild.roles.fetch(), role, interaction.user.username);
  	const categoryResult = removeCategory(await interaction.guild.channels.fetch(), game, interaction.user.username);
	// Need to provide feedback on what was done);
	let feedback = "";
	if (roleResult) {
		feedback += "- " + role + " removed successfully\n";
	} else {
		feedback += "- " + role + " was not removed, either it did not exist, or there were too many matching roles\n";
	}
	if (categoryResult) {
		feedback += "- " + game + " removed successfully\n";
	} else {
		feedback += "- " + game + " was not removed, either it did not exist, or there were too many matching categories\n";
	}
	const embed = new EmbedBuilder()
                        .setTitle("Result of category removal")
			.setDescription(feedback);
	interaction.editReply({ embeds: [embed]});
  	return;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('remove_game')
    .setDescription('Remove a game from the server')
    .addStringOption(option => 
      option.setName('category')
        .setDescription('The game to remove')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('role')
        .setDescription('The role to remove')
        .setRequired(true)),
  async execute(interaction) {
    if (roleTest.roleTest(interaction)) {
      await interaction.deferReply();
      removal(interaction);
    } else {
      roleTest.warnRole(interaction, "downtime_spending"); // need to adjust this later
    }
  }
};
