// Importing own modules here
const output = require("./output.js"); // Gives access to HELP, MIRROR, and ARRAYMIRROR functions

async function rosterCheck(message) {
  rosterSheets(message).then((posters) => {
    if (posters != null) {
      console.log("There are sheets waiting to be checked - need to post OUTPUT for this");
      console.log("New sheets from:");
      posters.forEach(poster => {
        console.log(poster);
      });
    }
  });
  return;
}

function rosterSheets(message) {
  return new Promise((resolve, reject) => {
    message.guild.channels.cache.filter(channel => channel.name === 'roster').forEach(channel => {
      channel.messages.fetch({ limit: 100 }).then(messages => {
        const allowedNumberOfPosts = 1; // set to 2 for release, 1 or 0 for debugging
        if (messages.size > allowedNumberOfPosts) {
          const listMessages = Array.from( messages.keys() );
          const newSheetPosters = [];
          for (let index = allowedNumberOfPosts; index < messages.size; index++) {
            user = messages.get(listMessages[index]).author;
            newSheetPosters.push(user.username + "#" + user.discriminator);
          }
          resolve(newSheetPosters);
        } else {
          resolve(null);
        }
      });
    });
  });
}

async function fetchReactions(quest) {
  let booleanReactionFlag;
  let reactionArray = []
  quest.reactions.cache.map(async (reaction) => {
    booleanReactionFlag = true;
    reactionArray.push(reaction);
  });
  if (booleanReactionFlag) {
    return reactionArray;
  }
  return;
}

function returnQuestTitle(quest) {
  // Takes a message containing a quest details and splits out all but the quest's title which is returned.
  let titleArray = quest.content.split(/\r?\n/);
  let title;
  let tier;
  if (titleArray[0] != '---') {
    title = titleArray[0];
    tier = titleArray[1];
  } else {
    title = titleArray[1];
    tier = titleArray[2];
  }
  return tier.split("*").join("") + "***" + title.split("*").join(""); // the *** provides a separator which we can use later
}

function returnUsers(users) {
  let userArray = [];
  users.forEach(user => {
    userArray.push(user.username + "#" + user.discriminator);
  });
  return userArray;
}

function returnEmojiUsers(emoji) {
  return new Promise((resolve, reject) => {
    let returnItem = [];
    emoji.users.fetch().then((users) => {
      if (users.size > 0) {
        returnItem = returnUsers(users);
      }
    }).finally(() => {
      resolve(returnItem);
    });
  });
}

function fetchCaravans(message) {
  return new Promise((resolve, reject) => {
    message.guild.channels.cache.filter(channel => channel.type === 'GUILD_CATEGORY' && channel.name === 'Quest Caravans').forEach(category => {
      const channels = [];
      category.children.forEach(child => {
        //channels.push(child.name); // child.name used as shorthand for a channel, currently pumps out EVERY child including ooc channels
        if (child.name.split("-")[0] == "quest") {
          channels.push(child); // child.name used as shorthand for a channel
        }
      });
      resolve(channels);
    });
  });
}

function fetchQuests(message) {
  return new Promise((resolve, reject) => {
    message.guild.channels.cache.filter(channel => channel.name === 'quest-board').forEach(channel => {
      channel.messages.fetch({ limit: 100 }).then(messages => {
        resolve(messages);
        }).catch(error => {
        reject(error);
      });
    });
  });
}

function fetchEachReaction(quest) {
  return new Promise((resolve, reject) => {
    const reactionsArray = [];
    fetchReactions(quest).then((reactions) => {
      if (reactions != undefined) { // used to filter out QUESTS with no REACTIONS
        reactions.forEach(reaction => {
          //reactionsArray.push(reaction._emoji.name); // used as a shorthand for an entire REACTION
          reactionsArray.push(reaction);
        });
       };
    }).finally(() => {
      resolve(reactionsArray);
    });
  });
}

function errorTooManyReactions(quest, pins) {
  if (quest[1].length > 1) {
    /* there are too many emojis in our reacted quest - this may mean that someone has posted a reaction other
     * than crossed swords.
     */
    quest[1].forEach(reaction => {
      if (reaction._emoji.name != '⚔️' ) {
        // now we want to know who posted the invalid reaction
        returnEmojiUsers(reaction).then((users) => {
          // this may be an invalid reaction, but is it a condonable reaction?  Need to check the pins
          if (checkRunning(pins, quest[0])) {
            console.log("Invalid but possibly condonable reaction detected on " + quest[0] + " by the following users:");
            console.log(users);
          } else {
            console.log("Invalid reaction detected!! " + reaction._emoji.name + " on quest: " + quest[0]);
            console.log(users);
          }
        });
      }
    });
  }
}

function errorCheckReactions(quest, pins) {
  // Each QUEST is an array of [TITLE[REACTION,...]]
  /*
   * pins is an array containing channels and quests in the format [[CARAVAN, QUEST],...], though caravans
   * that are NOT running a quest return as [CARAVAN, null]
   */
  // WIll be wanting OUTPUT from this function
  // quest[0] is the TITLE
  errorTooManyReactions(quest, pins);
  if (quest[1][0].count < 4) {
    // We may want to REPORT this quest to the BLADES, unless it is ALREADY RUNNING
    if (checkRunning(pins, quest[0])) {
      console.log("This quest has fewer than 4 crossed swords, but is currently running: " + quest[0]);
      // may need to report this to the VASSALS
    } else {
      // need to report this quest to the BLADES
      console.log("This is not a filled quest! " + quest[0]);
    }
  } else if (quest[1][0].count > 4) {
    console.log("This quest has too many reactions!!! " + quest[0]);
    // if we have too many reactions, we need to print all reactions as we cannot get datetime stamps
    quest = quest[1][0];
    returnEmojiUsers(quest).then((users) => {
      console.log(quest[0] + " has too many " + '⚔️' + "  reactions.  Users who have reacted:");
      console.log(users);
    });
  } else {
    // Let's check this quest against the pins
    if (checkRunning(pins, quest[0])) {
      console.log("This is a filled quest which is already running: " + quest[0]);
    } else {
      console.log("This is a filled quest which is not currently running: " + quest[0]);
    }
  }
  return;
}

