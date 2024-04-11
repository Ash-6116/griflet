const { SlashCommandBuilder, EmbedBuilder } = require('discord.js'),
	outputStyle = process.env.outputStyle,
	{ getAuthToken, getSpreadsheet, getSpreadsheetValues, writeSpreadsheetValues } = require('../../shared_classes/googleSheetsService.js'),
	{ writeToLedger } = require('./downtimeSpend.js');

async function fetchFromCharacterSheet(url, range) {
	let output = undefined;
	try {
		const gSheet = await getSpreadsheetValues({
			spreadsheetId: url.split("d/")[1].split("/edit")[0],
			sheetName: range,
			auth: await getAuthToken()
		});
		output = gSheet.data.values;
	} catch (error) {
		console.error(error);
	}
	return output;
}

function writeGatheredData(gatheredData) {
	writeToLedger(gatheredData);
	return;
}

async function generateBonusLedgerData(sheet, bonus, retiredText) {
	if (bonus > 0) {
		const bladeName = await fetchFromCharacterSheet(sheet, "C6:R6");
		const bladeLevel = await fetchFromCharacterSheet(sheet, "AL6:AM7");
		let progress = undefined;
		try {
			const response = await getSpreadsheetValues({
				spreadsheetId: process.env.spreadsheetId,
				sheetName: "Progression",
				auth: await getAuthToken()
			});
			progress = response.data.values;
		} catch (error) {
			console.error(error.message, error.stack);
		}
		// 1st, generate the row with the bonuses
		let outputArrays = [[bladeName[0][0], bonus, 0, progress[bladeLevel][2], 0, 0, "Retired Bonus", retiredText]];
		// 2nd, get the gold for all the levels the character jumped
		for (i = 2; i <= bladeLevel; i++) {
			outputArrays.push([bladeName[0][0], 0, progress[i][3].split(" GP")[0], 0, 0, 0, "Levelling", "Level " + i]);
		}
		return outputArrays;
	}
	return undefined;
}

async function gatherDataForLevelling(sheet, previousBlade) {
	// ERROR CHECKS WILL BE NEEDED HERE - TODO
        /**
         * should only kick in if:
         * 1. The sheet is NOT level 1
         * 2. A previous Blade has been supplied as an argument
         * 3. The previous Blade can be retrieved from the Retired roster
        **/
	// 1 - Determine Eligibility for Bonuses based on previous Blade (fetch previous Blade data first)
	let prevBladeData = undefined;
        try {
        	const response = await getSpreadsheetValues({
        		spreadsheetId: process.env.spreadsheetId,
        		sheetName: "Retired",
        		auth: await getAuthToken()
        	});
        	prevBladeData = response.data.values.filter(retiree => retiree[2] === previousBlade);
        	// if prevBladeData has no contents, the previous Blade was not found on the Retired Roster !!!
        	if (prevBladeData.length < 1 || prevBladeData == undefined) {
        		console.error("No previous Blade found");
        		prevBladeData = undefined
        	} else if (prevBladeData.lanth > 1) {
        		console.error("Too many previous Blades found");
        		prevBladeData = undefined
        	} else {
        		console.log(prevBladeData[0][2] + " | " + prevBladeData[0][12]);
        		prevBladeData = prevBladeData[0][12];
        	}
        } catch (error) {
        	console.error(error.message, error.stack);
        }
        // 2 - Calculate bonuses to award based on new character's level
        const bladeLevel = await fetchFromCharacterSheet(sheet, "AL6:AM7");
        let awardedBonus = 0, tier = undefined;
        if (prevBladeData != undefined) {
        	switch (prevBladeData) {
        		case 'Recruit':
        			if (bladeLevel > 1) {
        				higherLevelWarning();
        			}
        			break;
        		case 'Adept':
        			if (bladeLevel > 3) {
        				higherLevelWarning();
        			} else {
        				console.log("This Blade can have a bonus " + 2*(bladeLevel-1) + " tokens");
        				awardedBonus = 2*(bladeLevel-1);
        				tier = 2;
        			}
        			break;
        		case 'Expert':
        			if (bladeLevel > 4) {
        				higherLevelWarning();
        			} else {
        				console.log("This Blade can have a bonus " + 2*(bladeLevel-1) + " tokens");
        				awardedBonus = 2*(bladeLevel-1);
        				tier = 3;
        			}
        			break;
        		case 'Hero':
        			if (bladeLevel > 5) {
        				higherLevelWarning();
        			} else {
        				console.log("This Blade can have a bonus " + 2*(bladeLevel-1) + " tokens");
        					awardedBonus = 2*(bladeLevel-1);
        					tier = 4;
        			}
        			break;
        		default:
        			console.error("prevBladeData wasn't set to correct range.  Check retired blade and try again");
        			break;
        	}
        }
        // 3 - generate ledger output for level gains and token bonus
        let outputLedgerData = await generateBonusLedgerData(sheet, awardedBonus, "T" + tier + " retirement: " + previousBlade);
        return outputLedgerData;
}

