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

        let moderatorTag = 'Unknown';
        try {
            const auditLogs = await channel.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.ChannelDelete });
            const deleteLog = auditLogs.entries.first();
            if (deleteLog && deleteLog.target.id === channel.id) {
                moderatorTag = deleteLog.executor.tag;
            }
        } catch {}

        try {
            const imageBuffer = await buildModLogCard(
                channel.guild.iconURL({ extension: 'png' }), // Server logo as banner
                '#e74c3c', 
                'REALM ALTERED', 
                [`Channel: #${channel.name} (${channel.id})`, `Type: ${channel.type}`, `Destroyer: ${moderatorTag}`]
            );
            const attachment = new AttachmentBuilder(imageBuffer, { name: 'channel_delete.png' });
            await logChannel.send({ files: [attachment] });
        } catch (e) {
            console.error(e);
        }
    },
};