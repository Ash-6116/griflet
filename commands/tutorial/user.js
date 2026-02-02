const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const outputStyle = process.env.outputStyle;

async function produceOutput(interaction) {
	if (outputStyle == "Legacy") {
		await interaction.reply(`This command was run by ${interaction.user.username}, who joined on ${interaction.member.joinedAt}.`);
	} else if (outputStyle == "Embed") {
		const Embed = new EmbedBuilder()
			.setTitle('User Data')
			.setThumbnail(interaction.user.displayAvatarURL())
			.addFields({name: "user", value: interaction.user.username, inline: true})
			.addFields({name: "nickname", value: interaction.user.globalName, inline: true})
			.setFooter({ text: `Joined: ${interaction.member.joinedAt}` });
		interaction.reply({embeds: [Embed] });
	} else {
		console.log("Improper output style selected, must be either Legacy or Embed!!!");
	}
	return;
}

module.exports = {
	data: new SlashCommandBuilder()
		.setName('user')
		.setDescription('Provides information about the user.'),
	async execute(interaction) {
		// interaction.user is the object representing the User who ran the command
		// interaction.member is the GuildMember object, which represents the user in the specific guild
		//await interaction.reply(`This command was run by ${interaction.user.username}, who joined on ${interaction.member.joinedAt}.`);
		produceOutput(interaction);
		console.log("Ran user data command");
	},
};