function higherLevelWarning() {
	console.error("This Blade has a higher level than their retirement bonus allows for");
	return;
}

async function gatherDataForBackground(sheet) {
	const bladeName = await fetchFromCharacterSheet(sheet, "C6:R6"),
		bladeBackground = await fetchFromCharacterSheet(sheet, "Z5:AD5");
	let outputArray = [];
	// need to fetch Background sheet from Guild Roster
	try {
		const backgrounds = await getSpreadsheetValues({
			spreadsheetId: process.env.spreadsheetId,
			sheetName: "Backgrounds",
			auth: await getAuthToken(),
			range: "A:B"
		});
		const backgroundGold = backgrounds.data.values.filter(background => background[0].toLowerCase() === bladeBackground[0][0].toLowerCase())[0][1];
		outputArray.push(bladeName[0][0], 0, backgroundGold, 0, 0, 0, "Background", bladeBackground[0][0]);
	} catch (error) {
		console.error(error);
	}
	return outputArray;
}

function splitClassString(classString, separator) {
	let primaryClass, secondaryClass, tertiaryClass;
	const classArray = classString.split(separator);
	console.log(classArray);
	console.log(classArray.length);
	if (classArray.length == 2) {
		primaryClass = classArray[0];
		secondaryClass = classArray[1];
		tertiaryClass = undefined;
	} else if (classArray.length > 2 && classArray.length <= 3) {
		primaryClass = classArray[0];
		secondaryClass = classArray[1];
		tertiaryClass = classArray[2];
	} else if (classArray.length > 3) {
		primaryClass = classArray[0];
		secondaryClass = classArray[1];
		tertiaryClass = classArray[2];
		tertiaryClass += " +" + (classArray.length - 3) + " extra";
		return [primaryClass, secondaryClass, tertiaryClass];
	}
	console.log(primaryClass, secondaryClass, tertiaryClass);
	return [primaryClass, secondaryClass, tertiaryClass];
}

