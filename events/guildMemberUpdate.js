const { AttachmentBuilder } = require('discord.js');
const { createEmbed, THEME, modLog } = require('../utils/embeds');
const { getBoostPerksChannel, getBoostDmStatus, setBoostDmStatus, getGuildSettings } = require('../database/db');
const { buildModLogCard } = require('../utils/canvasBuilder');

module.exports = {
    once: false,
    async execute(oldMember, newMember, client) {
        const settings = getGuildSettings(newMember.guild.id);
        const logChannel = settings.log_channel_id ? newMember.guild.channels.cache.get(settings.log_channel_id) : null;

        // 1. Nickname Change (Canvas)
        if (oldMember.nickname !== newMember.nickname && logChannel) {
            const oldNick = oldMember.nickname || oldMember.user.username;
            const newNick = newMember.nickname || newMember.user.username;

            try {
                const imageBuffer = await buildModLogCard(
                    newMember.user.displayAvatarURL({ extension: 'png' }),
                    '#3498db', // Blue accent
                    'IDENTITY ALTERED',
                    [`User: ${newMember.user.tag} (${newMember.id})`, `Old Name: ${oldNick}`, `New Name: ${newNick}`]
                );
                const attachment = new AttachmentBuilder(imageBuffer, { name: 'nickname.png' });
                await logChannel.send({ files: [attachment] });
            } catch (e) { console.error(e); }
        }

        // 2. Role Changes (Canvas)
        const addedRoles = newMember.roles.cache.filter(r => !oldMember.roles.cache.has(r.id));
        const removedRoles = oldMember.roles.cache.filter(r => !newMember.roles.cache.has(r.id));

        if ((addedRoles.size > 0 || removedRoles.size > 0) && logChannel) {
            const addedStr = addedRoles.map(r => `+ ${r.name}`).join(', ') || 'None';
            const removedStr = removedRoles.map(r => `- ${r.name}`).join(', ') || 'None';

            try {
                const imageBuffer = await buildModLogCard(
                    newMember.user.displayAvatarURL({ extension: 'png' }),
                    '#9b59b6', // Purple accent
                    'ROLES ALTERED',
                    [`User: ${newMember.user.tag} (${newMember.id})`, `Added: ${addedStr.substring(0, 50)}`, `Removed: ${removedStr.substring(0, 50)}`]
                );
                const attachment = new AttachmentBuilder(imageBuffer, { name: 'roles.png' });
                await logChannel.send({ files: [attachment] });
            } catch (e) { console.error(e); }
        }

        // 3. Server Avatar Change (Embed - better for showing actual images)
        if (oldMember.avatar !== newMember.avatar && logChannel) {
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
            await logChannel.send({ embeds: [embed] });
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

                if (!wasBoosting && isBoosting) {
                    if (dmStatus !== 'welcomed') {
                        try {
                            await newMember.send(`🔥 **Thank you for boosting ${newMember.guild.name}!**\nBe sure to check out ${perksChannel} for your exclusive booster perks! 👑`);
                            setBoostDmStatus(newMember.guild.id, newMember.id, 'welcomed');
                        } catch (e) {
                            await perksChannel.send(`👑 <@${newMember.id}> your DMs are closed, but thank you for boosting! Check out this channel for your exclusive perks!`).then(m => setTimeout(() => m.delete().catch(() => {}), 30000));
                            setBoostDmStatus(newMember.guild.id, newMember.id, 'welcomed');
                        }
                    }
                }
                
                if (wasBoosting && !isBoosting) {
                    if (dmStatus !== 'farewelled') {
                        try {
                            await newMember.send(`💀 Your boost for **${newMember.guild.name}** has ended. You will no longer have access to exclusive booster perks.`);
                            setBoostDmStatus(newMember.guild.id, newMember.id, 'farewelled');
                        } catch (e) {
                            await perksChannel.send(`💀 <@${newMember.id}> your boost has ended. You will no longer have access to exclusive booster perks.`).then(m => setTimeout(() => m.delete().catch(() => {}), 30000));
                            setBoostDmStatus(newMember.guild.id, newMember.id, 'farewelled');
                        }
                    }
                }
            }
        }
    },
};