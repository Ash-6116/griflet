const { Events, EmbedBuilder } = require('discord.js'),
	crossed_swords = '⚔️', bow_and_arrows = '🏹',
	fs = require('fs'),
	downtime = require("../commands/moderation/downtime.js");
/**
 * Wish to use this module to run automated checks on reactions going to quest-board
**/

async function deleteReaction(message, reaction, user) { // could reuse this as part of the eventsGuildMemberRemove event
	const messageReactions = await message.reactions;
	if (messageReactions != undefined) {
		const messageResolved = await messageReactions.resolve(reaction);
		try {
			await messageResolved.users.remove(user.id);
			console.log("Reaction removed successfully");
		} catch (error) {
			console.errpr("Something prevented reaction from being removed successfully");
			console.error(error);
		}
	}
	return;
}

function warnUser(channel, user, warning) { // warning needs to be an ARRAY of TITLE and DESCRIPTION
	const warnEmbed = new EmbedBuilder()
		.setTitle(warning[0])
		.setDescription(warning[1]);
	channel.send({ content: "<@" + user.id + ">", embeds: [warnEmbed] });
	return;
}

async function errorChecking(reaction, user, strings) {
	const guildChannels = await reaction.message.guild.channels.fetch(),
		guildRoles = await reaction.message.guild.roles.fetch(),
		alerts = strings.reaction_alerts;
		warningChannel = guildChannels.get(Array.from(guildChannels.filter(channel => channel.name === "viewing-area").keys())[0]);
	if (guildChannels.get(reaction.message.channelId).name === "quest-board") {
		let questMessage = await guildChannels.get(reaction.message.channelId).messages.fetch(reaction.message.id);
		let questMessageArray = questMessage.content.split("\n");
		if (questMessageArray[0] === "---") {
			questMessage.splice(0, 1);
		}
		const quest_name = questMessageArray[0].replace(/\*/g, ""),
			quest_party_size = questMessageArray.filter(string => string.includes("Party"))[0].split(":")[1].replace(/\s/g, '').replace(/\*/g, '');
		switch (true) {
			case (quest_party_size.includes("?")):
				// Event quest, ignore size restraint
				break;
		// 1 - check if it is a valid reaction (crossed_swords or bow_and_arrows), if it isn't, Griflet should warn the user in viewing-area
			case (!(reaction._emoji.name == crossed_swords || reaction._emoji.name == bow_and_arrows)) :
				//warnUser(warningChannel, user, ["Incorrect Reaction", "Hi, just to let you know that on quest-board, the only valid reaction for most Blades members is the crossed_swords (" + crossed_swords + ") emoji.\n\nAs your reaction to " + quest_name + " was not crossed_swords, I have deleted the incorrect reaction.\n\nIf you would like to sign up to this quest, please repost a reaction to its post in quest-board using the crossed_swords emoji.  Thanks."]);
				warnUser(warningChannel, user, [alerts.invalid.title + ": " + quest_name, alerts.invalid.description]);
				deleteReaction(questMessage, reaction, user);
				break;
			// 5th reaction
			case (reaction.count > Number(quest_party_size)):
				//warnUser(warningChannel, user, ["Caravan already full", "Hi, just to let you know that " + quest_name + " is already filled and is either running or awaiting a DM.  Each caravan can have **four** players.  However, we rerun quests frequently, so you don't need to worry about missing out."]);
				warnUser(warningChannel, user, [alerts.full.title + ": " + quest_name, alerts.full.description]);
				deleteReaction(questMessage, reaction, user);
			default:
				// get the questBoard and runningCaravans
				console.log("Getting questBoard, this might take a while...");
				let questBoard = await downtime.gatherQuestBoard(reaction.message);
				await downtime.gatherRunningCaravans(guildChannels.filter(channel => channel.name === "Quest Caravans"), questBoard);
				downtime.checkUniqueReactions(questBoard);
				downtime.checkArrowIsOnlyOnRunning(questBoard);
				const questFromBoard = questBoard.find(quest => quest.name === quest_name);
				console.log("Finished gathering, starting checks...");
				switch (true) {
					case (questFromBoard.hasOwnProperty("error")) :
						console.log("Detected that quest" + quest_name + " has a detected error");
						if (questFromBoard.error.has("duplicatedReaction")) {
							if (questFromBoard.error.get("duplicatedReaction").join().includes(user.username)) {
								// user left reactions on other quests
								let duplicateLog = questFromBoard.error.get("duplicatedReaction").filter(error => error.includes(user.username));
								for (let e = 0; e < duplicateLog.length; e++) {
									duplicateLog[e] = "- " + duplicateLog[e].split(quest_name + " and ")[1];
								}
								console.log("Duplicate error detected, warning user...");
								let condonable = false; // used to prevent Event quests triggering
								duplicateLog.forEach(duplicate => {
									const title = duplicate.split("- ")[1];
									const match = questBoard.filter(quest => quest.name === title)[0];
									if (match != undefined) {
										if (match.tier === "???") {
											condonable = true;
											console.log("Duplicate is an event quest, ignore");
										}
									}
								});
								if (!condonable) {
									warnUser(warningChannel, user, [alerts.duplicates.title + ": " + quest_name, alerts.duplicates.description + "\n\n__**Duplicated Quest Reactions:**__\n- " + quest_name + "\n" + duplicateLog.join("\n")]);
									console.log("Attempting removal of duplicate reaction");
									deleteReaction(questMessage, reaction, user);
								}
							}
						}
						if (questFromBoard.error.has('arrowsOnNotRunning')) {
							console.log("Detected Arrow on non-running quest " + quest_name + ", taking corrective action.");
							// User left an arrows reaction on a quest that isn't running, remove it
							if (questFromBoard.error.get('arrowsOnNotRunning').has(user.id)) {
								warnUser(warningChannel, user, [alerts.arrow.title + ": " + quest_name, alerts.arrow.description]);
								deleteReaction(questMessage, reaction, user);
							}
						}
						break;
					case (questFromBoard.hasOwnProperty("caravan")) :
						warnUser(warningChannel, user, [alerts.already_running.title + ": " + quest_name, alerts.already_running.description ]);
						deleteReaction(questMessage, reaction, user);
						break;
					// 3 - check if the caravan has just filled and needs to have a vassals ping
					case (questFromBoard.hasOwnProperty("waiting")) :
						if (questFromBoard.waiting === "Vassals") {
							downtime.vassals(questBoard.filter(quest => quest.waiting === "Vassals"), guildRoles, guildChannels, strings);
							break;
						}
					default:
						break;
				}
				break;
		}
	}
	return;
}

module.exports = {
	name: Events.MessageReactionAdd,
	async execute(reaction, user) {
		let strings = "";
		if (fs.existsSync('strings.txt')) {
			strings = JSON.parse(fs.readFileSync('strings.txt', 'utf8'));
		}
		errorChecking(reaction, user, strings);
	},
};
