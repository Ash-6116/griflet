
const fs = require('fs');
// Importing own modules here
//const output = require("./output.js"); // Gives access to HELP, MIRROR, and ARRAYMIRROR functions
//const categories = require("./categories.js"); // Gives access to RESOLVEDATE function
//const categories = require("./commands/moderation/categories.js"); // Gives access to RESOLVEDATE function
const ledger = require("./ledger.js");

const debug = false; // used to switch between debug mode (true) and release (false)

function roster(rosterChannel) {
  return new Promise((resolve, reject) => {
    rosterChannel.forEach(channel => {
      channel.messages.fetch({limit: 100}).then(messages => {
        const allowedNumberOfPosts = 2; // set to 2 for release, 1 or 0 for debugging
        if (messages.size > allowedNumberOfPosts) {
          const newSheetPosters = [], reactedSheetPosters = [];
          // need to check for reactions!!  If there is a reaction, it is in the process of being checked
          messages.forEach(message => {
            const reactionsArray = [];
            message.reactions.cache.map(async (reaction) => {
              reactionsArray.push(reaction); // collecting reactions
            });
            if (reactionsArray.length > 0) {
              reactedSheetPosters.push(message.author.tag, true);
            } else {
              newSheetPosters.push(message.author.tag, false);
            }
          });
          resolve([newSheetPosters, reactedSheetPosters]);
        } else {
          resolve(null);
        }
      });
    });
  });
}

function questTitle(quest) {
  // Takes a message containing a quest details and splits out all but the quest's title which is returned.
  let titleArray = quest.split(/\r?\n/);
  let title, tier;
  if (titleArray[0] != '---') {
    title = titleArray[0];
    tier = titleArray[1];
  } else {
    title = titleArray[1];
    tier = titleArray[2];
  }
  return tier.split("*").join("") + " - " + title.split("*").join("");
}

function reactedQuests(questBoards) {
  return new Promise((resolve, reject) => {
    const boardReactions = [];
    questBoards.forEach(channel => {
      channel.messages.fetch({ limit: 100 }).then(quests => {
        const questsReactions = [];
        quests.forEach(quest => {
          const reactionsArray = [];
          quest.reactions.cache.map(async (reaction) => {
            reactionsArray.push(reaction);
          });
          questsReactions.push(reactionsArray);
        });
        resolve(questsReactions);
      }).catch(error => {
        reject(error);
      });
    });
  });
}

async function pinnedCaravans(cache) {
  const categoryList = Array.from( cache.keys() );
  for(let index = 0; index < cache.size; index++) {
    let children = cache.get(categoryList[index]).children;
    const channels = [], childList = Array.from( children.keys() );
    for(let c = 0; c < children.size; c++) {
      let child = children.get(childList[c]);
      if (child.name.split("-")[0] == "quest") {
        const pinned = await child.messages.fetchPinned(), pins = [];
        if (pinned.size == 0) {
          pins.push(child.name, null);
        } else {
          pinned.forEach(pin => {
            console.log(pin);
            let DM = pin.content.substring(
              pin.content.indexOf("DM: ") + 3,
              pin.content.lastIndexOf("\n")); // this'll return the DM's id tag number
              DM_substring = DM.substring(DM.indexOf("@") + 1, DM.lastIndexOf(">"));
              console.log(DM_substring);
              if (DM_substring[0] == "!") {
                DM_substring = DM_substring.substring(1,DM_substring.length);
              }
              DM = pin.mentions.users.get(DM_substring);
            pins.push(child.name, questTitle(pin.content), DM.tag, categories.resolveDate(pin.createdTimestamp));
          });
        }
        channels.push(pins);
      }
    }
    return channels;
  }
}

