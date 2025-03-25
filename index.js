// Check for debug and if so, bring in the process.env options locally
if (process.argv.indexOf("-d") > -1) {
	require('dotenv').config();
	console.log("Debug mode engaged");
}

if (process.argv.indexOf("-t") > -1) {
	// Set certain variables to their test counterparts
	console.log("Original sheet:" + process.env.spreadsheetId);
	process.env.spreadsheetId = process.env.testSpreadsheetId;
	console.log("Altered sheet:" + process.env.spreadsheetId);
}

const fs = require('node:fs'),
	path = require('node:path'),
	foldersPath = path.join(__dirname, 'commands'),
	commandFolders = fs.readdirSync(foldersPath),
	eventsPath = path.join(__dirname, 'events'),
	eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js')),
	{Client, Collection, Events, GatewayIntentBits, Partials } = require('discord.js'),
	client = new Client({ intents: [ GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMessageReactions], partials: [Partials.GuildMember, Partials.Channel, Partials.Message, Partials.Reaction], }); // Create a new client instance
client.cooldowns = new Collection();
client.commands = new Collection(); // Load command files

for (const folder of commandFolders) {
  const commandsPath = path.join(foldersPath, folder),
  	commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file),
    	command = require(filePath);
    // Set a new item in the Collection with the key as the command name and the value as the exported module
    if ('data' in command && 'execute' in command) {
      client.commands.set(command.data.name, command);
    } else {
      console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
    }
  }
}

for (const file of eventFiles) {
  const filePath = path.join(eventsPath, file),
  	event = require(filePath);
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args));
  } else {
    client.on(event.name, (...args) => event.execute(...args));
  }
}

client.login(process.env.GRIFLET_TOKEN);
