const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createEmbed, THEME, modLog } = require('../../utils/embeds');
const { isHardbanned } = require('../../database/db');

module.exports = {
    name: 'unban',
    description: 'Grant redemption to a banished soul',
    category: 'moderation',
    usage: 'unban <userid> [reason]',
    permissions: ['BanMembers'],
    data: new SlashCommandBuilder()
        .setName('unban')
        .setDescription('Grant redemption to a banished soul')
        .addStringOption(o => o.setName('user_id').setDescription('The ID of the soul to redeem').setRequired(true))
        .addStringOption(o => o.setName('reason').setDescription('Reason for redemption'))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

    async execute(message, args, client) {
        const userId = args[0];
        if (!userId) return message.reply({ embeds: [createEmbed({ description: '⚠️ Provide a user ID to unban.', color: THEME.error })] });
        const reason = args.slice(1).join(' ') || 'No reason provided';
        return this.run(client, message.guild, message.member, userId, reason, message);
    },

    async interact(interaction, client) {
        const userId = interaction.options.getString('user_id');
        const reason = interaction.options.getString('reason') || 'No reason provided';
        return this.run(client, interaction.guild, interaction.member, userId, reason, interaction);
    },

    async run(client, guild, moderator, userId, reason, context) {
        // Block if they are hardbanned
        if (isHardbanned(guild.id, userId)) {
            return context.reply({ embeds: [createEmbed({ description: '🔥 That soul is **eternally damned**. Standard unban cannot save them.\nOnly an Administrator can use `/hardunban` to grant clemency.', color: THEME.error })] });
        }

        try {
            await guild.bans.remove(userId, `${moderator.user.tag}: ${reason}`);
        } catch {
            return context.reply({ embeds: [createEmbed({ description: '⚠️ That soul is not banished, or the ID is invalid.', color: THEME.error })] });
        }

        modLog(client, guild, createEmbed({
            title: '✨ Member Unbanned',
            description: `**User ID:** ${userId}\n**Moderator:** ${moderator.user.tag}\n**Reason:** ${reason}`,
            color: THEME.success,
        }));

        return context.reply({ embeds: [createEmbed({ description: `✨ <@${userId}> has been granted redemption.\n**Reason:** ${reason}`, color: THEME.success })] });
    },
};
