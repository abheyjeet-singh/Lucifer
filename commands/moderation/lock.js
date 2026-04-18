const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createEmbed, THEME, modLog } = require('../../utils/embeds');

module.exports = {
    name: 'lock',
    description: 'Seal a channel shut',
    category: 'moderation',
    usage: 'lock [channel]',
    permissions: ['ManageChannels'],
    async execute(message, args, client) {
        const channel = message.mentions.channels.first() || message.channel;
        return this.run(client, message.guild, channel, message.member, message);
    },

    async run(client, guild, channel, moderator, context) {
        await channel.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: false });

        modLog(client, guild, createEmbed({
            title: '🔒 Channel Locked',
            description: `**Channel:** ${channel}\n**Moderator:** ${moderator.user.tag}`,
            color: THEME.accent,
        }));

        return context.reply({ embeds: [createEmbed({ description: `🔒 ${channel} has been sealed shut by divine authority.`, color: THEME.primary })] });
    },
};
