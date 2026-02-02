const { EmbedBuilder } = require('discord.js'),
	outputStyle = process.env.outputStyle;

async function restOfOutput(array, interaction) {
	for (let i=1; i < array.length; i++) {
		await interaction.followUp(array[i]);
		console.log(array[i]);
	}
	return;
}

function specificMirror(textArray, channel, Embed) {
	if (outputStyle === "Legacy") {
  		textArray.forEach(unit => {
    			channel.send(unit);
  		});
  	} else if (outputStyle === "Embed") {
  		if (textArray != undefined && Embed != undefined) {
  			channel.send({ content: textArray[0], embed: Embed});
  		} else if (textArray != undefined && Embed == undefined) {
  			channel.send(textArray[0]);
  		} else if (textArray == undefined && Embed != undefined) {
  			channel.send({embed: Embed});
  		}
  	} else {
  		console.log("Invalid Output Style selected, Output Style must be set to either Legacy or Embed.");
  	}
  return;
}

function outputEmbed(title, content, channel, image) {
	const outputEmbeddable = new EmbedBuilder()
		.setTitle(title)
		.setDescription(content)
	channel.send({ embeds: [outputEmbeddable] });
	return;
}

async function mirror(textArray, interaction, Embed) {
  /**
   * receives an array of text that needs to be sent to an interaction.
   *
   * The FIRST element of the array needs to use interaction.editReply
   * All FOLLOWING elements of the array need to use interaction.followUp
   * they also need to be sent to console.log!
  **/
  if (outputStyle == "Legacy") {
  	for (let i=0; i < textArray.length; i++) {
    		await interaction.followUp(textArray[i]);
    		console.log(textArray[i]);
  	}
  } else if (outputStyle == "Embed") {
  	if (textArray != undefined && Embed != undefined) {
  		await interaction.followUp({ content: textArray[0], embeds: Embed});
  		console.log(textArray[0]);
  		console.log(Embed);
  	} else if (textArray != undefined && Embed == undefined) {
  		for (let i=0; i < textArray.length; i++) {
  			await interaction.followUp(textArray[i]);
  			console.log(textArray[i]);
  		}
  	} else if (textArray == undefined && Embed != undefined) {
  		console.log("sending only an Embed");
  		await interaction.followUp({ embeds: Embed});
  		console.log(Embed);
	}
  } else {
  	console.log("Invalid Output Style selected, Output Style must be set to either Legacy or Embed.");
  }
  return;
}

module.exports = {mirror, specificMirror, outputEmbed}
