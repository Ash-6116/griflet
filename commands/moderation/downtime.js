/**
 * Goal: To rewrite Downtime.js to use a custom OBJECT, containing each quest on the quest-board and adding properties to each quests object to denote things such as a running caravan
**/

const { EmbedBuilder, SlashCommandBuilder } = require('discord.js'),
	fs = require('fs'),
	ledger = require('../../shared_classes/ledger.js'), // Gives access to ledger functions for writing to gsheet
	{ mirror, specificMirror } = require('../../shared_classes/output.js'),
	{ prompter } = require('../../shared_classes/prompter.js'), // Gives access to the prompter function for councilAlert
	outputStyle = process.env.outputStyle, // sets either Legacy or Embed
	{ resolveDate, categories } = require('./categories.js'), // Gives access to RESOLVEDATE function and categories function
	{ roleTest, warnRole } = require('../../shared_classes/roleTest.js'), // ensures the user has the appropriate role for running the command
	{ testUser } = require('../../shared_classes/user.js');

function roster(rosterChannel) { // TODO - overhaul?
	return new Promise((resolve, reject) => {
		rosterChannel.forEach(channel => {
			channel.messages.fetch().then(messages => {
				const allowedNumberOfPosts = 2; // set to 2 for release, 1 or 0 for debugging
				if (messages.size > allowedNumberOfPosts) {
					const newSheetPosters = [], reactedSheetPosters = [];
					// need to check for reactions!! If there is a reaction, it is in the process of being checked
					const messagesKeys = Array.from(messages.keys());
					for (let i = 0; i < messages.size-allowedNumberOfPosts; i++) {
						let message = messages.get(messagesKeys[i]);
						const reactionsArray = [];
						message.reactions.cache.map(async (reaction) => {
							reactionsArray.push(reaction); // collecting reactions
						});
						if (reactionsArray.length > 0) {
							reactedSheetPosters.push(testUser(message.author));
						} else {
							newSheetPosters.push(testUser(message.author));
						}
					}
					resolve([newSheetPosters, reactedSheetPosters]);
				} else {
					resolve(null);
				}
			});
		});
	});
}

async function gatherQuestBoard(interaction) {
	const channels = await interaction.guild.channels.fetch(),
		questChannel = channels.filter(channel => channel.name === "quest-board"),
		questKey = Array.from(questChannel.keys())[0],
		questBoard = await channels.get(questKey).messages.fetch(),
		messageKeys = Array.from(questBoard.keys());
	let quests = [];
	for (let k = 0; k < messageKeys.length; k++) {
		const item = questBoard.get(messageKeys[k]);
		if (item.content.length > 1) {
			const itemSplit = item.content.split(/\r?\n/);
			if (itemSplit[0] === "---") { // need t remove this element and move everything else down
				itemSplit.splice(0, 1); // remove only one element
			}
			const name = itemSplit[0].replace(/\*/g, ""), // remove bold formatting
				reactions = item.reactions.cache,
				reactionsKeys = Array.from(reactions.keys());
			let reactionsReformatted = new Map();
			for (let r = 0; r < reactionsKeys.length; r++) { // ditto above, rewrite as async forEach???
				let reaction = reactions.get(reactionsKeys[r]);
				reaction.users = await reaction.users.fetch();
				let reactionReformatted = { count: reaction.count,
					name: reactionsKeys[r],
					users: reaction.users };
				reactionsReformatted.set(reactionsKeys[r], reactionReformatted);
			}
			let quest = { name: name,
				description: itemSplit[4].replace(/\*/g, "").split("Description: ")[1],
				reactions: reactionsReformatted,
				rewards: itemSplit[3].replace(/\*/g, "").split("Rewards: ")[1]};
			if (itemSplit[1].replace(/\*/g, "").split("Tier:")[1] != undefined) {
				quest.tier = itemSplit[1].replace(/\*/g, "").split("Tier:")[1].trim();
			}
			quests.push(quest);
		}
	}
	return quests;
}

