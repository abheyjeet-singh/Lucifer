const { AuditLogEvent, AttachmentBuilder } = require('discord.js');
const { createEmbed, THEME, modLog } = require('../utils/embeds');
const { isStickyRolesEnabled, saveStickyUserRoles, getStickyRolesIgnore, getWelcome } = require('../database/db');
const { buildLeaveImage, buildModLogCard } = require('../utils/canvasBuilder');

module.exports = {
    once: false,
    async execute(member, client) {
        if (!member.guild) return;

        try {
            // ── 1. Sticky Roles: SAVE roles when user leaves ──
            if (isStickyRolesEnabled(member.guild.id)) {
                try {
                    const ignoredRoles = getStickyRolesIgnore(member.guild.id);
                    const rolesToSave = member.roles.cache
                        .filter(r => !r.managed && r.id !== member.guild.id && !ignoredRoles.includes(r.id))
                        .map(r => r.id);
                        
                    if (rolesToSave.length > 0) {
                        saveStickyUserRoles(member.guild.id, member.id, rolesToSave);
                    }
                } catch (e) {
                    console.error('Sticky Roles Save Error:', e);
                }
            }

            // ── 2. Check if it was a kick (Mod Log) ──
            let isKick = false;
            let moderatorTag = 'Unknown';
            let reason = 'No reason provided';
            try {
                const auditLogs = await member.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.MemberKick });
                const kickLog = auditLogs.entries.first();
                if (kickLog && kickLog.target.id === member.id && (Date.now() - kickLog.createdTimestamp) < 5000) {
                    isKick = true;
                    moderatorTag = kickLog.executor.tag;
                    reason = kickLog.reason || 'No reason provided';
                }
            } catch (e) {
                console.error('Audit Log Fetch Error:', e);
            }

            if (isKick) {
                try {
                    const imageBuffer = await buildModLogCard(
                        member.user.displayAvatarURL({ extension: 'png' }), 
                        '#e67e22', 
                        'MEMBER KICKED', 
                        [`User: ${member.user.tag} (${member.id})`, `Moderator: ${moderatorTag}`, `Reason: ${reason}`]
                    );
                    const attachment = new AttachmentBuilder(imageBuffer, { name: 'kick.png' });
                    await modLog(client, member.guild, { files: [attachment] });
                } catch (e) { 
                    console.error('Kick Canvas Error:', e); 
                }
            } else {
                try {
                    await modLog(client, member.guild, createEmbed({
                        title: '🚪 Soul Left the Realm',
                        description: `**User:** ${member.user} (${member.id})\n**Total Members:** ${member.guild.memberCount}`,
                        color: THEME.accent,
                        thumbnail: member.user.displayAvatarURL({ size: 256 }),
                        guild: member.guild
                    }));
                } catch (e) {
                    console.error('ModLog Error:', e);
                }
            }

            // ── 3. Send Leave Canvas Image & Custom Message ──
            const welcomeData = getWelcome(member.guild.id);
            const leaveChannelId = welcomeData.leave_channel_id || welcomeData.channel_id;
            
            if (leaveChannelId) {
                const leaveChannel = member.guild.channels.cache.get(leaveChannelId);
                if (leaveChannel) {
                    try {
                        const imageBuffer = await buildLeaveImage(member, client);
                        const attachment = new AttachmentBuilder(imageBuffer, { name: 'leave.png' });
                        
                        let leaveMsg = welcomeData.leave_message
                            ?.replace(/{user}/g, member.user.toString())
                            .replace(/{server}/g, member.guild.name)
                            .replace(/{count}/g, member.guild.memberCount) || undefined;
                        
                        await leaveChannel.send({ content: leaveMsg, files: [attachment] });
                    } catch (e) {
                        console.error('Leave Canvas/Message Error:', e);
                        try {
                            let leaveMsg = welcomeData.leave_message
                                ?.replace(/{user}/g, member.user.toString())
                                .replace(/{server}/g, member.guild.name)
                                .replace(/{count}/g, member.guild.memberCount) || `${member.user} left the server.`;
                            await leaveChannel.send({ content: leaveMsg });
                        } catch (e2) {
                            console.error('Leave Fallback Text Error:', e2);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('CRITICAL ERROR in guildMemberRemove:', error);
        }
    },
};