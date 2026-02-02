/**
* Automate the procedure for running a giveaway on Castle In The Mist
*
* 1. Retrieve all currently active BLADES from the Guild Roster along with their TIERS
* 2. Retrieve all items from the Shop spreadsheet (please put this in an .env variable!!!
* 3. Determine whether or not to include Tricky Treats (optional variable)
*      If set, retrieve list of Tricky Treats
* 4. For each BLADE:
*      Randomly assign ONE item from their available TIER from the shoppe (see Giveaway Template)
*      If Tricky Treats is set, randomly generate a number between 0 and 19 (mimicking a d20 roll) and assign the corresponding treat
* 5. Write out the information to the LEDGER
* 6. Report to bot-stuff
**/

const { SlashCommandBuilder, EmbedBluder } = require('discord.js'),
	roleTest = require('../../shared_classes/roleTest.js'),
	outputStyle = process.env.outputStyle,
	fs = require('fs'),
	{ getAuthToken, getSpreadsheet, getSpreadsheetValues, getSpreadsheetValuesByColumn, writeSpreadsheetValues } = require('../../shared_classes/googleSheetsService.js'),
	{ getAllSpreadsheetValues, writeToLedger } = require('./downtimeSpend.js');

function retrieveTreats() {
	if (fs.existsSync('tricky_treats.txt')) {
		var array = fs.readFileSync('tricky_treats.txt').toString().split("\n");
		array.splice(-1); // removing the last element as it'll be blank
		return array;
	} else {
		console.error("tricky_treats.txt is missing!");
	}
	return null;
}

async function retrieveTierItems() {
	const spreadsheetId = process.env.shopData,
		sheetName = "Tier Items",
		auth = await getAuthToken(),
		values = await getSpreadsheetValuesByColumn({spreadsheetId, auth, sheetName});
	return values.data["values"];
}

async function retrieveBlades() {
	const spreadsheetId = process.env.spreadsheetId,
		sheetName = "Roster",
		values = await getAllSpreadsheetValues(spreadsheetId, sheetName);
	return values;
}

function randomItem(items, tier) {
	return items[tier][Math.floor(Math.random() * (items[tier].length))]; // doing it this way so I don't have to write out Math.floor() four times
}

function assignGifts(blades, items, treats, booleanTrickyTreats) {
	let giftOutput = [];
	blades.shift(); // remove the first element as its a set of titles
	blades.forEach(blade => {
		if (blade[12] != "Council Member") { // filter out the councilmembers
			let bladeMap = new Map();
			bladeMap.set("Name", blade[2]);
			switch (blade[12]) {
				case "Recruit":
					bladeMap.set("Item", randomItem(items, 0));
					break;
				case "Adept":
					bladeMap.set("Item", randomItem(items, 1));
					break;
				case "Expert":
					bladeMap.set("Item", randomItem(items, 2));
					break;
				case "Hero":
					bladeMap.set("Item", randomItem(items, 3));
					break;
				default:
					console.log("What?? The TIER was left blank???");
					break;
			}
			if (booleanTrickyTreats) {
				if (blade[12] != "Council Member") {
					bladeMap.set("Treat", treats[Math.floor(Math.random() * (treats.length))]);
				}
			}
			giftOutput.push(bladeMap);
		}
	});
	return giftOutput;
}

async function writeToSheet(giftOutput, title) {
	let ledgerOutput = [];
	giftOutput.forEach(blade => {
		ledgerOutput.push([blade.get("Name"), 0, 0, 0, 0, 0, title, blade.get("Item")]);
		if (blade.has("Treat")) {
			ledgerOutput.push([blade.get("Name"), 0, 0, 0, 0, 0, "Tricky Treats", blade.get("Treat")]);
		}
	});
	writeToLedger(ledgerOutput);	
	return;
}

async function giveaway(interaction) {
	let trickyTreats = false;
	if (interaction.options.getBoolean("tricky_treats") == true) { // will not trigger if this is set to False or not passed
		trickyTreats = true;
	}
	const blades = await retrieveBlades(),
		items = await retrieveTierItems(),
		treats = retrieveTreats(),
		giftOutput = assignGifts(blades, items, treats, trickyTreats);
	writeToSheet(giftOutput, interaction.options.getString("title"));
	interaction.followUp("Done ;)");
}

module.exports = {
	data: new SlashCommandBuilder()
		.setName('giveaway')
		.setDescription('Run a giveaway on Castle In The Mist')
		.addStringOption(option =>
			option.setName('title')
				.setDescription('The title to put on the ledger output')
				.setRequired(true))
		.addBooleanOption(option =>
			option.setName('tricky_treats')
				.setDescription('Enable tricky treats')
				.setRequired(false)),
	async execute(interaction) {
		if (roleTest.roleTest(interaction)) {
			await interaction.deferReply();
			giveaway(interaction);
		} else {
			roleTest.warnRole(interaction, "giveaway");
		}
	}
};
