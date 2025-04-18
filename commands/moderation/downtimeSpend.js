const { SlashCommandBuilder, EmbedBuilder } = require('discord.js'),
  roleTest = require('../../shared_classes/roleTest.js'),
  { prompter } = require('../../shared_classes/prompter.js'),
  outputStyle = process.env.outputStyle,
  { getAuthToken, getSpreadsheet, getSpreadsheetValues, writeSpreadsheetValues } = require('../../shared_classes/googleSheetsService.js');

function calculateGains(reward, notes, blade, interaction) {
  console.log(notes);
  let downtimeRolls = notes.split('[')[1].split(']')[0].split(", ");
  console.log(downtimeRolls);
  let gain = 0, GOLD = 0, REP = 0;
  if (blade[0][10] == 0) {
    console.log("This Blade has no downtime available to spend.  Spending cannot continue.");
    return null;
  }
  if (parseInt(blade[0][10]) < downtimeRolls.length) {
    const overspend = downtimeRolls.length - blade[0][10];
    interaction.editReply(blade[0][2] + " has overspent their downtime by " + overspend + " weeks, their ledger output will be adjusted to remove the overspent weeks...");
    downtimeRolls = downtimeRolls.slice(0, blade[0][10]);
  }
  switch (reward.toUpperCase()) {
    case ('REP'):
      console.log("Rep requested");
      const rep = [0, 1, 2];
      console.log("Total spend: " + downtimeRolls.length);
      downtimeRolls.forEach(roll => {
        if (roll <= 10 || roll.includes("natural 1")) {
            gain += rep[0];
            console.log(roll + " awarded " + rep[0] + " rep."); // debugging
            return;
        }
        if (roll >= 11 && roll <=20) {
            gain += rep[1];
            console.log(roll + " awarded " + rep[1] + " rep."); // debugging
            return;
        }
        if (roll >=21) {
            gain += rep[2];
            console.log(roll + " awarded " + rep[2] + " rep."); // debugging
            return;
        }
      });
      REP = gain;
      break;
    case ('GOLD'):
      console.log("Gold requested, need Blade's TIER from the Roster");
      const goldRewards = {"recruit": [10, 25, 50, 75], "adept": [40, 65, 90, 125], "expert": [80, 110, 140, 175], "hero": [120, 160, 200, 250]}, tier = blade[0][12], rewardForTier = goldRewards[tier.toLowerCase()];
      if (rewardForTier == undefined) {
        console.error("Something went wrong, tier " + tier + " is undefined.  Downtime spending cannot proceed");
        return;
      }
      downtimeRolls.forEach(roll => {
        if (roll.includes("natural 1")) {
          roll = roll.split(" (natural 1)")[0];
        }
        if (roll <= 9) {
          gain += rewardForTier[0];
          return;
        }
        if (roll >= 10 && roll <= 14) {
          gain += rewardForTier[1];
          return;
        }
        if (roll >= 15 && roll <= 20) {
          gain += rewardForTier[2];
          return;
        }
        if (roll >= 21) {
          gain += rewardForTier[3];
          return;
        }
      });
      GOLD = gain;
      break;
    // may need to go in another function
    case ('GAMBLING'): // Blade is gambling for GOLD gain
    case ('PIT FIGHTING'): // Blade is pit fighting for GOLD gain
    case ('TRAINING'): // Blade is training the use of a language or tool
      // training requires 250 Gold and 10 weeks of downtime
      if (blade[0][10]) {
      
      }
    case ('CRAFTING'): // Blade is crafting resources
    default:
      console.error("invalid reward entered, downtime spend cannot continue");
      return null;
    }
  return [blade[0][2], 0, GOLD, REP, downtimeRolls.length*-1, 0, "Downtime", notes];
}

async function getData(blade) {
  const spreadsheetId = process.env.spreadsheetId;
  const sheetName = "Roster";
  const values = await getAllSpreadsheetValues(spreadsheetId, sheetName);
  let bladesData = [];
  values.forEach(value => {
    if (value.length > 0 && value[2].toUpperCase().includes(blade.toUpperCase())) {
      bladesData.push(value);
    }
  });
  return bladesData;
}

