const { SlashCommandBuilder } = require('discord.js'),
  fs = require('fs'),
  roleTest = require('../snippets/roleTest'),
  ledger = require('../../ledger.js'),
  { testUser } = require('../snippets/user'),
  { mirror, specificMirror } = require('../snippets/output'),
  { resolveDate } = require('./categories.js'); // Gives access to RESOLVEDATE function

const emoji_crossed_swords = "⚔️",
  emoji_bow_and_arrow = "🏹";

/**
async function errorCheckQuests(questsReacted, runningCaravans, guild) { // works with v14 but requires overhaul
  // need to replace alertsForCouncil [] with 
  const questsForGuildmates = [], questsForVassals = [], 
    alertsForCouncil = [],
    councilAlerts = {}, 
    caravanOutput = [], reactionOutput = [], emptyCaravans = []; // using reactionOutput to convert questsReacted for council output
  for (let index = 0; index < questsReacted.length; index++) { // iterating over the quests with reactions
    let quest = questsReacted[index];
    if (quest.length != 0) { // filtering out quests with no reactions, just in case
      const title = questTitle(quest[0].message.content);
      const questArray = [title];
      for (let i = 0; i < quest.length; i++) {
        const users = await resolveReactions(quest[index]);
        questArray.push(users);
      }
      reactionOutput.push(questArray);
      if ((questArray.length == 2 && questArray[1].slice(-1)[0] == "⚔️")||(questArray.length == 3 && questArray[1].slice(-1)[0] == '⚔️' && questArray[2].slice(-1)[0] == "🏹")) { // looking at quests that have only 1 reaction emoji or have 2 reactions with the 2nd being bow and arrow and the 1st is a crossed swords
        const caravan = isQuestRunning(title, runningCaravans);
        if (caravan != null) { // quest is running
          // Blades roles ALWAYS follow the format qc- and a number
          const caravanRole = guild.roles.cache.find(role => role.name === "QC-"+caravan[0].split("-")[2]).id; // returns the id value of the quest caravan role
          let blades = questArray[1].slice(0,-1);
          if (questArray.length == 3) {
            blades = blades.concat(questArray[2].slice(0,-1)); // TO DO - may not be adding Arrows, needs checkin
          }
          let currentBlades = 0;
          const lackOfRoles = []
          for (let m = 0; m < blades.length; m++) {
            try {
              const member = await guild.members.fetch(blades[m].id);
              if (member._roles.includes(caravanRole)) {
                currentBlades++; // the member has the role for the caravan
              } else {
                alertsForCouncil.push(testUser(blades[m]) + " does not have their role for " + caravan[0]);
              }
            } catch (e) {
              // The user doesn't exist - may have left the server
              console.log(e);
              console.log(testUser(blades[m]));
              console.log("Quest: " + title);
              alertsForCouncil.push("The following user has a reaction to a quest but cannot be found, they may have left the server.\nUser: " + testUser(blades[m]) + "\nQuest: " + title);
            }
          }
          //councilAlerts.put("caravan_roles", lackOfRoles);
          if (blades.length == currentBlades) {
            // this caravan is properly filled
            console.log(title + " is running in " + caravan[0]);
            caravanOutput.push([caravan[0] + ": " + title + "\nDM: " + caravan[2] + "\tDate Started: " + caravan[3], blades]); // TO DO change DM tag to name!!!
          } else {
            alertsForCouncil.push("There's fewer Blades in the caravan than reacted to the quest. " + title + " " + caravan[0]);
            // TODO - need to sort out what should happen here!!!
          }
        } else { // quest is not running
          if (questArray.length == 2 && questArray[1].slice(-1)[0] == "⚔️") {
            switch (true) {
              case (questArray[1].length-1 == 1): // 4 - exactly four crossed swords on a quest not running - 1 for debug.
                console.log("Need to alert the VASSALS: " + title);
                questsForVassals.push([title, questArray[1].slice(0, -1)]);
                break;
              case (questArray[1].length-1 < 4): // less than 4 crossed swords - valid reaction
                console.log("Need to alert the BLADES: " + title);
                console.log(questArray[1].length-1);
                questsForGuildmates.push([title, questArray[1].length-1]);
                break;
              case (questArray[1].length-1 > 4): // more than 4 crossed swords on a quest not running
                console.log("Need to alert the COUNCIL: " + title);
                alertsForCouncil.push("Too many reactions to " + title); // TO DO - add users to alert?
                break;
            }
          } else { // too many reaction emojis!!!
            alertsForCouncil.push("This quest has multiple reaction emojis. " + title); // this is NOT TRIGGERED
          }
        }
      }  else {
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
  alertsForCouncil.push(reactionOutput, caravanOutput, emptyCaravans); // ditto here for confusing output
  /**
   * would it be better to turn alertsForCouncil into a map where each KEY is descriptive?
   * eg:
   * { invalid: [reaction, reaction, ... ],
   *   empty: [caravan, caravan, ...],
   *   filled: [caravan, caravan, ...]}
  
  let sortedQuests;
  if (questsForGuildmates.length > 0) {
    sortedQuests = sortQuests(questsForGuildmates);
    console.log(sortedQuests);
  }
  let sortedVassals;
  questsForVassals.sort((a,b) => a[0].match(/\d/)[0]-b[0].match(/\d/)[0]);
  return [sortedQuests, alertsForCouncil, questsForVassals];
  /**
   * This return is the source of the confusion!!!
  /
}
**/

/**
 * Rewriting errorCheck to split it into its component parts

function sortQuests(questArray) { // works with v14 and requires no overhaul
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
**/

