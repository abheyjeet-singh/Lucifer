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

        let creator = 'Unknown';
        try {
            const auditLogs = await role.guild.fetchAuditLogs({ type: 30, limit: 1 }); // ROLE_CREATE
            const log = auditLogs.entries.first();
            if (log && log.target.id === role.id && Date.now() - log.createdTimestamp < 10000) {
                creator = `${log.executor.tag} (${log.executor.id})`;
            }
        } catch {}

        try {
            const imageBuffer = await buildModLogCard(
                null, 
                '#2ecc71', // Green accent
                'ROLE CONCEIVED', 
                [`Role: ${role.name} (${role.id})`, `Color: ${role.hexColor}`, `Creator: ${creator}`]
            );
            const attachment = new AttachmentBuilder(imageBuffer, { name: 'role_create.png' });
            await logChannel.send({ files: [attachment] });
        } catch (e) {
            console.error(e);
        }
    },
};