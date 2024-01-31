const { Events } = require('discord.js');
const { getAllSpreadsheetValues } = require('../commands/moderation/downtimeSpend.js');
const { misted, processOutput } = require('../commands/moderation/misted.js');

async function checkRosters(user) {
	const searchActive = await find_member(await getAllSpreadsheetValues(process.env.spreadsheetId, "Roster"), user.username);
	const searchInactive = await find_member(await getAllSpreadsheetValues(process.env.spreadsheetId, "Inactive"), user.username);
	return [false, searchActive, searchInactive];
}

module.exports = {
	name: Events.GuildMemberRemove,
	async execute(member) {
		const channels = await member.guild.channels.fetch();
		console.log("Member has left the server:");
		console.log(member);
		const result_of_checks = await misted(member.user.username, channels.filter(channel => channel.name === "roster"));
		console.log(processOutput(result_of_checks));
		channels.find(channel => channel.name === "bot-stuff").send(processOutput(result_of_checks));
		// member.guild.channels should exist in member object for those leaving the server
		/**
		User {
  			id: '472786958045675540',
  			bot: false,
  			system: false,
  			flags: UserFlagsBitField { bitfield: 0 },
  			username: 'undoingprune',
  			globalName: 'Rob',
  			discriminator: '0',
  			avatar: 'bc6457686e008c1b38a5818450212369',
 			banner: undefined,
			accentColor: undefined,
  			avatarDecoration: null
		}
		**/
		// the above is identical to a live user from message.author
	}, checkRosters
};
