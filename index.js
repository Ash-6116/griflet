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

function roleTest(message) {
  // this function checks a user has a specific role - used for restricting commands on Castle In The Mist server
  if (message.member.roles.cache.some(role => role.name === 'Knights') || message.member.roles.cache.some(role => role.name === 'Squires') || message.member.roles.cache.some(role => role.name === 'Baroness')) {
    console.log("User has the Knights role, the Squires role, or the Baroness role");
    return true;
  } else {
    console.log("User does not have an applicable role");
    return false;
  }
}

function warnRole(message, command) {
  output.mirror("Unfortunately, the command **" + command + "** is not available at this time.  It is currently restricted to Knights, Squires, or the Baroness.", message);
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
      if (roleTest(message)) { categories.categoryList(message); } else { warnRole(message, 'categories'); }
      break;
    case 'daily':
      if (roleTest(message)) { downtime.daily(message, args); } else { warnRole(message, 'daily'); }
      break;
    case 'downtime':
      if (roleTest(message)) { downtime.downtime(message, args); } else { warnRole(message, 'downtime'); }
      break;
    case 'ping':
      ping(message);
      break;
   case 'ledger':
     if (roleTest(message)) { ledger.main(args); } else { warnRole(message, 'ledger'); }
     break;
   case 'griflet':
      output.mirror(output.help(), message);
      break;
    default:
      break;
  }
});

client.login(process.env.GRIFLET_TOKEN); // COMMENT OUT IN DEV BUILDS