async function gatherRunningCaravans(caravans, questBoard) {
	let emptyCaravans = [];
	// go through each of the 10 quest caravans looking for pinned posts, if one is found, identify its
	// quest, then add the property "caravan: X" to the quest in questBoard where X is caravan number.
	// If possible, add the list of players mentioned to the quest as well.
	const categoryId = Array.from (caravans.keys() );
	for (let index = 0; index < caravans.size; index++) {
		let qcs = caravans.get(categoryId[index]).guild.channels.cache.filter(channel => channel.parentId === caravans.get(categoryId[index]).id && !channel.name.includes("-ooc"));
		qcs.delete('474382720739573779');
		// NEED TO REMOVE BRIEFING-ROOM
		const qc_id = Array.from(qcs.keys());
		for(let c = 0; c < qcs.size; c++) {
			const pinnedPost = await qcs.get(qc_id[c]).messages.fetchPinned();
			// check if pinnedPost is populated, for channels that have no pins, it will equal 0 in size
			if (pinnedPost.size < 1 && !qcs.get(qc_id[c]).name.includes("-ooc")) { // filters out ooc channels
				emptyCaravans.push(qcs.get(qc_id[c]).name);
			} else {
				pinnedPost.forEach(pin => {
					const pinSplit = pin.content.split("\n"),
						DM = pinSplit[5].substring(pinSplit[5].indexOf("@")+1, pinSplit[5].indexOf(">"));
						title = pinSplit[0].replace(/\*/g, ""),
						date = resolveDate(pin.createdTimestamp);
					console.log("Title: " + title + "  DM: " + DM);
					// now need to find the entry for the quest in questBoard and add to it
					console.log(pin.content);
					let caravanFromQuestBoard = questBoard.filter(quest => quest.name == title)[0], // error
						pinnedPlayerIDs = pin.content.split("Players: ")[1].split(", ");
					// Clean up pinnedPlayerIDs to remove <@ and > from each id, leaving behind only the id number
					for (let p = 0; p < pinnedPlayerIDs.length; p++) {
						pinnedPlayerIDs[p] = pinnedPlayerIDs[p].substring(
							pinnedPlayerIDs[p].indexOf("<@")+2,
							pinnedPlayerIDs[p].indexOf(">"));
					}
					caravanFromQuestBoard.DM = DM;
					caravanFromQuestBoard.caravan = qcs.get(qc_id[c]).name.split("quest-caravan-")[1];
					caravanFromQuestBoard.pinnedPlayerIDs = pinnedPlayerIDs; // need to try to clean this array up
					caravanFromQuestBoard.date = date;
				});
			}
		}
	}
	return emptyCaravans;
}

function membersOfRole(questBoard, roles) {
	questBoard.forEach(quest => {
		if (quest.hasOwnProperty('caravan')) {
			// need to fetch the role
			const caravanRole = roles.filter(role => role.name === "QC-"+quest.caravan),
				caravanRoleId = Array.from(caravanRole.keys())[0];
			// now, need a list of every member with the role
			const roleMembers = roles.get(caravanRoleId).members,
				roleMemberIds = Array.from(roleMembers.keys());
			quest.rolePlayers = roleMemberIds;
		}
	});
	return;
}

// error checks start here
function checkPlayersInCaravanHaveRole(questBoard) {
	questBoard.forEach(quest => {
		if (quest.hasOwnProperty('caravan')) { // if quest is running
			let missingRoles = [];
			// .rolePlayers is a list of all members with the role for the caravan
			// .pinnedPlayerIDs are every member mentioned in the pinned message in caravan
			quest.pinnedPlayerIDs.forEach(player => {
				if (quest.rolePlayers.indexOf(player) == -1) {
					missingRoles.push(player);
				}
			});
			if (missingRoles.length > 0) {
				if (!quest.hasOwnProperty('error')) {
					quest.error = new Map();
				}
				quest.error.set('missingRoles', missingRoles);
			}
		}
	});
	return;
}

function checkUserWithReactionsExists(questBoard, guildMembers) {
	questBoard.forEach(quest => {
		if (quest.reactions.size > 0) {
			let missingUsers = [];
			quest.reactions.forEach(reaction => {
				const playerArray = Array.from(reaction.users.keys());
				playerArray.forEach(player => {
					if (!guildMembers.has(player)) { // if the player isn't on the server
						missingUsers.push(reaction.users.get(player));
						reaction.users.delete(player);
						reaction.count = Number(reaction.count)-1;
					}
				});
				if (reaction.count == '0') {
					quest.reactions.delete(reaction.name);
				}
			});
			if (missingUsers.length > 0) {
				if (!quest.hasOwnProperty('error')) {
					quest.error = new Map();
				}
				quest.error.set('missingUsers', missingUsers);
			}
		}
	});
	return;
}

