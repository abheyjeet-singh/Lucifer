const { createEmbed, THEME, modLog } = require('../utils/embeds');

module.exports = {
    once: false,
    async execute(member, client) {
        const accountAge = Math.floor(member.user.createdTimestamp / 1000);
        const joinedAt = Math.floor(member.joinedTimestamp / 1000);
        
        // Calculate how long ago the account was created
        const ageDays = Math.floor((Date.now() - member.user.createdTimestamp) / (1000 * 60 * 60 * 24));
        let accountFlag = '';
        if (ageDays < 7) accountFlag = '🚨 **NEW ACCOUNT (Less than 7 days old)**';
        else if (ageDays < 30) accountFlag = '⚠️ **RECENT ACCOUNT (Less than 30 days old)**';

        await modLog(client, member.guild, createEmbed({
            title: '🚪 Soul Entered the Realm',
            description: `**User:** ${member.user} (${member.id})\n**Account Created:** <t:${accountAge}:R> (${ageDays} days old)\n**Joined Server:** <t:${joinedAt}:R>\n**Total Members:** ${member.guild.memberCount}\n${accountFlag}`,
            color: THEME.success,
            thumbnail: member.user.displayAvatarURL({ size: 256 }),
            footer: { text: member.user.tag }
        }));
    },
};
