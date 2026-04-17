const { createEmbed, THEME, modLog } = require('../utils/embeds');
const { getBoostPerksChannel, getBoostDmStatus, setBoostDmStatus } = require('../database/db');

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

        // ════════════════════════════════════════
        // ── 4. BOOST STATUS TRACKING ──
        // ════════════════════════════════════════
        if (newMember.user.bot) return;

        const wasBoosting = oldMember.premiumSince !== null;
        const isBoosting = newMember.premiumSince !== null;
        const perksChannelId = getBoostPerksChannel(newMember.guild.id);
        
        if (perksChannelId) {
            const perksChannel = newMember.guild.channels.cache.get(perksChannelId);
            
            if (perksChannel) {
                const dmStatus = getBoostDmStatus(newMember.guild.id, newMember.id);

                // ── NEW BOOST ──
                if (!wasBoosting && isBoosting) {
                    if (dmStatus !== 'welcomed') {
                        try {
                            await newMember.send(`🔥 **Thank you for boosting ${newMember.guild.name}!**\nBe sure to check out ${perksChannel} for your exclusive booster perks! 👑`);
                            setBoostDmStatus(newMember.guild.id, newMember.id, 'welcomed');
                        } catch (e) {
                            // DMs closed, fallback ping in perks channel
                            await perksChannel.send(`👑 <@${newMember.id}> your DMs are closed, but thank you for boosting! Check out this channel for your exclusive perks!`).then(m => setTimeout(() => m.delete().catch(() => {}), 30000));
                            setBoostDmStatus(newMember.guild.id, newMember.id, 'welcomed');
                        }
                    }
                }
                
                // ── BOOST ENDED ──
                if (wasBoosting && !isBoosting) {
                    if (dmStatus !== 'farewelled') {
                        try {
                            await newMember.send(`💀 Your boost for **${newMember.guild.name}** has ended. You will no longer have access to exclusive booster perks.`);
                            setBoostDmStatus(newMember.guild.id, newMember.id, 'farewelled');
                        } catch (e) {
                            // DMs closed, fallback ping in perks channel
                            await perksChannel.send(`💀 <@${newMember.id}> your boost has ended. You will no longer have access to exclusive booster perks.`).then(m => setTimeout(() => m.delete().catch(() => {}), 30000));
                            setBoostDmStatus(newMember.guild.id, newMember.id, 'farewelled');
                        }
                    }
                }
            }
        }
    },
};