function councilAlert(alerts, council) {
  /**
   * alerts will come in as an Array of arrays with the following sequence:
   * 1. general alerts for the council
   * 2. the reactions list
   * 3. the caravans lists
   * 4. quests waiting for blades
   * 5. quests waiting for vassals
   * 6. the roster list
  **/

  /** 2023.08
   *
   * Will be reformatting this function to include a prompt so that announcements can be checked for accuracy here, then pushed to the Blades/Vassals as appropriate, with the default option being to run silently.
  **/
  const debugQuest = "Tier: 0 - Debug Quest";
  const rosters = alerts.pop(), vassalsWaiting = alerts.pop(), bladesWaiting = alerts.pop(), emptyCaravans = alerts.pop(), runningCaravans = alerts.pop(), reactions = alerts.pop(); // separating the output back out
  let outputString = "";
  if (rosters != null) {
    outputString += "Rosters to be checked:\n";
    rosters.forEach(roster => {
      if (roster[1] == true ) {
        outputString += roster[0] + ", this sheet is currently being checked.\n";
      } else {
        outputString += roster[0] + ", this sheet is currently not being checked.\n";
      }
    });
    outputString += "\n";
    // Insert pause point here??
  }
  if (vassalsWaiting.length != 0) {
    //vassalsWaiting.push(debugQuest); // debug
    outputString += "The following quests are waiting for vassals to volunteer to run them:\n";
    vassalsWaiting.forEach(quest => {
      outputString += quest + "\n";
    });
    outputString += "\n";
  }
  if (bladesWaiting != undefined) {
    //bladesWaiting.push(debugQuest); // debug
    outputString += "The following quests are waiting for Blades to sign up before starting:\n";
    let tierNumber = 1;
    bladesWaiting.forEach(tier => {
      if (tier.length != 0) {
        outputString += "Tier " + tierNumber + ": "
        let questsForTier = "";
        tier.forEach(quest => {
          questsForTier += quest + ", ";
        });
        outputString += questsForTier.slice(0, (questsForTier.length-2)) + "\n";
      }
      tierNumber++;
    });
    outputString += "\n";
  }
  if (reactions != 0) {
    outputString += "Reacted Quests:\n";
    reactions.forEach(reaction => {
      outputString += reaction[0] + "\n"; // reaction[0] = title
      reaction.shift();
      reaction.forEach(users => {
        const emoji = users.pop();
        outputString += emoji + " x" + users.length + ": ";
        users.forEach(user => {
          outputString += user.tag + ", ";
        });
        outputString = outputString.slice(0, (outputString.length-2)) + "\n";
      });
    });
    outputString += "\n";
  }
  if (runningCaravans.length != 0) {
    outputString += "Filled Caravans:\n";
    runningCaravans.sort((a,b) => a[0].substring(14,a[0].indexOf(":"))-b[0].substring(14,b[0].indexOf(":")));
    runningCaravans.forEach(caravan => {
      outputString += caravan[0] + "\nPlayers: ";
      caravan[1].forEach(user => {
        outputString += user.tag + ", ";
      });
      outputString = outputString.slice(0, (outputString.length-2)) + "\n";
    });
    outputString += "\n";
  }
  if (emptyCaravans.length != 0) {
    outputString += "Empty Caravans:\n";
    emptyCaravans.sort((a,b) => b.substring(b.lastIndexOf("-"),)-a.substring(a.lastIndexOf("-"),));
    emptyCaravans.forEach(caravan => {
      outputString += caravan + "\n";
    });
    outputString += "\n";
    //console.log(array.sort((a,b) => a-b));
  }
  if (alerts.length != 0) {
    outputString += "Alerts for Council:\n";
    alerts.forEach(alert => {
      outputString += alert + "\n";
    });
  }
  if (debug) {
    console.log(outputString);
  } else {
    output.specificMirror(outputString, council);
  }
  return;
}

function isQuestRunning(title, runningCaravans) {
  let output = null;
  runningCaravans.forEach(caravan => {
    if (caravan.includes(title)) {
      output = caravan;
    }
  });
  return output;
}

function resolveReactions(reaction) {
  return new Promise((resolve, reject) => {
    const userArray = [];
    reaction.users.fetch().then((users) => {
      users.forEach(user => {
        userArray.push(user);
      });
    }).finally(() => {
      userArray.push(reaction._emoji.name);
      resolve(userArray);
    });
  });
}

