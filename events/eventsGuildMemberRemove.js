const { Events, EmbedBuilder } = require('discord.js');
const { getAllSpreadsheetValues } = require('../commands/moderation/downtimeSpend.js');
const { misted, processOutput } = require('../commands/moderation/misted.js');

module.exports = {
	name: Events.GuildMemberRemove,
	async execute(member) {
		const embed = new EmbedBuilder()
			.setTitle(member.user.username + " has left the server!")
		const channels = await member.guild.channels.fetch();
		console.log(member.user.username + " has left the server!");
		console.log(member);
		const result_of_checks = await misted(member.user.username, channels.filter(channel => channel.name === "roster"));
		embed.setDescription(processOutput(result_of_checks));
		embed.setThumbnail(member.user.displayAvatarURL());
		//channels.find(channel => channel.name === "bot-stuff").send("**__" + member.user.username + " has left the server:__**\n" + processOutput(result_of_checks));
		channels.find(channel => channel.name === "bot-stuff").send({ embeds: [embed] });
		// 29/7/24 - Write the user's name into a file to be retrieved on Sunday during downtime
		fs.appendFile("leavers.txt", member.user.username, (err) => {
			if (err) {
				console.log(err);
			} else {
				console.log("Log File Updated");
			}
		});
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
3  			avatarDecoration: null
		}
		**/
		// the above is identical to a live user from message.author
	}
};