function checkValidReactions(questBoard) {
	const bladesEmoji = '⚔️', arrowsEmoji = "🏹";
	questBoard.forEach(quest => {
		if (quest.hasOwnProperty('reactions')) {
			let invalidReactions = new Map();
			quest.reactions.forEach(reaction => {
				switch (reaction.name) {
					case (bladesEmoji):
						break;
					case (arrowsEmoji):
						break;
					default:
						// remove the reaction
						quest.reactions.delete(reaction.name);
						invalidReactions.set(reaction.name, reaction.users);
						break;
				}
			});
			if (invalidReactions.size > 0) {
				if (!quest.hasOwnProperty('error')) { // creating this if it doesn't already exist
					quest.error = new Map();
				}
				quest.error.set('invalidReaction', invalidReactions);
			}
		}
	});
	return;
}

function checkArrowIsOnlyOnRunning(questBoard) {
	const arrowsEmoji = "🏹";
	questBoard.forEach(quest => {
		if (quest.reactions.size > 0) {
			if (!quest.hasOwnProperty('caravan') && quest.reactions.has(arrowsEmoji)) {
				// if the quest isn't running and has an Arrows reaction
				if (!quest.hasOwnProperty('error')) {
					quest.error = new Map();
				}
				quest.error.set('arrowsOnNotRunning', quest.reactions.get(arrowsEmoji).users);
				quest.reactions.delete(arrowsEmoji);
			}
		}
	});
	return;
}

function checkNumberOfReactions(questBoard) {
	// If a quest is not running and has 4 valid reactions, it is waiting for VASSALS (.waiting: Vassals)
	// If a quest is not running and has between 1 and 3 valid reactions, it is waiting for BLADES (.waiting: Blades)
	questBoard.forEach(quest => {
		if (quest.reactions.size > 0) {
			const bladesEmoji = '⚔️';
			if (!quest.hasOwnProperty('caravan')) {
				const crossed_swords = quest.reactions.get(bladesEmoji);
				if (crossed_swords.count > 0 && crossed_swords.count < 4) {
					quest.waiting = 'Blades';
				} else if (crossed_swords.count > 0 && crossed_swords.count == 4) {
					quest.waiting = 'Vassals';
				}
			}
		}
	});
	return;
}

function checkUniqueReactions(questBoard) {
	// For each quest in questBoard, make a duplicate copy of the existing questBoard with the current
	// quest removed.  Then use the two to verify that users have one unique crossed_swords emoji on one
	// quest not multiple.  Provide an error if this is not the case
	const bladesEmoji = '⚔️'; // we need this as we only care about VALID BLADES REACTIONS, Arrows are exempt
	questBoard.forEach(quest => {
		if (quest.reactions.get(bladesEmoji) != undefined) { // filter out quests with no Blades reactions
			let comparisonSet = questBoard, duplicatedArray = [];
			comparisonSet = comparisonSet.filter(comparison => comparison.name !== quest.name);
			comparisonSet.forEach(comparison => {
				if (comparison.reactions.get(bladesEmoji) != undefined) {
					quest.reactions.get(bladesEmoji).users.forEach(user => {
						if (comparison.reactions.get(bladesEmoji).users.has(user.id)) {
							duplicatedArray.push(user.username + " reacted to " + quest.name + " and " + comparison.name);
						}
					});
				}
			});
			if (duplicatedArray.length > 0) {
				if (!quest.hasOwnProperty('error')) {
					quest.error = new Map();
				}
				quest.error.set('duplicatedReaction', duplicatedArray);
			}
		}
	});
	return;
}

// error checks end here

