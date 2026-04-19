const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createEmbed, THEME, modLog } = require('../../utils/embeds');

module.exports = {
    name: 'roleremove',
    description: 'Strip a role from a soul',
    category: 'moderation',
    usage: 'roleremove @user @role',
    permissions: ['ManageRoles'],
    
    async execute(message, args, client) {
        const target = message.mentions.members.first();
        const role = message.mentions.roles.first();
        if (!target || !role) return message.reply({ embeds: [createEmbed({ context: message, description: '⚠️ Use: `roleremove @user @role`', color: THEME.error })] });
        return this.run(client, message.guild, message.member, target, role, message);
    },

    async run(client, guild, moderator, target, role, context) {
        if (!target.roles.cache.has(role.id)) return context.reply({ embeds: [createEmbed({ context: guild, description: '⚠️ That soul does not bear this role.', color: THEME.error })] });
        if (role.position >= guild.members.me.roles.highest.position) return context.reply({ embeds: [createEmbed({ context: guild, description: '🚫 I cannot strip a role equal to or above my own.', color: THEME.error })] });

        await target.roles.remove(role, `${moderator.user.tag}`);

        modLog(client, guild, createEmbed({
            title: '🎭 Role Removed',
            description: `**User:** ${target.user.tag}\n**Role:** ${role.name}\n**Moderator:** ${moderator.user.tag}`,
            color: THEME.accent,
        }));

        return context.reply({ embeds: [createEmbed({ context: guild, description: `🎭 **${role.name}** has been stripped from **${target.user.tag}**.`, color: THEME.primary })] });
    },
};
