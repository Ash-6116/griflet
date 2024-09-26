const { Events, EmbedBuilder } = require('discord.js'),
	crossed_swords = '⚔️', bow_and_arrows = '🏹',
	fs = require('fs'),
	downtime = require("../commands/moderation/downtime.js");
/**
 * Wish to use this module to run automated checks on reactions going to quest-board
**/

async function deleteReaction(message, reaction, user) { // could reuse this as part of the eventsGuildMemberRemove event
	const messageResolved = await message.reactions.resolve(reaction);
	await messageResolved.remove(user.id);
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
		const questMessage = await guildChannels.get(reaction.message.channelId).messages.fetch(reaction.message.id),
			quest_name = questMessage.content.split("\n")[0];
		switch (true) {
		// 1 - check if it is a valid reaction (crossed_swords or bow_and_arrows), if it isn't, Griflet should warn the user in viewing-area
			case (!(reaction._emoji.name == crossed_swords || reaction._emoji.name == bow_and_arrows)) :
				//warnUser(warningChannel, user, ["Incorrect Reaction", "Hi, just to let you know that on quest-board, the only valid reaction for most Blades members is the crossed_swords (" + crossed_swords + ") emoji.\n\nAs your reaction to " + quest_name + " was not crossed_swords, I have deleted the incorrect reaction.\n\nIf you would like to sign up to this quest, please repost a reaction to its post in quest-board using the crossed_swords emoji.  Thanks."]);
				warnUser(warningChannel, user, [alerts.invalid.title + ": " + quest_name, alerts.invalid.description]);
				deleteReaction(questMessage, reaction, user);
				break;
			// 5th reaction
			case (reaction.count > 4):
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
						if (questFromBoard.error.has("duplicatedReaction")) {
							if (questFromBoard.error.get("duplicatedReaction").join().includes(user.username)) {
								// user left reactions elsewhere, remove this one!!!
								//warnUser(warningChannel, user, ["Reaction On Multiple Quests", "Hi there, as a general rule of Blades, players can only leave their reaction on *__one__* quest at a time.  I have detected that you left more than one reaction, so your reaction to " + quest_name + " has been removed."]);
								warnUser(warningChannel, user, [alerts.duplicates.title + ": " + quest_name, alerts.duplicates.description]);
								deleteReaction(questMessage, reaction, user);
							}
						}
						if (questFromBoard.error.has('arrowsOnNotRunning')) {
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