async function dailyRoutine(interaction, guildChannels, guildRoles) {
	// 2024 restructuring
	// 1st - get the list of quests from quest-board
	interaction.editReply("Gathering quests and their reactions, this can take a while...");
	const guildMembers = await interaction.guild.members.fetch();
	let questBoard = await gatherQuestBoard(interaction);
	interaction.editReply("Quest Board gathered, proceeding with error checks...");
	// 2nd - update the questBoard with data gathered from pins in Quest Caravan channels
	const emptyCaravans = await gatherRunningCaravans(guildChannels.filter(channel => channel.name === "Quest Caravans"), questBoard);
	// 3rd - update the questBoard with data gathered from roles for checking later
	membersOfRole(questBoard, guildRoles);
	// 4th - Begin error checks, 1 function per check
	// each error check will update the quest board with any error messages appended to the quest.error property
	checkUserWithReactionsExists(questBoard, guildMembers);
	checkPlayersInCaravanHaveRole(questBoard);
	checkValidReactions(questBoard);
	checkUniqueReactions(questBoard);
	checkArrowIsOnlyOnRunning(questBoard);
	checkNumberOfReactions(questBoard); // !! THIS CHECK MUST ALWAYS RUN LAST !!
	interaction.editReply("Error checks complete, proceeding to process output...");
	return [questBoard, emptyCaravans]; // return questBoard and use this function as a daily command so it can be exported to a reactions autorun?
}

function sortByCaravan(a, b) {
	const questA = parseInt(a.caravan);
	const questB = parseInt(b.caravan);
	if (questA > questB) return 1;
	if (questB > questA) return -1;
	return 0;
}

