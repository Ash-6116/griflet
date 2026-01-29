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

async function misted(misted_user, roster, questBoard) {
	let outputMap = new Map();
	outputMap.set("roster", await roster_check(roster, misted_user)); // First, check the roster to see if they have a sheet in progress
	outputMap.set("active", await find_member(await getAllSpreadsheetValues(process.env.spreadsheetId, "Roster"), misted_user)); // Second, check the Guild Roster | Active tab
	outputMap.set("inactive", await find_member(await getAllSpreadsheetValues(process.env.spreadsheetId, "Inactive"), misted_user)); // Third, check the Guild Roster | Inactive tab
	// Fourth, check the quest-board for any reactions from the user
	if (questBoard == undefined) {
		return outputMap; // this is an emergency escape in case quest-boards wasn't passed in, processOutput will be able to continue without the reactions this way
	}
	const questKey = Array.from(questBoard.keys());
	let reacted = []
	for (k = 0; k < questKey.length; k++) {
		const quests = await questBoard.get(questKey[k]).messages.fetch(),
			questsID = Array.from(quests.keys());
		for (q = 0; q < questsID.length; q++) {
			const reactions = quests.get(questsID[q]).reactions.cache;
			if (reactions.size > 0) { // really only care about these as they have reactions data
				const reactionsKeys = Array.from(reactions.keys());
				for (r = 0; r < reactionsKeys.length; r++) {
					let reaction = reactions.get(reactionsKeys[r]),
						users = await reaction.users.fetch(); // if this contains our misted_user, then we want to flash it!!!
					users.forEach(user => { // don't need a for loop as we're not awaiting data ;)
						if (user.username === misted_user) {
							reacted.push(quests.get(questsID[q]).content.replace('-\n', '').replace(/\-/g,'').split('\n')[0]); // this nonsense gets just the title from the message.content
						}
					});
				}
			}
		}
	}
	outputMap.set("reactions", reacted);
	return outputMap;
}

function processOutput(misted_returned) { // expecting a map, with a roster boolean, active and inactive roster fetches, and a reactions arra
	let outputString = "";
	if (misted_returned.has("roster")) { // misted_returned should ALWAYS have this, but an error check hurts nobody
		if (misted_returned.get("roster")) { // this works as result_from_roster is a boolean
			outputString += "- User left a message in roster\n";
		} else {
			outputString += "- User has not left a message in roster\n";
		}
	}
	if (misted_returned.has("active")) {
		if (misted_returned.get("active").length > 0) {
			outputString += "- User has the following Blade(s) on the Active roster:\n";
			misted_returned.get("active").forEach(blade => {
				outputString += "     " + blade[2];
				if (blade[13] != "") { // checking status in case they were on a quest
					outputString += ", they were on the quest: " + blade[13];
				}
				outputString += "\n";
			});
		}
	}
	if (misted_returned.has("inactive")) {
		if (misted_returned.get("inactive").length > 0) {
			outputString += "- User has the following Blade(s) on the Inactive roster:\n";
			misted_returned.get("inactive").forEach(blade => {
				outputString += "     " + blade[2] + "\n";
			});
		}
	}
	if (misted_returned.has("reactions")) {
		if (misted_returned.get("reactions").length > 0) {
			outputString += "- User has left the following reactions in quest-board:\n";
			misted_returned.get("reactions").forEach(reaction => {
				outputString += "     " + reaction + "\n";
			});
		}
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
			const result_of_checks = await misted(interaction.options.getString('user'), channels.filter(channel => channel.name === "roster"), channels.filter(channel => channel.name === "quest-board"));
			outputEmbed.setDescription(processOutput(result_of_checks));
			interaction.editReply({ embeds: [outputEmbed] });
			//interaction.editReply("__**Result of check on " + interaction.options.getString('user') + "**__\n" + processOutput(result_of_checks));
		} else {
			roleTest.warnRole(interaction, "misted");
		}
	}, misted, processOutput, find_member
};
