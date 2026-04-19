const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createEmbed, THEME, modLog } = require('../../utils/embeds');
const { removeHardban, isHardbanned } = require('../../database/db');

module.exports = {
    name: 'hardunban',
    description: 'Grant clemency to an eternally damned soul (Admin only)',
    category: 'moderation',
    usage: 'hardunban <userid> [reason]',
    permissions: ['Administrator'],

    async execute(message, args, client) {
        const userId = args[0];
        if (!userId) return message.reply({ embeds: [createEmbed({ context: message, description: '⚠️ Provide a user ID to grant clemency.', color: THEME.error })] });
        const reason = args.slice(1).join(' ') || 'Clemency granted';
        return this.run(client, message.guild, message.member, userId, reason, message);
    },

    async run(client, guild, moderator, userId, reason, context) {
        if (!isHardbanned(guild.id, userId)) return context.reply({ embeds: [createEmbed({ context: guild, description: '⚠️ That soul is not eternally damned. Use regular `unban` if they are simply banished.', color: THEME.error })] });

        // Remove from hardban DB first so the event listener doesn't re-ban them
        removeHardban(guild.id, userId);

        try {
            await guild.bans.remove(userId, `[CLEMENCY] ${moderator.user.tag}: ${reason}`);
        } catch {
            return context.reply({ embeds: [createEmbed({ context: guild, description: '⚠️ That soul is not in the underworld, but their eternal mark has been removed.', color: THEME.accent })] });
        }

        modLog(client, guild, createEmbed({
            title: '✨ Clemency Granted (Hardban Lifted)',
            description: `**User ID:** ${userId}\n**Moderator:** ${moderator.user.tag}\n**Reason:** ${reason}`,
            color: THEME.success,
        }));

        return context.reply({ embeds: [createEmbed({ context: guild, description: `✨ <@${userId}> has been granted divine clemency. Their eternal damnation is lifted.\n**Reason:** ${reason}`, color: THEME.success })] });
    },
};
