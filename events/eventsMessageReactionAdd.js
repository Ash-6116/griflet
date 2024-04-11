const { Events, EmbedBuilder } = require('discord.js');
const crossed_swords = '⚔️', bow_and_arrows = '🏹';

/**
 * Wish to use this module to run automated checks on reactions going to quest-board
**/

function deleteReaction(reaction, user) { // could reuse this as part of the eventsGuildMemberRemove event
	reaction.users.remove(user.id);
	return;
}

function warnUser(channel, user, warning) { // warning needs to be an ARRAY of TITLE and DESCRIPTION
	const warnEmbed = new EmbedBuilder()
		.setTitle(warning[0])
		.setDescription(warning[1]);
	channel.send({ content: "<@" + user.id + ">", embeds: [warnEmbed] });
	return;
}

async function errorChecking(reaction, user) {
	const guildChannels = await reaction.message.guild.channels.fetch(),
		warningChannel = guildChannels.get(Array.from(guildChannels.filter(channel => channel.name === "viewing-area").keys())[0]);
	if (guildChannels.get(reaction.message.channelId).name === "quest-board") {
		// 1 - check if it is a valid reaction (crossed_swords or bow_and_arrows), if it isn't, Griflet should warn the user in viewing-area
		if (!(reaction._emoji.name == crossed_swords || reaction._emoji.name == bow_and_arrows)) {
			warnUser(warningChannel, user, ["Incorrect Reaction", "Hi, just to let you know that on quest-board, the only valid reaction for most Blades members is the crossed_swords (" + crossed_swords + ") emoji.\n\nAs your reaction to quest was not crossed_swords, I have deleted the incorrect reaction.\n\nIf you would like to sign up to this quest, please repost a reaction to its post in quest-board using the crossed_swords emoji.  Thanks."]);
			deleteReaction(reaction, user);
		}
		// 1a - check to see if the user has left any reactions to other caravans - they can only have 1 reaction to a quest at a time
		// 2 - check if the caravan is already full
			// warn user, delete reaction
		// 3 - check if the caravan has just filled and needs to have a vassals ping
		// 4 - check if the caravan isn't full but is currently running
			// advise user, do not delete reaction
	}
	return;
}

module.exports = {
	name: Events.MessageReactionAdd,
	async execute(reaction, user) {
		errorChecking(reaction, user);
	},
};
