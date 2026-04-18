const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createEmbed, THEME } = require('../../utils/embeds');
module.exports = {
    name: 'vcunmute', description: 'Unmute a soul in voice', category: 'moderation', usage: 'vcunmute @user', permissions: ['MuteMembers'],
    async execute(message, args, client) { const target = message.mentions.members.first(); if (!target) return message.reply({ embeds: [createEmbed({ description: '⚠️ Mention a user.', color: THEME.error })] }); return this.run(client, message.guild, message.member, target, message); },
    async run(client, guild, moderator, target, context) {
        await target.voice.setMute(false, `Unmuted by ${moderator.user.tag}`);
        return context.reply({ embeds: [createEmbed({ description: `🔊 **${target.user.tag}** has been given back their voice.`, color: THEME.success })] });
    },
};
