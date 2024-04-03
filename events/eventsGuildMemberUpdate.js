const { Events, EmbedBuilder } = require('discord.js');

module.exports = {
	name: Events.GuildMemberUpdate,
	async execute(member) {
		console.log("Member has been updated...");
		console.log(member);
		if (member.pending != false) {
			const channels = await member.guild.channels.fetch(),
				embed = new EmbedBuilder()
					.setTitle(member.user.username + " has accepted the server rules!")
					.setImage(member.user.displayAvatarURL())
					.addFields({name: "username", value: member.user.username, inline: false});
			if (member.user.has(globalName)) {
				embed.addFields({name: "nickname", value: member.user.globalName, inline: false});
			}
			channels.find(channel => channel.name === "bot-stuff").send({ embeds: [embed] });
		}
	}
}
