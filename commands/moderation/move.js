const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { createEmbed, THEME } = require('../../utils/embeds');
module.exports = {
    name: 'move', description: 'Teleport a soul to another voice channel', category: 'moderation', usage: 'move @user #channel', permissions: ['MoveMembers'],
    data: new SlashCommandBuilder().setName('move').setDescription('Teleport a soul to another voice channel').addUserOption(o => o.setName('user').setDescription('The soul to move').setRequired(true)).addChannelOption(o => o.setName('channel').setDescription('The destination').addChannelTypes(ChannelType.GuildVoice).setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.MoveMembers),
    async execute(message, args, client) { const target = message.mentions.members.first(); const ch = message.mentions.channels.first(); if (!target || !ch) return message.reply({ embeds: [createEmbed({ context: message, description: '⚠️ Use: `l!move @user #channel`', color: THEME.error })] }); return this.run(client, message.guild, message.member, target, ch, message); },
    async interact(interaction, client) { return this.run(client, interaction.guild, interaction.member, interaction.options.getMember('user'), interaction.options.getChannel('channel'), interaction); },
    async run(client, guild, moderator, target, channel, context) {
        if (!target.voice.channel) return context.reply({ embeds: [createEmbed({ context: guild, description: '⚠️ That soul is not in a voice channel.', color: THEME.error })] });
        await target.voice.setChannel(channel, `Moved by ${moderator.user.tag}`);
        return context.reply({ embeds: [createEmbed({ context: guild, description: `⚡ **${target.user.tag}** has been teleported to ${channel}.`, color: THEME.primary })] });
    },
};
