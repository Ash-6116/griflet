function mirror(textString, message) {
  // Echoes strings to both a reply on Discord and the console log one after the other.
  //console.log(textString);
  let chunkedOutput = textString.match(/[\s\S]{1,1750}/g); // Splits output into character chunks equal to 1750 in size or smaller. // NEED TO REPLACE THIS WITH A METHOD THAT SPLITS ON NEWLINE CLOSEST TO 1750
  chunkedOutput.forEach(chunk => {
    message.reply(chunk, message); // sends chunks as a reply to existing message // commented out during debug only
    //message.channel.send(textString); // sends output as unique message
    console.log(chunk);
  });
  //console.log(typeof allowedLength);
  return;
}

function arrayMirror(array, message) {
  let outputString = "";
  array.forEach(element => {
    if (outputString.length > 1650) {
      mirror(outputString, message);
      outputString = "";
    }
    outputString += element;
  });
  mirror(outputString, message); // to catch the last few elements that did not get sent to mirror
  return;
}

function help() {
  console.log("Griflet commands:");
  console.log("!categories\n\tList out the last message times and authors.");
  console.log("!downtime\n\tRun the Downtime routine for Castle In The Mist Discord server.");
  console.log("!ping\n\tRun the ping command.");
  return;
}

module.exports = {help, mirror, arrayMirror}
