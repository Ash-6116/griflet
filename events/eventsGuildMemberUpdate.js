const { Events, EmbedBuilder } = require('discord.js');

module.exports = {
	name: Events.GuildMemberUpdate,
	async execute(oldMember, newMember) {
		console.log("Member has been updated...");
		console.log(newMember);
		if (oldMember.pending && !newMember.pending) {
			const channels = await newMember.guild.channels.fetch(),
				embed = new EmbedBuilder()
					.setTitle(newMember.user.username + " has accepted the server rules!")
					.setImage(newMember.user.displayAvatarURL())
					.addFields({name: "username", value: newMember.user.username, inline: false});
			if (member.user.hasOwnProperty('globalName')) {
				embed.addFields({name: "nickname", value: newMember.user.globalName, inline: false});
			}
			channels.find(channel => channel.name === "bot-stuff").send({ embeds: [embed] });
		}
	}
}
