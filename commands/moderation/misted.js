const { SlashCommandBuilder, EmbedBuilder } = require('discord.js'),
	roleTest = require('../../shared_classes/roleTest.js'),
	{ getAllSpreadsheetValues } = require('./downtimeSpend.js');

async function roster_check(roster, misted_user) {
	const roster_messages = await Array.from(roster.values())[0].messages.fetch();
	if (roster_messages.filter(message => message.author.username == misted_user).size > 0) {
		return true;
	}
	return false;
}

async function find_member(dataset, misted_user) {
	let matches = [];
	await dataset.forEach(entry => {
		if (entry.length > 0 && entry[0].toUpperCase().includes("@" + misted_user.toUpperCase())) {
			matches.push(entry);
		}
	});
	return matches;
}

async function misted(misted_user, roster) {
	// First, check the roster to see if they have a sheet in progress
	const result_from_roster = await roster_check(roster, misted_user);
	// Second, check the Guild Roster | Active tab
	const searchActive = await find_member(await getAllSpreadsheetValues(process.env.spreadsheetId, "Roster"), misted_user);
	// Third, check the Guild Roster | Inactive tab
	const searchInactive = await find_member(await getAllSpreadsheetValues(process.env.spreadsheetId, "Inactive"), misted_user);
	// Fourth, check the quest-board for any reactions from the user
	// TODO
	return [result_from_roster, searchActive, searchInactive];
}

function processOutput(misted_returned) {
	// expecting a three item array, first being a boolean, then second and third being row data from the Roster and Inactive sheets in the Guild Roster
	let outputString = "";
	if (misted_returned[0]) {
		outputString += "-  User left a message in roster\n";
	} else {
		outputString += "-  User has not left a message in roster\n";
	}
	if (misted_returned[1].length > 0) {
		outputString += "-  User has the following Blade(s) on the Active roster:\n";
		misted_returned[1].forEach(blade => {
			outputString += "     " +  blade[2];
			if (blade[13] != "") { // checking status in case they were on a quest
				outputString += ", they were on the quest: " + blade[13];
			}
			outputString += "\n";
		});
	}
	if (misted_returned[2].length > 0) {
		outputString += "-  User has the following Blade(s) on the Inactive roster:\n";
		misted_returned[2].forEach(blade => {
			outputString += "    " + blade[2] + "\n";
		});
	}
	return outputString;
}

module.exports = {
	data: new SlashCommandBuilder()
		.setName('misted')
		.setDescription('runs a check for a recently departed member in case they are part of the Blades of Obsidian')
		.addStringOption(option =>
			option.setName('user')
				.setDescription('The user that has left')
				.setRequired(true)),
	async execute(interaction) {
		if (roleTest.roleTest(interaction)) {
			await interaction.deferReply();
			const outputEmbed = new EmbedBuilder()
				.setTitle("Result of check on " + interaction.options.getString('user'))
			const channels = await interaction.guild.channels.fetch();
			const result_of_checks = await misted(interaction.options.getString('user'), channels.filter(channel => channel.name === "roster"));
			outputEmbed.setDescription(processOutput(result_of_checks));
			interaction.editReply({ embeds: [outputEmbed] });
			//interaction.editReply("__**Result of check on " + interaction.options.getString('user') + "**__\n" + processOutput(result_of_checks));
		} else {
			roleTest.warnRole(interaction, "misted");
		}
	}, misted, processOutput, find_member
};
