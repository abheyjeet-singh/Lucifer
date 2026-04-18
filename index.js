require('dotenv').config();
const { Client, GatewayIntentBits, Partials } = require('discord.js');
const { loadCommands } = require('./handlers/commandHandler');
const { loadEvents } = require('./handlers/eventHandler');
const { registerSlashCommands } = require('./handlers/slashHandler');
const { getExpiredTempbans, removeTempban, getExpiredReminders, removeReminder } = require('./database/db');
const logger = require('./utils/logger');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildBans, GatewayIntentBits.GuildMessageReactions,
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

client.snipes = new Map();

const slashData = loadCommands(client);
loadEvents(client);

client.once('clientReady', () => {
    registerSlashCommands(slashData, process.env.CLIENT_ID, process.env.TOKEN);

    // ── Tempban Auto-Unban Checker ──
    setInterval(async () => {
        const expired = getExpiredTempbans(Date.now());
        for (const temp of expired) {
            const guild = client.guilds.cache.get(temp.guild_id);
            if (guild) {
                try { await guild.bans.remove(temp.user_id, '⏳ Tempban expired.'); logger.info(`Auto-unbanned ${temp.user_id}`); } catch {}
                removeTempban(temp.guild_id, temp.user_id);
            }
        }
    }, 60 * 1000);

    // ── Reminders Checker ──
    setInterval(async () => {
        const expired = getExpiredReminders(Date.now());
        for (const rem of expired) {
            const channel = client.channels.cache.get(rem.channel_id);
            if (channel) {
                await channel.send(`⏰ <@${rem.user_id}>, your divine alarm has rung!\n> ${rem.reason}`).catch(() => {});
            } else {
                const user = await client.users.fetch(rem.user_id).catch(() => null);
                if (user) await user.send(`⏰ Your divine alarm has rung!\n> ${rem.reason}`).catch(() => {});
            }
            removeReminder(rem.id);
        }
    }, 15 * 1000); // Check every 15 seconds for precise reminders

    // ── ITEM EXPIRATION SWEEPER ──
    // Runs every 5 minutes to remove expired shop items (like Rob Shields) from the database
    setInterval(() => {
        try {
            const db = require('./database/db').db;
            const now = Date.now();
            const result = db.prepare('DELETE FROM inventory WHERE expires IS NOT NULL AND expires <= ?').run(now);
            if (result.changes > 0) {
                logger.info(`🔥 Sweeper: Removed ${result.changes} expired item(s).`);
            }
        } catch (err) {
            logger.error('Sweeper Error:', err);
        }
    }, 5 * 60 * 1000); // 5 minutes
});

client.login(process.env.TOKEN)
    .then(() => logger.success('Lucifer is rising...'))
    .catch(err => logger.error(`Failed to login: ${err.message}`));

process.on('unhandledRejection', error => console.error('Unhandled Promise Rejection:', error));
process.on('uncaughtException', error => console.error('Uncaught Exception:', error));