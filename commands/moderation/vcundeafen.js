const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createEmbed, THEME } = require('../../utils/embeds');
module.exports = {
    name: 'vcundeafen', description: 'Restore hearing to a soul', category: 'moderation', usage: 'vcundeafen @user', permissions: ['DeafenMembers'],
    data: new SlashCommandBuilder().setName('vcundeafen').setDescription('Restore hearing to a soul').addUserOption(o => o.setName('user').setDescription('The soul to undeafen').setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.DeafenMembers),
    async execute(message, args, client) { const target = message.mentions.members.first(); if (!target) return message.reply({ embeds: [createEmbed({ description: '⚠️ Mention a user.', color: THEME.error })] }); return this.run(client, message.guild, message.member, target, message); },
    async interact(interaction, client) { return this.run(client, interaction.guild, interaction.member, interaction.options.getMember('user'), interaction); },
    async run(client, guild, moderator, target, context) {
        await target.voice.setDeaf(false, `Undeafened by ${moderator.user.tag}`);
        return context.reply({ embeds: [createEmbed({ description: `👂 **${target.user.tag}** can hear the realm once more.`, color: THEME.success })] });
    },
};
