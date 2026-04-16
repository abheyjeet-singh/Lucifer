const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createEmbed, THEME, modLog } = require('../../utils/embeds');

module.exports = {
    name: 'ban',
    description: 'Ban a sinner from this realm',
    category: 'moderation',
    usage: 'ban @user [reason]',
    permissions: ['BanMembers'],
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Ban a sinner from this realm')
        .addUserOption(o => o.setName('user').setDescription('The sinner to banish').setRequired(true))
        .addStringOption(o => o.setName('reason').setDescription('Reason for banishment'))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

    async execute(message, args, client) {
        const target = message.mentions.members.first() || await message.guild.members.fetch(args[0]).catch(() => null);
        if (!target) return message.reply({ embeds: [createEmbed({ description: '⚠️ Mention a valid sinner to banish.', color: THEME.error })] });
        const reason = args.slice(1).join(' ') || 'No reason provided';
        return this.run(client, message.guild, message.member, target, reason, message);
    },

    async interact(interaction, client) {
        const user = interaction.options.getUser('user');
        const target = await interaction.guild.members.fetch(user.id).catch(() => null);
        if (!target) return interaction.reply({ embeds: [createEmbed({ description: '⚠️ That soul cannot be found in this realm.', color: THEME.error })], ephemeral: true });
        const reason = interaction.options.getString('reason') || 'No reason provided';
        return this.run(client, interaction.guild, interaction.member, target, reason, interaction);
    },

    async run(client, guild, moderator, target, reason, context) {
        if (!target.bannable) return context.reply({ embeds: [createEmbed({ description: '🚫 I cannot banish this soul. They may outrank me.', color: THEME.error })] });
        if (target.id === moderator.id) return context.reply({ embeds: [createEmbed({ description: '🤔 Banishing yourself? How... poetic.', color: THEME.secondary })] });

        await target.ban({ reason: `${moderator.user.tag}: ${reason}` });

        try { await target.send({ embeds: [createEmbed({ title: '⚔️ You Have Been Banished', description: `Banned from **${guild.name}**\n**Reason:** ${reason}\n**Moderator:** ${moderator.user.tag}`, color: THEME.secondary })] }); } catch {}

        const embed = createEmbed({
            title: '⚔️ Judgment Passed',
            description: `**${target.user.tag}** has been cast into the underworld.\n\n📋 **Reason:** ${reason}\n🗡️ **Moderator:** ${moderator.user.tag}`,
            color: THEME.primary,
            thumbnail: target.user.displayAvatarURL({ size: 256 }),
        });

        modLog(client, guild, createEmbed({
            title: '⚖️ Member Banned',
            description: `**User:** ${target.user.tag} (${target.id})\n**Moderator:** ${moderator.user.tag}\n**Reason:** ${reason}`,
            color: THEME.secondary,
        }));

        return context.reply({ embeds: [embed] });
    },
};
