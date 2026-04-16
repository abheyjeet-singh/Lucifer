const { createEmbed, THEME } = require('../utils/embeds');
const { getGuildSettings } = require('../database/db');

module.exports = {
    once: false,
    async execute(oldUser, newUser, client) {
        // 1. Global Username Change
        if (oldUser.username !== newUser.username) {
            const embed = createEmbed({
                title: '👤 True Name Altered (Global)',
                description: `**User:** ${newUser} (${newUser.id})\n**Old Name:** ${oldUser.username}\n**New Name:** ${newUser.username}`,
                color: THEME.accent,
                thumbnail: newUser.displayAvatarURL({ size: 128 }),
            });

            // Send to all mutual guilds' log channels
            for (const guild of client.guilds.cache.values()) {
                if (guild.members.cache.has(newUser.id)) {
                    const settings = getGuildSettings(guild.id);
                    if (settings.log_channel_id) {
                        const ch = guild.channels.cache.get(settings.log_channel_id);
                        if (ch) await ch.send({ embeds: [embed] }).catch(() => {});
                    }
                }
            }
        }

        // 2. Global Avatar Change
        if (oldUser.displayAvatarURL() !== newUser.displayAvatarURL()) {
            const oldUrl = oldUser.displayAvatarURL({ size: 512 });
            const newUrl = newUser.displayAvatarURL({ size: 512 });

            const embed = createEmbed({
                title: '🖼️ Global Visage Altered',
                description: `**User:** ${newUser} (${newUser.id})`,
                color: THEME.celestial,
                image: newUrl,
                thumbnail: oldUrl,
            });

            embed.addFields(
                { name: 'Old Visage', value: 'Shown in thumbnail (top right)', inline: true },
                { name: 'New Visage', value: 'Shown in main image', inline: true }
            );

            for (const guild of client.guilds.cache.values()) {
                if (guild.members.cache.has(newUser.id)) {
                    const settings = getGuildSettings(guild.id);
                    if (settings.log_channel_id) {
                        const ch = guild.channels.cache.get(settings.log_channel_id);
                        if (ch) await ch.send({ embeds: [embed] }).catch(() => {});
                    }
                }
            }
        }
    },
};
