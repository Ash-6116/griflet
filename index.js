// updated to GOLD 2025.12.19

const fs = require('node:fs'),
	pjson = require('./package.json');
	path = require('node:path'),
	commandPath = path.join(__dirname, 'commands'),
	commandFolders = fs.readdirSync(commandPath),
	eventPath = path.join(__dirname, 'events'),
	eventFiles = fs.readdirSync(eventPath).filter(file => file.endsWith('.js')),
	sharedPath = path.join(__dirname, 'shared_classes'),
	sharedFiles = fs.readdirSync(sharedPath),
	{Client, Collection, Events, GatewayIntentBits, Partials, REST, Routes} = require('discord.js'),
	client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMessageReactions], partials: [Partials.GuildMember, Partials.Channel, Partials.Message, Partials.Reaction] }); // Creates a new client instance
	

function checkVariables() { // sanity check to ensure the env variables have been populated
	const listOfVariables = [{ id: "process.env.GCLOUD_PROJECT", short: "GCLOUD_PROJECT", value: process.env.GCLOUD_PROJECT},
			{ id: "process.env.outputStyle", short: "Output Style", value: process.env.outputStyle},
			{ id: "process.env.spreadsheetId", short: "Spreadsheet ID", value: process.env.spreadsheetId},
			{ id: "process.env.testSpreadsheetId", short: "Test Spreadsheet ID", value: process.env.testSpreadsheetId}],
		listOfProtectedVariables = [{ id: "process.env.GOOGLE_APPLICATION_CREDENTIALS", short: "GOOGLE_APPLICATION_CREDENTIALS", value: process.env.GOOGLE_APPLICATION_CREDENTIALS},
			{ id: "process.env.GRIFLET_TOKEN", short: "GRIFLET_TOKEN", value: process.env.GRIFLET_TOKEN},
			{ id: "process.env.GRIFLET_CLIENT_ID", short: "GRIFLET CLIENT ID", value: process.env.GRIFLET_CLIENT_ID},
			{ id: "process.env.GRIFLET_GUILD_ID", short: "GRIFLET GUILD ID", value: process.env.GRIFLET_GUILD_ID}];
	listOfVariables.forEach(variable => {
		if (variable.value !== undefined) {
			console.log("Variable Loaded:- " + variable.short + ": " + variable.value);
		} else {
			console.error("ERROR: " + variable.id + " not populated!!!");
		}
	});
	listOfProtectedVariables.forEach(variable => {
		if (variable.value !== undefined) {
			console.log("Variable Loaded:- " + variable.short);
		} else {
			console.error("ERROR: " + variable.id + " not populated!!!");
		}
	});
}

function printSpacer() {
	const width = process.stdout.columns;
	let print = "";
	for (i = 0; i < width; i++) {
		print += "*";
	}
	console.log(print);
}

printSpacer();

console.log(pjson.name + " v" + pjson.version + "\n" + pjson.description + "\nLast Version Started: " + pjson.incept_date); // flash up the version of Griflet on screen, reading from the package.json

printSpacer();

if (process.argv.includes("-d")) { // Check for debug and if so, bring in the process.env options locally - SEE IF THIS CAN BE SIMPLIFIED TO ("d") to allow combining!!!
	require('dotenv').config();
	console.log("Debug mode engaged");
}

checkVariables(); // check the env-variables have been loaded correctly

if (process.argv.includes("-t")) { // Set certain variables to their test counterparts
	console.log("Original sheet:" + process.env.spreadsheetId);
	process.env.spreadsheetId = process.env.testSpreadsheetId;
	console.log("Altered sheet:" + process.env.spreadsheetId);
}

printSpacer();

client.cooldowns = new Collection();
client.commands = new Collection(); // Load command files into this in a bit
console.log("Commands:");
for (const folders of commandFolders) { // Add commands from subfolders
	const commandFiles = fs.readdirSync(path.join(commandPath, folders));
	for (const file of commandFiles) { // commandFiles doesn't exist you wally!!!
		const command = require(path.join(path.join(commandPath,folders),file));
		if ('data' in command && 'execute' in command) { // Set a new item in the Collection with the key as the command name and the value as the exported module
			console.log("Added to command set: " + command.data.name);
			client.commands.set(command.data.name, command);
		} else {
			console.error(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
		}
	}
}
printSpacer();
console.log("Events:");
for (const file of eventFiles) { // same as above, but for onEvent files
	const event = require(path.join(eventPath, file));
	console.log("Added to events: " + event.name);
	if (event.once) {
		client.once(event.name, (...args) => event.execute(...args));
	} else {
		client.on(event.name, (...args) => event.execute(...args));
	}
}
printSpacer();
console.log("Shared Classes:");
for (const file of sharedFiles) { // same as above, but for shared files
	console.log("Found " + file);
}
printSpacer();
client.login(process.env.GRIFLET_TOKEN); // will produce its own errors on the console if an invalid token is supplied
