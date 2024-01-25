async function restOfOutput(array, interaction) {
  for (let i=1; i < array.length; i++) {
    await interaction.followUp(array[i]);
    console.log(array[i]);
  }
  return;
}

function specificMirror(textArray, channel) {
  textArray.forEach(unit => {
    channel.send(unit);
  });
  return;
}

async function mirror(textArray, interaction) {
  /**
   * receives an array of text that needs to be sent to an interaction.
   *
   * The FIRST element of the array needs to use interaction.editReply
   * All FOLLOWING elements of the array need to use interaction.followUp
   * they also need to be sent to console.log!
  **/
  /**
  await interaction.reply(textArray[0]).catch(err => {
    interaction.editReply(textArray[0]);
    /**
     * send a reply to an interaction or if that interaction has already had a reply
     * edit the reply instead
  }).then(reply => {
    console.log("Finished posting first message");
  });
  **/
  for (let i=0; i < textArray.length; i++) {
    await interaction.followUp(textArray[i]);
    console.log(textArray[i]);
  }
  return;
}

module.exports = {mirror, specificMirror}
