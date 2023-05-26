const { SlashCommandBuilder } = require('discord.js'),
  { testUser } = require('../snippets/user'),
  { serverinfo } = require('./serverinfo.js'),
  { mirror } = require('../snippets/output');

function checkUsersHaveRoles(userCache) {
  let usersWithoutRoles = new Map();
  // rewrite below to use a FILTER
  const userKeys = Array.from(userCache.keys());
  userKeys.forEach(key => {
    const user = userCache.get(key);
    if (user._roles.length == 0) {
      usersWithoutRoles.set(key, user);
    }
  });
  return usersWithoutRoles;
}

function checkUsersAreBlades(userCache, bladesRole) {
  let blades = new Map();
  const userKeys = Array.from(userCache.keys()),
    bladesKeys = Array.from(bladesRole.keys());
  userKeys.forEach(key => {
    const user = userCache.get(key);
    if (user._roles.includes(bladesKeys[0])) {
      blades.set(key, user);
    }
  });
  return blades;
}

function checkRolesHaveUsers(userCache, guildRoles) {
  let emptyRoles = [];
  const roleArray = Array.from(guildRoles.keys());
  roleArray.forEach(role => {
    if (userCache.filter(user => user._roles.includes(role)).size === 0) {
      console.log(guildRoles.get(role).name + " has no users.");
      emptyRoles.push(guildRoles.get(role).name);
    }
  });
  return emptyRoles;
}

function buildOutput(outputObject) {
  let finalOutput = [], outputString = "";
  if (outputObject.has("no_role_users")) {
    let tempOutput = "";
    const no_face = outputObject.get("no_role_users"),
      no_face_keys = Array.from(no_face.keys());
    tempOutput += (`${no_face.size} users have no roles:\n`);
    no_face_keys.forEach(key => {
      tempOutput += (testUser(no_face.get(key).user) + "\n");
    });
    tempOutput += "\n";
    if (outputString.length + tempOutput.length < 2000) {
      outputString += tempOutput;
    } else {
      finalOutput.push(outputString);
      outputString = tempOutput;
    }
  }
  if (outputObject.has("empty_roles")) {
    let tempOutput = "";
    const no_mates = outputObject.get("empty_roles");
    tempOutput += (`${no_mates.length} roles have no users:\n`);
    no_mates.forEach(role => {
      tempOutput += (role + "\n");
    });
    tempOutput += "\n";
    if (outputString.length + tempOutput.length < 2000) {
      outputString += tempOutput;
    } else {
      finalOutput.push(outputString);
      outputString = tempOutput;
    }
  }
  if (outputObject.has("blades")) {
    let tempOutput = "";
    const blades = outputObject.get("blades"),
      blades_keys = Array.from(blades.keys());
    tempOutput += (`The following ${blades.size} users are Blades of Obsidian:\n`);
    blades_keys.forEach(key => {
      tempOutput += (testUser(blades.get(key).user) + "\n");
    });
    tempOutput += "\n";
    if (outputString.length + tempOutput.length < 2000) {
      outputString += tempOutput;
    } else {
      finalOutput.push(outputString);
      outputString = tempOutput;
    }
  }
  finalOutput.push(outputString);
  //mirror(finalOutput, interaction);
  return finalOutput;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('activity')
    .setDescription('Tests for user activity'),
  async execute(interaction) {
    await interaction.deferReply();
    let outputMap = new Map();
    const guildRoles = await interaction.guild.roles.fetch(),
      userCache = await interaction.guild.members.fetch(); // I AM NOT EQUAL TO .GUILD.MEMBERS.CACHE DUMBASS
    outputMap.set("no_role_users",  usersWithoutRoles = checkUsersHaveRoles(userCache));
    outputMap.set("empty_roles", checkRolesHaveUsers(userCache, guildRoles));
    const blades = checkUsersAreBlades(userCache, guildRoles.filter(role => role.name === "Blades"));
    outputMap.set("blades", blades);
    let output = buildOutput(outputMap);
    output.push(await serverinfo(interaction));
    await mirror(output, interaction);
  },
}