async function writeToLedger(values) {
  console.log(values);
  console.log("Trying to write data to sheet...");
  const spreadsheetId = process.env.spreadsheetId;
  const sheetName = "Ledger";
  const range = sheetName+"!A:H";
  try {
    const auth = await getAuthToken();
    writeSpreadsheetValues({
      spreadsheetId,
      sheetName,
      auth,
      values,
      range
    });
    console.log("Data written to sheet.");
  } catch (error) {
    console.error(error.message, error.stack);
  }
  return;
}

async function getAllSpreadsheetValues(spreadsheetId, sheetName) {
  try {
    const auth = await getAuthToken();
    const response = await getSpreadsheetValues({
      spreadsheetId,
      sheetName,
      auth
    });
    return response.data["values"];
  } catch (error) {
    console.error(error.message, error.stack);
  }
  return; 
}

function returnAvatar(player, users) {
	let blade = users.filter(member => member.user.username === player.split("@")[1]),
		avatarURL = undefined;
	if (blade.size > 0) {
		const idKey = Array.from(blade.keys());
		avatarURL = blade.get(idKey[0]).user.displayAvatarURL();
	}
	return avatarURL;
}

async function resolveArtwork(bladeData, users) {
	// first, see if the character sheet listed in bladeData[14] (v1.4!C176:H176) contains a URL
	let artworkUrl = undefined;
	try {
		const auth = await getAuthToken();
		const charSheet = await getSpreadsheetValues({
			spreadsheetId: bladeData[14].split("d/")[1].split("/edit")[0], // spreadsheetId is between d/ and /edit of the URL in bladeData[14]
			sheetName: "C176:H176",
			auth
		});
		if (charSheet.data.values != undefined) { // if it is undefined, it will not be useable for retrieving a URL
			let value = charSheet.data.values[0][0];
			if (value.includes("http")) {
				artworkUrl = value;
			} else {
				if (users != null) {
					artworkUrl = returnAvatar(bladeData[0], users);
				}
			}
		} else {
			if (users != null) {
				artworkUrl = returnAvatar(bladeData[0], users);
			}
		}
	} catch (error) {
		console.log(error);
	}
	return artworkUrl;
}

async function constructNGViewOutput(bladesData, users) { // need to define player for each Blade
	const EmbedArray = [];
	for (i=0; i < bladesData.length; i++) {
		const bladeData = bladesData[i];
	//bladesData.forEach(bladeData => {
		const Embed = new EmbedBuilder();
		Embed.setTitle(bladeData[2]);
		Embed.addFields({name: "Reputation", value: bladeData[7], inline: true});
		Embed.addFields({name: "Gold", value: bladeData[8], inline: true});
		Embed.addFields({name: "Tokens", value: bladeData[9], inline: true});
		Embed.addFields({name: "Downtime", value: bladeData[10], inline: true});
		Embed.addFields({name: "Hearts Remaining", value: bladeData[11], inline: true});
		Embed.addFields({name: "Tier", value: bladeData[12], inline: true});
		let bladeDescription = "", bladeQuest = "";
		bladeDescription += bladeData[3] + " " + bladeData[4]; // this gets species and class, eg Drow Paladin
		if (bladeData[5] != "N/A") {
			bladeDescription += "/" + bladeData[5];
		}
		if (bladeData[6] != "N/A") {
			bladeDescription += "/" + bladeData[6];
		}
		if ((bladeData[5] == "N/A") && (bladeData[6] == "N/A")) { // will not trigger for multiclass characters, as their levels should be in the secondary/tertiary class fields, eg, Drow Paladin 5/Warlock 1.  Otherwise the command would gleeefully print out Drow Paladin 5/ Warlock 1 6
			bladeDescription += " " + bladeData[1];
		}
		if (bladeData[13] != "") {
			bladeQuest = bladeData[13];
		} else {
			bladeQuest = "Not currently on a quest";
		}
		Embed.setDescription(bladeDescription);
		Embed.addFields({name: "Current Quest", value: bladeQuest, inline: false});
		// FETCH ARTWORK URL IF IT EXISTS ON SHEET, OTHERWISE USE THE AVATAR OF THE USER ASSOCIATED WITH THE BLADE (IF AVAILABLE)
		let artwork = await resolveArtwork(bladeData, users);
		if (artwork != undefined) {
			Embed.setThumbnail(artwork);
		}
		let nextLevel = "";
		if (bladeData[1] < 20) { // will not trigger for level 20 characters
			let progression = await getAllSpreadsheetValues(process.env.spreadsheetId, "Progression");
			progression.splice([0][0], 1);
			nextLevel += progression[bladeData[1]][2] - bladeData[7];
		} else {
			nextLevel += "MAX LEVEL REACHED";
		}
		Embed.addFields({name: "Rep to Next Level", value: nextLevel, inline: true});
		EmbedArray.push(Embed);
	//});
	};
	return EmbedArray;
}

