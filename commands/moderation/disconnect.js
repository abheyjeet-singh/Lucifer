const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createEmbed, THEME } = require('../../utils/embeds');
module.exports = {
    name: 'disconnect', description: 'Drop a soul from their voice channel', category: 'moderation', usage: 'disconnect @user', permissions: ['MoveMembers'],
    data: new SlashCommandBuilder().setName('disconnect').setDescription('Drop a soul from their voice channel').addUserOption(o => o.setName('user').setDescription('The soul to drop').setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.MoveMembers),
    async execute(message, args, client) { const target = message.mentions.members.first(); if (!target) return message.reply({ embeds: [createEmbed({ description: '⚠️ Mention a user.', color: THEME.error })] }); return this.run(client, message.guild, message.member, target, message); },
    async interact(interaction, client) { return this.run(client, interaction.guild, interaction.member, interaction.options.getMember('user'), interaction); },
    async run(client, guild, moderator, target, context) {
        if (!target.voice.channel) return context.reply({ embeds: [createEmbed({ description: '⚠️ That soul is not in a voice channel.', color: THEME.error })] });
        await target.voice.disconnect(`Dropped by ${moderator.user.tag}`);
        return context.reply({ embeds: [createEmbed({ description: `🦅 **${target.user.tag}** has been dropped from the voice realm.`, color: THEME.primary })] });
    },
};
