const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createEmbed, THEME } = require('../../utils/embeds');
module.exports = {
    name: 'vcmute', description: 'Server mute a soul in voice', category: 'moderation', usage: 'vcmute @user', permissions: ['MuteMembers'],
    data: new SlashCommandBuilder().setName('vcmute').setDescription('Server mute a soul in voice').addUserOption(o => o.setName('user').setDescription('The soul to mute').setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.MuteMembers),
    async execute(message, args, client) { const target = message.mentions.members.first(); if (!target) return message.reply({ embeds: [createEmbed({ description: '⚠️ Mention a user.', color: THEME.error })] }); return this.run(client, message.guild, message.member, target, message); },
    async interact(interaction, client) { return this.run(client, interaction.guild, interaction.member, interaction.options.getMember('user'), interaction); },
    async run(client, guild, moderator, target, context) {
        if (!target.voice.channel) return context.reply({ embeds: [createEmbed({ description: '⚠️ That soul is not in a voice channel.', color: THEME.error })] });
        await target.voice.setMute(true, `Muted by ${moderator.user.tag}`);
        return context.reply({ embeds: [createEmbed({ description: `🔇 **${target.user.tag}** has been silenced in the voice realm.`, color: THEME.accent })] });
    },
};
