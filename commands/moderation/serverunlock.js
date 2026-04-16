const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createEmbed, THEME } = require('../../utils/embeds');

module.exports = {
    name: 'serverunlock', description: 'Unlock the entire server', category: 'moderation', usage: 'serverunlock [reason]', permissions: ['Administrator'],
    data: new SlashCommandBuilder()
        .setName('serverunlock').setDescription('Unlock the entire server')
        .addStringOption(o => o.setName('reason').setDescription('Reason for unlock').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
    async execute(message, args, client) {
        const reason = args.join(' ') || 'Server Unlock';
        const msg = await message.reply({ embeds: [createEmbed({ description: '🔓 Unlocking the server...', color: THEME.accent })] });
        try {
            for (const [id, channel] of message.guild.channels.cache) {
                if (channel.isTextBased() || channel.isVoiceBased()) {
                    await channel.permissionOverwrites.edit(message.guild.id, { SendMessages: null, Connect: null }, { reason }).catch(() => {});
                }
            }
            msg.edit({ embeds: [createEmbed({ description: `🔓 **Server is now unlocked.**\n> ${reason}`, color: THEME.success })] });
        } catch { msg.edit({ embeds: [createEmbed({ description: '🚫 Failed to unlock some channels.', color: THEME.error })] }); }
    },
    async interact(interaction, client) {
        const reason = interaction.options.getString('reason') || 'Server Unlock';
        await interaction.reply({ embeds: [createEmbed({ description: '🔓 Unlocking the server...', color: THEME.accent })] });
        try {
            for (const [id, channel] of interaction.guild.channels.cache) {
                if (channel.isTextBased() || channel.isVoiceBased()) {
                    await channel.permissionOverwrites.edit(interaction.guild.id, { SendMessages: null, Connect: null }, { reason }).catch(() => {});
                }
            }
            interaction.editReply({ embeds: [createEmbed({ description: `🔓 **Server is now unlocked.**\n> ${reason}`, color: THEME.success })] });
        } catch { interaction.editReply({ embeds: [createEmbed({ description: '🚫 Failed to unlock some channels.', color: THEME.error })] }); }
    },
};