function checkRunning(pins, questTitle) {
  var running = new Boolean(false);
  pins.forEach(pin => {
    if (pin[1] == questTitle) {
      running = true;
    }
  });
  return running;
}

function returnCaravanPin(caravan) {
  return new Promise((resolve, reject) => {
    const pinnedCaravan = []
    caravan.messages.fetchPinned().then((pins) => {
      pins.forEach(pin => pinnedCaravan.push(caravan.name, returnQuestTitle(pin)));
    }).finally(() => {
      resolve(pinnedCaravan);
    });
  });
}

async function returnPinnedCaravan(caravan) {
  let caravanPin = [];
  let pins = await returnCaravanPin(caravan);
  if (pins.length == 0) {
    caravanPin.push(caravan.name, null);
  } else {
    caravanPin = pins;
  }
  return caravanPin;
}

function prepareOutputReactedQuests(questsReacted) {
  let outputString = "";
  outputString += "Quests With Reactions:\n";
  questsReacted.forEach(quest => {
    let name = quest[0].split("***").join(" - ");
    outputString += name + "\n";
    quest[1].forEach(emoji => {
      outputString += emoji._emoji.name + "  x" + emoji.count + "  ";
    });
    outputString += "\n";
  });
  return outputString;
}

function prepareOutputRunningCaravans(runningCaravans) {
  let outputString = "";
  outputString += "Running Caravans:\n";
  runningCaravans.forEach(caravan => {
    if (caravan[1] != null) {
     outputString += caravan[0] + ": " + caravan[1].split("***").join(" - ") + "\n"; 
    }
  });
  return outputString;
}

async function questCheck(message) {
  let outputString = "";
  const questsReacted = await reactedQuests(message);
  const runningCaravans = await pinnedCaravans(message);
  questsReacted.forEach(quest => {
    errorCheckReactions(quest, runningCaravans); // uncomment for release
  });
  outputString += prepareOutputRunningCaravans(runningCaravans);
  outputString += prepareOutputReactedQuests(questsReacted);
  output.mirror(outputString, message);
  return;
}

async function pinnedCaravans(message) {
  const caravans = await fetchCaravans(message); // fills the caravans variable with the caravans from 'Quest Caravams'
  // caravans is the equivalent of quests in reactedQuests()
  const pinArray = [];
  for (let index = 0; index < caravans.length; index++) {
    let caravan = caravans[index];
    pin = await returnPinnedCaravan(caravan);
    pinArray.push(pin);
  }
  return pinArray;
}

async function reactedQuests(message) {
  // needs to be async because of await
  // TODO - refer to this to build up pinnedCaravans()
  const quests = await fetchQuests(message); // fills the quests variable with the messages from 'quest-board'
  const questArray = [];
  const questKeys = Array.from( quests.keys() );
  for (let index = 0; index < quests.size; index++) {
    let quest = quests.get(questKeys[index]);
    const reactionArray = [];
    reactions = await fetchEachReaction(quest);
    if (reactions.length != 0) {
      const reactedQuest = [];
      reactedQuest.push(returnQuestTitle(quest)); // pushes the quest into an array - using returnQuestTitle as a convenient placeholder for QUESTS
      reactedQuest.push(reactions);
      questArray.push(reactedQuest);
    }
  }
  return questArray;
}

function announce(message) {
  announcement = "@Blades the weekly downtime has been applied.  As a reminder you can only spend downtime or shop if you are not in a quest or if your quest has not left the guild hall.\nPlease ask @Knights or @Squires for spending downtime, a document of suggested activities can be found in gameplay-reference.";
  output.mirror(announcement, message); // need to work out how to ping a role
  return;
}

function downtime(message) {
  /**
   * Wish to add a function to run routines done when applying weekly downtime.
   * 1) Check if there are any additional posts in #roster that need to be sorted out.
   * 2) Check if anyone has left the server in the last week with the command:
   *      from: Dyno in: general-lounge 'absorbed'
   * 3) Work out which quests are awaiting guildmates.
   * 4) Send a message to #announcements with the following format:
   *      @Blades the weekly downtime has been applied.  As a reminder you can only spend downtime or shop if
   *      you are not in a quest or if your quest has not left the guild hall.
   *      Please ask @Knights or @Squires for spending downtime, a document of suggested activities can be 
   *      found in gameplay-reference.
   *
   *      Quests Waiting For Guildmates:
   *      Tier 1: Impregnable Fortress
  **/
  // Step 1 - check for additional posts in #roster
  rosterCheck(message); // uncomment for release
  // Step 2 - check if anyone has left the server in the last week with the command
  // Step 3 - Work out which quests are awaiting guildmates.
  questCheck(message);
  // Step 4 - Send a message to #announcements with a predefined message
  //announce(message);
  console.log("This module is still in development: !downtime");
  return;
}

module.exports = {downtime};
