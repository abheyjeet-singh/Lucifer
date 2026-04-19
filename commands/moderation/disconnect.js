const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createEmbed, THEME } = require('../../utils/embeds');
module.exports = {
    name: 'disconnect', description: 'Drop a soul from their voice channel', category: 'moderation', usage: 'disconnect @user', permissions: ['MoveMembers'],
    async execute(message, args, client) { const target = message.mentions.members.first(); if (!target) return message.reply({ embeds: [createEmbed({ context: message, description: '⚠️ Mention a user.', color: THEME.error })] }); return this.run(client, message.guild, message.member, target, message); },
    async run(client, guild, moderator, target, context) {
        if (!target.voice.channel) return context.reply({ embeds: [createEmbed({ context: guild, description: '⚠️ That soul is not in a voice channel.', color: THEME.error })] });
        await target.voice.disconnect(`Dropped by ${moderator.user.tag}`);
        return context.reply({ embeds: [createEmbed({ context: guild, description: `🦅 **${target.user.tag}** has been dropped from the voice realm.`, color: THEME.primary })] });
    },
};
