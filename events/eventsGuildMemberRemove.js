const { Events } = require('discord.js');
const { getAllSpreadsheetValues } = require('../commands/moderation/downtimeSpend.js');
const { find_member, processOutput } = require('../commands/moderation/misted.js');

async function checkRosters(user) {
	const searchActive = await find_member(await getAllSpreadsheetValues(process.env.spreadsheetId, "Roster"), user.username);
	const searchInactive = await find_member(await getAllSpreadsheetValues(process.env.spreadsheetId, "Inactive"), user.username);
	return [false, searchActive, searchInactive];
}

module.exports = {
	name: Events.GuildMemberRemove,
	async execute(member) {
		console.log("Member has left the server:");
		console.log(member);
		const result_of_checks = await checkRosters(member);
		console.log(processOutput(result_of_checks));
		member.guild.channels.cache.get("457628737421180928").send(processOutput(result_of_checks));
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
	},
};
