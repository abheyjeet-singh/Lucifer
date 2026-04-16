const { createEmbed, THEME } = require('../utils/embeds');
const { getGuildSettings } = require('../database/db');

module.exports = {
    once: false,
    async execute(oldMessage, newMessage, client) {
        // Ignore DMs
        if (!oldMessage.guild) return;

        // Ignore edits that don't change the text (e.g., embed additions)
        if (oldMessage.content === newMessage.content) return;

        // Handle Partial Messages (sent before bot started)
        // If oldMessage is partial, we don't know who sent it, so we grab data from the newMessage
        if (oldMessage.partial) {
            try { await oldMessage.fetch(); } catch { return; }
        }

        const author = oldMessage.author || newMessage.author;
        if (!author || author.bot) return; // Ignore bots or completely unknown authors

        const settings = getGuildSettings(oldMessage.guild.id);
        if (!settings.log_channel_id) return;
        const logChannel = oldMessage.guild.channels.cache.get(settings.log_channel_id);
        if (!logChannel) return;

        const embed = createEmbed({
            title: '✏️ Message Altered',
            description: `**Author:** ${author} (${author.id})\n**Channel:** ${oldMessage.channel}\n[Jump to Message](${newMessage.url})`,
            color: THEME.celestial,
        });

        // Before text (truncate if too long)
        if (oldMessage.content) {
            const beforeText = oldMessage.content.length > 1024 ? oldMessage.content.substring(0, 1021) + '...' : oldMessage.content;
            embed.addFields({ name: '📤 Before', value: beforeText });
        } else {
            embed.addFields({ name: '📤 Before', value: '*No text content or message was uncached*' });
        }

        // After text (truncate if too long)
        if (newMessage.content) {
            const afterText = newMessage.content.length > 1024 ? newMessage.content.substring(0, 1021) + '...' : newMessage.content;
            embed.addFields({ name: '📥 After', value: afterText });
        } else {
            embed.addFields({ name: '📥 After', value: '*Text was removed entirely*' });
        }

        try {
            await logChannel.send({ embeds: [embed] });
        } catch (error) {
            console.error("Failed to send edit log:", error.message);
        }
    },
};
