const Discord = require("discord.js");
//const config = require("./config.json"); // COMMENT OUT IN RELEASE BUILDS!!!
const client = new Discord.Client({ intents: ["GUILDS", "GUILD_MESSAGES"] });
const prefix = "!";

// Importing own modules here
const categories = require("./categories.js");
const downtime = require("./downtime.js");
const output = require("./output.js");

function ping(message) {
  const timeTaken = Date.now() - message.createdTimestamp;
  mirror(`Pong! This message has a latency of ${timeTaken}ms.`, message);
  return;
}

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

client.on("messageCreate", function(message) {
  if (message.author.bot) return;
  if (!message.content.startsWith(prefix)) return;

  const commandBody = message.content.slice(prefix.length);
  const args = commandBody.split(' ');
  const command = args.shift().toLowerCase();

  switch (command) {
    case 'categories':
      categories.categoryList(message);
      break;
    case 'downtime':
      downtime.downtime(message);
      break;
    case 'ping':
      ping(message);
      break;
   case 'griflet':
      output.mirror(output.help(), message);
      break;
    default:
      break;
  }
});

//client.login(config.BOT_TOKEN); // COMMENT OUT IN RELEASE BUILDS
client.login(process.env.GRIFLET_TOKEN); // COMMENT OUT IN DEV BUILDS
