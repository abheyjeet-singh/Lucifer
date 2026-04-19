const { AuditLogEvent, AttachmentBuilder } = require('discord.js');
const { getGuildSettings, isStickyRolesEnabled, removeStickyUserRoles } = require('../database/db');
const { buildModLogCard } = require('../utils/canvasBuilder');

module.exports = {
    once: false,
    async execute(ban, client) {
        const { guild, user } = ban;

        // ── Sticky Roles: Wipe saved roles if the user is banned ──
        // If a user is banned, they forfeit their sticky roles. 
        // (guildMemberRemove fires first and saves them, so we must delete them here)
        if (isStickyRolesEnabled(guild.id)) {
            removeStickyUserRoles(guild.id, user.id);
        }

        // ── EXISTING BAN LOG LOGIC ──
        const settings = getGuildSettings(guild.id);
        if (!settings.log_channel_id) return;
        const logChannel = guild.channels.cache.get(settings.log_channel_id);
        if (!logChannel) return;

        let moderatorTag = 'Unknown';
        let reason = 'No reason provided';
        try {
            const auditLogs = await guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.MemberBanAdd });
            const banLog = auditLogs.entries.first();
            if (banLog && banLog.target.id === user.id) {
                moderatorTag = banLog.executor.tag;
                reason = banLog.reason || 'No reason provided';
            }
        } catch {}

        try {
            const imageBuffer = await buildModLogCard(
                user.displayAvatarURL({ extension: 'png' }), 
                '#e74c3c', 
                'SOUL BANISHED', 
                [`Victim: ${user.tag} (${user.id})`, `Inquisitor: ${moderatorTag}`, `Reason: ${reason}`]
            );
            const attachment = new AttachmentBuilder(imageBuffer, { name: 'ban.png' });
            await logChannel.send({ files: [attachment] });
        } catch (e) {
            console.error(e);
        }
    },
};