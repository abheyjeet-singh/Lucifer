const { AttachmentBuilder } = require('discord.js');
const { getGuildSettings } = require('../database/db');
const { buildModLogCard } = require('../utils/canvasBuilder');

module.exports = {
    once: false,
    async execute(channel, client) {
        if (!channel.guild) return; // Ignore DMs
        const settings = getGuildSettings(channel.guild.id);
        if (!settings.log_channel_id) return;
        const logChannel = channel.guild.channels.cache.get(settings.log_channel_id);
        if (!logChannel) return;

        let creator = 'Unknown';
        try {
            const auditLogs = await channel.guild.fetchAuditLogs({ type: 10, limit: 1 }); // CHANNEL_CREATE
            const log = auditLogs.entries.first();
            if (log && log.target.id === channel.id && Date.now() - log.createdTimestamp < 10000) {
                creator = `${log.executor.tag} (${log.executor.id})`;
            }
        } catch {}

        try {
            const imageBuffer = await buildModLogCard(
                null, // No avatar for channels
                '#2ecc71', // Green accent
                'CHANNEL FORGED', 
                [`Channel: #${channel.name} (${channel.id})`, `Type: ${channel.type}`, `Creator: ${creator}`]
            );
            const attachment = new AttachmentBuilder(imageBuffer, { name: 'channel_create.png' });
            await logChannel.send({ files: [attachment] });
        } catch (e) {
            console.error(e);
        }
    },
};