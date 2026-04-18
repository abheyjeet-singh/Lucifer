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

        let creator = 'Unknown';
        try {
            const auditLogs = await emoji.guild.fetchAuditLogs({ type: 60, limit: 1 }); // EMOJI_CREATE
            const log = auditLogs.entries.first();
            if (log && log.target.id === emoji.id && Date.now() - log.createdTimestamp < 10000) {
                creator = `${log.executor.tag} (${log.executor.id})`;
            }
        } catch {}

        try {
            const imageBuffer = await buildModLogCard(
                emoji.imageURL(), // Use the new emoji as the avatar!
                '#2ecc71', // Green accent
                'EMOJI ADDED', 
                [`Name: :${emoji.name}:`, `Animated: ${emoji.animated ? 'Yes' : 'No'}`, `Added By: ${creator}`]
            );
            const attachment = new AttachmentBuilder(imageBuffer, { name: 'emoji_create.png' });
            await logChannel.send({ files: [attachment] });
        } catch (e) {
            console.error(e);
        }
    },
};