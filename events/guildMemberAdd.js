const { createEmbed, THEME, modLog } = require('../utils/embeds');
const { isStickyRolesEnabled, getStickyUserRoles, removeStickyUserRoles } = require('../database/db');

module.exports = {
    once: false,
    async execute(member, client) {
        // ── Sticky Roles: Restore roles when user rejoins ──
        if (isStickyRolesEnabled(member.guild.id)) {
            const savedRoles = getStickyUserRoles(member.guild.id, member.id);
            if (savedRoles && savedRoles.length > 0) {
                const validRoles = savedRoles.filter(roleId => member.guild.roles.cache.has(roleId));
                if (validRoles.length > 0) {
                    try {
                        await member.roles.add(validRoles, 'Sticky Roles — Rejoined server');
                        await modLog(client, member.guild, createEmbed({
                            title: '📌 Sticky Roles Restored',
                            description: `**User:** ${member.user} (${member.id})\n**Roles Restored:** ${validRoles.map(id => `<@&${id}>`).join(', ')}`,
                            color: THEME.success,
                        }));
                    } catch (e) {
                        console.error('Sticky Roles Error:', e);
                        await modLog(client, member.guild, createEmbed({
                            title: '⚠️ Sticky Roles Failed',
                            description: `**User:** ${member.user} (${member.id})\n**Error:** Could not restore roles. Check my role hierarchy.`,
                            color: THEME.error,
                        }));
                    }
                }
                removeStickyUserRoles(member.guild.id, member.id);
            }
        }

        // ── Log Join ──
        const accountAge = Math.floor(member.user.createdTimestamp / 1000);
        const joinedAt = Math.floor(member.joinedTimestamp / 1000);
        const ageDays = Math.floor((Date.now() - member.user.createdTimestamp) / (1000 * 60 * 60 * 24));
        let accountFlag = '';
        if (ageDays < 7) accountFlag = '\n🚨 **NEW ACCOUNT (Less than 7 days old)**';
        else if (ageDays < 30) accountFlag = '\n⚠️ **RECENT ACCOUNT (Less than 30 days old)**';

        await modLog(client, member.guild, createEmbed({
            title: '🚪 Soul Entered the Realm',
            description: `**User:** ${member.user} (${member.id})\n**Account Created:** <t:${accountAge}:R> (${ageDays} days old)\n**Joined Server:** <t:${joinedAt}:R>\n**Total Members:** ${member.guild.memberCount}${accountFlag}`,
            color: THEME.success,
            thumbnail: member.user.displayAvatarURL({ size: 256 }),
            footer: { text: member.user.tag }
        }));
    },
};