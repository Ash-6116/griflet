const { SlashCommandBuilder, EmbedBuilder } = require('discord.js'),
	wait = require('node:timers/promises').setTimeout,
	outputStyle = process.env.outputStyle;

async function produceOutput(outputString, interaction) {
	if (outputStyle == "Legacy") {
		await interaction.editReply(outputString);
	} else if (outputStyle == "Embed") {
		const Embed = new EmbedBuilder()
			.setTitle('Ping Tutorial')
			.setDescription("a module made by following Discord's ping tutorial")
			.setThumbnail(interaction.user.displayAvatarURL()) // will insert image alongside title and description
			.addFields({name: "output", value: outputString, inline: false})
			.setImage(interaction.user.displayAvatarURL()); // will insert the user's image into the Embed
		interaction.editReply({ embeds: [Embed] });
	} else {
		console.log("Improper output style selected, must be either Legacy or Embed!!!");
	}
	return;
}

module.exports = {
	cooldown: 10,
	data: new SlashCommandBuilder()
		.setName('ping')
		.setDescription('Replies with Pong!'),
	async execute(interaction) {
		if (interaction.deferred == false) {
			await interaction.deferReply(); // used to reply to a longer command, ie categories
			console.log("Ping command reacting to " + interaction.user.username + " in " + interaction.member.guild.name);
			await wait(4000);
			await produceOutput('Pong!', interaction); // alters the deferReply to a result
			await wait(5000);
			await produceOutput('Pong again!', interaction);
			await wait(3000);
			await produceOutput('Pong one more time!', interaction)
		} else {
			console.log("Interaction deferred by another instance");
		}
	},
};
