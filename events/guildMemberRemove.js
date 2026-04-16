const { createEmbed, THEME, modLog } = require('../utils/embeds');

module.exports = {
    once: false,
    async execute(member, client) {
        const roles = member.roles.cache.filter(r => r.id !== member.guild.id).map(r => r.toString()).join(', ') || 'None';
        const joinedAt = Math.floor(member.joinedTimestamp / 1000);
        
        // Calculate how long they stayed
        const stayDuration = Math.floor((Date.now() - member.joinedTimestamp) / (1000 * 60 * 60 * 24));

        await modLog(client, member.guild, createEmbed({
            title: '🚪 Soul Departed the Realm',
            description: `**User:** ${member.user.tag} (${member.id})\n**Joined:** <t:${joinedAt}:R>\n**Stayed For:** ${stayDuration} days\n**Roles:** ${roles}`,
            color: THEME.accent,
            thumbnail: member.user.displayAvatarURL({ size: 256 }),
        }));
    },
};
