const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createEmbed, THEME, modLog } = require('../../utils/embeds');

module.exports = {
    name: 'slowmode',
    description: 'Control the flow of mortal words',
    category: 'moderation',
    usage: 'slowmode <seconds | off>',
    permissions: ['ManageChannels'],
    data: new SlashCommandBuilder()
        .setName('slowmode')
        .setDescription('Control the flow of mortal words')
        .addIntegerOption(o => o.setName('seconds').setDescription('Seconds (0 to disable)').setRequired(true).setMinValue(0).setMaxValue(21600))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    async execute(message, args, client) {
        const seconds = args[0]?.toLowerCase() === 'off' ? 0 : parseInt(args[0]);
        if (isNaN(seconds)) return message.reply({ embeds: [createEmbed({ description: '⚠️ Provide seconds (0 to disable).', color: THEME.error })] });
        return this.run(client, message.guild, message.channel, message.member, seconds, message);
    },

    async interact(interaction, client) {
        return this.run(client, interaction.guild, interaction.channel, interaction.member, interaction.options.getInteger('seconds'), interaction);
    },

    async run(client, guild, channel, moderator, seconds, context) {
        await channel.setRateLimitPerUser(seconds, `${moderator.user.tag}`);

        modLog(client, guild, createEmbed({
            title: '🐌 Slowmode Updated',
            description: `**Channel:** ${channel}\n**Slowmode:** ${seconds ? `${seconds}s` : 'Disabled'}\n**Moderator:** ${moderator.user.tag}`,
            color: seconds ? THEME.accent : THEME.success,
        }));

        return context.reply({ embeds: [createEmbed({ description: seconds ? `🐌 Slowmode set to **${seconds}s** in ${channel}.` : `🐌 Slowmode disabled in ${channel}.`, color: THEME.primary })] });
    },
};
