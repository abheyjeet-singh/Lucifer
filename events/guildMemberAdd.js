const { createEmbed, THEME, modLog } = require('../utils/embeds');
const { isStickyRolesEnabled, getStickyUserRoles, removeStickyUserRoles, getStickyRolesIgnore, getWelcome } = require('../database/db');
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
            return; 
        }

        // ── ANTI-RAID (Mass Joins) ──
        const now = Date.now();
        const key = member.guild.id;
        if (!joinMap.has(key)) joinMap.set(key, []);
        const joins = joinMap.get(key).filter(t => now - t < 10000); 
        joins.push(now);
        joinMap.set(key, joins);

        if (joins.length >= 10) { 
            const channels = member.guild.channels.cache.filter(c => c.isTextBased());
            for (const [id, channel] of channels) {
                await channel.permissionOverwrites.edit(member.guild.id, { SendMessages: false }, { reason: 'Anti-Raid Auto-Lock' }).catch(() => {});
            }
            await modLog(client, member.guild, createEmbed({ 
                title: '🚨 RAID DETECTED', 
                description: 'Server locked automatically. 10 joins in 10 seconds.', 
                color: THEME.error 
            }));
            joinMap.delete(key);
        }

        // ── Sticky Roles: Restore roles when user rejoins ──
        if (isStickyRolesEnabled(member.guild.id)) {
            const savedRoles = getStickyUserRoles(member.guild.id, member.id);
            if (savedRoles && savedRoles.length > 0) {
                const ignoredRoles = getStickyRolesIgnore(member.guild.id);
                
                const validRoles = savedRoles.filter(roleId => 
                    member.guild.roles.cache.has(roleId) && !ignoredRoles.includes(roleId)
                );

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
                    }
                }
                removeStickyUserRoles(member.guild.id, member.id);
            }
        }

        // ── Welcome System (Auto-role + Canvas Image) ──
        const welcomeData = getWelcome(member.guild.id);
        if (welcomeData.channel_id) {
            if (welcomeData.role_id) {
                await member.roles.add(welcomeData.role_id).catch(() => {});
            }

            const channel = member.guild.channels.cache.get(welcomeData.channel_id);
            if (channel) {
                try {
                    const imageBuffer = await buildWelcomeImage(member, client);
                    const attachment = new AttachmentBuilder(imageBuffer, { name: 'welcome.png' });
                    
                    const welcomeMsg = welcomeData.message
                        ?.replace(/{user}/g, member.user.toString())
                        .replace(/{server}/g, member.guild.name)
                        .replace(/{count}/g, member.guild.memberCount) 
                        || `👋 Welcome to Hell, ${member.user}!`;
                        
                    await channel.send({ content: welcomeMsg, files: [attachment] });
                } catch (e) {
                    console.error('Welcome Canvas Error:', e);
                }
            }
        }

        // ── Log Join ──
        const accountAge = Math.floor(member.user.createdTimestamp / 1000);
        const joinedAt = Math.floor(member.joinedTimestamp / 1000);
        let accountFlag = '';
        if (accountAgeDays < 7) accountFlag = '\n🚨 **NEW ACCOUNT (Less than 7 days old)**';
        else if (accountAgeDays < 30) accountFlag = '\n⚠️ **RECENT ACCOUNT (Less than 30 days old)**';

        await modLog(client, member.guild, createEmbed({
            title: '🚪 Soul Entered the Realm',
            description: `**User:** ${member.user} (${member.id})\n**Account Created:** <t:${accountAge}:R>\n**Joined Server:** <t:${joinedAt}:R>\n**Total Members:** ${member.guild.memberCount}${accountFlag}`,
            color: THEME.success,
            thumbnail: member.user.displayAvatarURL({ size: 256 }),
        }));

        // ── Invite Event Tracking ──
        try {
            const inviteEventCmd = require('../commands/utility/inviteevent');
            await inviteEventCmd.handleMemberJoin(member.guild, client);
        } catch (e) {
            console.error('Invite Event Tracking Error:', e);
        }
    },
};