async function councilAlert(questBoard, guildChannels, interaction, emptyCaravans, rosterOutput) {
	/**
	 * This function needs a total overhaul from NGcounilAlert and councilAlert from Griflet v2.0
	 * as the data structure has radically changed.
	 *
	 * Needs an embed each for:
	 *	Rosters
	 *	Quests Waiting For Blades
	 *	Quests Waiting For Vassals
	 *	Reacted Quests (showing each reaction)
	 *	Filled Caravans
	 *	Empty Caravans
	 *	Errors
	**/
	const outputEmbedArray = [];
	let logForFile = "Downtime Log:\n" + Date() + "\nLeft Server: ";
	if (fs.existsSync('leavers.txt')) { // people left the server this week
		logForFile += fs.readFileSync('leavers.txt', 'utf8');
		fs.unlink('leavers.txt', (err) => {
			if (err) {
				console.log(err);
			} else {
				console.log("File removed successfully");
			}
		});
	} else {
		logForFile += "Nobody\n";
	}
	// roster
	if (rosterOutput != null) {
		if (rosterOutput[0].length > 0 || rosterOutput[1].length > 0) {
			const rosterEmbed = new EmbedBuilder()
				.setTitle('Rosters');
			let rosterString = "";
			logForFile += "Rosters:\n";
			if (rosterOutput[0].length > 0) {
				rosterString += "**";
				rosterOutput[0].forEach(newSheet => {
					rosterString += newSheet + ", ";
				});
				rosterString += "**\nis not currently being checked\n\n";
			}
			if (rosterOutput[1].length > 0) {
				rosterString += "**";
				rosterOutput[1].forEach(sheet => {
					rosterString += sheet + ", ";
				});
				rosterString += "**\nis currently being checked";
			}
			logForFile += rosterString + "\n";
			rosterEmbed.setDescription(rosterString);
			outputEmbedArray.push(rosterEmbed);
		}
	}
	// Show running caravans
	if (questBoard.filter(quest => quest.hasOwnProperty('caravan'))) {
		const runningEmbed = new EmbedBuilder()
			.setTitle("Running Caravans"),
			bladesEmoji = '⚔️';
		let runningString = "";
		logForFile += "Running Caravans\n";
		questBoard.filter(quest => quest.hasOwnProperty('caravan')).sort(sortByCaravan).forEach(quest => {
			runningString += "**quest-caravan-" + quest.caravan + ":\n	Tier: " + quest.tier + " - " + quest.name + "**\n";
			runningString += "DM:  <@" + quest.DM + ">\n"; // TODO - might need a different way to ping people
			runningString += "Date started: " + quest.date + "\n";
			runningString += "Players: ";
			if (quest.reactions.has(bladesEmoji)) {
				quest.reactions.get(bladesEmoji).users.forEach(user => {
					runningString += "<@" + user.id + ">, "; // as above
				});
			}
			runningString = runningString.slice(0, -2) + "\n\n";
		});
		logForFile += runningString + "\n";
		runningEmbed.setDescription(runningString);
		outputEmbedArray.push(runningEmbed);
	}
	// Show empty caravans
	if (emptyCaravans != null) {
		const emptyEmbed = new EmbedBuilder()
			.setTitle("Empty Caravans");
		let emptyString = "";
		logForFile += "Empty Caravans:\n";
		emptyCaravans.forEach(caravan => {
			emptyString += caravan + "\n";
		});
		emptyEmbed.setDescription(emptyString);
		outputEmbedArray.push(emptyEmbed);
		logForFile += emptyString + "\n";
	}
	// Show reaction log
	const reactionEmbed = new EmbedBuilder()
		.setTitle("Reacted Quests");
	let reactionString = "", reactionLog = "";
	logForFile += "Reacted Quests\n";
	if (questBoard.filter(quest => quest.hasOwnProperty('reactions'))) {
		questBoard.filter(quest => quest.hasOwnProperty('reactions')).forEach(quest => {
			if (quest.reactions.size > 0) {
				reactionString += quest.name + "\n";
				reactionLog += quest.name + "\n";
				quest.reactions.forEach(reaction => {
					reactionString += reaction.name + " x" + reaction.count + "   ";
					reactionLog += reaction.name + " x" + reaction.count + "   ";
					let userString = "";
					reaction.users.forEach(user => {
						userString += "<@" + user.id + ">, ";
						reactionLog += user.username + "\n";
					});
					reactionString += userString.slice(0, -2) + "\n";
				});
			}
		});
	} else {
		reactionString += "No reactions";
		reactionLog += reactionString;
	}
	reactionEmbed.setDescription(reactionString);
	outputEmbedArray.push(reactionEmbed);
	logForFile += reactionLog + "\n";
	// Show error logs
	/**
	 *	.error:
	 *		missingRoles
	 *		missingUsers
	 *		invalidReaction
	 *		arrowsOnNotRunning
	 *		duplicatedReaction
	**/
	let missingRolesString = "", missingUsersString = "", invalidReactionString = "", arrowsOnNotRunningString = "", duplicatedReactionString = "";
	if (questBoard.filter(quest => quest.hasOwnProperty('error'))) {
		questBoard.filter(quest => quest.hasOwnProperty('error')).forEach(quest => {
			switch (true) {
				case quest.error.has('missingRoles'):
					missingRolesString += quest.name + " (Role: QC-" + quest.caravan + ")\n";
					let users = "";
					quest.error.get("missingRoles").forEach(missing => {
						users += "<@" + missing + ">, ";
					});
					missingRolesString += users.slice(0, -2) + "\n\n";
					break;
				case quest.error.has('missingUsers'):
					console.log("Found missing users");
					console.log(quest.error.get('missingUsers'));
					// TODO - populate
					break;
				case quest.error.has('invalidReaction'):
					invalidReactionString += quest.name + "\n";
					const invalidReactions = Array.from(quest.error.get('invalidReaction').keys());
					invalidReactions.forEach(invalidReaction => {
						invalidReactionString += invalidReaction + "   ";
						let users = "";
						quest.error.get('invalidReaction').get(invalidReaction).forEach(user => {
							users += "<@" + user.id + ">, ";
						});
						invalidReactionString += users.slice(0, -2) + "\n";
					});
					invalidReactionString += "\n";
					break;
				case quest.error.has('arrowsOnNotRunning'):
					arrowsOnNotRunningString += quest.name + "\n";
					let arrows = "";
					quest.error.get('arrowsOnNotRunning').forEach(arrow => {
						arrows += "<@" + arrow.id + ">, ";
					});
					arrowsOnNotRunningString += arrows.slice(0, -2) + "\n";
					break;
				case quest.error.has('duplicatedReaction'):
					duplicatedReactionString += quest.name + "\n";
					quest.error.get('duplicatedReaction').forEach(duplicate => {
						duplicatedReactionString += "- " + duplicate + "\n";
					});
					break;
				default:
					// This will only fire if there's an element in quest.error that
					// has not been handled properly above
					console.log("Found something in quest.error but did not handle it correctly");
					console.log(quest.error);
					break;
			}
		});
	}
	const errorArray = [ { name: "Missing Roles", content: missingRolesString },
		{ name: "Missing Users", content: missingUsersString},
		{ name: "Invalid Reactions", content: invalidReactionString},
		{ name: "Arrows On Quests Not Currently Running", content: arrowsOnNotRunningString},
		{ name: "Duplicated Reactions", content: duplicatedReactionString }]; // doing it this way to make it easier to reuse code
	errorArray.forEach(error => {
		if (error.content.length > 0) {
			const errorEmbed = new EmbedBuilder()
				.setTitle(error.name)
				.setDescription(error.content);
			outputEmbedArray.push(errorEmbed);
			logForFile += error.name + "\n" + error.content + "\n";
		}
	});
	// Send output to bot-stuff
	guildChannels.find(channel => channel.name === "bot-stuff").send({ content: "Weekly Downtime Log", embeds: outputEmbedArray });
	logForFile += "---	---	---\n\n";
	// replace ids with usernames
	logForFile = replaceIdsWithUsernames(logForFile, await interaction.guild.members.fetch());
	// Write to the log file
	fs.appendFile("Logging.txt", logForFile.split("*").join(""), (err) => {
		if (err) {
			console.log(err);
		} else {
			console.log("Downtime log file written");
		}
	});
	// Await goahead from a council member before firing off pings, unless the silent option was passed or no errors detected
	if (interaction.options.getString('options') != "silent") {
		if (questBoard.filter(quest => quest.hasOwnProperty('error')).length == 0) {
			interaction.followUp("No errors detected, proceeding with announcement");
			return true;
		}
		try {
			await new Promise(resolve => setTimeout(resolve, 1000)); // waiting 1 second to give Discord a chance to refresh
			interaction.followUp("Would you like to run the whole announcement routine, or only have output in bot-stuff as a log? Y/N");
			let collection = await prompter(120000, interaction); // should return TRUE if a reply is received within 2 minutes to indicate the announcements can go ahead, FALSE if the timer runs out or if the reply is NO.
			if (collection != null) {
				if (isNaN(collection) && collection.toLowerCase().includes("y")) {
					interaction.followUp("Alerts selected, announcement routines will run shortly.");
					return true;
				}
			} else {
				interaction.followUp("No alerts selected, no announcement routines will run.");
				return false;
			}
		} catch (err) {
			console.log("ERROR!");
			console.log(err);
		}
	}
	return false;
}

