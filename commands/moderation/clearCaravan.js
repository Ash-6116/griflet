const { SlashCommandBuilder, EmbedBuilder } = require('discord.js'),
	roleTest = require('../../shared_classes/roleTest.js'),
	outputStyle = process.env.outputStyle;

function determineRole(caravan) {
	let role = "";
	if (caravan.includes("quest-caravan-")) { // received a string
		role += caravan.replace("quest-caravan-", "");		
	} else {
		role = null;
	}
	return role;
}

function determineCaravanName(caravanName, channels) {
	if (caravanName.includes("#")) { // need to change this from a ping to a text field
		const results = channels.filter(channel => channel.id === caravanName.replace("<#", "").replace(">", ""));
		results.forEach(result => {
			caravanName = result.name;
		});
	}
	return caravanName;
}

async function clearPinsAndMark(caravan) {
	// want to remove all pins from both of the channels of the caravan, and then post ``` ``` to both channels
	for (c = 0; c < caravan.length; c++) {
		const caravanChannels = caravan[c],
			channelArray = Array.from(caravanChannels.keys());
		// TODO - fetch messages from ic caravan (index 0) and put in a google doc
		for (k = 0; k < channelArray.length; k++) {
			const channel = caravanChannels.get(channelArray[k]),
				pins = await channel.messages.fetchPins();
			pins.items.forEach(item => {
				item.message.unpin().catch(console.error);
			});
			channel.send("``` ```");
		}
	}
	return "cleared pins and marked last post";
}

function clearRole(role, members) {
	const roleArray = Array.from(role.keys());
	for (r = 0; r < roleArray.length; r++) { // roleArray[r] will be a role.id
		const roleObject = role.get(roleArray[r]);
		roleObject.members.forEach(member => {
			member.roles.remove(roleObject);			
		});
	}
	return "cleared role";
}

async function clearCaravan(interaction) {
	const channels = await interaction.guild.channels.fetch(),
		roles = await interaction.guild.roles.fetch(),
		members = await interaction.guild.members.fetch(),
		caravanName = interaction.options.getString('caravan'),
		caravanString = determineCaravanName(caravanName, channels), // makes sure that if a ping is sent, it is converted to a string
		roleName = determineRole(caravanString, roles); // need to change this to a filter for guild.roles!!!
	let feedback = caravanName + "\n";
	if (roleName != null) { // using this as an error check since determineRole already checked caravanName
		const caravan = [channels.filter(channel => channel.name === caravanString), channels.filter(channel => channel.name === "qc" + roleName + "-ooc")],
			role = roles.filter(role => role.name === "QC-" + roleName); // convert role.name to uppercase at all times for consistency???
			feedback += "- " + await clearPinsAndMark(caravan) + "\n";
			// TODO - go on Guild Roster and remove any reference to the caravan being cleared by overwriting cells
			feedback += "- " + clearRole(role, members) + "\n";
	} else {
		feedback += "Oops, something went wrong, was a valid caravan specified?";	
	}
	/**
	 *	1st - remove the caravan's ROLE from anyone who has it (for instance, quest-caravan-1 will have the role qc-1)
	 *	remember to test that the hash tag was not used because if it was, we'll need to retrieve the caravan number with a filter lookup
	 *	2nd - mark both ic and ooc channels with a line ``` ```
	 *	3rd - remove reactions to the quest IF those reactions were left by players who have just been cleared - SO RETAIN THEIR FUCKING IDS
	 *	4th - create a gdoc of the quest, archiving from the pinned post to the most recent post in ic- TO DO IN FUTURE UPDATE!!!
	 *	5th - remove all pins in both ooc and ic
	**/
	const embed = new EmbedBuilder()
                        .setTitle("Result of Caravan Clearance")
			.setDescription(feedback);
	interaction.editReply({ embeds: [embed]});
  	return;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clear_caravan')
    .setDescription('Clear a caravan from Castle In The Mist server')
    .addStringOption(option => 
      option.setName('caravan')
        .setDescription('The caravan to clear')
        .setRequired(true)),
  async execute(interaction) {
    if (roleTest.roleTest(interaction)) {
      await interaction.deferReply();
      clearCaravan(interaction);
    } else {
      roleTest.warnRole(interaction, "clear_caravan");
    }
  }
};
