const { AuditLogEvent, AttachmentBuilder } = require('discord.js');
const { createEmbed, THEME, modLog } = require('../utils/embeds');
const { buildModLogCard } = require('../utils/canvasBuilder');

module.exports = {
    once: false,
    async execute(channel, client) {
        // Ignore DMs
        if (!channel.guild) return;

        let auditEntry = null;
        let actionType = 'Modified';
        let accentColor = THEME.celestial;
        let title = '🪝 WEBHOOK MODIFIED';
        let executorAvatar = client.user.displayAvatarURL({ extension: 'png' }); // Fallback avatar

        try {
            const auditLogs = await channel.guild.fetchAuditLogs({ limit: 5 });
            
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
                if (auditEntry.action === AuditLogEvent.WebhookCreate) {
                    actionType = 'Created'; accentColor = THEME.success; title = '🪝 WEBHOOK CREATED';
                } else if (auditEntry.action === AuditLogEvent.WebhookUpdate) {
                    actionType = 'Updated'; accentColor = THEME.celestial; title = '✏️ WEBHOOK UPDATED';
                } else if (auditEntry.action === AuditLogEvent.WebhookDelete) {
                    actionType = 'Deleted'; accentColor = THEME.error; title = '🗑️ WEBHOOK DELETED';
                }
                
                if (auditEntry.executor) {
                    executorAvatar = auditEntry.executor.displayAvatarURL({ extension: 'png' });
                }
            }
        } catch (error) {
            console.error('Webhook Audit Log Error:', error.message);
        }

        if (auditEntry) {
            const executor = auditEntry.executor;
            const webhookName = auditEntry.target.name || 'Unknown';

            const details = [
                `Channel: #${channel.name} (${channel.id})`,
                `Webhook: ${webhookName}`,
                `Executed By: ${executor ? executor.tag : 'Unknown'}`
            ];

            try {
                const imageBuffer = await buildModLogCard(executorAvatar, accentColor, title, details);
                const attachment = new AttachmentBuilder(imageBuffer, { name: 'webhook.png' });
                await modLog(client, channel.guild, { files: [attachment] });
            } catch (e) {
                console.error(e);
                // Fallback to embed if canvas fails
                await modLog(client, channel.guild, createEmbed({ context: guild, title: title, description: details.join('\n'), color: accentColor }));
            }
        } else {
            // Fallback if we couldn't fetch the audit log
            const emoji = actionType === 'Created' ? '🪝' : actionType === 'Updated' ? '✏️' : '🗑️';
            await modLog(client, channel.guild, createEmbed({
                title: `${emoji} Webhook ${actionType}`,
                description: `**Channel:** ${channel} (${channel.id})\n**Executed By:** Unknown (Audit Log unavailable)`,
                color: accentColor,
            }));
        }
    },
};