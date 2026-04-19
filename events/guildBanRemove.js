const { AuditLogEvent, AttachmentBuilder } = require('discord.js');
const { getGuildSettings } = require('../database/db');
const { buildModLogCard } = require('../utils/canvasBuilder');

module.exports = {
    once: false,
    async execute(ban, client) {
        const { guild, user } = ban;
        const settings = getGuildSettings(guild.id);
        if (!settings.log_channel_id) return;
        const logChannel = guild.channels.cache.get(settings.log_channel_id);
        if (!logChannel) return;

        let moderatorTag = 'Unknown';
        try {
            const auditLogs = await guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.MemberBanRemove });
            const unbanLog = auditLogs.entries.first();
            if (unbanLog && unbanLog.target.id === user.id) {
                moderatorTag = unbanLog.executor.tag;
            }
        } catch {}

        try {
            const imageBuffer = await buildModLogCard(
                user.displayAvatarURL({ extension: 'png' }), // TARGET avatar
                '#2ecc71', 
                'SOUL ABSOLVED', 
                [`Victim: ${user.tag} (${user.id})`, `Inquisitor: ${moderatorTag}`]
            );
            const attachment = new AttachmentBuilder(imageBuffer, { name: 'unban.png' });
            await logChannel.send({ files: [attachment] });
        } catch (e) {
            console.error(e);
        }
    },
};