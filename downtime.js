// Importing own modules here
const output = require("./output.js"); // Gives access to HELP, MIRROR, and ARRAYMIRROR functions

function roster(rosterChannel) {
  //console.log(rosterChannel);
  return new Promise((resolve, reject) => {
    rosterChannel.forEach(channel => {
      channel.messages.fetch({limit: 100}).then(messages => {
        //console.log(messages);
        const allowedNumberOfPosts = 0; // set to 2 for release, 1 or 0 for debugging
        if (messages.size > allowedNumberOfPosts) {
          const newSheetPosters = [];
          messages.forEach(message => {
            newSheetPosters.push(message.author.username + "#" + message.author.discriminator);
          });
          resolve(newSheetPosters);
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
  // the *** provides a separator which can be used later
  return tier.split("*").join("") + "***" + title.split("*").join("");
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
    const channels = [];
    //console.log(children);
    const childList = Array.from( children.keys() );
    for(let c = 0; c < children.size; c++) {
      let child = children.get(childList[c]);
      if (child.name.split("-")[0] == "quest") {
        const pinned = await child.messages.fetchPinned();
        const pins = [];
        if (pinned.size == 0) {
          pins.push(child.name, null);
        } else {
          pinned.forEach(pin => {
            pins.push(child.name, questTitle(pin.content));
          });
        }
        channels.push(pins);
      }
    }
    return channels;
  }
}

function councilAlert(questsReacted, runningCaravans, council) {
  let report = "";
  let emptyCaravans = "";
  let filledCaravans = "";
  let reactedQuests = "";
  let sortedCaravans = runningCaravans.sort(); // reorders the caravans in name order
  questsReacted.forEach(quest => {
    if (quest.length != 0) {
      quest.forEach(reaction => {
        reactedQuests += questTitle(reaction.message.content).split("***").join(" - ") + reaction._emoji.name + "  x" + reaction.count + "\n";
      });
    }
  });
  sortedCaravans.forEach(caravan => {
    if (caravan[1] == null) {
      emptyCaravans += caravan[0] + "\n";
    } else {
      filledCaravans += caravan[0] + "  " + caravan[1].split("***").join(" - ") + "\n";
    }
  });
  report += "Reacted Quests:\n" + reactedQuests + "\n\nFilled Caravans:\n" + filledCaravans + "\n\nEmpty Caravans:\n" + emptyCaravans;
  console.log(report);
  output.specificMirror(report, council);
  return;
}

async function questCheck(cache, council) {
  // Work out which quests are awaiting guild mates
  // NEED - Quests with reactions
  // NEED - Running Quests
  let outputString = "";
  const questsReacted = await reactedQuests(cache.filter(channel => channel.name === 'quest-board'));
  const runningCaravans = await pinnedCaravans(cache.filter(channel => channel.type === 'GUILD_CATEGORY' && channel.name === 'Quest Caravans'));
  //console.log(questsReacted);
  //console.log(runningCaravans);
  councilAlert(questsReacted, runningCaravans, council);
  // is coming through as [[],...] where empty results in the nestedArray mean no reactions
  return outputString;
}

function buildRoleList(cache) {
  let usableRoles = [];
  cache.forEach(role => {
    if (role.name == "Blades" || role.name == "Knights" || role.name == "Squires" || role.name == "Vassals") {
      let usableRole = [];
      usableRole.push(role.id, role.name);
      usableRoles.push(usableRole);
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
    if (channel.name == "gameplay-reference" || channel.name == "announcements" || channel.name == "briefing-room" || channel.name == "bot-stuff") {
      let usableChannel = [];
      usableChannel.push(channel.id, channel.name);
      usableChannels.push(usableChannel);
    }
  });
  return usableChannels;
}

function announce(roles, usableChannels, args, announcementChannel) {
  // replace message with guild in the function?
  let usableRoles = buildRoleList(roles);
  stdAnnouncement = "<@&" + returnItemId(usableRoles, "Blades") + "> the weekly downtime has been applied.  As a reminder you can only spend downtime or shop if you are not in a quest or if your quest has not left the guild hall.\nPlease ask <@&" + returnItemId(usableRoles, "Knights") + "> or <@&" + returnItemId(usableRoles, "Squires") + "> for spending downtime, a document of suggested activities can be found in <#" + returnItemId(usableChannels, "gameplay-reference") + ">.";
  let additionalAnnouncement = "";
  args.forEach(arg => {
    additionalAnnouncement += arg + " ";
  });
  //output.specificMirror(stdAnnouncement + "\n\n" + additionalAnnouncement, announcementChannel);
}

async function downtime(message, args) {
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
  let questsWaitingBlades = []; // will fill this with quests awaiting guildmates
  let councilLog = ""; // will fill this with output for the council
  let questsWaitingVassals = []; // will fill this with quests awaiting DM
  let usableChannels = buildChannelList(message.guild.channels.cache.filter(m => m.type === 'GUILD_TEXT'));
  // roster will return the authors of any sheets not yet checked
  const rosterOutput = await roster(message.guild.channels.cache.filter(channel => channel.name === 'roster'));
  console.log(rosterOutput); // debug only
  const questsChecked = questCheck(message.guild.channels.cache, message.guild.channels.cache.filter(m => m.id === returnItemId(usableChannels, "bot-stuff")));
  // announce(message.guild.roles.cache, usableChannels, args, message.guild.channels.cache.filter(m => m.id === returnItemId(usableChannels, "announcements")));
}

module.exports = {downtime}
