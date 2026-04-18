const { AttachmentBuilder } = require('discord.js');
const { getGuildSettings } = require('../database/db');
const { buildModLogCard } = require('../utils/canvasBuilder');

module.exports = {
    once: false,
    async execute(emoji, client) {
        const settings = getGuildSettings(emoji.guild.id);
        if (!settings.log_channel_id) return;
        const logChannel = emoji.guild.channels.cache.get(settings.log_channel_id);
        if (!logChannel) return;

        let deleter = 'Unknown';
        try {
            const auditLogs = await emoji.guild.fetchAuditLogs({ type: 62, limit: 1 }); // EMOJI_DELETE
            const log = auditLogs.entries.first();
            if (log && log.target.id === emoji.id && Date.now() - log.createdTimestamp < 10000) {
                deleter = `${log.executor.tag} (${log.executor.id})`;
            }
        } catch {}

        try {
            const imageBuffer = await buildModLogCard(
                null, // Emoji is deleted, image URL might be invalid, use null
                '#e74c3c', // Red accent
                'EMOJI REMOVED', 
                [`Name: :${emoji.name}:`, `Animated: ${emoji.animated ? 'Yes' : 'No'}`, `Removed By: ${deleter}`]
            );
            const attachment = new AttachmentBuilder(imageBuffer, { name: 'emoji_delete.png' });
            await logChannel.send({ files: [attachment] });
        } catch (e) {
            console.error(e);
        }
    },
};