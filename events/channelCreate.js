const { AuditLogEvent, AttachmentBuilder } = require('discord.js');
const { getGuildSettings } = require('../database/db');
const { buildModLogCard } = require('../utils/canvasBuilder');

module.exports = {
    once: false,
    async execute(channel, client) {
        if (!channel.guild) return;
        const settings = getGuildSettings(channel.guild.id);
        if (!settings.log_channel_id) return;
        const logChannel = channel.guild.channels.cache.get(settings.log_channel_id);
        if (!logChannel) return;

        let creator = 'Unknown';
        try {
            const auditLogs = await channel.guild.fetchAuditLogs({ type: AuditLogEvent.ChannelCreate, limit: 1 });
            const log = auditLogs.entries.first();
            if (log && log.target.id === channel.id && Date.now() - log.createdTimestamp < 10000) {
                creator = `${log.executor.tag} (${log.executor.id})`;
            }
        } catch {}

        try {
            const imageBuffer = await buildModLogCard(
                channel.guild.iconURL({ extension: 'png' }), // Server logo as banner
                '#2ecc71', 
                'REALM EXPANDED', 
                [`Channel: #${channel.name} (${channel.id})`, `Type: ${channel.type}`, `Architect: ${creator}`]
            );
            const attachment = new AttachmentBuilder(imageBuffer, { name: 'channel_create.png' });
            await logChannel.send({ files: [attachment] });
        } catch (e) {
            console.error(e);
        }
    },
};