async function errorCheckQuests(questsReacted, runningCaravans, guild) {
  const questsForGuildmates = [], questsForVassals = [], alertsForCouncil = [], caravanOutput = [], reactionOutput = [], emptyCaravans = []; // using reactionOutput to convert questsReacted for council output
  for(let index = 0; index < questsReacted.length; index ++) { // iterating over the quests with reactions
    let quest = questsReacted[index];
    if (quest.length != 0) {  // filtering out quests with no reactions, just in case
      const title = questTitle(quest[0].message.content);
      const questArray = [title];
      for (let index = 0; index < quest.length; index++) {
        const users = await resolveReactions(quest[index]);
        questArray.push(users);
      }
      reactionOutput.push(questArray);
      if ((questArray.length == 2 && questArray[1].slice(-1)[0] == "⚔️")||(questArray.length == 3 && questArray[1].slice(-1)[0] == "⚔️" && questArray[2].slice(-1)[0] == "🏹")) {  // looking at quests that have only 1 reaction emoji or have 2 reactions with the 2nd being bow and arrow and the 1st is a crossed swords
        const caravan = isQuestRunning(title, runningCaravans);
        if (caravan != null) { // quest is running
          // Blades roles ALWAYS follow the format qc- and a number
          const caravanRole = guild.roles.cache.find(role => role.name === "QC-"+caravan[0].split("-")[2]).id; // returns the id value of the quest caravan role
          let blades = questArray[1].slice(0,-1);
          if (questArray.length == 3) {
            blades = blades.concat(questArray[2].slice(0,-1)); // TODO - may not be adding Arrows, needs checking
          }
          let currentBlades = 0;
          for (let m = 0; m < blades.length; m++) {
            try {
              const member = await guild.members.fetch(blades[m].id);
              if (member._roles.includes(caravanRole)) {
                currentBlades++; // the member has the role for the caravan
              } else {
                alertsForCouncil.push(blades[m].tag + " does not have their role for " + caravan[0]);
              }
            } catch (e) {
              // The user doesn't exist - may have left the server
              console.log(e);
              console.log(blades[m].tag);
              console.log("Quest: " + title);
              alertsForCouncil.push("The following user has a reaction to a quest but cannot be found, they may have left the server.\nUser: " + blades[m].tag + "\nQuest: " + title);
            }
          }
          if (blades.length == currentBlades) {
            // this caravan is properly filled
            console.log(title + " is running in " + caravan[0]);
            caravanOutput.push([caravan[0] + ": " + title + "\nDM: " + caravan[2] + "\tDate Started: " + caravan[3], blades]); // TODO change DM tag to name!!!
          } else {
            alertsForCouncil.push("There's fewer Blades in the caravan than reacted to the quest. " + title + " " + caravan[0]);
            // TODO - need to sort out what should happen here!!!
          }
        } else { // quest is not running
          if (questArray.length == 2 && questArray[1].slice(-1)[0] == "⚔️") {
            switch (true) {
              case (questArray[1].length-1 == 4): // 4 - exactly four crossed swords on a quest not running - 1 for debug.
                console.log("Need to alert the VASSALS: " + title);
                questsForVassals.push([title, questArray[1].slice(0,-1)]);
                break;
              case (questArray[1].length-1 < 4): // less than 4 crossed swords - valid reaction
                console.log("Need to alert the BLADES: " + title); // Add number of signups here???
                console.log(questArray[1].length-1);
                questsForGuildmates.push([title, questArray[1].length-1]);
                //questsForGuildmates.push(title);
                break;
              case (questArray[1].length-1 > 4): // more than 4 crossed swords on a quest not running
                console.log("Need to alert the COUNCIL: " + title);
                alertsForCouncil.push("Too many reactions to " + title); // TO DO - add users to alert?
                break;
            }
          } else {  // too many reaction emojis!!!
            alertsForCouncil.push("This quest has multiple reaction emojis. " + title); // this is NOT TRIGGERED
          }
        }
      } else {
        alertsForCouncil.push("Invalid reaction!!! " + title); // - BROKEN TO BE DELETED
      }
    }
  }
  runningCaravans.forEach(caravan => {
    if (caravan[1] == null) {
      console.log("Need to send this to the council!!! " + caravan[0]);
      emptyCaravans.push(caravan[0]);
    }
  });
  alertsForCouncil.push(reactionOutput, caravanOutput, emptyCaravans);
  let sortedQuests;
  if (questsForGuildmates.length > 0) {
    sortedQuests = sortQuests(questsForGuildmates);
    console.log(sortedQuests);
  }
  let sortedVassals;
  questsForVassals.sort((a,b) => a[0].match(/\d/)[0]-b[0].match(/\d/)[0]);
  return [sortedQuests, alertsForCouncil, questsForVassals];
}

async function questCheck(guild, council) {
  let cache = guild.channels.cache
  // Work out which quests are awaiting guild mates
  // NEED - Quests with reactions
  // NEED - Running Quests
  let outputString = "";
  const questsReacted = await reactedQuests(cache.filter(channel => channel.name === 'quest-board'));
  const runningCaravans = await pinnedCaravans(cache.filter(channel => channel.type === 'GUILD_CATEGORY' && channel.name === 'Quest Caravans'));
  const checkedQuests = await errorCheckQuests(questsReacted, runningCaravans, guild);
  /**
   *  checkedQuests[0] == questsForGuildmates
   *  checkedQuests[1] == alertsForCouncil
   *  checkedQuests[2] == questsForVassals
  **/
  return checkedQuests;
}

