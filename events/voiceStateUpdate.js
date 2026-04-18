const { ChannelType, PermissionFlagsBits, AttachmentBuilder } = require('discord.js');
const { getDynamicVcHub, addDynamicVc, removeDynamicVc, isDynamicVc, getGuildSettings } = require('../database/db');
const { createEmbed, THEME, modLog } = require('../utils/embeds');
const { buildModLogCard } = require('../utils/canvasBuilder');
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
        const logChannel = guild.channels.cache.get(settings.log_channel_id);
        if (!logChannel || member.user.bot) return;

        // ── High Frequency: Keep as Text Embeds ──
        let logTitle = '';
        let logDesc = '';
        let logColor = THEME.dark;

        if (!oldState.channelId && newState.channelId) {
            logTitle = '🎙️ Joined Voice'; logDesc = `**User:** ${member.user} | **Channel:** ${newState.channel}`; logColor = THEME.success;
        } else if (oldState.channelId && !newState.channelId) {
            logTitle = '🔇 Left Voice'; logDesc = `**User:** ${member.user} | **Channel:** ${oldState.channel}`; logColor = THEME.error;
        } else if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
            logTitle = '🚚 Moved Voice'; logDesc = `**User:** ${member.user}\n**From:** ${oldState.channel} | **To:** ${newState.channel}`; logColor = THEME.celestial;
        }

        if (logTitle) {
            await modLog(client, guild, createEmbed({ title: logTitle, description: logDesc, color: logColor }));
        }

        // ── Mod Actions: Premium Canvas Logs ──
        if (oldState.channelId && newState.channelId && oldState.channelId === newState.channelId) {
            if (oldState.serverMute !== newState.serverMute) {
                try {
                    const imageBuffer = await buildModLogCard(
                        member.user.displayAvatarURL({ extension: 'png' }),
                        newState.serverMute ? '#e74c3c' : '#2ecc71', // Red if muted, Green if unmuted
                        newState.serverMute ? 'SERVER MUTED' : 'SERVER UNMUTED',
                        [`User: ${member.user.tag} (${member.id})`, `Channel: ${newState.channel.name}`]
                    );
                    const attachment = new AttachmentBuilder(imageBuffer, { name: 'mute.png' });
                    await logChannel.send({ files: [attachment] });
                } catch (e) { console.error(e); }
            }
            else if (oldState.serverDeaf !== newState.serverDeaf) {
                try {
                    const imageBuffer = await buildModLogCard(
                        member.user.displayAvatarURL({ extension: 'png' }),
                        newState.serverDeaf ? '#e74c3c' : '#2ecc71',
                        newState.serverDeaf ? 'SERVER DEAFENED' : 'SERVER UNDEAFENED',
                        [`User: ${member.user.tag} (${member.id})`, `Channel: ${newState.channel.name}`]
                    );
                    const attachment = new AttachmentBuilder(imageBuffer, { name: 'deafen.png' });
                    await logChannel.send({ files: [attachment] });
                } catch (e) { console.error(e); }
            }
        }
    },
};