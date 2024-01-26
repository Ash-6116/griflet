const fs = require('node:fs');
const path = require('node:path');
const {Client, Collection, Events, GatewayIntentBits } = require('discord.js');
const { messageCreateHandling } = require('./events/messageCreate.js');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] }); // Create a new client instance
client.cooldowns = new Collection();
client.commands = new Collection(); // Load command files

// custom client reactions - might be able to write into eventFiles
client.on('messageCreate', async (message) => { // triggered with every message sent to a server Griflet is a member of
	messageCreateHandling(client, message);
});

client.on('guildMemberRemove', async (member) => { // triggered if someone leaves the server
	console.log("Member has left server:");
	console.log(member.user);
});


const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
  const commandsPath = path.join(foldersPath, folder);
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    // Set a new item in the Collection with the key as the command name and the value as the exported module
    if ('data' in command && 'execute' in command) {
      client.commands.set(command.data.name, command);
    } else {
      console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
    }
  }
}

const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
  const filePath = path.join(eventsPath, file);
  const event = require(filePath);
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args));
  } else {
    client.on(event.name, (...args) => event.execute(...args));
  }
}

client.login(process.env.GRIFLET_TOKEN);