function constructViewOutput(bladesData, users) {
  // need to define player
  let outputString = "";
  bladesData.forEach(bladeData => {
    outputString += bladeData[2] + "\n";
    outputString += "*" + bladeData[3] + " " + bladeData[4];
    if (bladeData[5] != 'N/A') {
      outputString += "/" + bladeData[5];
    }
    if (bladeData[6] != 'N/A') {
      outputString += "/" + bladeData[6];
    }
    if ((bladeData[5] != 'N/A') || (bladeData[6] != 'N/A')) { // omits printing total level field if character is a multiclass
      outputString += "*\n";
    } else {
      outputString += " " + bladeData[1] + "*\n";
    }
    outputString += "**Reputation: **" + bladeData[7] + "\n";
    outputString += "**Gold: **" + bladeData[8] + "\n";
    outputString += "**Tokens: **" + bladeData[9] + "\n";
    outputString += "**Downtime: **" + bladeData[10] + "\n";
    outputString += "**Hearts Remaining: **" + bladeData[11] + "\n";
    outputString += "**Tier: **" + bladeData[12] + "\n";
    outputString += "**Current Quest: **"
    if (bladeData[13] != "") {
      outputString += bladeData[13];
    } else {
      outputString += "Null";
    }
    outputString += "\n";
    //outputString += "<@" + Array.from(player.keys())[0] + ">\n";
  });
  return outputString;
}

async function checkForLevellingNG(bladeData) {
	await new Promise(resolve => setTimeout(resolve, 10000));
	const bladeNewData = await getData(bladeData[0][2]),
		Embed = new EmbedBuilder();
	let progression = await getAllSpreadsheetValues(process.env.spreadsheetId, "Progression");
	progression.splice([0][0], 1);
	Embed.setTitle("Status Change Report for " + bladeData[0][2]);
	let artwork = await resolveArtwork(bladeData[0], null);
	if (artwork != undefined) {
		Embed.setThumbnail(artwork);
	}
	console.log(bladeData);
	if (bladeData[0][1] != bladeNewData[0][1]) { // a level up has occurred
		let levelDataToGoToSheet = [], goldGain = 0;
		Embed.addFields({name: "Level", value: bladeData[0][1] + " → " + bladeNewData[0][1], inline: false});
		for (let i = parseInt(bladeData[0][1]); i < parseInt(bladeNewData[0][1]); i++) {
			let gold = parseInt(progression[i][3].split(" GP")[0]);
			goldGain += gold;
			levelDataToGoToSheet.push([bladeNewData[0][2], 0, gold, 0, 0, 0, "Levelling", "Level " + parseInt(i+1)]);
		}
		console.log("Total gain: " + goldGain);
		writeToLedger(levelDataToGoToSheet);
		bladeNewData[0][8] = parseInt(bladeNewData[0][8]) + goldGain;
	}
	if (bladeData[0][12] != bladeNewData[0][12]) { // a rank up has occurred
		Embed.addFields({name: "Tier", value: bladeData[0][12] + " → " + bladeNewData[0][12], inline: false});
	}
	if (bladeData[0][8] != bladeNewData[0][8]) { // gold value has channged
		Embed.addFields({name: "Gold", value: bladeData[0][8] + " GP → " + bladeNewData[0][8] + " GP", inline: false});
	}
	if (bladeData[0][10] != bladeNewData[0][10]) { // downtime value changed
		Embed.addFields({name: "Downtime", value: bladeData[0][10] + " → " + bladeNewData[0][10], inline: false});
	}
	if (bladeData[0][7] != bladeNewData[0][7]) { // rep value changed
		let value = bladeData[0][7] + " → " + bladeNewData[0][7] + " (";
		if (bladeNewData[0][1] == 20) {
	       		value += "MAX)";
	     	} else {
     	  		let target = progression[bladeNewData[0][1]][2];
	       		value += (target - bladeNewData[0][7]) + " from level up.)";
	     	}
		Embed.addFields({name: "Reputation", value: value, inline: false});
	}
	return Embed;
}