function buildRoleList(cache) {
  let usableRoles = [];
  cache.forEach(role => {
    if (role.name == "Blades" || role.name == "Knights" || role.name == "Squires" || role.name == "Vassals") {
      usableRoles.push([role.id, role.name]);
    }
  });
  return usableRoles;
}

function returnItemId(usableItem, target) {
  let returnId = null;
  usableItem.forEach(role => {
    if (role[1] == target) {
      returnId = role[0];
    }
  });
  return returnId;
}

function buildChannelList(cache) {
  let usableChannels = [];
  cache.forEach(channel => {
    if (channel.name == "gameplay-reference" || channel.name == "announcements" || channel.name == "briefing-room" || channel.name == "bot-stuff" || channel.name == "blades-confessionals") {
      usableChannels.push([channel.id, channel.name]);
    }
  });
  return usableChannels;
}

function sortQuests(questArray) {
  // Blades arrays have 4 tiers
  const tier1 = [], tier2 = [], tier3 = [], tier4 = [];
  questArray.forEach(quest => {
    console.log(quest);
    const splitQuestObject = quest[0].split(" - "), title = splitQuestObject[1]; // splits the string
    switch (splitQuestObject[0].replace(/[^0-9]/g, '')) { // strips the string to just the quest tier number
      case '1':
        tier1.push([title, quest[1]]);
        break;
      case '2':
        tier2.push([title, quest[1]]);
        break;
      case '3':
        tier3.push([title, quest[1]]);
        break;
      case '4':
        tier4.push([title, quest[1]]);
        break;
    }
  });
  return [tier1, tier2, tier3, tier4];
}

function vassalsAlert(questsWaitingForDM, announcementChannel, roles) {
  if (questsWaitingForDM.length != 0) {
    let stdAnnouncement = "<@&" + returnItemId(roles, "Vassals") + ">, the following ";
    let endAnnouncement = "Is there anyone free who can volunteer to take ";
    if (questsWaitingForDM.length == 1) {
      stdAnnouncement += "quest has been filled.\n";
      endAnnouncement += "this quest?"
    } else {
      stdAnnouncement += "quests have filled.\n";
      endAnnouncement += "these quests?";
    }
    questsWaitingForDM.forEach(questWaiting => {
      stdAnnouncement += questWaiting[0] + ", the party will be: ";
      let usersWaiting = "";
      questWaiting[1].forEach(user => {
        usersWaiting += "<@" + user.id + ">, "; // use user.tag as a fallback ;)
      });
      stdAnnouncement += usersWaiting.slice(0, (usersWaiting.length-2)) + "\n";
    });
    stdAnnouncement += endAnnouncement + "  Many thanks.";
    if (debug) {
      console.log(stdAnnouncement);
    } else {
      output.specificMirror(stdAnnouncement, announcementChannel);
    }
  }
  return;
}

function announce(roles, usableChannels, args, announcementChannel, questsWaitingForGuildmates) {
  // replace message with guild in the function?
  let usableRoles = buildRoleList(roles); // move to downtime function?
  let stdAnnouncement = "<@&" + returnItemId(usableRoles, "Blades") + "> the weekly downtime has been applied.  As a reminder you can only spend downtime or shop if you are not in a quest or if your quest has not left the guild hall.\nPlease ask <@&" + returnItemId(usableRoles, "Knights") + "> or <@&" + returnItemId(usableRoles, "Squires") + "> for spending downtime, a document of suggested activities can be found in <#" + returnItemId(usableChannels, "gameplay-reference") + ">. \n\n";
  if (questsWaitingForGuildmates == undefined) {
    stdAnnouncement += "Quests Waiting For Guildmates:\nNone";
  } else {
    if (questsWaitingForGuildmates.length > 1) {
      stdAnnouncement += "Quests ";
    } else {
      stdAnnouncement += "Quest ";
    }
    stdAnnouncement += "Waiting For Guildmates:\n";
    let tierNumber = 1;
    questsWaitingForGuildmates.forEach(tier => {
      if (tier.length != 0) {
        stdAnnouncement += "Tier " + tierNumber + ": "
        let questsForTier = "";
        tier.forEach(quest => {
          questsForTier += quest[0] + " (" + quest[1];
          if (quest[1] == 1) {
            questsForTier += " Blade ";
          } else {
            questsForTier += " Blades ";
          }
          questsForTier += "Signed Up), ";
        });
        stdAnnouncement += questsForTier.slice(0, (questsForTier.length-2)) + "\n";
      }
      tierNumber++;
    });
  }
  let additionalAnnouncement = "";
  if (args.length != 0) {
    additionalAnnouncement += "\n";
  }
  args.forEach(arg => {
    additionalAnnouncement += arg + " ";
  });
  if (debug) {
    console.log(stdAnnouncement + additionalAnnouncement);
  } else {
    output.specificMirror(stdAnnouncement + additionalAnnouncement, announcementChannel);
  }
}