function replaceIdsWithUsernames(logForFile, guildMembers) {
	let log = logForFile.split("<@");
	log.forEach((usertag, index) => {
		if (usertag.includes(">")) {
			let id_array = usertag.split(">");
			// 0 will always be the id number, 1 will be additional data after the tag
			if (guildMembers.has(id_array[0])) {
				id_array[0] = guildMembers.get(id_array[0]).user.username;
			} else {
				id_array[0] = "<@" + id_array[0] + ">";
			}
			usertag = id_array.join("");
		}
		log[index] = usertag;
	});
	// use log.join("") to rejoin into a string
	return log.join("");
}

function prompt(guildChannels) {
	const confessional = guildChannels.find(channel => channel.name === "blades-confessionals"),
		standard = "You can describe your character's answer to the following prompt either in character as them or out of character describing it yourself.  Please remember to keep things civil, even here you are under the watchful eye of the council and the rules for both Blades and the server as a whole still apply.  For the sake of making it clear which character the confession goes with, please use the following format: `**Name of character**: [answer]`\n\n";
		if (fs.existsSync('prompts.txt')) {
			fs.readFile('prompts.txt', 'utf8', (err, data) => {
				if (err) {
					return console.log(err);
				}
				var array = data.toString().split("\n");
				specificMirror([standard + array[Math.floor(Math.random() * (array.length-1))]], confessional);
			});
		} else {
			console.error("Prompts file is missing!");
		}
	return;
}

function isFirstSunday() {
	const current_date = new Date();
	let rolling_date = new Date(current_date.getFullYear(), current_date.getMonth(), 1); // roll to the first day of the month...
	if (rolling_date.getDay() != 0) {  // if rolling_date is not on a SUNDAY, roll forward to next SUNDAY
		// need to add days
		rolling_date.setDate(rolling_date.getDate() + (7-rolling_date.getDay()));
	}
	if (current_date.getMonth() == rolling_date.getMonth() && current_date.getDate() == rolling_date.getDate()) {
		return true;
	}
	return false;
}

