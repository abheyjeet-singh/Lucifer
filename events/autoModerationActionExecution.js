const { createEmbed, THEME, modLog } = require('../utils/embeds');

module.exports = {
    once: false,
    async execute(execution, client) {
        const guild = execution.guild;
        const action = execution.action.type; // 1=Block, 2=SendAlert, 3=Timeout
        const actionStr = action === 1 ? '🛑 Message Blocked' : action === 2 ? '⚠️ Alert Sent' : action === 3 ? '🔇 User Timed Out' : 'Unknown';

        let content = execution.message?.content || 'No content cached';
        if (content.length > 1024) content = content.substring(0, 1021) + '...';

        await modLog(client, guild, createEmbed({
            title: '🤖 Discord AutoMod Triggered',
            description: `**User:** <@${execution.userId}> (${execution.userId})\n**Channel:** <#${execution.channelId}>\n**Action:** ${actionStr}\n**Rule Triggered:** ${execution.ruleTriggerType}`,
            fields: [
                { name: '📝 Message Content', value: content }
            ],
            color: THEME.accent,
        }));
    },
};