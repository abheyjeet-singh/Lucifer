const { AuditLogEvent, AttachmentBuilder } = require('discord.js');
const { getGuildSettings } = require('../database/db');
const { buildModLogCard } = require('../utils/canvasBuilder');

module.exports = {
    once: false,
    async execute(role, client) {
        const settings = getGuildSettings(role.guild.id);
        if (!settings.log_channel_id) return;
        const logChannel = role.guild.channels.cache.get(settings.log_channel_id);
        if (!logChannel) return;

        let creator = 'Unknown';
        try {
            const auditLogs = await role.guild.fetchAuditLogs({ type: AuditLogEvent.RoleCreate, limit: 1 });
            const log = auditLogs.entries.first();
            if (log && log.target.id === role.id && Date.now() - log.createdTimestamp < 10000) {
                creator = `${log.executor.tag} (${log.executor.id})`;
            }
        } catch {}

        try {
            // Use the role's actual color as the accent! Fallback to green if default.
            const accentColor = role.hexColor && role.hexColor !== '#000000' ? role.hexColor : '#2ecc71';
            
            const imageBuffer = await buildModLogCard(
                role.guild.iconURL({ extension: 'png' }), // Server logo as banner
                accentColor, 
                'TITLE CONCEIVED', 
                [`Role: ${role.name} (${role.id})`, `Color: ${role.hexColor}`, `Architect: ${creator}`]
            );
            const attachment = new AttachmentBuilder(imageBuffer, { name: 'role_create.png' });
            await logChannel.send({ files: [attachment] });
        } catch (e) {
            console.error(e);
        }
    },
};