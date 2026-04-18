const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createEmbed, THEME } = require('../../utils/embeds');
module.exports = {
    name: 'vcdeafen', description: 'Block a soul from hearing the realm', category: 'moderation', usage: 'vcdeafen @user', permissions: ['DeafenMembers'],
    async execute(message, args, client) { const target = message.mentions.members.first(); if (!target) return message.reply({ embeds: [createEmbed({ description: '⚠️ Mention a user.', color: THEME.error })] }); return this.run(client, message.guild, message.member, target, message); },
    async run(client, guild, moderator, target, context) {
        if (!target.voice.channel) return context.reply({ embeds: [createEmbed({ description: '⚠️ That soul is not in a voice channel.', color: THEME.error })] });
        await target.voice.setDeaf(true, `Deafened by ${moderator.user.tag}`);
        return context.reply({ embeds: [createEmbed({ description: `👂 **${target.user.tag}** has been plunged into silence.`, color: THEME.accent })] });
    },
};
