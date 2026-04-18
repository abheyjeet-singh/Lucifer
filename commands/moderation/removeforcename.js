const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createEmbed, THEME, modLog } = require('../../utils/embeds');
const { removeForcedName, getForcedName } = require('../../database/db');

module.exports = {
    name: 'removeforcename',
    description: 'Free a soul from their forced name',
    category: 'moderation',
    usage: 'removeforcename @user',
    aliases: ['rfn'],
    permissions: ['ManageNicknames'],

    async execute(message, args, client) {
        const target = message.mentions.members.first();
        if (!target) return message.reply({ embeds: [createEmbed({ description: '⚠️ Use: `rfn @user`', color: THEME.error })] });
        return this.run(client, message.guild, message.member, target, message);
    },

    async run(client, guild, moderator, target, context) {
        const forcedName = getForcedName(guild.id, target.id);
        if (!forcedName) return context.reply({ embeds: [createEmbed({ description: '⚠️ That soul is not branded with a forced name.', color: THEME.error })] });

        removeForcedName(guild.id, target.id);
        
        // Reset their nickname back to their original username
        if (target.manageable) await target.setNickname(null, `Force name removed by ${moderator.user.tag}`);

        modLog(client, guild, createEmbed({
            title: '✨ Brand Removed',
            description: `**User:** ${target.user.tag} (${target.id})\n**Previous Forced Name:** ${forcedName}\n**Moderator:** ${moderator.user.tag}`,
            color: THEME.success,
        }));

        return context.reply({ embeds: [createEmbed({
            description: `✨ **${target.user.tag}** has been freed from their forced name. They may choose their own identity once more.`,
            color: THEME.success
        })] });
    },
};
