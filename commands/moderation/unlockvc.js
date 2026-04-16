const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { createEmbed, THEME } = require('../../utils/embeds');
module.exports = {
    name: 'unlockvc', description: 'Unlock a sealed voice channel', category: 'moderation', usage: 'unlockvc [channel]', permissions: ['ManageChannels'],
    data: new SlashCommandBuilder().setName('unlockvc').setDescription('Unlock a sealed voice channel').addChannelOption(o => o.setName('channel').setDescription('The channel to unlock').addChannelTypes(ChannelType.GuildVoice)).setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
    async execute(message, args, client) { const ch = message.mentions.channels.first() || message.member.voice.channel; if (!ch) return message.reply({ embeds: [createEmbed({ description: '⚠️ Join a VC or mention one.', color: THEME.error })] }); return this.run(client, message.guild, ch, message); },
    async interact(interaction, client) { const ch = interaction.options.getChannel('channel') || interaction.member.voice.channel; if (!ch) return interaction.reply({ embeds: [createEmbed({ description: '⚠️ Join a VC or select one.', color: THEME.error })], ephemeral: true }); return this.run(client, interaction.guild, ch, interaction); },
    async run(client, guild, channel, context) {
        await channel.permissionOverwrites.edit(guild.id, { Connect: null });
        return context.reply({ embeds: [createEmbed({ description: `🔓 ${channel} has been unsealed. Mortals may enter again.`, color: THEME.success })] });
    },
};
