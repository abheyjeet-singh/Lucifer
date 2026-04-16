const { createEmbed, THEME, modLog } = require('../utils/embeds');

module.exports = {
    once: false,
    async execute(oldMember, newMember, client) {
        // 1. Nickname Change
        if (oldMember.nickname !== newMember.nickname) {
            const oldNick = oldMember.nickname || oldMember.user.username;
            const newNick = newMember.nickname || newMember.user.username;

            await modLog(client, newMember.guild, createEmbed({
                title: '🏷️ Identity Altered',
                description: `**User:** ${newMember.user} (${newMember.id})\n**Old Name:** ${oldNick}\n**New Name:** ${newNick}`,
                color: THEME.celestial,
            }));
        }

        // 2. Role Changes
        const addedRoles = newMember.roles.cache.filter(r => !oldMember.roles.cache.has(r.id));
        const removedRoles = oldMember.roles.cache.filter(r => !newMember.roles.cache.has(r.id));

        if (addedRoles.size > 0 || removedRoles.size > 0) {
            const addedStr = addedRoles.map(r => `+ ${r.name}`).join('\n') || 'None';
            const removedStr = removedRoles.map(r => `- ${r.name}`).join('\n') || 'None';

            await modLog(client, newMember.guild, createEmbed({
                title: '🎭 Roles Altered',
                description: `**User:** ${newMember.user} (${newMember.id})`,
                fields: [
                    { name: '🟢 Added', value: addedStr, inline: true },
                    { name: '🔴 Removed', value: removedStr, inline: true },
                ],
                color: THEME.primary,
            }));
        }

        // 3. Server Avatar Change
        if (oldMember.avatar !== newMember.avatar) {
            const oldUrl = oldMember.avatarURL({ size: 256 }) || oldMember.user.displayAvatarURL({ size: 256 });
            const newUrl = newMember.avatarURL({ size: 256 }) || newMember.user.displayAvatarURL({ size: 256 });

            const embed = createEmbed({
                title: '🖼️ Server Visage Altered',
                description: `**User:** ${newMember.user} (${newMember.id})`,
                color: THEME.celestial,
                image: newUrl,
                thumbnail: oldUrl,
            });

            embed.addFields(
                { name: 'Old Visage', value: 'Shown in thumbnail (top right)', inline: true },
                { name: 'New Visage', value: 'Shown in main image', inline: true }
            );

            await modLog(client, newMember.guild, embed);
        }
    },
};