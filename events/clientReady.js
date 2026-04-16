const { ActivityType } = require('discord.js');
const logger = require('../utils/logger');

module.exports = {
    once: true,
    async execute(client) {
        logger.success(`${client.user.username} has descended from the Silver City!`);
        logger.info(`Serving ${client.guilds.cache.size} kingdom(s)`);

        client.user.setPresence({
            activities: [{ name: "🔥 Hell's Gates", type: ActivityType.Watching }],
            status: 'dnd',
        });
    },
};
