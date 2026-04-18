const { createEmbed, THEME, modLog } = require('../utils/embeds');

module.exports = {
    once: false,
    async execute(emoji, client) {
        let creator = 'Unknown';
        try {
            const auditLogs = await emoji.guild.fetchAuditLogs({ type: 60, limit: 1 }); // Type 60 = EMOJI_CREATE
            const log = auditLogs.entries.first();
            if (log && log.target.id === emoji.id && Date.now() - log.createdTimestamp < 10000) {
                creator = `${log.executor} (${log.executor.id})`;
            }
        } catch {}

        await modLog(client, emoji.guild, createEmbed({
            title: '😀 Emoji Added',
            description: `**Emoji:** ${emoji} (\`${emoji.name}\`)\n**Animated:** ${emoji.animated ? 'Yes' : 'No'}\n**Added By:** ${creator}`,
            color: THEME.success,
        }));
    },
};