function isLastSunday() {
	const current_date = new Date();
	let rolling_date = new Date(current_date.getFullYear(), current_date.getMonth() +1, 0); // roll forward to the last day of the month...
	if (rolling_date.getDay() != 0) { // if rolling_date is not on a SUNDAY, roll back to previous SUNDAY
		rolling_date.setDate(rolling_date.getDate() - rolling_date.getDay());
	}
	if (current_date.getMonth() == rolling_date.getMonth() && current_date.getDate() == rolling_date.getDate()) {
		return true;
	}
	return false;
}

function announce(questBoard, guildRoles, guildChannels, messageForBlades, strings) {
	// 2024 restructure - get a strings file, and if the message includes a $, treat that as a lookup,
	// eg. $server_anniversary should replace the messageForBlades with prewritten text from strings
	const bladesEmoji = '⚔️',
		announcementStrings = strings.announcement;;
	let stdAnnouncement = announcementStrings.downtime_applied + "\nPlease ask <@&" + guildRoles.find(role => role.name === 'Knights').id + "> or <@&" + guildRoles.find(role => role.name === 'Squires').id + "> for spending downtime, a document of suggested activities can be found in <#" + guildChannels.find(channel => channel.name === "gameplay-reference").id + "> and quests can be found in <#" + guildChannels.find(channel => channel.name === "quest-board") + "\n\n__**Quests Waiting For Guildmates:**__\n";
	if (questBoard.length > 0) {
	} else {
		stdAnnouncement += "None\n";
	}
	for (let t = 1; t <= 4; t++) {
		if (questBoard.filter(quest => quest.tier == t).length > 0) {
			stdAnnouncement += "** Tier " + t + " Quests:**\n";
			questBoard.filter(quest => quest.tier == t).forEach(quest => {
				stdAnnouncement += "- " + quest.name + " (" + quest.reactions.get(bladesEmoji).count;
				if (quest.reactions.get(bladesEmoji).count == 1) {
					stdAnnouncement += " Blade";
				} else {
					stdAnnouncement += " Blades";
				}
				stdAnnouncement += " signed up)\n";
			});
		}
	}
	const announcementEmbed = new EmbedBuilder()
		.setTitle("Weekly Downtime Awarded")
		.setDescription(stdAnnouncement)
	if (isLastSunday()) { // returns true if it is the last Sunday of the month
		console.log("Set $announce_check if it isn't already in messageForBlades");
		if (messageForBlades == null || !messageForBlades.includes("$activity_check")) {
			console.log("Didn't include activity check, setting it...");
			if (messageForBlades == null) {
				messageForBlades = "$activity_check";
			} else {
				messageForBlades += " $activity_check";
			}
		}
	}
	if (messageForBlades != null) {
		let message = messageForBlades;
		if (message.includes("$")) { // need to perform string substitution using the JSON strings file
			let messageArray = message.split(" ");
			messageArray.forEach((component, index) => {
				if (component.includes("$")) {
					component = component.slice(component.indexOf("$")+1);
					if (announcementStrings.hasOwnProperty(component)) {
						// replace the variable name with its JSON value
						component = announcementStrings[component] + "\n\n";
					}
					messageArray[index] = component;
				}
			});
			message = messageArray.join(" ");
		}
		announcementEmbed.addFields({ name: "Message From The Council", value: message, inline: false});
	}
	guildChannels.find(channel => channel.name === "announcements").send({ content: "<@&" + guildRoles.find(role => role.name === 'Blades').id + ">", embeds: [announcementEmbed] });
	return;
}

