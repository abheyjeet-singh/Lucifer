const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createEmbed, THEME, modLog } = require('../../utils/embeds');

module.exports = {
    name: 'kick',
    description: 'Expel a soul from paradise',
    category: 'moderation',
    usage: 'kick @user [reason]',
    permissions: ['KickMembers'],
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Expel a soul from paradise')
        .addUserOption(o => o.setName('user').setDescription('The soul to expel').setRequired(true))
        .addStringOption(o => o.setName('reason').setDescription('Reason'))
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

    async execute(message, args, client) {
        const target = message.mentions.members.first() || await message.guild.members.fetch(args[0]).catch(() => null);
        if (!target) return message.reply({ embeds: [createEmbed({ description: '⚠️ Mention a valid soul to expel.', color: THEME.error })] });
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
        if (!target.kickable) return context.reply({ embeds: [createEmbed({ description: '🚫 I cannot expel this soul.', color: THEME.error })] });
        if (target.id === moderator.id) return context.reply({ embeds: [createEmbed({ description: '🤔 Kicking yourself? Bold move.', color: THEME.secondary })] });

        try { await target.send({ embeds: [createEmbed({ title: '🦅 You Have Been Expelled', description: `Kicked from **${guild.name}**\n**Reason:** ${reason}\n**Moderator:** ${moderator.user.tag}`, color: THEME.secondary })] }); } catch {}

        await target.kick(`${moderator.user.tag}: ${reason}`);

        modLog(client, guild, createEmbed({
            title: '🦅 Member Kicked',
            description: `**User:** ${target.user.tag} (${target.id})\n**Moderator:** ${moderator.user.tag}\n**Reason:** ${reason}`,
            color: THEME.accent,
        }));

        return context.reply({ embeds: [createEmbed({ description: `🦅 **${target.user.tag}** has been expelled from paradise.\n📋 **Reason:** ${reason}\n🗡️ **Moderator:** ${moderator.user.tag}`, color: THEME.primary, thumbnail: target.user.displayAvatarURL({ size: 256 }) })] });
    },
};
