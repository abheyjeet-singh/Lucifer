const { AuditLogEvent } = require('discord.js');
const { createEmbed, THEME, modLog } = require('../utils/embeds');

module.exports = {
    once: false,
    async execute(channel, client) {
        // Ignore DMs
        if (!channel.guild) return;

        let auditEntry = null;
        let actionType = 'Modified';

        try {
            // Fetch the latest 5 audit logs of ANY type to save API calls (Discord rate limits audit logs heavily)
            const auditLogs = await channel.guild.fetchAuditLogs({ limit: 5 });
            
            // Find the most recent webhook action in this channel within the last 5 seconds
            auditEntry = auditLogs.entries.find(entry => {
                const isWebhookAction = [
                    AuditLogEvent.WebhookCreate, 
                    AuditLogEvent.WebhookUpdate, 
                    AuditLogEvent.WebhookDelete
                ].includes(entry.action);
                
                const isRecent = Date.now() - entry.createdTimestamp < 5000;
                const isCorrectChannel = entry.target && entry.target.channelId === channel.id;

                return isWebhookAction && isRecent && isCorrectChannel;
            });

            if (auditEntry) {
                if (auditEntry.action === AuditLogEvent.WebhookCreate) actionType = 'Created';
                else if (auditEntry.action === AuditLogEvent.WebhookUpdate) actionType = 'Updated';
                else if (auditEntry.action === AuditLogEvent.WebhookDelete) actionType = 'Deleted';
            }
        } catch (error) {
            console.error('Webhook Audit Log Error:', error.message);
        }

        // Format the log based on the action type
        let emoji = '🪝';
        let color = THEME.celestial;

        if (actionType === 'Created') {
            emoji = '🪝';
            color = THEME.success; // Green for creation
        } else if (actionType === 'Updated') {
            emoji = '✏️';
            color = THEME.celestial; // Blue for updates
        } else if (actionType === 'Deleted') {
            emoji = '🗑️';
            color = THEME.error; // Red for deletion
        }

        // If we found the audit log, we know WHO did it and the webhook name
        if (auditEntry) {
            const executor = auditEntry.executor;
            const webhookName = auditEntry.target.name || 'Unknown';

            await modLog(client, channel.guild, createEmbed({
                title: `${emoji} Webhook ${actionType}`,
                description: `**Channel:** ${channel} (${channel.id})\n**Webhook Name:** ${webhookName}\n**Executed By:** ${executor} (${executor.id})`,
                color: color,
            }));
        } else {
            // Fallback if we couldn't fetch the audit log (missing permissions or rate limited)
            await modLog(client, channel.guild, createEmbed({
                title: `${emoji} Webhook ${actionType}`,
                description: `**Channel:** ${channel} (${channel.id})\n**Executed By:** Unknown (Missing View Audit Log permissions or rate limited)`,
                color: color,
            }));
        }
    },
};