const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { createEmbed, THEME } = require('../../utils/embeds');

module.exports = {
    name: 'serverlock', description: 'Lock down the entire server', category: 'moderation', usage: 'serverlock [reason]', permissions: ['Administrator'],
    data: new SlashCommandBuilder()
        .setName('serverlock').setDescription('Lock down the entire server')
        .addStringOption(o => o.setName('reason').setDescription('Reason for lockdown').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
    async execute(message, args, client) {
        const reason = args.join(' ') || 'Server Lockdown';
        const msg = await message.reply({ embeds: [createEmbed({ description: '🔒 Locking down the server...', color: THEME.accent })] });
        try {
            for (const [id, channel] of message.guild.channels.cache) {
                if (channel.isTextBased() || channel.isVoiceBased()) {
                    await channel.permissionOverwrites.edit(message.guild.id, { SendMessages: false, Connect: false }, { reason }).catch(() => {});
                }
            }
            msg.edit({ embeds: [createEmbed({ description: `🔒 **Server is now locked.**\n> ${reason}`, color: THEME.error })] });
        } catch { msg.edit({ embeds: [createEmbed({ description: '🚫 Failed to lock some channels.', color: THEME.error })] }); }
    },
    async interact(interaction, client) {
        const reason = interaction.options.getString('reason') || 'Server Lockdown';
        await interaction.reply({ embeds: [createEmbed({ description: '🔒 Locking down the server...', color: THEME.accent })] });
        try {
            for (const [id, channel] of interaction.guild.channels.cache) {
                if (channel.isTextBased() || channel.isVoiceBased()) {
                    await channel.permissionOverwrites.edit(interaction.guild.id, { SendMessages: false, Connect: false }, { reason }).catch(() => {});
                }
            }
            interaction.editReply({ embeds: [createEmbed({ description: `🔒 **Server is now locked.**\n> ${reason}`, color: THEME.error })] });
        } catch { interaction.editReply({ embeds: [createEmbed({ description: '🚫 Failed to lock some channels.', color: THEME.error })] }); }
    },
};
