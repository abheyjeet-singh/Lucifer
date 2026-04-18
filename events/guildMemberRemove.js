const { AuditLogEvent, AttachmentBuilder } = require('discord.js');
const { createEmbed, THEME } = require('../utils/embeds');
const { isStickyRolesEnabled, getStickyUserRoles, removeStickyUserRoles, getGuildSettings } = require('../database/db');
const { buildLeaveImage, buildModLogCard } = require('../utils/canvasBuilder');

module.exports = {
    once: false,
    async execute(member, client) {
        if (!member.guild) return;

        // ── Sticky Roles Cleanup ──
        if (isStickyRolesEnabled(member.guild.id)) {
            removeStickyUserRoles(member.guild.id, member.id);
        }

        // ── Visual Logs ──
        const settings = getGuildSettings(member.guild.id);
        if (!settings.log_channel_id) return;
        const logChannel = member.guild.channels.cache.get(settings.log_channel_id);
        if (!logChannel) return;

        // Check if it was a kick
        let isKick = false;
        let moderatorTag = 'Unknown';
        let reason = 'No reason provided';
        try {
            const auditLogs = await member.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.MemberKick });
            const kickLog = auditLogs.entries.first();
            if (kickLog && kickLog.target.id === member.id && (Date.now() - kickLog.createdTimestamp) < 5000) {
                isKick = true;
                moderatorTag = kickLog.executor.tag;
                reason = kickLog.reason || 'No reason provided';
            }
        } catch {}

        try {
            if (isKick) {
                // Send Kick Log Card
                const imageBuffer = await buildModLogCard(
                    member.user.displayAvatarURL({ extension: 'png' }), 
                    '#e67e22', // Orange accent
                    'MEMBER KICKED', 
                    [`User: ${member.user.tag} (${member.id})`, `Moderator: ${moderatorTag}`, `Reason: ${reason}`]
                );
                const attachment = new AttachmentBuilder(imageBuffer, { name: 'kick.png' });
                await logChannel.send({ files: [attachment] });
            } else {
                // Send Leave Image Card
                const imageBuffer = await buildLeaveImage(member);
                const attachment = new AttachmentBuilder(imageBuffer, { name: 'leave.png' });
                await logChannel.send({ files: [attachment] });
            }
        } catch (e) {
            console.error(e);
        }
    },
};