const { createEmbed, THEME, modLog } = require('../utils/embeds');

module.exports = {
    once: false,
    async execute(role, client) {
        let creator = 'Unknown';
        try {
            const auditLogs = await role.guild.fetchAuditLogs({ type: 30, limit: 1 }); // Type 30 = ROLE_CREATE
            const log = auditLogs.entries.first();
            if (log && log.target.id === role.id && Date.now() - log.createdTimestamp < 10000) {
                creator = `${log.executor} (${log.executor.id})`;
            }
        } catch {}

        await modLog(client, role.guild, createEmbed({
            title: '🎭 Role Conceived',
            description: `**Role:** ${role} (${role.id})\n**Color:** ${role.hexColor}\n**Creator:** ${creator}`,
            color: THEME.success,
        }));
    },
};
