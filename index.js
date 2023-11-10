const fs = require('node:fs');
const path = require('node:path');
const {Client, Collection, Events, GatewayIntentBits } = require('discord.js');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] }); // Create a new client instance
client.cooldowns = new Collection();
client.commands = new Collection(); // Load command files
client.on('messageCreate', async (message) => {
         // 23.11 addition as a joke, wait for a message from viewing-area including the word 'morning'
         if (message.channelId === '473284658025594881' && message.author.id != '897148749267222649') { // message >
         //if (message.guildId === '775705450338451478' && message.author.id != '897148749267222649') { // message >
                 if (message.content.toLowerCase().includes("morning")) { // if someone posts a message containing >
                         // post "Morning user, how are you?"
                         await message.reply("morning " + message.author.username + ", how are things with you?");
                         console.log("greeting sent");
                 } else if (message.content.toLowerCase().includes("how about you") || message.content.toLowerCase(>
                         // post "Pretty good thanks"
                         await message.reply("I'm doing pretty good thanks.");
                         console.log("response sent");
                 }
         }
         // 23.11 addition as serious, wait for a message in ads-discussion with three keywords and auto pin it.
         //if (message.guildId === '775705450338451478' && message.channelId === '1172549592345235466') { // on dev>
         if (message.guildId === '473284658025594881' && message.channelId === '711238243676586023') {
                 if (message.content.toLowerCase().includes("**title**") && message.content.toLowerCase().includes(>
                         message.pin(); // pin the message
                 }
         }
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
