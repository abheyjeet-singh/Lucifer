const { createEmbed, THEME, modLog } = require('../utils/embeds');

module.exports = {
    once: false,
    async execute(channel, client) {
        if (!channel.guild) return; // Ignore DMs
        
        let creator = 'Unknown';
        try {
            const auditLogs = await channel.guild.fetchAuditLogs({ type: 10, limit: 1 }); // Type 10 = CHANNEL_CREATE
            const log = auditLogs.entries.first();
            if (log && log.target.id === channel.id && Date.now() - log.createdTimestamp < 10000) {
                creator = `${log.executor} (${log.executor.id})`;
            }
        } catch {}

        await modLog(client, channel.guild, createEmbed({
            title: '🧱 Channel Forged',
            description: `**Channel:** ${channel} (${channel.id})\n**Type:** ${channel.type}\n**Creator:** ${creator}`,
            color: THEME.success,
        }));
    },
};