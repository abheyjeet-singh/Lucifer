const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, THEME } = require('../../utils/embeds');

module.exports = {
    name: 'panic',
    description: 'Locks down the entire server in case of a raid or nuke.',
    permissions: ['Administrator'],
    data: new SlashCommandBuilder()
        .setName('panic')
        .setDescription('Emergency server lockdown.'),

    async execute(message, args, client) {
        const msg = await message.reply({ embeds: [createEmbed({ context: message, description: '🚨 **INITIATING PANIC MODE...** Locking all channels.', color: THEME.accent })] });
        
        const channels = message.guild.channels.cache.filter(c => c.isTextBased());
        for (const [id, channel] of channels) {
            await channel.permissionOverwrites.edit(message.guild.id, { SendMessages: false }, { reason: 'PANIC MODE ACTIVATED' }).catch(() => {});
        }
        
        await msg.edit({ embeds: [createEmbed({ context: guild, description: '🛑 **PANIC MODE ACTIVE.** All channels locked. Use `l!serverunlock` to unlock.', color: THEME.error })] });
    },

    async interact(interaction, client) {
        await interaction.reply({ embeds: [createEmbed({ context: interaction, description: '🚨 **INITIATING PANIC MODE...**', color: THEME.accent })] });
        
        const channels = interaction.guild.channels.cache.filter(c => c.isTextBased());
        for (const [id, channel] of channels) {
            await channel.permissionOverwrites.edit(interaction.guild.id, { SendMessages: false }, { reason: 'PANIC MODE ACTIVATED' }).catch(() => {});
        }
        
        await interaction.editReply({ embeds: [createEmbed({ context: guild, description: '🛑 **PANIC MODE ACTIVE.** All channels locked.', color: THEME.error })] });
    }
};