function vassals(questBoard, guildRoles, guildChannels, strings) {
	// 2024 restructure, fire only if .waiting exists and it is "Vassals"
	if (questBoard.length > 0) {
		const vassals_alert = strings.vassals_alert,
			bladesEmoji = '⚔️';
		let descriptionString = vassals_alert.prefix;
		if (questBoard.length == 1) { // single quest
			descriptionString += vassals_alert.prefix_singular + vassals_alert.suffix + vassals_alert.suffix_singular;
		} else { // multiple quests
			descriptionString += vassals_alert.prefix_plural + vassals_alert.suffix + vassals_alert.suffix_plural;
		}
		descriptionString += vassals_alert.gratitude;
		const vassalsEmbed = new EmbedBuilder()
			.setTitle("Quest Has Filled")
			.setDescription(descriptionString);
		questBoard.forEach(quest => {
			let usersAsString = vassals_alert.party;
			quest.reactions.get(bladesEmoji).users.forEach(user => {
				usersAsString += "<@" + user.id + ">, ";
			});
			vassalsEmbed.addFields({ name: quest.name, value: usersAsString.slice(0, -2), inline: false});
		});
		guildChannels.find(channel => channel.name === "briefing-room").send({ content: "<@&" + guildRoles.find(role => role.name === "Vassals").id + ">", embeds: [vassalsEmbed] });
	}
	return;
}

async function downtimeRoutine(interaction) {
	const rosterOutput = await roster(interaction.guild.channels.cache.filter(channel => channel.name === 'roster' && channel.parentId === Array.from(interaction.guild.channels.cache.filter(category => category.name === 'Blades of Obsidian').keys())[0])),
		guildChannels = await interaction.guild.channels.fetch(),
		guildRoles = await interaction.guild.roles.fetch(),
		dailyOutput = await dailyRoutine(interaction, guildChannels, guildRoles),
		questBoard = dailyOutput[0],
		emptyCaravans = dailyOutput[1],
		routine = interaction.options.getString('routine'),
		messageForBlades = interaction.options.getString('message'),
		options = interaction.options.getString('options'); // need to convert any string here TO LOWER CASE and make into an ARRAY, so that multiple options can be passed at the same time, ie. daily, no vassals
	let strings = { }, // empty Object to prevent errors being thrown
		councilAuthorisation = false;
	if (fs.existsSync('strings.txt')) {
		strings = JSON.parse(fs.readFileSync('strings.txt', 'utf8'));
	} else {
		console.error('JSON Strings file is missing!');
		strings = "";
	}
	if (routine == null) {
		councilAuthorisation = await councilAlert(questBoard, guildChannels, interaction, emptyCaravans, rosterOutput);
		console.log("Council Authorisation: " + councilAuthorisation);
	}
	switch (true) {
		// need to convert these to treat options as an ARRAY and check it does not contain specific keywords rather than assuming only one option is present
		case (options == null || options != "no announcement" || options != "daily") && (councilAuthorisation || routine == "announce"):
			announce(questBoard.filter(quest => quest.waiting === "Blades"), guildRoles, guildChannels, messageForBlades, strings);
		case (options == null || options != "no vassals") && (councilAuthorisation || (routine == "announce" || routine == "daily")):
			vassals(questBoard.filter(quest => quest.waiting === "Vassals"), guildRoles, guildChannels, strings);
		case (options == null || options != "no prompt" || options != "daily") && (councilAuthorisation || routine == "prompt"):
			prompt(guildChannels);
		case (options == null || options != "no ledger" || options != "daily") && (councilAuthorisation || routine == "ledger"):
			ledger.main(process.env.spreadsheetId, "Roster");
		default: // do nothing
			break;
	}
	if (isFirstSunday()) { // triggers on first Sunday of the month
		interaction.options._hoistedOptions = [{ name: 'period', type: 3, value: '3' }]; // setting period to 3 months for categories
		categories(interaction);
	}
	return;
}

module.exports = { checkArrowIsOnlyOnRunning,
	checkUniqueReactions,
	gatherQuestBoard,
	gatherRunningCaravans,
	vassals,
	data: new SlashCommandBuilder()
		.setName('downtime')
		.setDescription('Run all or parts of the Downtime routine for CitM server')
		.addStringOption(option =>
			option.setName('message')
				.setDescription("A message to display alongside this week's downtime alert.")
				.setRequired(false))
		.addStringOption(option =>
			option.setName('routine')
				.setDescription("Run a specific part of the Downtime routine rather than all of it.")
				.setRequired(false))
		.addStringOption(option =>
			option.setName('options')
				.setDescription("Options to suppress output aside from the bot channel")
				.setRequired(false)),
	async execute(interaction) {
		if (roleTest(interaction)) {
			await interaction.deferReply();
			await downtimeRoutine(interaction);
		} else {
			warnRole(interaction, "downtime");
		}
	},
};
