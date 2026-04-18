const { createEmbed, THEME, modLog } = require('../utils/embeds');

module.exports = {
    once: false,
    async execute(emoji, client) {
        let deleter = 'Unknown';
        try {
            const auditLogs = await emoji.guild.fetchAuditLogs({ type: 62, limit: 1 }); // Type 62 = EMOJI_DELETE
            const log = auditLogs.entries.first();
            if (log && log.target.id === emoji.id && Date.now() - log.createdTimestamp < 10000) {
                deleter = `${log.executor} (${log.executor.id})`;
            }
        } catch {}

        await modLog(client, emoji.guild, createEmbed({
            title: '🗑️ Emoji Removed',
            description: `**Name:** \`${emoji.name}\`\n**Animated:** ${emoji.animated ? 'Yes' : 'No'}\n**Removed By:** ${deleter}`,
            color: THEME.error,
        }));
    },
};