async function writeToRoster(sheet, player) {
	let primaryClass = undefined, secondaryClass = "N/A", tertiaryClass = "N/A";
	const bladeName = await fetchFromCharacterSheet(sheet, "C6:R6"),
		bladeRace = await fetchFromCharacterSheet(sheet, "T7:Y7"),
		bladeClass = await fetchFromCharacterSheet(sheet, "T5:Y5"),
		bladeFormulas = ['=MAX(FILTER(Progression!$A$2:$A$21, INDIRECT("R[0]C8", FALSE)>=Progression!$C$2:$C$21))',
			'=SUM(FILTER( Ledger!$D:$D, EXACT(Ledger!$A:$A, INDIRECT("R[0]C3", FALSE))))',
			'=SUM(FILTER( Ledger!$C:$C, EXACT(Ledger!$A:$A, INDIRECT("R[0]C3", FALSE))))',
			'=SUM(FILTER( Ledger!$B:$B, EXACT(Ledger!$A:$A, INDIRECT("R[0]C3", FALSE))))',
			'=SUM(FILTER( Ledger!$E:$E, EXACT(Ledger!$A:$A, INDIRECT("R[0]C3", FALSE))))',
			'=SUM(FILTER( Ledger!$F:$F, EXACT(Ledger!$A:$A, INDIRECT("R[0]C3", FALSE))))',
			'=IFS(INDIRECT("R[0]C8", FALSE)>=Progression!$C$18,Progression!$E$18, INDIRECT("R[0]C8", FALSE)>=Progression!$C$12,Progression!$E$12, INDIRECT("R[0]C8", FALSE)>=Progression!$C$6,Progression!$E$6, INDIRECT("R[0]C8", FALSE)>=Progression!$C$2,Progression!$E$2)'];
	// This does not check the levels for the multiclass!!
	if (bladeClass[0][0].includes('/')) {
		const classArray = splitClassString(bladeClass[0][0], '/');
		console.log(classArray);
		primaryClass = classArray[0], secondaryClass = classArray[1];
		if (classArray[2] != undefined) {
			tertiaryClass = classArray[2];
		}
	} else if (bladeClass[0][0].includes('\\')) {
		const classArray = splitClassString(bladeClass[0][0], '\\');
		console.log(classArray);
		primaryClass = classArray[0], secondaryClass = classArray[1];
		if (classArray[2] != undefined) {
			tertiaryClass = classArray[2];
		}
	} else if (bladeClass[0][0].includes('|')) {
		const classArray = splitClassString(bladeClass[0][0], '|');
		console.log(classArray);
		primaryClass = classArray[0], secondaryClass = classArray[1];
		if (classArray[2] != undefined) {
			tertiaryClass = classArray[2];
		}
	} else if (bladeClass[0][0].includes('-')) {
		const classArray = splitClassString(bladeClass[0][0], '-');
		console.log(classArray);
		primaryClass = classArray[0], secondaryClass = classArray[1];
		if (classArray[2] != undefined) {
			tertiaryClass = classArray[2];
		}
	} else {
		primaryClass = bladeClass[0][0];
	}
	console.log(player);
	let toRoster = ["@" + player, bladeFormulas[0], bladeName[0][0], bladeRace[0][0], primaryClass, secondaryClass, tertiaryClass, bladeFormulas[1], bladeFormulas[2], bladeFormulas[3], bladeFormulas[4], bladeFormulas[5], bladeFormulas[6], sheet]; // does not account for multiclassing or for formulas
	try {
		writeSpreadsheetValues({
			spreadsheetId: process.env.spreadsheetId,
			sheetName: "Roster",
			auth: await getAuthToken(),
			values: [toRoster],
			range: "A:O"
		});
	} catch (error) {
		console.error(error.message, error.stack);
	}
	return;
}

function identifyPlayer(player, playerData) {
	let newBlade = undefined;
	if (player.includes("@")) { // can fetch the user from Discord by id number
		newBlade = playerData.get(player.split("@")[1].split(">")[0]);
	} else { // need to manually look up user
		newBlade = playerData.filter(blade => blade.user.username === player); // does not work - returns a collection TO DO fix
	}
	console.log(newBlade);
	return newBlade;
	/**
	if (newBlade != undefined) {
		newBlade.roles.add(role); // does nothing if the role was already assigned to the player
		console.log("added role to Blade");
	} else {
		console.error("Could not locate given player");
	}
	**/
}

