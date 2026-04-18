const { createEmbed, THEME, modLog } = require('../utils/embeds');
const { isStickyRolesEnabled, getStickyUserRoles, removeStickyUserRoles, getWelcome } = require('../database/db');
const { buildWelcomeImage } = require('../utils/canvasBuilder');
const { AttachmentBuilder } = require('discord.js');

const joinMap = new Map();

module.exports = {
    once: false,
    async execute(member, client) {
        // ── ANTI-BOT (New Accounts < 24h) ──
        const accountAgeDays = (Date.now() - member.user.createdTimestamp) / (1000 * 60 * 60 * 24);
        if (accountAgeDays < 1) {
            await member.kick('Anti-Bot: Account is less than 24 hours old.').catch(() => {});
            await modLog(client, member.guild, createEmbed({ 
                title: '🛡️ New Account Kicked', 
                description: `Kicked <@${member.id}> (\`${member.user.tag}\`) - Account was only ${accountAgeDays.toFixed(1)} days old.`, 
                color: THEME.accent 
            }));
            return; // Stop processing if kicked
        }

        // ── ANTI-RAID (Mass Joins) ──
        const now = Date.now();
        const key = member.guild.id;
        if (!joinMap.has(key)) joinMap.set(key, []);
        const joins = joinMap.get(key).filter(t => now - t < 10000); // Last 10 seconds
        joins.push(now);
        joinMap.set(key, joins);

        if (joins.length >= 10) { // 10 joins in 10 seconds
            const channels = member.guild.channels.cache.filter(c => c.isTextBased());
            for (const [id, channel] of channels) {
                await channel.permissionOverwrites.edit(member.guild.id, { SendMessages: false }, { reason: 'Anti-Raid Auto-Lock' }).catch(() => {});
            }
            await modLog(client, member.guild, createEmbed({ 
                title: '🚨 RAID DETECTED', 
                description: 'Server locked automatically. 10 joins in 10 seconds. Use `/serverunlock` or `l!serverunlock` when safe.', 
                color: THEME.error 
            }));
            joinMap.delete(key);
        }

        // ── Sticky Roles: Restore roles when user rejoins ──
        if (isStickyRolesEnabled(member.guild.id)) {
            const savedRoles = getStickyUserRoles(member.guild.id, member.id);
            if (savedRoles && savedRoles.length > 0) {
                const validRoles = savedRoles.filter(roleId => member.guild.roles.cache.has(roleId));
                if (validRoles.length > 0) {
                    try {
                        await member.roles.add(validRoles, 'Sticky Roles — Rejoined server');
                        await modLog(client, member.guild, createEmbed({
                            title: '📌 Sticky Roles Restored',
                            description: `**User:** ${member.user} (${member.id})\n**Roles Restored:** ${validRoles.map(id => `<@&${id}>`).join(', ')}`,
                            color: THEME.success,
                        }));
                    } catch (e) {
                        console.error('Sticky Roles Error:', e);
                        await modLog(client, member.guild, createEmbed({
                            title: '⚠️ Sticky Roles Failed',
                            description: `**User:** ${member.user} (${member.id})\n**Error:** Could not restore roles. Check my role hierarchy.`,
                            color: THEME.error,
                        }));
                    }
                }
                removeStickyUserRoles(member.guild.id, member.id);
            }
        }

        // ── Canvas Welcome Image ──
        const welcomeData = getWelcome(member.guild.id);
        if (welcomeData.channel_id) {
            const channel = member.guild.channels.cache.get(welcomeData.channel_id);
            if (channel) {
                try {
                    const imageBuffer = await buildWelcomeImage(member);
                    const attachment = new AttachmentBuilder(imageBuffer, { name: 'welcome.png' });
                    const welcomeMsg = welcomeData.message?.replace('{user}', member.user.toString()).replace('{server}', member.guild.name) || `👋 Welcome to Hell, ${member.user}!`;
                    await channel.send({ content: welcomeMsg, files: [attachment] });
                } catch (e) {
                    console.error('Welcome Canvas Error:', e);
                }
            }
        }

        // ── Log Join ──
        const accountAge = Math.floor(member.user.createdTimestamp / 1000);
        const joinedAt = Math.floor(member.joinedTimestamp / 1000);
        const ageDays = Math.floor((Date.now() - member.user.createdTimestamp) / (1000 * 60 * 60 * 24));
        let accountFlag = '';
        if (ageDays < 7) accountFlag = '\n🚨 **NEW ACCOUNT (Less than 7 days old)**';
        else if (ageDays < 30) accountFlag = '\n⚠️ **RECENT ACCOUNT (Less than 30 days old)**';

        await modLog(client, member.guild, createEmbed({
            title: '🚪 Soul Entered the Realm',
            description: `**User:** ${member.user} (${member.id})\n**Account Created:** <t:${accountAge}:R> (${ageDays} days old)\n**Joined Server:** <t:${joinedAt}:R>\n**Total Members:** ${member.guild.memberCount}${accountFlag}`,
            color: THEME.success,
            thumbnail: member.user.displayAvatarURL({ size: 256 }),
            footer: { text: member.user.tag }
        }));
    },
};