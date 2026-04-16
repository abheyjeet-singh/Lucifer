const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createEmbed, THEME, modLog } = require('../../utils/embeds');

module.exports = {
    name: 'softban',
    description: 'Ban & unban — cleanses their messages',
    category: 'moderation',
    usage: 'softban @user [reason]',
    permissions: ['BanMembers'],
    data: new SlashCommandBuilder()
        .setName('softban')
        .setDescription('Ban & unban to cleanse their messages')
        .addUserOption(o => o.setName('user').setDescription('The sinner').setRequired(true))
        .addStringOption(o => o.setName('reason').setDescription('Reason'))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

    async execute(message, args, client) {
        const target = message.mentions.members.first() || await message.guild.members.fetch(args[0]).catch(() => null);
        if (!target) return message.reply({ embeds: [createEmbed({ description: '⚠️ Mention a valid sinner.', color: THEME.error })] });
        const reason = args.slice(1).join(' ') || 'No reason provided';
        return this.run(client, message.guild, message.member, target, reason, message);
    },

    async interact(interaction, client) {
        const target = interaction.options.getMember('user');
        if (!target) return interaction.reply({ embeds: [createEmbed({ description: '⚠️ That soul cannot be found.', color: THEME.error })], ephemeral: true });
        const reason = interaction.options.getString('reason') || 'No reason provided';
        return this.run(client, interaction.guild, interaction.member, target, reason, interaction);
    },

    async run(client, guild, moderator, target, reason, context) {
        if (!target.bannable) return context.reply({ embeds: [createEmbed({ description: '🚫 I cannot softban this soul.', color: THEME.error })] });

        await target.ban({ deleteMessageDays: 1, reason: `Softban by ${moderator.user.tag}: ${reason}` });
        await guild.bans.remove(target.id, 'Softban — redemption granted');

        modLog(client, guild, createEmbed({
            title: '🧹 Member Softbanned',
            description: `**User:** ${target.user.tag} (${target.id})\n**Moderator:** ${moderator.user.tag}\n**Reason:** ${reason}`,
            color: THEME.accent,
        }));

        return context.reply({ embeds: [createEmbed({ description: `🧹 **${target.user.tag}** has been cleansed and returned.\n📋 **Reason:** ${reason}`, color: THEME.primary })] });
    },
};
