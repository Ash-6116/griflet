const {mirror} = require('./output.js'),
  {testUser} = require('./user.js');

function warnRole(interaction, command) {
  mirror([`Unfortunately, the command **/${command}** is not available at this time.  It is currently restricted to Knights, Squires, or the Baroness.`], interaction);
}

function roleTest(interaction) {
  // this function checks a user has a specific role - used for restricting commands on Castle In The Mist server
  console.log("This function is intended to test a user has a specific role before executing a command");
  let roles = interaction.member.roles.cache,
    user = testUser(interaction.user);
  if (roles.some(role => role.name === 'Knights') || roles.some(role => role.name === 'Squires') || roles.some(role => role.name === 'Baroness')) {
    console.log(`${user} has the Knights role, the Squires role, or the Baroness role`);
    return true;
  } else {
    console.log(`${user} does not have an applicable role`);
    return false;
  }
}

module.exports = {roleTest, warnRole}
