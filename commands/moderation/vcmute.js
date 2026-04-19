const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createEmbed, THEME } = require('../../utils/embeds');
module.exports = {
    name: 'vcmute', description: 'Server mute a soul in voice', category: 'moderation', usage: 'vcmute @user', permissions: ['MuteMembers'],
    async execute(message, args, client) { const target = message.mentions.members.first(); if (!target) return message.reply({ embeds: [createEmbed({ context: message, description: '⚠️ Mention a user.', color: THEME.error })] }); return this.run(client, message.guild, message.member, target, message); },
    async run(client, guild, moderator, target, context) {
        if (!target.voice.channel) return context.reply({ embeds: [createEmbed({ context: guild, description: '⚠️ That soul is not in a voice channel.', color: THEME.error })] });
        await target.voice.setMute(true, `Muted by ${moderator.user.tag}`);
        return context.reply({ embeds: [createEmbed({ context: guild, description: `🔇 **${target.user.tag}** has been silenced in the voice realm.`, color: THEME.accent })] });
    },
};
