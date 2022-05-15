const Discord = require("discord.js");
const client = new Discord.Client({ intents: ["GUILDS", "GUILD_MESSAGES"] });
const prefix = "!";

// Importing own modules here
const categories = require("./categories.js");
const downtime = require("./downtime.js");
const output = require("./output.js");
const ledger = require("./ledger.js");

function ping(message) {
  const timeTaken = Date.now() - message.createdTimestamp;
  mirror(`Pong! This message has a latency of ${timeTaken}ms.`, message);
  return;
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
    case 'daily':
      downtime.daily(message, args);
      break;
    case 'downtime':
      downtime.downtime(message, args);
      break;
    case 'ping':
      ping(message);
      break;
   case 'ledger':
     ledger.main(args);
     break;
   case 'griflet':
      output.mirror(output.help(), message);
      break;
    default:
      break;
  }
});

client.login(process.env.GRIFLET_TOKEN); // COMMENT OUT IN DEV BUILDS