async function pinnedCaravans(cache) {
  const categoryList = Array.from( cache.keys() );
  for (let index = 0; index < cache.size; index++) {
    //let children = cache.get(categoryList[index]).children; // this doesn't exist anymore!!!
    let childrenResult = children(cache.get(categoryList[index]));
    const channels = [], childList = Array.from(childrenResult.keys());
    for(let c = 0; c < childrenResult.size; c++) {
      let child = childrenResult.get(childList[c]);
      if (child.name.split("-")[0] == "quest") {
        const pinned = await child.messages.fetchPinned(), pins = [];
        if (pinned.size == 0) {
          pins.push(child.name, null);
        } else {
          pinned.forEach(pin => {
            let DM = pin.content.substring(
              pin.content.indexOf("DM: ") + 3,
              pin.content.lastIndexOf("\n")); // this'll return the DM's id tag number
            DM_substring = DM.substring(DM.indexOf("@") + 1, DM.lastIndexOf(">"));
            if (DM_substring[0] == "!") {
              DM_substring = DM_substring.substring(1,DM_substring.length);
            }
            DM = pin.mentions.users.get(DM_substring); // DM is a USER object, like dealt with in Categories
            pins.push(child.name, questTitle(pin.content), testUser(DM), resolveDate(pin.createdTimestamp));
          });
        }
        channels.push(pins);
      }
    }
    return channels;
  }
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

function children(cache) {
  return cache.guild.channels.cache.filter(c => c.parentId === cache.id);
}

function reactedQuests(questBoards) { // works with v14 no overhaul needed
  return new Promise((resolve, reject) => {
    questBoards.forEach(channel => {
      channel.messages.fetch().then(quests => {
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

function roster(rosterChannel) { // works with v14
  return new Promise((resolve, reject) => {
    rosterChannel.forEach(channel => {
      channel.messages.fetch().then(messages => {
        const allowedNumberOfPosts = 2; // set to 2 for release, 1 or 0 for debugging
        if (messages.size > allowedNumberOfPosts) {
          const newSheetPosters = [], reactedSheetPosters = [];
          // need to check for reactions!!  If there is a reaction, it is in the process of being checked
          const messagesKeys = Array.from(messages.keys());
          for (let i = 0; i < messages.size-allowedNumberOfPosts; i++) {
            let message = messages.get(messagesKeys[i]);
            const reactionsArray = [];
            message.reactions.cache.map(async (reaction) => {
              reactionsArray.push(reaction); // collecting reactions
            });
            if (reactionsArray.length > 0) {
              reactedSheetPosters.push(testUser(message.author), true);
            } else {
              newSheetPosters.push(testUser(message.author), false);
            }
          }
          resolve([newSheetPosters, reactedSheetPosters]);
        } else {
          resolve(null);
        }
      });
    });
  });
}

function buildRoleList(cache) { // this function works with API v14 and requires no overhaul
  let usableRoles = [];
  cache.forEach(role => {
    if (role.name == "Blades" || role.name == "Knights" || role.name == "Squires" || role.name == "Vassals") {
      usableRoles.push([role.id, role.name]);
    }
  });
  return usableRoles;
}

function buildChannelList(cache) { // this function works with API v14 and requires no overhaul
  let usableChannels = [];
  cache.forEach(channel => {
    if (channel.name === "gameplay-reference" || channel.name == "announcements" || channel.name == "briefing-room" || channel.name == "bot-stuff" || channel.name == "blades-confessionals") {
      usableChannels.push([channel.id, channel.name]);
    }
  });
  return usableChannels;
}

function sortCaravans(caravans) {
  // receiving an unsorted list of both empty and full caravans, need to sort them.
  let emptyCaravans = [], runningCaravans = [];
  caravans.forEach(caravan => {
    if (caravan[1] == null) {
      emptyCaravans.push(caravan[0])
    } else {
      runningCaravans.push(caravan);
    }
  });
  emptyCaravans.sort();
  runningCaravans.sort();
  return [emptyCaravans, runningCaravans];
}

function addToOutput(outputString, addendum, finalOutput) {
  if (outputString.length + addendum.length > 2000) {
    finalOutput.push(outputString);
    outputString = addendum;
  } else {
    outputString += addendum;
  }
  return [finalOutput, outputString];
}

function v14councilAlert(alertPackage, usableChannels) { // change to use outputSpecificMirror NOT interaction
  /**
   * Going to be receiving a JSON object containing the alerts, rather than the old array.
   * Each key is going to be describing the element in question.
  **/
  /**
   * 2023.08
   *
   * Going to be changing parts of this to require a prompt so that downtime does not have to be run twice with a -silent argument to check accuracy of output
  **/
  console.log(alertPackage);
  // 1st, lets deal with the roster (these should only trigger if they are in the alert package!!!
  let roster, caravans, reactions, emptyCaravans, filledCaravans;
  if (alertPackage.has("roster")) { roster = alertPackage.get("roster")}
  if (alertPackage.has("caravans")) { caravans = alertPackage.get("caravans"), emptyCaravans = caravans[0], filledCaravans = caravans[1]}
  if (alertPackage.has("reactions")) { reactions = alertPackage.get("reactions")}
  let outputString = "",
    finalOutput = [],
    temp = [];
  if (roster != null) { // there's sheets to check
    let rosterMessage = "__**Rosters**__\n";
    roster.forEach(sheet => {
      if (sheet.length != 0) { // filtering out empty elements
        rosterMessage += sheet[0] + " has posted a sheet, it ";
        if (sheet[1] === true) {
          rosterMessage += "is currently being checked.\n";
        } else {
          rosterMessage += "is not currently being checked.\n";
        }
      }
    });
    temp = addToOutput(outputString, rosterMessage, finalOutput);
    finalOutput = temp[0];
    outputString = temp[1];
  } else {
    temp = addToOutput(outputString, "There are no messages waiting in roster\n", finalOutput);
    finalOutput = temp[0];
    outputString = temp[1];
  }
  // 2nd, show the quests waiting for Blades
  // 3rd, show the quests waiting for Vassals
  // 4th, show all the reacted quests - including invalid reactions
  if (reactions != null) {
    const questsWithReactions = Array.from(reactions.keys());
    let reactionString = "__**Reacted Quests**__\n";
    questsWithReactions.forEach(quest => {
      reactionString += quest + "\n";
      reactionMap = reactions.get(quest);
      reactionKeys = Array.from(reactionMap.keys());
      reactionKeys.forEach(reaction => {
        reactionString += reaction + " x" + reactionMap.get(reaction).length + ": " + reactionMap.get(reaction) + "\n";
      });
    });
    temp = addToOutput(outputString, reactionString, finalOutput);
    finalOutput = temp[0];
    outputString = temp[1];
  }
  // 5th, show the filled caravans
  if (filledCaravans != null) {
    let filledString = "__**Filled Caravans**__\n";
    filledCaravans.forEach(caravan => {
      filledString += caravan[0] + ":" + caravan[1] + "\nDM: " + caravan[2] + "\tDate Started: " + caravan[3] + "\n";
    });
    temp = addToOutput(outputString, filledString, finalOutput);
    finalOutput = temp[0];
    outputString = temp[1];
  }
  // 6th, show the empty caravans
  if (emptyCaravans != null) {
    let emptyString = "__**Empty Caravans**__\n";
    emptyCaravans.forEach(caravan => {
      emptyString += caravan + "\n";
    });
    temp = addToOutput(outputString, emptyString, finalOutput);
    finalOutput = temp[0];
    outputString = temp[1];
  }
  // 7th, show the alerts for the council.
  /**
   *  These could be anything from a missing role
   *  to a Blade that left a reaction leaving the server
  **/
  if (alertPackage.has("missing users")) {
    const missingUsers = alertPackage.get("missing users");
    let missingString = "__**Missing Users**__\n*The following reactions were left by someone no longer on the server*\n";
    const questArray = Array.from(missingUsers.keys());
    questArray.forEach(key => {
      missingString += key + "\n";
      const reactionArray = Array.from(missingUsers.get(key).keys());
      reactionArray.forEach(reaction => {
        missingString += reaction + ": ";
        const users = missingUsers.get(key).get(reaction);
        users.forEach(user => {
          missingString += testUser(user) + ", ";
        });
        missingString += "\n";
      });
    });
    temp = addToOutput(outputString, missingString, finalOutput);
    finalOutput = temp[0];
    outputString = temp[1];
  }
  /**
  if (alertPackage.has("alertsAllGroups"alertsAllGroups.has("council")) {
    console.log("Quest Alerts:");
    console.log(alertPackage.alertsAllGroups.get("council"));
  }
  // TO DO - FIX
  **/
  if (outputString.length > 0) {
    finalOutput.push(outputString);
    specificMirror(finalOutput, usableChannels.find(channel => channel.name === "bot-stuff"));
  }
  return;
}

async function processReactions(questsWithReactions) {
  // receiving an array that if a quest has no reactions is empty, if it does, contains an array of reactions
  let output = new Map();
  for (let q = 0; q < questsWithReactions.length; q++) {
    let quest = questsWithReactions[q],
      title;
    if (quest.length != 0) { // filtering out quests with no reaction
      let reactions = new Map();
      for (let r = 0; r < quest.length; r++) {
        let reaction = quest[r];
        if (title === undefined) {
          title = questTitle(reaction.message.content);
        }
        let emoji = reaction._emoji.name;
        let users = await reaction.users.fetch(),
          usersIds = Array.from(users.keys()),
          usersList = [];
        usersIds.forEach(user => {
          usersList.push(users.get(user));
        });
        reactions.set(emoji, usersList);
      }
      output.set(title, reactions);
    }
  }
  return output;
}

function errorCheckFilledQuests(validReactions) {
  const filledQuestNumber = 4; // 1 or 2 for debug, 4 for release
  /**
   *  Need to filter the valid quests into groups:
   *  1)  Filled quests, where the total number of reactions is 4
   *  2)  Pending quests, where the total number of reaction is less than 4
   *  3)  Overfilled quests, where the total number of reactions is greater than 4
  **/
  const keys = Array.from(validReactions.keys());
  let filledQuests = new Map(), pendingQuests = new Map(), overfilledQuests = new Map(), returnableMap = new Map();
  keys.forEach(key => {
    let quest = validReactions.get(key);
    if (quest.has(emoji_bow_and_arrow)) {
      if (quest.get(emoji_bow_and_arrow).length + quest.get(emoji_crossed_swords).length === filledQuestNumber) {
        filledQuests.set(key, quest);
      } else if (quest.get(emoji_bow_and_arrow).length + quest.get(emoji_crossed_swords).length < filledQuestNumber) {
        pendingQuests.set(key, quest);
      } else {
        overfilledQuests.set(key, quest);
      }
    } else {
      if (quest.get(emoji_crossed_swords).length === filledQuestNumber) {
        filledQuests.set(key, quest);
      } else if (quest.get(emoji_crossed_swords).length < filledQuestNumber) {
        pendingQuests.set(key, quest);
      } else {
        overfilledQuests.set(key, quest);
      }
    }
  });
  if (filledQuests.size > 0) {
    returnableMap.set("filled", filledQuests);
  }
  if (pendingQuests.size > 0) {
    returnableMap.set("pending", pendingQuests);
  }
  if (overfilledQuests.size > 0) {
    returnableMap.set("overfilled", overfilledQuests);
  }
  return returnableMap;
}

function errorCheckUserExists(reactionsData, userCache) {
  let missingUserQuests = new Map();
  // Need to make sure each user that left reactions is still on the server
  const questList = Array.from(reactionsData.keys());
  questList.forEach(quest => {
    const reactions = reactionsData.get(quest);
    const reactionsList = Array.from(reactions.keys());
    let missingReactions = new Map();
    reactionsList.forEach(reaction => {
      let missingUsers = [];
      const users = reactions.get(reaction);
      users.forEach(user => {
        if (userCache.has(user.id)) {
          console.log("User exists on server: " + testUser(user)); // do not need to touch their reaction!
        } else {
          console.log("User no longer exists on server: " + testUser(user)); // need to remove their reaction from Griflet's list and notify the council!
          // get the current reactions' array, then filter out the missing user
          let currentReaction = reactionsData.get(quest).get(reaction).filter(missing => missing.id !== user.id);
          if (currentReaction.length == 0) {
            // Need to remove the reaction from the quest array as it has no users
            reactionsData.get(quest).delete(reaction);
          } else {
            // Need to replace the existing reaction array with the currentReaction array to remove missing users
            reactionsData.get(quest).set(reaction, currentReaction);
          }
          // Now we need to put them in the missingUserQuests map so their absence can be highlighted to the council
          missingUsers.push(user);
        }
      });
      if (missingUsers.length > 0) { // need to add users to missingUserQuests
        missingUserQuests.set(quest, missingReactions.set(reaction, missingUsers));
      }
    });
  });
  return [reactionsData, missingUserQuests];
}

function errorCheckReactions(processedReactions) {
  const questKeys = Array.from(processedReactions.keys());
  let validQuests = new Map(), invalidQuests = new Map(); // collecting these for output later
  questKeys.forEach(key => {
    const quest = processedReactions.get(key);
    /**
     *  What are we trying to do here?
     *
     * 1. Identify quests with FOUR valid reactions.  These can either be crossed_swords, or bow_and_arrow.
     * 2. Identify quests with between ONE and THREE valid reactions.  Same restrictions as above.  A check
     *    that no quest that is not running has bow_and_arrows will be performed in another function
     * 3. Identify quests that have FIVE or more valid reactions, for reporting to the COUNCIL (too many
     *    reactions)
     * 4. Identify quests with NO valid reactions, but have any other reaction, for reporting to the COUNCIL
     * 5. Identify quests with a mixture of valid and non valid reactions.  Report the invalids and treat the
     *    valids as if they'd been identified properly.
    **/
    /**
     *  Desired Outputs:
     *  Filled caravans - further checking required in another function, but will probably be RUNNING or sent to the VASSALS
     *  Pending caravans - further checking required in another function, but will probably be sent to the BLADES
     *  Rejected reactions - alert the Council
    **/
    if (quest.size >= 1 && quest.has(emoji_crossed_swords)) {
      if (quest.size == 1 && quest.has(emoji_crossed_swords) || quest.size == 2 && quest.has(emoji_crossed_swords) && quest.has(emoji_bow_and_arrow)) {
        validQuests.set(key, quest);
      }
      if (quest.size >= 3) {
        let invalidReactions = new Map(), validReactions = new Map(); // going to need to separate these out ;)
        let rebuiltQuest = new Map();
        const reactionKeys = Array.from(quest.keys());
        reactionKeys.forEach(reactionKey => {
          if (reactionKey == emoji_crossed_swords || reactionKey == emoji_bow_and_arrow) {
            validReactions.set(reactionKey, quest.get(reactionKey));
          } else {
            invalidReactions.set(reactionKey, quest.get(reactionKey));
          }
        });
        invalidQuests.set(key, invalidReactions);
        validQuests.set(key, validReactions);
      }
    } else {
      invalidQuests.set(key, quest);
    }
  });
  return [validQuests, invalidQuests]; // returning two maps with key Quest Name and value maps of reactions and users
}

function errorCheckIsRunning(questMaps, questChannels) {
  // What are the deliverables?
  let runningQuests = new Map(), alerts = new Map(), alertsForBlades = new Map(), alertsForVassals = new Map(), alertsForCouncil = new Map();
  let runningCaravans = new Map();
  console.log(questMaps);
  questChannels.forEach(caravan => {
    if (caravan[1] != null) { // stripping out empty caravans
      let runningCaravan = new Map();
      runningCaravan.set("caravan", caravan[0]);
      runningCaravan.set("DM", caravan[2]);
      runningCaravan.set("Start Date", caravan[3]);
      runningCaravans.set(caravan[1], runningCaravan);
    }
  });
  if (questMaps.has("filled")) {
    const filledKeys = Array.from(questMaps.get("filled").keys());
    filledKeys.forEach(key => {
      if (runningCaravans.has(key)) {
        console.log(key + " is a running caravan, no action required");
        let runningQuest = new Map();
        runningQuest.set("DM", runningCaravans.get(key).get("DM"));
        runningQuest.set("caravan", runningCaravans.get(key).get("caravan"));
        runningQuest.set("Start Date", runningCaravans.get(key).get("Start Date"));
        const filledContents = questMaps.get("filled").get(key); // might receive multiple reactions, need to account for this
        runningQuest.set("blades", filledContents.get(emoji_crossed_swords));
        if (filledContents.get(emoji_bow_and_arrow)) {
          runningQuest.set("arrows", filledContents.get(emoji_bow_and_arrow));
        }
        runningQuests.set(key, runningQuest);
      } else {
        console.log(key + " is not running, a vassal is needed");
        let alertForVassals = new Map();
        const reactionsForQuest = questMaps.get("filled").get(key);
        alertForVassals.set("blades", reactionsForQuest.get(emoji_crossed_swords));
        if (reactionsForQuest.has(emoji_bow_and_arrow)) {
          alertForVassals.set("arrows", reactionsForQuest.get(emoji_bow_and_arrow));
        }
        alertsForVassals.set(key, alertForVassals);
      }
    });
  }
  if (questMaps.has("pending")) {
    const pendingKeys = Array.from(questMaps.get("pending").keys());
    pendingKeys.forEach(key => {
      if (!runningCaravans.has(key)) {
        console.log(key + " is not running, blades are needed");
        let alertForBlades = new Map();
        const reactionsForQuest = questMaps.get("pending").get(key);
        alertForBlades.set("blades", reactionsForQuest.get(emoji_crossed_swords));
        if (reactionsForQuest.has(emoji_bow_and_arrow)) { // this should never trigger, but is included just in case
          alertForBlades.set("arrows", reactionsForQuest.get(emoji_bow_and_arrow));
        }
        alertsForBlades.set(key, alertForBlades);
      } else {
        console.log(key + " is in a running caravan but isn't filled.  Advise council");
        let alertForCouncil = new Map();
        alertForCouncil.set("DM", runningCaravans.get(key).get("DM"));
        alertForCouncil.set("caravan", runningCaravans.get(key).get("caravan"));
        alertForCouncil.set("Start Date", runningCaravans.get(key).get("Start Date"));
        const users = questMaps.get("pending").get(key);
        alertForCouncil.set("blades", users.get(emoji_crossed_swords));
        if (users.has(emoji_bow_and_arrow)) {
          alertForCouncil.set("arrows", users.get(emoji_bow_and_arrow));
        }
        alertsForCouncil.set(key, alertForCouncil);
      }
    });
  }
  if (questMaps.has("overfilled")) {
    const overfilledKeys = Array.from(questMaps.get("overfilled").keys());
    overfilledKeys.forEach(key => {
      if (runningCaravans.has(key)) {
        console.log(key + " is a running caravan but is overfilled.  Advise council, but list as running");
        let runningQuest = new Map(), alertForCouncil = new Map();
        runningQuest.set("DM", runningCaravans.get(key).get("DM"));
        alertForCouncil.set("DM", runningCaravans.get(key).get("DM"));
        runningQuest.set("caravan", runningCaravans.get(key).get("caravan"));
        alertForCouncil.set("DM", runningCaravans.get(key).get("caravan"));
        runningQuest.set("Start Date", runningCaravans.get(key).get("Start Date"));
        alertForCouncil.set("Start Date", runningCaravans.get(key).get("Start Date"));
        const filledContents = questMaps.get("overfilled").get(key);
        runningQuest.set("blades", filledContents.get(emoji_crossed_swords));
        alertForCouncil.set("blades", filledContents.get(emoji_crossed_swords));
        if (filledContents.get(emoji_bow_and_arrow)) {
          runningQuest.set("arrows", filledContents.get(emoji_bow_and_arrow));
          alertForCouncil.set("arrows", filledContents.get(emoji_bow_and_arrow));
        }
        runningQuests.set(key, runningQuest);
        alertsForCouncil.set(key, alertForCouncil);
      } else {
        console.log(key + " is not running but is overfilled.  Advise council prior to the vassals");
        let alertForCouncil = new Map();
        const filledContents = questMaps.get("overfilled").get(key);
        alertForCouncil.set("blades", filledContents.get(emoji_crossed_swords));
        if (filledContents.get(emoji_bow_and_arrow)) {
          alertForCouncil.set("arrows", filledContents.get(emoji_bow_and_arrow));
        }
        alertsForCouncil.set(key, alertForCouncil);
      }
    });
  }
  if (runningQuests.size > 0) {
    alerts.set("running", runningQuests);
  }
  if (alertsForBlades.size > 0) {
    alerts.set("blades", alertsForBlades);
  }
  if (alertsForVassals.size > 0) {
    alerts.set("vassals", alertsForVassals);
  }
  if (alertsForCouncil.size > 0) {
    alerts.set("council.", alertsForCouncil);
  }
  console.log(alerts);
  return alerts;
}

function errorCheckUsersHaveRole(runningCaravansWithUsers, blades, caravanRoles) {
  let alerts = new Map();
  runningCaravansWithUsers.forEach(caravan => {
    const caravanName = caravan.get("caravan");
    const roleKey = Array.from(caravanRoles.filter(role => role.name === "QC-" + caravanName.split("-")[2]).keys()); // this long ass code just gets the id number of the caravan role
    let missingUsers = [];
    caravan.get("blades").forEach(blade => {
      /**
       * need to check each Blade has the appropriate role for the caravan by fetching them
       * from the blades object and checking the role.  Can be derived by appending the caravan NUMBER
       * to the string 'QC-'
      **/
      const bladeRoles = blades.get(blade.id)._roles; // need to check this contains the appropriate role
      if (!bladeRoles.includes(roleKey[0])) {
        console.log(testUser(blade) + " does not have their role for " + caravanName); // need to report this to council
        missingUsers.push([blade]);
      }
    });
    if (caravan.has("arrows")) {
      caravan.get("arrows").forEach(arrow => {
        const arrowRoles = blades.get(arrow.id)._roles; // need to check this contains the appropriate role
        if (!arrowRoles.includes(roleKey[0])) {
          console.log(testUser(arrow) + " does not have their role for " + caravanName); // need to report this to council
          missingUsers.push([arrow]);
        }
      });
    }
    if (missingUsers.length > 0) {
      alerts.set(caravanName, missingUsers);
    }
  });
  return alerts;
}

function prompt(usableChannels) { // TO DO - alter so that it will only post if the last post wasn't sent by Griflet, also check content isn't the same as the previous weeks
  const confessional = usableChannels.find(channel => channel.name === "blades-confessionals"),
    standard = "You can describe your character's answer to the following prompt either in character as them or out of character describing it yourself.  Please remember to keep things civil, even here you are under the watchful eye of the council and the rules for both Blades and the server as a whole still apply.  For the sake of making it clear which character the confession goes with, please use the following format: `**Name of character**: [answer]`\n\n";
    fs.readFile('prompts.txt', 'utf8', (err, data) => {
    if (err) {
      return console.log(err);
    }
    var array = data.toString().split("\n");
    specificMirror([standard + array[Math.floor(Math.random() * (array.length-1))]], confessional);
  });
  return;
}

function vassalsAlert(questsWaitingForDM, usableRoles, usableChannels) {
  let finalOutput = [];
  const questKeys = Array.from(questsWaitingForDM.keys());
  let stdAnnouncement = "<@&" + usableRoles.find(role => role.name === "Vassals").id + ">, the following ",
    endAnnouncement = "Is there anyone free who can volunteer to take ";
  if (questsWaitingForDM.size == 1) {
    stdAnnouncement += "quest has been filled.\n";
    endAnnouncement += "this quest?";
  } else {
    stdAnnouncement += "quests have filled.\n";
    endAnnouncement += "these quests?";
  }
  endAnnouncement += "  Many thanks.";
  questKeys.forEach(key => {
    stdAnnouncement += key + ", the party will be: ";
    const blades = questsWaitingForDM.get(key).get("blades");
    let usersWaiting = "";
    blades.forEach(blade => {
      usersWaiting += "<@" + blade.id + ">, ";
    });
    if (questsWaitingForDM.get(key).has("arrows")) {
      const arrows = questsWaitingForDM.get(key).get("arrows");
      arrows.forEach(arrow => {
        usersWaiting += "<@" + arrow.id + ">, ";
      });
    }
    if (stdAnnouncement.length + usersWaiting.length < 2000) {
      stdAnnouncement += usersWaiting.slice(0, (usersWaiting.length-2)) + "\n";
    } else {
      finalOutput.push(stdAnnouncement);
      stdAnnouncement = usersWaiting.slice(0, (usersWaiting.length-2)) + "\n";
    }
  });
  if (stdAnnouncement.length + endAnnouncement.length < 2000) {
    stdAnnouncement += endAnnouncement;
  }  else {
    finalOutput.push(stdAnnouncement);
    stdAnnouncement = endAnnouncement;
  }
  finalOutput.push(stdAnnouncement);
  specificMirror(finalOutput, usableChannels.find(channel => channel.name === "briefing-room"));
  return;
}

function formatQuestForOutput(questWaitingForBlades, title) {
  let announcement = "\t" + title.split(" - ")[1] + " (" + questWaitingForBlades.get("blades").length;
  if (questWaitingForBlades.get("blades").length == 1) {
    announcement += " Blade ";
  } else {
    announcement += " Blades ";
  }
  announcement += "Signed Up)\n";
  return announcement;
}

function announce(questsWaitingForBlades, usableRoles, usableChannels, messageForBlades) {
  const bladesRole = usableRoles.find(role => role.name === "Blades"),
    knightsRole = usableRoles.find(role => role.name === "Knights"),
    squiresRole = usableRoles.find(role => role.name === "Squires"),
    announcements = usableChannels.find(channel => channel.name === "announcements");
  let questKeys;
  if (questsWaitingForBlades != null) {
    questKeys = Array.from(questsWaitingForBlades.keys());
  }
  let tier1Array, tier2Array, tier3Array, tier4Array;
  if (questKeys != undefined) {
    tier1Array = questKeys.filter(quest => quest.includes("1")),
    tier2Array = questKeys.filter(quest => quest.includes("2")),
    tier3Array = questKeys.filter(quest => quest.includes("3")),
    tier4Array = questKeys.filter(quest => quest.includes("4"));
  }
  let stdAnnouncement = "<@&" + bladesRole.id + "> the weekly downtime has been applied.  As a reminder you can only spend downtime or shop if you are not in a quest or if your quest has not left the guild hall.\nPlease ask <@&" + knightsRole.id + "> or <@&" + squiresRole.id + "> for spending downtime, a document of suggested activities can be found in <#" + usableChannels.find(channel => channel.name === "gameplay-reference").id + ">.\n\n",
    finalOutput = [];
  stdAnnouncement += "__**Quests Waiting For Guildmates:**__\n";
  if (questsWaitingForBlades != null) {
    if (tier1Array.length > 0) {
      let tierAnnouncement = "Tier 1:\n";
      console.log(questsWaitingForBlades);
      tier1Array.forEach(quest => {
        tierAnnouncement += formatQuestForOutput(questsWaitingForBlades.get(quest), quest);
      });
      if (tierAnnouncement.length + stdAnnouncement.length > 2000) {
        finalOutput.push(stdAnnouncement);
        stdAnnouncement = tierAnnouncement;
      } else {
        stdAnnouncement += tierAnnouncement;
      }
    }
    if (tier2Array.length > 0) {
      let tierAnnouncement = "Tier 2:\n";
      tier2Array.forEach(quest => {
        tierAnnouncement += formatQuestForOutput(questsWaitingForBlades.get(quest), quest);
      });
      if (tierAnnouncement.length + stdAnnouncement.length > 2000) {
        finalOutput.push(stdAnnouncement);
        stdAnnouncement = tierAnnouncement;
      } else {
        stdAnnouncement += tierAnnouncement;
      }
    }
    if (tier3Array.length > 0) {
      let tierAnnouncement = "Tier 3:\n";
      tier3Array.forEach(quest => {
        tierAnnouncement += formatQuestForOutput(questsWaitingForBlades.get(quest), quest);
      });
      if (tierAnnouncement.length + stdAnnouncement.length > 2000) {
        finalOutput.push(stdAnnouncement);
        stdAnnouncement = tierAnnouncement;
      } else {
        stdAnnouncement += tierAnnouncement;
      }
    }
    if (tier4Array.length > 0) {
      let tierAnnouncement = "Tier 4:\n";
      tier4Array.forEach(quest => {
        tierAnnouncement += formatQuestForOutput(questsWaitingForBlades.get(quest), quest);
      });
      if (tierAnnouncement.length + stdAnnouncement.length > 2000) {
        finalOutput.push(stdAnnouncement);
        stdAnnouncement = tierAnnouncement;
      } else {
        stdAnnouncement += tierAnnouncement;
      }
    }
  } else {
    let tierAnnouncement = "None\n";
    if (tierAnnouncement.length + stdAnnouncement.length > 2000) {
      finalOutput.push(stdAnnouncement);
      stdAnnouncement = tierAnnouncement;
    } else {
      stdAnnouncement += tierAnnouncement;
    }
  }
  if (messageForBlades != null) {
    let councilAnnouncement = "\n**__Message From The Council__**\n" + messageForBlades;
    if (councilAnnouncement.length > 2000) {
      // do something to break it up, not sure what as Message cannot accept line breaks
    }
    if (stdAnnouncement.length + councilAnnouncement.length > 2000) {
      finalOutput.push(stdAnnouncement);
      stdAnnouncement = councilAnnouncement;
    } else {
      stdAnnouncement += councilAnnouncement;
    }
  }
  finalOutput.push(stdAnnouncement); // accunt for anything less than 2000
  specificMirror(finalOutput, announcements);
  return;
}

function routineCouncilAlertsRosterOnly(rosterOutput) {
  let councilAlerts = new Map();
  councilAlerts.set("roster", rosterOutput);
  return councilAlerts;
}

function routineVassalsAnnouncement(alertsDividedIntoGroups, usableRoles, usableChannels) {
  if (alertsDividedIntoGroups.has("vassals")) { // going to want to run a VASSALS PING
    vassalsAlert(alertsDividedIntoGroups.get("vassals"), usableRoles, usableChannels);
  }
  return;
}

function routineAnnouncement(alertsDividedIntoGroups, usableRoles, usableChannels, messageForBlades) {
  if (alertsDividedIntoGroups.has("blades")) { // going to want to run an ANNOUNCEMENT with the blades included
    announce(alertsDividedIntoGroups.get("blades"), usableRoles, usableChannels, messageForBlades);
  } else {  // still need to run an alert, but with no quests waiting
    announce(null, usableRoles, usableChannels, messageForBlades);
  }
  return;
}

function routineCouncilAlertsSetup (alertsDividedIntoGroups,
  sortedCaravans,
  invalidReactions,
  userExistsResults,
  reactionsSortedIntoFilled,
  rosterOutput,
  reactionsData){
  console.log("Invalid reactions:");
  console.log(invalidReactions); // this is EMPTY even when it should have a reaction - TO DO - fix
  console.log("Reactions Sorted Data:");
  console.log(reactionsSortedIntoFilled);
  let councilAlerts = new Map();
  councilAlerts.set("alertsAllGroups", alertsDividedIntoGroups);
  councilAlerts.set("caravans", sortedCaravans);
  if (invalidReactions.size > 0) {
    councilAlerts.set("invalid reactions", invalidReactions);
  }
  if (userExistsResults[1].size > 0) {
    councilAlerts.set("missing users", userExistsResults[1]);
  }
  if (reactionsSortedIntoFilled.has("council")) {
    councilAlerts.set("quest alerts", reactionsSortedIntoFilled.get("council"));
  }
  councilAlerts.set("reactions", reactionsData);
  if (reactionsSortedIntoFilled.has("running")) {
    councilAlerts.set("running caravans", reactionsSortedIntoFilled.get("running"));
  }
  councilAlerts.set("roster", rosterOutput);
  return councilAlerts;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('downtime')
    .setDescription('Run all or parts of the Downtime routine for CitM server')
    .addStringOption(option =>
      option.setName('message')
        .setDescription("A message to display alongside this week's downtime alert.")
        .setRequired(false))
    .addStringOption(option =>
      option.setName('routine')
        .setDescription("Run a specific part of the Downtime routine rather than all of it.")
        .setRequired(false))
    .addStringOption(option =>
      option.setName('options')
        .setDescription("Options to suppress output aside from the bot channel")
        .setRequired(false)),
  async execute(interaction) {
    if (roleTest.roleTest(interaction)) {
      await interaction.deferReply();
      // 2023 restructuring
      // 1st - get the channels and roles we'll need later
      let usableChannels = await interaction.guild.channels.fetch(),
        usableRoles = await interaction.guild.roles.fetch(),
        councilAlerts = new Map();
      // 2nd - check the ROSTER
      const bladesCategory = interaction.guild.channels.cache.filter(m => m.name === 'Blades of Obsidian'), 
        bladesKey = bladesCategory.get(Array.from(bladesCategory.keys())[0]),
        rosterOutput = await roster(interaction.guild.channels.cache.filter(channel => channel.name === 'roster' && channel.parentId === bladesKey.id)),
        routine = interaction.options.getString('routine'),
        options = interaction.options.getString('options'),
        messageForBlades = interaction.options.getString('message');
      // 3rd - get the QUEST CARAVANS and split them into two lists, EMPTY and FULL
      const caravans = await pinnedCaravans(interaction.guild.channels.cache.filter(channel => channel.name === "Quest Caravans"));
      interaction.editReply("Retrieved Quest Caravans list...");
      /**
       * outputs[3] appears to be an array of:
       * sortedQuests
       * alertsForCouncil
       * ???
       * empty caravans
       * ???
      **/
      // 4th - fetch all reactions, including invalid reactions
      const questsWithReactions = await reactedQuests(interaction.guild.channels.cache.filter(channel => channel.name === 'quest-board' && channel.parentId === bladesKey.id));
      let reactionsData = await processReactions(questsWithReactions);
      interaction.editReply("Retrieved Quest-Board reactions...");
      // 5th - error check the reactions
      const userExistsResults = errorCheckUserExists(reactionsData, await interaction.guild.members.fetch());
      reactionsData = userExistsResults[0]; // removes users who are no longer on the server from reactionsData
      const checkedReactions = errorCheckReactions(reactionsData),
        validReactions = checkedReactions[0],
        invalidReactions = checkedReactions[1];
      const reactionsSortedIntoFilled = errorCheckFilledQuests(validReactions);
      const alertsDividedIntoGroups = errorCheckIsRunning(reactionsSortedIntoFilled, caravans); // add to councilAlerts
      if (alertsDividedIntoGroups.has("running")) {
        const serverMembers = await interaction.guild.members.fetch();
        const roles = await interaction.guild.roles.fetch();
        const caravanRoles = roles.filter(role => role.name.includes("QC"));
        const blades = serverMembers.filter(member => member._roles.includes(Array.from(roles.filter(role => role.name === "Blades").keys())[0]));
        const usersMissingRoles = errorCheckUsersHaveRole(alertsDividedIntoGroups.get("running"), blades, caravanRoles); // need to add this to councilAlerts
        //if (usersMissingRoles.size > 0) {
          //councilAlerts.set("missing roles", usersMissingRoles); // need to work out how to break this into its own routine
        //}
      }
      if (routine != null) { // send off alerts to Blades and Vassals as appropriate - TO DO break routines out into own functions
        switch (routine) { // if the ROUTINE option has been used, jump straight to the named routine
          case ("roster"):
            interaction.editReply("Checking roster...");
            councilAlerts = routineCouncilAlertsRosterOnly(rosterOutput); // move 'there are no sheets' to councilAlerts
            v14councilAlert(councilAlerts, usableChannels);
            break;
          case ("prompt"):
            interaction.editReply("Sending prompt to Blades...");
            prompt(usableChannels);
            break;
          case ("council"):
            interaction.editReply("Sending alerts to council...");
            councilAlerts = routineCouncilAlertsSetup(alertsDividedIntoGroups, sortCaravans(caravans), invalidReactions, userExistsResults, reactionsSortedIntoFilled, rosterOutput, reactionsData);
            v14councilAlert(councilAlerts, usableChannels);
            break;
          case ("ledger"):
            interaction.editReply("Sending Data to Ledger...");
            ledger.main();
          case ("daily"):
            interaction.editReply("Running Daily routine...");
            // same as council but also with a vassals alert
            councilAlerts = routineCouncilAlertsSetup(alertsDividedIntoGroups, sortCaravans(caravans), invalidReactions, userExistsResults, reactionsSortedIntoFilled, rosterOutput, reactionsData);
            v14councilAlert(councilAlerts, usableChannels);
            routineVassalsAnnouncement(alertsDividedIntoGroups, usableRoles, usableChannels);
            break;
          case ("announce"):
            interaction.editReply("Sending announcement to Blades...");
            routineAnnouncement(alertsDividedIntoGroups, usableRoles, usableChannels, messageForBlades);
            break;
          default:
            interaction.followUp("I'm sorry, I did not recognise the routine " + routine);
            break;
        }
      } else { // routine has not been set, so run the whole routine's output
        councilAlerts = routineCouncilAlertsSetup(alertsDividedIntoGroups, sortCaravans(caravans), invalidReactions, userExistsResults, reactionsSortedIntoFilled, rosterOutput, reactionsData);
        v14councilAlert(councilAlerts, usableChannels);
        if (options != null) {
          switch (options) {
            case ("silent"):
              interaction.editReply("The silent option was passed, announcements will not trigger");
              break;
            case ("no prompt"):
              routineAnnouncement(alertsDividedIntoGroups, usableRoles, usableChannels, messageForBlades);
              routineVassalsAnnouncement(alertsDividedIntoGroups, usableRoles, usableChannels);
              ledger.main(process.env.spreadsheetId, "Roster");
              break;
            case ("no vassals"):
              routineAnnouncement(alertsDividedIntoGroups, usableRoles, usableChannels, messageForBlades);
              prompt(usableChannels);
              ledger.main(process.env.spreadsheetId, "Roster");
              break;
            case ("no ledger"):
              prompt(usableChannels);
              routineAnnouncement(alertsDividedIntoGroups, usableRoles, usableChannels, messageForBlades);
              routineVassalsAnnouncement(alertsDividedIntoGroups, usableRoles, usableChannels);
              break;
            default:
              interaction.followUp("I'm sorry, I do not recognise the option " + options);
              break;
          }
        } else {
          prompt(usableChannels);
          routineAnnouncement(alertsDividedIntoGroups, usableRoles, usableChannels, messageForBlades);
          routineVassalsAnnouncement(alertsDividedIntoGroups, usableRoles, usableChannels);
          ledger.main(process.env.spreadsheetId, "Roster");
        }
      }
    } else {
      roleTest.warnRole(interaction, "downtime");
    }
  },
};
