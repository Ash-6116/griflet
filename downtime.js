// Importing own modules here
const output = require("./output.js"); // Gives access to HELP, MIRROR, and ARRAYMIRROR functions

function rosterCheck(message) {
  return new Promise((resolve, reject) => {
    message.guild.channels.cache.filter(channel => channel.name === 'roster').forEach(channel => {
      channel.messages.fetch({ limit: 100 }).then(messages => {
        console.log(`Received ${messages.size} messages from #roster`);
        if (messages.size > 2) {
          console.log(`There are new sheets to be checked.`);
          resolve(messages.size);
        } else {
          console.log(`There are no sheets to be checked.`);
          resolve(null);
        }
      });
    });
  });
}

function questCheck(message) {
  return new Promise((resolve, reject) => {
    message.guild.channels.cache.filter(channel => channel.name === 'quest-board').forEach(channel => {
      channel.messages.fetch({ limit: 100 }).then(messages => {
        console.log(`There are currently ${messages.size} quests on the board\n`);
        messages.forEach(message => {
          //let reactions = message.reactions.cache.find(emoji => emoji.emoji.name == '⚔️');
          //let reactions = message.reactions.cache.find(emoji => emoji.emoji.name == '*');
          message.reactions.cache.map(async (reaction) => {
            let reactedUser = await reaction.users.fetch();
              reactedUser.map((user) => {
                console.log("Users reacting to " + message.content + "\n" + user.username + "#" + user.discriminator + "\nTotal Players: " + reactedUser.size + "\n");
              });
            console.log(reaction.count);
          });
        });
        resolve(null);
      });
    });
  });
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
  // Step 1 - check for additional posts in #roster - spin this off into a Promise
  //rosterCheck(message);
  // Step 2 - check if anyone has left the server in the last week with the command
  // Step 3 - Work out which quests are awaiting guildmates.
  //questCheck(message);
  console.log("This module is still in development.");
  return;
}

module.exports = {downtime};
