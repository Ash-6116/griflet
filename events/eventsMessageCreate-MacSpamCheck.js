const { Events } = require('discord.js');

module.exports = {
	name: Events.MessageCreate,
	async execute(message) {
		if (message.guild.name.includes("Griflet Development Server") || message.guild.name.includes("A Castle in the Mist")) {
				if (message.content.toLowerCase().includes("macbook") && message.content.toLowerCase().includes("sell")) {
					// Send an alert to bot-spam with a link to the original message tagged for the Knights
					const guildChannels = await message.guild.channels.fetch(), guildRoles = await message.guild.roles.fetch();
					guildChannels.find(channel => channel.name === "bot-stuff").send("<@&" + guildRoles.find(role => role.name === 'Knights').id + ">\nSuspected macbook spam detected, please investigate\nhttps://discord.com/channels/" + message.guild.id + "/" + message.channel.id + "/" + message.id);
					return;
				}
		}
	},
};
