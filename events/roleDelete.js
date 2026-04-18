const { AttachmentBuilder } = require('discord.js');
const { getGuildSettings } = require('../database/db');
const { buildModLogCard } = require('../utils/canvasBuilder');

module.exports = {
    once: false,
    async execute(role, client) {
        const settings = getGuildSettings(role.guild.id);
        if (!settings.log_channel_id) return;
        const logChannel = role.guild.channels.cache.get(settings.log_channel_id);
        if (!logChannel) return;

        let deleter = 'Unknown';
        try {
            const auditLogs = await role.guild.fetchAuditLogs({ type: 32, limit: 1 }); // ROLE_DELETE
            const log = auditLogs.entries.first();
            if (log && log.target.id === role.id && Date.now() - log.createdTimestamp < 10000) {
                deleter = `${log.executor.tag} (${log.executor.id})`;
            }
        } catch {}

        try {
            const imageBuffer = await buildModLogCard(
                null, 
                '#e74c3c', // Red accent
                'ROLE VANISHED', 
                [`Role: ${role.name} (${role.id})`, `Color: ${role.hexColor}`, `Deleted By: ${deleter}`]
            );
            const attachment = new AttachmentBuilder(imageBuffer, { name: 'role_delete.png' });
            await logChannel.send({ files: [attachment] });
        } catch (e) {
            console.error(e);
        }
    },
};