module.exports = {
	data: new SlashCommandBuilder()
		.setName('add_to_roster')
		.setDescription('Adds a new Blade to the roster')
		.addStringOption(option =>
			option.setName('player')
				.setDescription('The player who owns the character (note: please use the @ symbol to get their username).')
				.setRequired(true))
		.addStringOption(option =>
			option.setName('sheet')
				.setDescription("The URL for the player's character sheet.")
				.setRequired(true))
		.addStringOption(option =>
			option.setName('previous_blade')
				.setDescription("The name of the player's previous Blade if cashing in retirement rewards.")
				.setRequired(false)),

	async execute(interaction) {
		await interaction.deferReply();
		const player = interaction.options.getString('player'),
			sheet = interaction.options.getString('sheet'),
			retirementBonusSource = interaction.options.getString('previous_blade'),
			playerData = await interaction.guild.members.fetch(),
			roles = await interaction.guild.roles.fetch(),
			channels = await interaction.guild.channels.fetch(),
			viewing = channels.find(channel => channel.name === "viewing-area"),
			bladeName = await fetchFromCharacterSheet(sheet, "C6:R6"),
			role = roles.find(role => role.name === "Blades"),
			backgroundLedgerInput = await gatherDataForBackground(sheet);
			suffix = "Welcome to the Blades!  Please be sure to read through the rules in <#" + channels.find(channel => channel.name === "gameplay-reference") + "> and roll `!r 1d100` in the <#" + channels.find(channel => channel.name === "dice-tray") + "> for your trinket.  Please also change your nickname to match this format: `Character (username)`.  Cheers!";
		let dataToGoToLedger = [], playerDiscordData = undefined;
		// 1st, add a ledger entry for the new character's BACKGROUND (find from their character sheet) - taken care of above as backgroundLedgerInput
		dataToGoToLedger.push(backgroundLedgerInput);
		// 2nd, add a roster entry for their new character (gather data from their character sheet and standard formulas)
		// 3rd, add a ledger entry for the new character's SIGNUP (standard for all characters)
		dataToGoToLedger.push([bladeName[0][0], 0, 75, 0, 1, 3, "Signing", ""]);
		// 4th (if applicable), add a ledger entry for the new character's bonuses
		let levelingData = await gatherDataForLevelling(sheet, retirementBonusSource);
		if (levelingData != undefined) {
			levelingData.forEach(row => {
				dataToGoToLedger.push(row);
			});
		}
		// 5th, add the Blades role to the player
		if (player.includes("@")) {
			playerDiscordData = playerData.get(player.split("@")[1].split(">")[0]);
		} else {
			const filteredData = playerData.filter(GuildMember => GuildMember.user.username.toLowerCase() === player.toLowerCase()),
				filterKeys = Array.from(filteredData.keys());
			if (filterKeys.length === 1) {
				playerDiscordData = filteredData.get(filterKeys[0]);
			} else {
				// warn that too many users were retrieved TODO
			}
		}
		if (playerDiscordData != undefined) {
			playerDiscordData.roles.add(role);
		} else {
			// Alert council that player could not be retrieved and will need the role added manually TODO
		}
		writeToRoster(sheet, playerDiscordData.user.username);
		// 6th, announce in viewing
		let prefix = undefined, pictureUrl = undefined;
		if (playerDiscordData != undefined) {
			prefix =  "<@" + playerDiscordData.id + "> ";
			pictureUrl = playerDiscordData.user.displayAvatarURL();
		} else {
			prefix = player + " ";
		}
		if (outputStyle === "Embed") {
			const Embed = new EmbedBuilder()
				.setTitle("Blade Signup Successful")
				.setDescription(prefix + suffix);
			if (pictureUrl != undefined) {
				Embed.setThumbnail(pictureUrl);
			}
			channels.find(channel => channel.name === "viewing-area").send({ embeds: [Embed] });
		} else if (outputStyle === "Legacy") {
			channels.find(channel => channel.name === "viewing-area").send(prefix + suffix);
		} else {
			console.log("Improper output style selected, must be either Legacy or Embed!!!");
		}
		//writeSigningToLedger(dataToGoToLedger);
		writeToLedger(dataToGoToLedger);
		interaction.deleteReply();
	},
};
