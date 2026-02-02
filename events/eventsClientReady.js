// GOLD SOURCE: 2025.12.19

const { Events } = require('discord.js');

module.exports = {
  name: Events.ClientReady,
  once: true,
  execute(client) {
    console.log(`Logged in as ${client.user.tag}\nSystem Ready...`);
  },
};
