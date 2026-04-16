const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, THEME } = require('../../utils/embeds');
const { getAiUsage, AI_DAILY_LIMIT } = require('../../database/db');

module.exports = {
    name: 'aiusage',
    description: 'Check the realm\'s remaining AI wisdom',
    category: 'utility',
    usage: 'aiusage',
    permissions: [],
    data: new SlashCommandBuilder()
        .setName('aiusage')
        .setDescription('Check the realm\'s remaining AI wisdom for today'),

    async execute(message, args, client) {
        return this.run(client, message.guild, message);
    },

    async interact(interaction, client) {
        return this.run(client, interaction.guild, interaction);
    },

    async run(client, guild, context) {
        const currentUsage = getAiUsage(guild.id);
        const remaining = AI_DAILY_LIMIT - currentUsage;

        let statusEmoji = '✨';
        let statusText = 'Plenty of wisdom remaining.';
        if (remaining <= 0) { statusEmoji = '🔒'; statusText = 'The gates are shut until tomorrow.'; }
        else if (remaining <= 10) { statusEmoji = '⚠️'; statusText = 'Wisdom is running low. Use it wisely.'; }

        return context.reply({ embeds: [createEmbed({
            title: '🔮 AI Wisdom Quota',
            description: `${statusEmoji} **${remaining}** / **${AI_DAILY_LIMIT}** requests remaining today.\n\n*${statusText}*`,
            color: remaining <= 10 ? THEME.accent : THEME.success,
        })] });
    },
};
