const { createEmbed, THEME, modLog } = require('../utils/embeds');

module.exports = {
    once: false,
    async execute(role, client) {
        let deleter = 'Unknown';
        try {
            const auditLogs = await role.guild.fetchAuditLogs({ type: 32, limit: 1 }); // Type 32 = ROLE_DELETE
            const log = auditLogs.entries.first();
            if (log && log.target.id === role.id && Date.now() - log.createdTimestamp < 10000) {
                deleter = `${log.executor} (${log.executor.id})`;
            }
        } catch {}

        await modLog(client, role.guild, createEmbed({
            title: '🗑️ Role Vanished',
            description: `**Name:** ${role.name} (${role.id})\n**Color:** ${role.hexColor}\n**Deleted By:** ${deleter}`,
            color: THEME.error,
        }));
    },
};
