const { SlashCommandBuilder } = require('discord.js'),
  roleTest = require('../snippets/roleTest'),
  { getAuthToken, getSpreadsheet, getSpreadsheetValues, writeSpreadsheetValues } = require('../../googleSheetsService.js');

function calculateGains(reward, notes, blade, interaction) {
  let downtimeRolls = notes.split('[')[1].split(']')[0].split(", ");
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
      downtimeRolls.forEach(roll => {
        if (roll <= 10 || roll.includes("natural 1")) {
            gain += rep[0];
            return;
        }
        if (roll >= 11 && roll <=20) {
            gain += rep[1];
            return;
        }
        if (roll >21) {
            gain += rep[2];
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

function constructViewOutput(bladesData, player) {
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
    if (bladeData[5] != 'N/A' || bladeData[6] != 'N/A') { // omits printing total level field if character is a multiclass
      outputString == "*\n";
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
    outputString += "<@" + Array.from(player.keys())[0] + ">\n";
  });
  return outputString;
}

async function checkForLevelling(bladeData) {
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

async function prompter(timeLimit, interaction) { // this collects a user's reply after a prompt
  return new Promise (function (resolve, reject) {
  const collectorFilter = m => m.author.id == interaction.user.id,
    collector = interaction.channel.awaitMessages({ filter: collectorFilter, time: timeLimit, max: 1})
      .then(collected => {
        const key = Array.from(collected.keys());
        resolve(collected.get(key[0]).content);
      }).catch(collected => {
        resolve(null);
      });
  });
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

async function downtimeSpend(interaction) {
  const users = await interaction.guild.members.fetch();
  const blade = interaction.options.getString('blade'),
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
          let notification = await checkForLevelling(bladeData);
          console.log(notification);
          interaction.followUp(notification);
        } else {
          interaction.followUp("The selected Blade has no weeks of Downtime to spend."); // improve output?
        }
      } else {
        interaction.followUp("No reward or no notes set!  Downtime spend cannot run in Record mode without these arguments!");
      }
      break;
    case ("VIEW"):
      let player = users.filter(guildmember => guildmember.user.username === bladeData[0][0].substring(1));
      output = constructViewOutput(bladeData, player);
      interaction.followUp(output);
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
  },
};