async function checkForLevelling(bladeData) { // need a new form of this for Embed!!!
  await new Promise(resolve => setTimeout(resolve, 10000)); // waiting 10 seconds to give the sheet a chance to refresh
  const bladeNewData = await getData(bladeData[0][2]);
  let progression = await getAllSpreadsheetValues(process.env.spreadsheetId, "Progression");
  progression.splice([0][0], 1);
  let notification = "***__Status Change Report for " + bladeData[0][2] + "__***\n";
  if (bladeData[0][1] != bladeNewData[0][1]) { // a level up has occurred
    let levelDataToGoToSheet = [], goldGain = 0;
    notification += "- You have levelled up!! Your new level is **__" + bladeNewData[0][1] + "__**.\n\tPlease remember to mark any gained Ability Score Improvements/Feats on your character sheet.  Your HP increases by class average plus your Constitution modifier.\n"; // Adjust to show old level too?
    for (let i = parseInt(bladeData[0][1]); i < parseInt(bladeNewData[0][1]); i++) {
      let gold = parseInt(progression[i][3].split(" GP")[0]);
      goldGain += gold;
      levelDataToGoToSheet.push([bladeNewData[0][2], 0, gold, 0, 0, 0, "Leveling", "Level " + parseInt(i+1)]);
    }
    console.log("Total gain: " + goldGain);
    writeToLedger(levelDataToGoToSheet);
    bladeNewData[0][8] = parseInt(bladeNewData[0][8]) + goldGain;
  }
  if (bladeData[0][12] != bladeNewData[0][12]) { // a rank up has occurred
    notification += "- Your rank has changed, you are now in the **__" + bladeNewData[0][12] + "__** tier!\n";
  }
  if (bladeData[0][8] != bladeNewData[0][8]) { // gold value has changed
    notification += "- Your gold value has ";
    if (bladeData[0][8] < bladeNewData[0][8]) {
      notification += "increased"
    } else {
      notification += "decreased" // this is not firing off properly, please fix
    }
    notification += ", you now have **__" + bladeNewData[0][8] + "GP__**.\n";
  }
  if (bladeData[0][10] != bladeNewData[0][10]) { // downtime value changed
    notification += "- You currently have **__" + bladeNewData[0][10] + "__** weeks of Downtime remaining.\n";
  }
  if (bladeData[0][7] != bladeNewData[0][7]) { // rep value changed
    notification += "- Your reputation has increased!  You now have a reputation value of **__" + bladeNewData[0][7] + "__**.  ";
    if (bladeNewData[0][1] == 20) {
      notification += "\n\t\t**You have maxed out your level and can gain no further levels from increasing Reputation**\n";
    } else {
      let target = progression[bladeNewData[0][1]][2];
      notification += "You need to gain " + (target - bladeNewData[0][7]) + " points of reputation in order to level up.\n";
    }
  }
  return notification;
}

async function collectOneBlade(blades, interaction) { // need to prompt the user to select ONE Blade
  let timeLimit = 60*1000, tries = 3, invalidRemains = true;
  while (invalidRemains) {
    let i = 0, prompt = "```";
    blades.forEach(blade => {
      prompt += i + ": " + blade[2] + "\t" + blade[0] + "\n";
      i++;
    });
    prompt += "```"; // use an embed instead?
    prompt += "\nToo many Blades have been selected, please type the number of the Blade in the above list spending downtime. \n{Time Limit Remaining for Reply: " + (timeLimit/1000)*tries + " seconds.  Tries Remaining: " + tries + "}\n";
    interaction.followUp(prompt);
    let collection = await prompter(timeLimit, interaction);
    if (collection != null && !isNaN(collection) && parseInt(collection) < blades.length -1) {
      console.log(blades[parseInt(collection)]);
      return [blades[parseInt(collection)]];
    } else {
      if (tries > 1) {
        tries--;
      } else {
        invalidRemains = false;
      }
    }
  }
  interaction.followUp("Too many invalid options selected, please recheck the options selected and rerun the command again:\n```blade: " + interaction.options.getString('blade') + " mode: " + interaction.options.getString('mode') + " reward: " + interaction.options.getString('reward') + " notes: " + interaction.options.getString('notes') + "```");
  return null;
}

