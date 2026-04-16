const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createEmbed, THEME, modLog } = require('../../utils/embeds');
const { addForcedName } = require('../../database/db');

module.exports = {
    name: 'forcename',
    description: 'Force a soul to wear a name they cannot remove',
    category: 'moderation',
    usage: 'forcename @user <nickname>',
    aliases: ['fn'],
    permissions: ['ManageNicknames'],
    data: new SlashCommandBuilder()
        .setName('forcename')
        .setDescription('Force a soul to wear a name they cannot remove')
        .addUserOption(o => o.setName('user').setDescription('The soul to rename').setRequired(true))
        .addStringOption(o => o.setName('nickname').setDescription('The name they must wear').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageNicknames),

    async execute(message, args, client) {
        const target = message.mentions.members.first();
        const nickname = args.slice(1).join(' ');
        if (!target || !nickname) return message.reply({ embeds: [createEmbed({ description: '⚠️ Use: `fn @user <nickname>`', color: THEME.error })] });
        return this.run(client, message.guild, message.member, target, nickname, message);
    },

    async interact(interaction, client) {
        const target = interaction.options.getMember('user');
        const nickname = interaction.options.getString('nickname');
        return this.run(client, interaction.guild, interaction.member, target, nickname, interaction);
    },

    async run(client, guild, moderator, target, nickname, context) {
        if (target.id === guild.ownerId) return context.reply({ embeds: [createEmbed({ description: '🚫 I cannot force a name upon the ruler of this realm.', color: THEME.error })] });
        if (!target.manageable) return context.reply({ embeds: [createEmbed({ description: '🚫 This soul is too powerful for me to rename.', color: THEME.error })] });

        addForcedName(guild.id, target.id, nickname);
        await target.setNickname(nickname, `Forced by ${moderator.user.tag}`);

        modLog(client, guild, createEmbed({
            title: '🏷️ Name Forcibly Changed',
            description: `**User:** ${target.user.tag} (${target.id})\n**Forced Name:** ${nickname}\n**Moderator:** ${moderator.user.tag}`,
            color: THEME.accent,
        }));

        return context.reply({ embeds: [createEmbed({
            description: `🏷️ **${target.user.tag}** has been eternally branded as **${nickname}**.\nThey cannot escape this name.`,
            color: THEME.primary
        })] });
    },
};
