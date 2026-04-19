const { ActivityType } = require('discord.js');
const logger = require('../utils/logger');
const { getActiveGiveaways } = require('../database/db');
const giveawayCommand = require('../commands/utility/giveaway');

module.exports = {
    once: true,
    async execute(client) {
        logger.success(`${client.user.username} has descended from the Silver City!`);
        logger.info(`Serving ${client.guilds.cache.size} kingdom(s)`);

        // ── Fetch Bot Owner Name for Status ──
        let ownerName = 'The Creator';
        try {
            if (process.env.BOT_OWNER_ID) {
                const owner = await client.users.fetch(process.env.BOT_OWNER_ID);
                ownerName = owner.username;
            }
        } catch {}

        // ── Dynamic Rotating Status ──
        const statusList = [
            { name: `🛠️ Getting Fixed by ${ownerName}`, type: ActivityType.Playing },
            { name: `📶 Ping: ${client.ws.ping}ms`, type: ActivityType.Watching },
            { name: '👑 Playing with mortal souls', type: ActivityType.Playing },
            { name: '🍷 Drinking at Lux', type: ActivityType.Playing },
            { name: '⚔️ Watching over Hell', type: ActivityType.Watching },
            { name: `🔥 Serving ${client.guilds.cache.size} realms`, type: ActivityType.Playing }
        ];
        
        let statusIndex = 0;
        
        const updateStatus = () => {
            if (statusList[statusIndex].name.includes('Ping:')) {
                statusList[statusIndex].name = `📶 Ping: ${client.ws.ping}ms`;
            }
            if (statusList[statusIndex].name.includes('Serving')) {
                statusList[statusIndex].name = `🔥 Serving ${client.guilds.cache.size} realms`;
            }

            client.user.setPresence({
                activities: [statusList[statusIndex]],
                status: 'dnd',
            });
            
            statusIndex = (statusIndex + 1) % statusList.length;
        };

        updateStatus();
        setInterval(updateStatus, 60 * 1000);

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

        // ── Resume Active Invite Events ──
        try {
            const inviteEventCmd = require('../commands/utility/inviteevent');
            await inviteEventCmd.resumeInviteEvents(client);
        } catch (error) {
            logger.error('Failed to resume invite events: ' + error.message);
        }
    },
};