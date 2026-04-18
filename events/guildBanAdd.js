const { createEmbed, THEME, modLog } = require('../utils/embeds');

module.exports = {
    once: false,
    async execute(ban, client) {
        // Fetch the ban to get the reason
        let reason = 'No reason provided';
        try {
            const fullBan = await ban.guild.bans.fetch(ban.user.id);
            reason = fullBan.reason || 'No reason provided';
        } catch {}

        // Fetch Audit Log to find out WHO banned them
        let moderator = 'Unknown (Possibly Discord System)';
        try {
            const auditLogs = await ban.guild.fetchAuditLogs({ type: 22, limit: 1 }); // Type 22 = MEMBER_BAN_ADD
            const log = auditLogs.entries.first();
            if (log && log.target.id === ban.user.id && Date.now() - log.createdTimestamp < 10000) {
                moderator = `${log.executor} (${log.executor.id})`;
            }
        } catch {}

        await modLog(client, ban.guild, createEmbed({
            title: '🔨 Soul Banished',
            description: `**User:** ${ban.user} (${ban.user.id})\n**Moderator:** ${moderator}\n**Reason:** ${reason}`,
            color: THEME.error,
            thumbnail: ban.user.displayAvatarURL({ size: 256 }),
            footer: { text: ban.user.tag }
        }));
    },
};