async function rosterView(bladeData, interaction) {
	const users = await interaction.guild.members.fetch();
	if (outputStyle == "Legacy") {
		let output = constructViewOutput(bladeData, users);
		interaction.followUp(output);
	} else if (outputStyle == "Embed") {
		let outputEmbed = await constructNGViewOutput(bladeData, users);
		if (outputEmbed.length > 0) {
			interaction.followUp({ embeds: outputEmbed });
		} else {
			interaction.followUp("Apologies, there does not seem to be a Blade on the roster with the name: " + interaction.options.getString('blade'));
		}
	} else {
		console.log("Improper output style selected, must be either Legacy or Embed!!!");
	}
	return;
}

async function downtimeSpend(interaction) {
  const users = await interaction.guild.members.fetch(),
    blade = interaction.options.getString('blade'),
    mode = interaction.options.getString('mode');
  console.log(interaction.options);
  let bladeData = await getData(blade);
  switch (mode.toUpperCase()) {
    case ("RECORD"):
      if (interaction.options.getString('reward') != null && interaction.options.getString('notes') != null) {
        if (bladeData.length > 1) {
          const collection = await collectOneBlade(bladeData, interaction);
          if (collection != null) {
            bladeData = collection;
          } else {
            console.error("Error occured with collecting one Blade");
            return null;
          }
        }
        // THIS SHOULD NOT TRIGGER FOR TRAINING SPEND!!!
        ledgerOutput = calculateGains(interaction.options.getString('reward'), interaction.options.getString('notes'), bladeData, interaction);
        if (ledgerOutput != null) {
          await writeToLedger([ledgerOutput]); // elements 1 through 5 must be INTEGERS and enclosed in 2 dimensional array [[,]] as it is an array of rows where each row is an array of cells
          if (outputStyle == "Legacy") {
          	let notification = await checkForLevelling(bladeData);
          	console.log(notification);
          	interaction.followUp(notification);
          } else if (outputStyle == "Embed") {
          	let embed = await checkForLevellingNG(bladeData);
          	interaction.followUp({embeds: [embed]});
          } else {
          	console.log("Improper output style selected, must be either Legacy or Embed!!!");
          }
        } else {
          interaction.followUp("The selected Blade has no weeks of Downtime to spend."); // improve output?
        }
      } else {
        interaction.followUp("No reward or no notes set!  Downtime spend cannot run in Record mode without these arguments!");
      }
      break;
    case ("VIEW"):
     // move to separate function so it can be shared with roster!!!
      rosterView(bladeData, interaction);
      break;
    default:
      console.error("Invalid mode set, downtime spend cannot continue");
      break;
  }
  return;
}

/**
 TO DO:
 - Gambling
 - Pit Fighting
**/
module.exports = {
  data: new SlashCommandBuilder()
    .setName('downtime_spending')
    .setDescription('Add a Blade spending downtime to ledger')
    .addStringOption(option => 
      option.setName('blade')
        .setDescription('The Blade who is spending the downtime')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('mode')
        .setDescription('View total Downtime for a Blade or Record a downtime event')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('reward')
        .setDescription('The type of the reward the Blade wants: rep or gold')
        .setRequired(false))
    .addStringOption(option =>
      option.setName('notes')
        .setDescription('the notes to add to the ledger record')
        .setRequired(false)),
  async execute(interaction) {
    if (roleTest.roleTest(interaction)) {
      await interaction.deferReply();
      downtimeSpend(interaction);
    } else {
      roleTest.warnRole(interaction, "downtime_spending");
    }
  }, getAllSpreadsheetValues, rosterView, getData, writeToLedger
};
