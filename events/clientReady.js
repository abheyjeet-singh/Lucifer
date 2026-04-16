const { ActivityType } = require('discord.js');
const logger = require('../utils/logger');
const { getActiveGiveaways } = require('../database/db');
const giveawayCommand = require('../commands/utility/giveaway');

module.exports = {
    once: true,
    async execute(client) {
        logger.success(`${client.user.username} has descended from the Silver City!`);
        logger.info(`Serving ${client.guilds.cache.size} kingdom(s)`);

        client.user.setPresence({
            activities: [{ name: "🔥 Hell's Gates", type: ActivityType.Watching }],
            status: 'dnd',
        });

        // ── Resume Active Giveaways ──
        try {
            const activeGiveaways = getActiveGiveaways();
            if (activeGiveaways.length > 0) {
                logger.info(`Resuming ${activeGiveaways.length} active giveaway(s)...`);
                for (const gData of activeGiveaways) {
                    await giveawayCommand.resumeGiveaway(client, gData);
                }
            }
        } catch (error) {
            logger.error('Failed to resume giveaways: ' + error.message);
        }
    },
};