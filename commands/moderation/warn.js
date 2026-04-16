const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createEmbed, THEME, modLog } = require('../../utils/embeds');
const { addWarning, getWarningCount } = require('../../database/db');

module.exports = {
    name: 'warn',
    description: 'Note a soul\'s sins',
    category: 'moderation',
    usage: 'warn @user [reason]',
    permissions: ['ModerateMembers'],
    data: new SlashCommandBuilder()
        .setName('warn')
        .setDescription("Note a soul's sins")
        .addUserOption(o => o.setName('user').setDescription('The sinner').setRequired(true))
        .addStringOption(o => o.setName('reason').setDescription('The sin committed'))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

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
        addWarning(guild.id, target.id, moderator.id, reason);
        const count = getWarningCount(guild.id, target.id);

        try { await target.send({ embeds: [createEmbed({ title: '⚠️ You Have Been Warned', description: `Warned in **${guild.name}**\n**Reason:** ${reason}\n**Moderator:** ${moderator.user.tag}\n**Total Warnings:** ${count}`, color: THEME.accent })] }); } catch {}

        modLog(client, guild, createEmbed({
            title: '⚠️ Member Warned',
            description: `**User:** ${target.user.tag} (${target.id})\n**Moderator:** ${moderator.user.tag}\n**Reason:** ${reason}\n**Total Warnings:** ${count}`,
            color: THEME.accent,
        }));

        return context.reply({ embeds: [createEmbed({
            description: `⚠️ **${target.user.tag}**, Lucifer has noted your sins.\n⚡ **Strike ${count}/3**\n📋 **Reason:** ${reason}`,
            color: THEME.accent,
            thumbnail: target.user.displayAvatarURL({ size: 256 }),
        })] });
    },
};
