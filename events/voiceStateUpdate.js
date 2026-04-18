const { ChannelType, PermissionFlagsBits } = require('discord.js');
const { getDynamicVcHub, addDynamicVc, removeDynamicVc, isDynamicVc, getGuildSettings } = require('../database/db');
const { createEmbed, THEME, modLog } = require('../utils/embeds');
const logger = require('../utils/logger');

module.exports = {
    once: false,
    async execute(oldState, newState, client) {
        const guild = newState.guild;
        const member = newState.member;

        // ════════════════════════════════════════
        // ── 1. DYNAMIC VC LOGIC (Unchanged) ──
        // ════════════════════════════════════════
        if (!oldState.channelId && newState.channelId) {
            const hubId = getDynamicVcHub(guild.id);
            if (hubId && newState.channelId === hubId) {
                const parent = newState.channel.parent;
                try {
                    const newChannel = await guild.channels.create({
                        name: `⭐ ${member.user.username}'s Room`,
                        type: ChannelType.GuildVoice,
                        parent: parent || null,
                        permissionOverwrites: [
                            { id: guild.id, deny: [PermissionFlagsBits.Connect] },
                            { id: member.id, allow: [PermissionFlagsBits.Connect, PermissionFlagsBits.ManageChannels] },
                            { id: client.user.id, allow: [PermissionFlagsBits.Connect, PermissionFlagsBits.ManageChannels] }
                        ]
                    });
                    await member.voice.setChannel(newChannel);
                    addDynamicVc(newChannel.id);
                } catch (error) {
                    logger.error(`Failed to create dynamic VC: ${error.message}`);
                }
            }
        }

        if (oldState.channelId && !newState.channelId) {
            if (isDynamicVc(oldState.channelId)) {
                const channel = oldState.channel;
                if (channel && channel.members.size === 0) {
                    try {
                        await channel.delete();
                        removeDynamicVc(channel.id);
                    } catch (error) {
                        logger.error(`Failed to delete dynamic VC ${channel.id}: ${error.message}`);
                        removeDynamicVc(channel.id);
                    }
                }
            }
        }

        // ════════════════════════════════════════
        // ── 2. VOICE STATE LOGGING ──
        // ════════════════════════════════════════
        const settings = getGuildSettings(guild.id);
        if (!settings.log_channel_id) return;

        // Ignore bot voice updates
        if (member.user.bot) return;

        let logTitle = '';
        let logDesc = '';
        let logColor = THEME.dark;

        // Joined a VC
        if (!oldState.channelId && newState.channelId) {
            logTitle = '🎙️ Joined Voice Channel';
            logDesc = `**User:** ${member.user} (${member.id})\n**Channel:** ${newState.channel}`;
            logColor = THEME.success;
        }
        // Left a VC
        else if (oldState.channelId && !newState.channelId) {
            logTitle = '🔇 Left Voice Channel';
            logDesc = `**User:** ${member.user} (${member.id})\n**Channel:** ${oldState.channel}`;
            logColor = THEME.error;
        }
        // Moved VCs
        else if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
            logTitle = '🚚 Moved Voice Channel';
            logDesc = `**User:** ${member.user} (${member.id})\n**From:** ${oldState.channel}\n**To:** ${newState.channel}`;
            logColor = THEME.celestial;
        }
        // Server Mute/Deafen/Unmute/Undeafen (Only log server actions, not self-mutes)
        else if (oldState.channelId && newState.channelId && oldState.channelId === newState.channelId) {
            if (oldState.serverMute !== newState.serverMute) {
                logTitle = newState.serverMute ? '🔇 Server Muted' : '🔊 Server Unmuted';
                logDesc = `**User:** ${member.user} (${member.id})\n**Channel:** ${newState.channel}`;
                logColor = newState.serverMute ? THEME.accent : THEME.success;
            }
            else if (oldState.serverDeaf !== newState.serverDeaf) {
                logTitle = newState.serverDeaf ? '🔕 Server Deafened' : '🔔 Server Undeafened';
                logDesc = `**User:** ${member.user} (${member.id})\n**Channel:** ${newState.channel}`;
                logColor = newState.serverDeaf ? THEME.accent : THEME.success;
            }
            // Optional: Video/Streaming start/stop
            else if (oldState.streaming !== newState.streaming) {
                logTitle = newState.streaming ? '📺 Started Streaming' : '📺 Stopped Streaming';
                logDesc = `**User:** ${member.user} (${member.id})\n**Channel:** ${newState.channel}`;
                logColor = newState.streaming ? THEME.primary : THEME.dark;
            }
        }

        if (logTitle) {
            await modLog(client, guild, createEmbed({
                title: logTitle,
                description: logDesc,
                color: logColor,
            }));
        }
    },
};