function prompt(message) {
  let usableChannels = buildChannelList(message.guild.channels.cache.filter(m => m.type === 'GUILD_TEXT')); 
  let announcementChannel = message.guild.channels.cache.filter(m => m.id === returnItemId(usableChannels, "blades-confessionals"));
  fs.readFile('prompts.txt', 'utf8', (err, data) => {
  	if (err) {
  		return console.log(err);
  	}
  	var array = data.toString().split("\n");
  	let standard = "You can describe your character's answer to the following prompt either in character as them or out of character describing  it yourself.  Please remember to keep things civil, even here you are under the watchful eye of the council and the rules for both Blades and the server as a whole still apply.  For the sake of making it clear which character the confession goes with, please use the following format: `**Name character**: [answer/prompt]`\n\n";
  	output.specificMirror(standard + array[Math.floor(Math.random() * array.length)], announcementChannel);
  });
  return;
}

async function daily(message, args) {
  // TODO - is message the appropriate item for this module?
  /**
   * Wish to add a function to run routines done when applying weekly downtime.
   * 1) Check if there are any additional posts in #roster that need to be sorted out.
   * 2) Check if anyone has left the server in the last week with the command:
   *      from: Dyno in: general-lounge 'absorbed' or its equivalent.
   * 3) Work out which quests are awaiting guildmates.
   * 4) Send a message to #announcements with the following format:
   *      @Blades the weekly downtime has been applied.  As a reminder you can only spend downtime or shop
   *      if you are not in a quest or if your quest has not left the guild hall.
   *      Please ask @Knights or @Squires for spending downtime, a document of suggested activities can be
   *      found in #gameplay-reference.
   *
   *      Quests Waiting For Guildmates:
   *      Tier 1: Impregnable Fortress
  **/
  let questsWaitingBlades = [], councilLog = "", questsWaitingVassals = [], usableChannels = buildChannelList(message.guild.channels.cache.filter(m => m.type === 'GUILD_TEXT')), usableRoles = buildRoleList(message.guild.roles.cache);
  // roster will return the authors of any sheets not yet checked in an array [new, in progress]
  const rosterOutput = await roster(message.guild.channels.cache.filter(channel => channel.name === 'roster'));
  const questsChecked = await questCheck(message.guild, message.guild.channels.cache.filter(m => m.id === returnItemId(usableChannels, "bot-stuff"))); // returns any quests awaiting BLADES
  if (!args.includes('-silent')) {
    if (!args.includes('-novassal')) {
      vassalsAlert(questsChecked[2], message.guild.channels.cache.filter(m => m.id === returnItemId(usableChannels, "briefing-room")), usableRoles);
    }
  } else {
    console.log("Silent argument has been passed - announcement will not trigger\n" + questsChecked[2]);
  }
  // adding the output sent to vassals and blades along with the roster to the council.
  questsChecked[1].push(questsChecked[0], questsChecked[2], rosterOutput);
  councilAlert(questsChecked[1], message.guild.channels.cache.filter(m => m.id === returnItemId(usableChannels, "bot-stuff")));
  return [usableChannels, questsChecked[0]];
}

function downtime(message, args) {
  daily(message, args).then(announcement => {
    if (args.includes('-novassal')) {
      args.splice(args.indexOf('novassal'), 1); // prevents the argument ending up in the Blades announcements
    }
    if (!args.includes('-silent')) {
      ledger.main();
      announce(message.guild.roles.cache, announcement[0], args, message.guild.channels.cache.filter(m => m.id === returnItemId(announcement[0], "announcements")), announcement[1]);
      prompt(message);
    } else {
      console.log("Silent argument has been passed - announcement will not trigger\n" + announcement[1]);
    }
  });
  return;
}

module.exports = {daily, downtime, prompt}
