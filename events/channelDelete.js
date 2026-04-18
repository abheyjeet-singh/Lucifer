const { createEmbed, THEME, modLog } = require('../utils/embeds');

module.exports = {
    once: false,
    async execute(channel, client) {
        if (!channel.guild) return;

        let deleter = 'Unknown';
        try {
            const auditLogs = await channel.guild.fetchAuditLogs({ type: 12, limit: 1 }); // Type 12 = CHANNEL_DELETE
            const log = auditLogs.entries.first();
            if (log && log.target.id === channel.id && Date.now() - log.createdTimestamp < 10000) {
                deleter = `${log.executor} (${log.executor.id})`;
            }
        } catch {}

        await modLog(client, channel.guild, createEmbed({
            title: '🗑️ Channel Destroyed',
            description: `**Name:** #${channel.name} (${channel.id})\n**Type:** ${channel.type}\n**Deleted By:** ${deleter}`,
            color: THEME.error,
        }));
    },
};