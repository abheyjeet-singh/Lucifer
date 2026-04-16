const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { createEmbed, THEME } = require('../../utils/embeds');
module.exports = {
    name: 'lockvc', description: 'Lock a voice channel so no one else can join', category: 'moderation', usage: 'lockvc [channel]', permissions: ['ManageChannels'],
    data: new SlashCommandBuilder().setName('lockvc').setDescription('Lock a voice channel').addChannelOption(o => o.setName('channel').setDescription('The channel to lock (Defaults to your current VC)').addChannelTypes(ChannelType.GuildVoice)).setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
    async execute(message, args, client) { const ch = message.mentions.channels.first() || message.member.voice.channel; if (!ch) return message.reply({ embeds: [createEmbed({ description: '⚠️ Join a VC or mention one.', color: THEME.error })] }); return this.run(client, message.guild, ch, message); },
    async interact(interaction, client) { const ch = interaction.options.getChannel('channel') || interaction.member.voice.channel; if (!ch) return interaction.reply({ embeds: [createEmbed({ description: '⚠️ Join a VC or select one.', color: THEME.error })], ephemeral: true }); return this.run(client, interaction.guild, ch, interaction); },
    async run(client, guild, channel, context) {
        await channel.permissionOverwrites.edit(guild.id, { Connect: false });
        return context.reply({ embeds: [createEmbed({ description: `🔒 ${channel} has been sealed. No more mortals may enter.`, color: THEME.accent })] });
    },
};
