const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, THEME } = require('../../utils/embeds');

module.exports = {
    name: 'unpanic',
    description: 'Unlocks all channels after a panic mode lockdown.',
    permissions: ['Administrator'],
    data: new SlashCommandBuilder()
        .setName('unpanic')
        .setDescription('Unlocks all channels after a panic mode lockdown.'),

    async execute(message, args, client) {
        const msg = await message.reply({ embeds: [createEmbed({ description: '🔓 **DEACTIVATING PANIC MODE...** Restoring channel access.', color: THEME.accent })] });
        
        const channels = message.guild.channels.cache.filter(c => c.isTextBased());
        for (const [id, channel] of channels) {
            // Setting SendMessages to null removes the explicit deny, reverting to default
            await channel.permissionOverwrites.edit(message.guild.id, { SendMessages: null }, { reason: 'UNPANIC MODE - Lockdown lifted' }).catch(() => {});
        }
        
        await msg.edit({ embeds: [createEmbed({ description: '✅ **PANIC MODE DEACTIVATED.** All channels have been unlocked. Breathe easy.', color: THEME.success })] });
    },

    async interact(interaction, client) {
        await interaction.reply({ embeds: [createEmbed({ description: '🔓 **DEACTIVATING PANIC MODE...**', color: THEME.accent })] });
        
        const channels = interaction.guild.channels.cache.filter(c => c.isTextBased());
        for (const [id, channel] of channels) {
            await channel.permissionOverwrites.edit(interaction.guild.id, { SendMessages: null }, { reason: 'UNPANIC MODE - Lockdown lifted' }).catch(() => {});
        }
        
        await interaction.editReply({ embeds: [createEmbed({ description: '✅ **PANIC MODE DEACTIVATED.** All channels have been unlocked.', color: THEME.success })] });
    }
};