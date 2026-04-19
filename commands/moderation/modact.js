const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { createEmbed, THEME, modLog } = require('../../utils/embeds');
const { isHardbanned, addTempban, addHardban, removeHardban, addForcedName, removeForcedName } = require('../../database/db');

function parseDuration(str) { 
    const match = str?.toLowerCase().match(/^(\d+)(s|m|h|d)$/); 
    if (!match) return null; 
    const num = parseInt(match[1]); 
    const unit = { s: 1, m: 60, h: 3600, d: 86400 }[match[2]]; 
    return num * unit * 1000; 
}

module.exports = {
    name: 'modact',
    description: 'Moderation actions hub',
    permissions: ['ModerateMembers'],
    data: new SlashCommandBuilder()
        .setName('modact')
        .setDescription('All moderation actions in one place')
        // -- BANS & KICKS --
        .addSubcommand(sc => sc.setName('kick').setDescription('Expel a soul from paradise')
            .addUserOption(o => o.setName('user').setDescription('The soul to expel').setRequired(true))
            .addStringOption(o => o.setName('reason').setDescription('Reason for expulsion')))
        .addSubcommand(sc => sc.setName('ban').setDescription('Ban a sinner from this realm')
            .addUserOption(o => o.setName('user').setDescription('The sinner to banish').setRequired(true))
            .addStringOption(o => o.setName('reason').setDescription('Reason for banishment')))
        .addSubcommand(sc => sc.setName('unban').setDescription('Grant redemption to a banished soul')
            .addStringOption(o => o.setName('user_id').setDescription('The ID of the soul to redeem').setRequired(true))
            .addStringOption(o => o.setName('reason').setDescription('Reason for redemption')))
        .addSubcommand(sc => sc.setName('softban').setDescription('Ban & unban — cleanses their messages')
            .addUserOption(o => o.setName('user').setDescription('The sinner').setRequired(true))
            .addStringOption(o => o.setName('reason').setDescription('Reason')))
        .addSubcommand(sc => sc.setName('tempban').setDescription('Temporarily exile a soul from this realm')
            .addUserOption(o => o.setName('user').setDescription('The soul to exile').setRequired(true))
            .addStringOption(o => o.setName('duration').setDescription('Duration (e.g. 1h, 12h, 3d)').setRequired(true))
            .addStringOption(o => o.setName('reason').setDescription('Reason for exile')))
        .addSubcommand(sc => sc.setName('hardban').setDescription('Eternally damn a soul (Strict Ban)')
            .addUserOption(o => o.setName('user').setDescription('The soul to damn').setRequired(true))
            .addStringOption(o => o.setName('reason').setDescription('Reason for damnation')))
        .addSubcommand(sc => sc.setName('hardunban').setDescription('Grant clemency to an eternally damned soul')
            .addStringOption(o => o.setName('user_id').setDescription('The ID of the soul').setRequired(true))
            .addStringOption(o => o.setName('reason').setDescription('Reason for clemency')))
        // -- TIMEOUTS & MUTES --
        .addSubcommand(sc => sc.setName('timeout').setDescription('Put a user in the naughty corner')
            .addUserOption(o => o.setName('user').setDescription('User to timeout').setRequired(true))
            .addStringOption(o => o.setName('duration').setDescription('Duration (e.g., 1m, 1h, 1d)').setRequired(true))
            .addStringOption(o => o.setName('reason').setDescription('Reason for timeout')))
        .addSubcommand(sc => sc.setName('untimeout').setDescription('Remove a user from the naughty corner')
            .addUserOption(o => o.setName('user').setDescription('User to untimeout').setRequired(true))
            .addStringOption(o => o.setName('reason').setDescription('Reason')))
        .addSubcommand(sc => sc.setName('mute').setDescription('Silence a soul by divine decree')
            .addUserOption(o => o.setName('user').setDescription('The soul to silence').setRequired(true))
            .addStringOption(o => o.setName('duration').setDescription('Duration (e.g. 1h, 30m, 1d)').setRequired(true))
            .addStringOption(o => o.setName('reason').setDescription('Reason')))
        .addSubcommand(sc => sc.setName('unmute').setDescription('Release a soul from silence')
            .addUserOption(o => o.setName('user').setDescription('The soul to release').setRequired(true))
            .addStringOption(o => o.setName('reason').setDescription('Reason')))
        // -- VOICE MODERATION --
        .addSubcommand(sc => sc.setName('vcmute').setDescription('Mute a soul in a voice channel')
            .addUserOption(o => o.setName('user').setDescription('The soul to mute').setRequired(true))
            .addStringOption(o => o.setName('reason').setDescription('Reason')))
        .addSubcommand(sc => sc.setName('vcunmute').setDescription('Unmute a soul in a voice channel')
            .addUserOption(o => o.setName('user').setDescription('The soul to unmute').setRequired(true))
            .addStringOption(o => o.setName('reason').setDescription('Reason')))
        .addSubcommand(sc => sc.setName('vcdeafen').setDescription('Deafen a soul in a voice channel')
            .addUserOption(o => o.setName('user').setDescription('The soul to deafen').setRequired(true))
            .addStringOption(o => o.setName('reason').setDescription('Reason')))
        .addSubcommand(sc => sc.setName('vcundeafen').setDescription('Undeafen a soul in a voice channel')
            .addUserOption(o => o.setName('user').setDescription('The soul to undeafen').setRequired(true))
            .addStringOption(o => o.setName('reason').setDescription('Reason')))
        .addSubcommand(sc => sc.setName('disconnect').setDescription('Disconnect a soul from voice')
            .addUserOption(o => o.setName('user').setDescription('The soul to disconnect').setRequired(true))
            .addStringOption(o => o.setName('reason').setDescription('Reason')))
        // -- ROLES --
        .addSubcommand(sc => sc.setName('roleadd').setDescription('Bestow a role upon a soul')
            .addUserOption(o => o.setName('user').setDescription('The soul').setRequired(true))
            .addRoleOption(o => o.setName('role').setDescription('The role to bestow').setRequired(true))
            .addStringOption(o => o.setName('reason').setDescription('Reason')))
        .addSubcommand(sc => sc.setName('roleremove').setDescription('Strip a role from a soul')
            .addUserOption(o => o.setName('user').setDescription('The soul').setRequired(true))
            .addRoleOption(o => o.setName('role').setDescription('The role to strip').setRequired(true))
            .addStringOption(o => o.setName('reason').setDescription('Reason')))
        // -- LOCKDOWNS --
        .addSubcommand(sc => sc.setName('lock').setDescription('Lock the current or specified channel')
            .addChannelOption(o => o.setName('channel').setDescription('Channel to lock (defaults to current)').addChannelTypes(ChannelType.GuildText))
            .addStringOption(o => o.setName('reason').setDescription('Reason for lockdown')))
        .addSubcommand(sc => sc.setName('unlock').setDescription('Unlock a previously locked channel')
            .addChannelOption(o => o.setName('channel').setDescription('Channel to unlock (defaults to current)').addChannelTypes(ChannelType.GuildText))
            .addStringOption(o => o.setName('reason').setDescription('Reason for unlock')))
        // -- NICKNAMES --
        .addSubcommand(sc => sc.setName('forcename').setDescription('Force a nickname upon a soul')
            .addUserOption(o => o.setName('user').setDescription('The soul').setRequired(true))
            .addStringOption(o => o.setName('nickname').setDescription('The forced nickname').setRequired(true)))
        .addSubcommand(sc => sc.setName('removeforcename').setDescription('Remove a forced nickname')
            .addUserOption(o => o.setName('user').setDescription('The soul').setRequired(true))),

    async execute(message, args, client) {
        return message.reply({ embeds: [createEmbed({ context: message, description: '⚠️ This command is for slash only. Use standard prefix commands like `l!kick`, `l!ban`, `l!lock`, etc.', color: THEME.accent })] });
    },

    async interact(interaction, client) {
        const subcommand = interaction.options.getSubcommand();
        const moderator = interaction.member;
        
        await interaction.deferReply();

        try {
            const targetUser = interaction.options.getUser('user');
            const targetMember = targetUser ? await interaction.guild.members.fetch(targetUser.id).catch(() => null) : null;
            const reason = interaction.options.getString('reason') || 'No reason provided';

            switch (subcommand) {
                // ── BANS & KICKS ──
                case 'kick': {
                    if (!targetMember) return interaction.editReply({ embeds: [createEmbed({ context: guild, description: '⚠️ That soul cannot be found.', color: THEME.error })] });
                    if (!targetMember.kickable) return interaction.editReply({ embeds: [createEmbed({ context: guild, description: '🚫 I cannot expel this soul. They may outrank me.', color: THEME.error })] });
                    try { await targetMember.send({ embeds: [createEmbed({ context: guild, title: '🦅 You Have Been Expelled', description: `Kicked from **${interaction.guild.name}**\n**Reason:** ${reason}\n**Moderator:** ${moderator.user.tag}`, color: THEME.secondary })] }); } catch {}
                    await targetMember.kick(`${moderator.user.tag}: ${reason}`);
                    modLog(client, interaction.guild, createEmbed({ context: guild, title: '🦅 Member Kicked', description: `**User:** ${targetMember.user.tag} (${targetMember.id})\n**Moderator:** ${moderator.user.tag}\n**Reason:** ${reason}`, color: THEME.accent }));
                    return interaction.editReply({ embeds: [createEmbed({ context: guild, description: `🦅 **${targetMember.user.tag}** has been expelled from paradise.`, color: THEME.primary })] });
                }
                case 'ban': {
                    if (!targetMember) return interaction.editReply({ embeds: [createEmbed({ context: guild, description: '⚠️ That soul cannot be found.', color: THEME.error })] });
                    if (!targetMember.bannable) return interaction.editReply({ embeds: [createEmbed({ context: guild, description: '🚫 I cannot banish this soul. They may outrank me.', color: THEME.error })] });
                    await targetMember.ban({ reason: `${moderator.user.tag}: ${reason}` });
                    try { await targetMember.send({ embeds: [createEmbed({ context: guild, title: '⚔️ You Have Been Banished', description: `Banned from **${interaction.guild.name}**\n**Reason:** ${reason}\n**Moderator:** ${moderator.user.tag}`, color: THEME.secondary })] }); } catch {}
                    modLog(client, interaction.guild, createEmbed({ context: guild, title: '⚖️ Member Banned', description: `**User:** ${targetMember.user.tag} (${targetMember.id})\n**Moderator:** ${moderator.user.tag}\n**Reason:** ${reason}`, color: THEME.secondary }));
                    return interaction.editReply({ embeds: [createEmbed({ context: guild, description: `⚔️ **${targetMember.user.tag}** has been cast into the underworld.`, color: THEME.primary })] });
                }
                case 'unban': {
                    const userId = interaction.options.getString('user_id');
                    if (isHardbanned(interaction.guild.id, userId)) return interaction.editReply({ embeds: [createEmbed({ context: guild, description: '🔥 That soul is **eternally damned**. Use `/modact hardunban` instead.', color: THEME.error })] });
                    try { await interaction.guild.bans.remove(userId, `${moderator.user.tag}: ${reason}`); } catch { return interaction.editReply({ embeds: [createEmbed({ context: guild, description: '⚠️ That soul is not banished, or the ID is invalid.', color: THEME.error })] }); }
                    modLog(client, interaction.guild, createEmbed({ context: guild, title: '✨ Member Unbanned', description: `**User ID:** ${userId}\n**Moderator:** ${moderator.user.tag}`, color: THEME.success }));
                    return interaction.editReply({ embeds: [createEmbed({ context: guild, description: `✨ <@${userId}> has been granted redemption.`, color: THEME.success })] });
                }
                case 'softban': {
                    if (!targetMember) return interaction.editReply({ embeds: [createEmbed({ context: guild, description: '⚠️ That soul cannot be found.', color: THEME.error })] });
                    if (!targetMember.bannable) return interaction.editReply({ embeds: [createEmbed({ context: guild, description: '🚫 I cannot softban this soul.', color: THEME.error })] });
                    await targetMember.ban({ deleteMessageSeconds: 86400, reason: `Softban by ${moderator.user.tag}: ${reason}` });
                    await interaction.guild.bans.remove(targetMember.id, 'Softban — redemption granted');
                    modLog(client, interaction.guild, createEmbed({ context: guild, title: '🧹 Member Softbanned', description: `**User:** ${targetMember.user.tag}\n**Moderator:** ${moderator.user.tag}`, color: THEME.accent }));
                    return interaction.editReply({ embeds: [createEmbed({ context: guild, description: `🧹 **${targetMember.user.tag}** has been cleansed and returned.`, color: THEME.primary })] });
                }
                case 'tempban': {
                    if (!targetMember) return interaction.editReply({ embeds: [createEmbed({ context: guild, description: '⚠️ That soul cannot be found.', color: THEME.error })] });
                    if (!targetMember.bannable) return interaction.editReply({ embeds: [createEmbed({ context: guild, description: '🚫 I cannot exile this soul.', color: THEME.error })] });
                    const durationStr = interaction.options.getString('duration');
                    const ms = parseDuration(durationStr);
                    if (!ms) return interaction.editReply({ embeds: [createEmbed({ context: guild, description: '⚠️ Invalid duration. Use: `1m`, `1h`, `1d`', color: THEME.error })] });
                    const unbanTimestamp = Date.now() + ms;
                    addTempban(interaction.guild.id, targetMember.id, unbanTimestamp);
                    await targetMember.ban({ reason: `[TEMPBAN ${durationStr}] ${moderator.user.tag}: ${reason}` });
                    modLog(client, interaction.guild, createEmbed({ context: guild, title: '⏳ Member Tempbanned', description: `**User:** ${targetMember.user.tag}\n**Duration:** ${durationStr}`, color: THEME.accent }));
                    return interaction.editReply({ embeds: [createEmbed({ context: guild, description: `⏳ **${targetMember.user.tag}** has been temporarily exiled for ${durationStr}.`, color: THEME.primary })] });
                }
                case 'hardban': {
                    if (!targetMember) return interaction.editReply({ embeds: [createEmbed({ context: guild, description: '⚠️ That soul cannot be found.', color: THEME.error })] });
                    if (!targetMember.bannable) return interaction.editReply({ embeds: [createEmbed({ context: guild, description: '🚫 I cannot damn this soul.', color: THEME.error })] });
                    addHardban(interaction.guild.id, targetMember.id);
                    await targetMember.ban({ reason: `[HARDBAN] ${moderator.user.tag}: ${reason}` });
                    modLog(client, interaction.guild, createEmbed({ context: guild, title: '🔥 Member Hardbanned', description: `**User:** ${targetMember.user.tag}\n**Moderator:** ${moderator.user.tag}`, color: THEME.error }));
                    return interaction.editReply({ embeds: [createEmbed({ context: guild, description: `🔥 **${targetMember.user.tag}** has been eternally damned.`, color: THEME.error })] });
                }
                case 'hardunban': {
                    const userId = interaction.options.getString('user_id');
                    removeHardban(interaction.guild.id, userId);
                    try { await interaction.guild.bans.remove(userId, `[HARDUNBAN] ${moderator.user.tag}: ${reason}`); } catch {}
                    modLog(client, interaction.guild, createEmbed({ context: guild, title: '🕊️ Member Hardunbanned', description: `**User ID:** ${userId}\n**Moderator:** ${moderator.user.tag}`, color: THEME.success }));
                    return interaction.editReply({ embeds: [createEmbed({ context: guild, description: `🕊️ <@${userId}> has been granted clemency from eternal damnation.`, color: THEME.success })] });
                }

                // ── TIMEOUTS & MUTES ──
                case 'timeout': {
                    if (!targetMember) return interaction.editReply({ embeds: [createEmbed({ context: guild, description: '⚠️ That soul cannot be found.', color: THEME.error })] });
                    const durationStr = interaction.options.getString('duration');
                    const ms = parseDuration(durationStr);
                    if (!ms || ms > 2419200000) return interaction.editReply({ embeds: [createEmbed({ context: guild, description: '⚠️ Invalid duration (max 28d).', color: THEME.error })] });
                    await targetMember.timeout(ms, reason);
                    return interaction.editReply({ embeds: [createEmbed({ context: guild, description: `🔇 **${targetMember.user.tag}** timed out for **${durationStr}**.`, color: THEME.success })] });
                }
                case 'untimeout': {
                    if (!targetMember) return interaction.editReply({ embeds: [createEmbed({ context: guild, description: '⚠️ That soul cannot be found.', color: THEME.error })] });
                    await targetMember.timeout(null, reason);
                    return interaction.editReply({ embeds: [createEmbed({ context: guild, description: `🔊 **${targetMember.user.tag}** timeout removed.`, color: THEME.success })] });
                }
                case 'mute': {
                    if (!targetMember) return interaction.editReply({ embeds: [createEmbed({ context: guild, description: '⚠️ That soul cannot be found.', color: THEME.error })] });
                    const durationStr = interaction.options.getString('duration');
                    const ms = parseDuration(durationStr);
                    if (!ms || ms > 2419200000) return interaction.editReply({ embeds: [createEmbed({ context: guild, description: '⚠️ Invalid duration (max 28d).', color: THEME.error })] });
                    await targetMember.timeout(ms, reason);
                    return interaction.editReply({ embeds: [createEmbed({ context: guild, description: `🔇 **${targetMember.user.tag}** silenced for **${durationStr}**.`, color: THEME.success })] });
                }
                case 'unmute': {
                    if (!targetMember) return interaction.editReply({ embeds: [createEmbed({ context: guild, description: '⚠️ That soul cannot be found.', color: THEME.error })] });
                    await targetMember.timeout(null, reason);
                    return interaction.editReply({ embeds: [createEmbed({ context: guild, description: `🔊 **${targetMember.user.tag}** released from silence.`, color: THEME.success })] });
                }

                // ── VOICE MODERATION ──
                case 'vcmute': {
                    if (!targetMember?.voice.channel) return interaction.editReply({ embeds: [createEmbed({ context: guild, description: '⚠️ That soul is not in a voice channel.', color: THEME.error })] });
                    await targetMember.voice.setMute(true, reason);
                    return interaction.editReply({ embeds: [createEmbed({ context: guild, description: `🔇 **${targetMember.user.tag}** has been muted in voice.`, color: THEME.success })] });
                }
                case 'vcunmute': {
                    if (!targetMember?.voice.channel) return interaction.editReply({ embeds: [createEmbed({ context: guild, description: '⚠️ That soul is not in a voice channel.', color: THEME.error })] });
                    await targetMember.voice.setMute(false, reason);
                    return interaction.editReply({ embeds: [createEmbed({ context: guild, description: `🔊 **${targetMember.user.tag}** has been unmuted in voice.`, color: THEME.success })] });
                }
                case 'vcdeafen': {
                    if (!targetMember?.voice.channel) return interaction.editReply({ embeds: [createEmbed({ context: guild, description: '⚠️ That soul is not in a voice channel.', color: THEME.error })] });
                    await targetMember.voice.setDeaf(true, reason);
                    return interaction.editReply({ embeds: [createEmbed({ context: guild, description: `👂 **${targetMember.user.tag}** has been deafened.`, color: THEME.success })] });
                }
                case 'vcundeafen': {
                    if (!targetMember?.voice.channel) return interaction.editReply({ embeds: [createEmbed({ context: guild, description: '⚠️ That soul is not in a voice channel.', color: THEME.error })] });
                    await targetMember.voice.setDeaf(false, reason);
                    return interaction.editReply({ embeds: [createEmbed({ context: guild, description: `👂 **${targetMember.user.tag}** has been undeafened.`, color: THEME.success })] });
                }
                case 'disconnect': {
                    if (!targetMember?.voice.channel) return interaction.editReply({ embeds: [createEmbed({ context: guild, description: '⚠️ That soul is not in a voice channel.', color: THEME.error })] });
                    await targetMember.voice.disconnect(reason);
                    return interaction.editReply({ embeds: [createEmbed({ context: guild, description: `🔌 **${targetMember.user.tag}** has been disconnected from voice.`, color: THEME.success })] });
                }

                // ── ROLES ──
                case 'roleadd': {
                    if (!targetMember) return interaction.editReply({ embeds: [createEmbed({ context: guild, description: '⚠️ That soul cannot be found.', color: THEME.error })] });
                    const role = interaction.options.getRole('role');
                    if (targetMember.roles.cache.has(role.id)) return interaction.editReply({ embeds: [createEmbed({ context: guild, description: '⚠️ They already have that role.', color: THEME.error })] });
                    await targetMember.roles.add(role, reason);
                    return interaction.editReply({ embeds: [createEmbed({ context: guild, description: `✅ Added ${role} to **${targetMember.user.tag}**.`, color: THEME.success })] });
                }
                case 'roleremove': {
                    if (!targetMember) return interaction.editReply({ embeds: [createEmbed({ context: guild, description: '⚠️ That soul cannot be found.', color: THEME.error })] });
                    const role = interaction.options.getRole('role');
                    if (!targetMember.roles.cache.has(role.id)) return interaction.editReply({ embeds: [createEmbed({ context: guild, description: '⚠️ They don\'t have that role.', color: THEME.error })] });
                    await targetMember.roles.remove(role, reason);
                    return interaction.editReply({ embeds: [createEmbed({ context: guild, description: `✅ Removed ${role} from **${targetMember.user.tag}**.`, color: THEME.success })] });
                }

                // ── LOCKDOWNS ──
                case 'lock': {
                    const channel = interaction.options.getChannel('channel') || interaction.channel;
                    await channel.permissionOverwrites.edit(interaction.guild.id, { SendMessages: false }, { reason: `Locked by ${moderator.user.tag}: ${reason}` });
                    return interaction.editReply({ embeds: [createEmbed({ context: guild, description: `🔒 ${channel} has been locked down.`, color: THEME.accent })] });
                }
                case 'unlock': {
                    const channel = interaction.options.getChannel('channel') || interaction.channel;
                    await channel.permissionOverwrites.edit(interaction.guild.id, { SendMessages: null }, { reason: `Unlocked by ${moderator.user.tag}: ${reason}` });
                    return interaction.editReply({ embeds: [createEmbed({ context: guild, description: `🔓 ${channel} has been unlocked.`, color: THEME.success })] });
                }

                // ── NICKNAMES ──
                case 'forcename': {
                    if (!targetMember) return interaction.editReply({ embeds: [createEmbed({ context: guild, description: '⚠️ That soul cannot be found.', color: THEME.error })] });
                    const nickname = interaction.options.getString('nickname');
                    addForcedName(interaction.guild.id, targetMember.id, nickname);
                    await targetMember.setNickname(nickname, `Forced by ${moderator.user.tag}`);
                    return interaction.editReply({ embeds: [createEmbed({ context: guild, description: `🏷️ **${targetMember.user.tag}** has been branded as **${nickname}**.`, color: THEME.accent })] });
                }
                case 'removeforcename': {
                    if (!targetMember) return interaction.editReply({ embeds: [createEmbed({ context: guild, description: '⚠️ That soul cannot be found.', color: THEME.error })] });
                    removeForcedName(interaction.guild.id, targetMember.id);
                    await targetMember.setNickname(null, `Force name removed by ${moderator.user.tag}`).catch(() => {});
                    return interaction.editReply({ embeds: [createEmbed({ context: guild, description: `🏷️ Forced name removed from **${targetMember.user.tag}**.`, color: THEME.success })] });
                }
            }
        } catch (error) {
            console.error(error);
            return interaction.editReply({ embeds: [createEmbed({ context: guild, description: `❌ Failed to execute mod action: \`${error.message.substring(0, 50)}\`\nCheck my role hierarchy and permissions.`, color: THEME.error })] });
        }
    }
};