const { createEmbed, THEME, modLog } = require('../utils/embeds');
const { isStickyRolesEnabled, saveStickyUserRoles, removeStickyUserRoles, getGuildSettings } = require('../database/db');

module.exports = {
    once: false,
    async execute(member, client) {
        if (member.user.bot) return;

        // ── 1. Sticky Roles: Save roles when user leaves ──
        if (isStickyRolesEnabled(member.guild.id)) {
            const rolesToSave = member.roles.cache
                .filter(r => !r.managed && r.id !== member.guild.id && r.id !== member.guild.roles.premiumSubscriberRole?.id)
                .map(r => r.id);
                
            if (rolesToSave.length > 0) {
                saveStickyUserRoles(member.guild.id, member.id, rolesToSave);
            } else {
                removeStickyUserRoles(member.guild.id, member.id);
            }
        }

        // ── 2. Check if they were KICKED ──
        let kickLog = null;
        try {
            const auditLogs = await member.guild.fetchAuditLogs({ type: 20, limit: 1 }); // Type 20 = MEMBER_KICK
            const log = auditLogs.entries.first();
            if (log && log.target.id === member.id && Date.now() - log.createdTimestamp < 5000) {
                kickLog = log;
            }
        } catch {}

        const joinedAt = Math.floor(member.joinedTimestamp / 1000);
        const stayDuration = Math.floor((Date.now() - member.joinedTimestamp) / (1000 * 60 * 60 * 24));
        const roles = member.roles.cache.filter(r => r.id !== member.guild.id).sort((a, b) => b.position - a.position).map(r => `${r.name}`).join(', ') || 'None';

        // If they were kicked, log a Kick embed instead of a Leave embed
        if (kickLog) {
            await modLog(client, member.guild, createEmbed({
                title: '👢 Soul Kicked Out',
                description: `**User:** ${member.user} (${member.id})\n**Kicked By:** ${kickLog.executor} (${kickLog.executor.id})\n**Reason:** ${kickLog.reason || 'No reason provided'}\n**Joined:** <t:${joinedAt}:R>\n**Stayed For:** ${stayDuration} days`,
                fields: [{ name: '🎭 Roles', value: roles.substring(0, 1024) }],
                color: THEME.accent,
                thumbnail: member.user.displayAvatarURL({ size: 256 }),
                footer: { text: member.user.tag }
            }));
        } else {
            // Normal Leave
            await modLog(client, member.guild, createEmbed({
                title: '🚪 Soul Left the Realm',
                description: `**User:** ${member.user} (${member.id})\n**Joined:** <t:${joinedAt}:R>\n**Stayed For:** ${stayDuration} days\n**Total Members:** ${member.guild.memberCount}`,
                fields: [{ name: '🎭 Roles', value: roles.substring(0, 1024) }],
                color: THEME.accent,
                thumbnail: member.user.displayAvatarURL({ size: 256 }),
                footer: { text: member.user.tag }
            }));
        }
    },
};