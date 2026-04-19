const { SlashCommandBuilder } = require('discord.js');
const axios = require('axios');
const { createEmbed, THEME } = require('../../utils/embeds');

module.exports = {
    name: 'meme',
    description: 'Get a random meme from Reddit',
    data: new SlashCommandBuilder().setName('meme').setDescription('Get a random meme'),

    async execute(message, args, client) {
        try {
            const res = await axios.get('https://meme-api.com/gimme');
            const meme = res.data;
            return message.reply({ embeds: [createEmbed({
                title: meme.title,
                url: meme.postLink,
                image: meme.url,
                color: THEME.primary,
                footer: { text: `👍 ${meme.ups} | r/${meme.subreddit}` }
            })] });
        } catch (e) {
            return message.reply({ embeds: [createEmbed({ context: message, description: '❌ Could not fetch a meme. Try again later.', color: THEME.error })] });
        }
    },

    async interact(interaction, client) {
        await interaction.deferReply();
        try {
            const res = await axios.get('https://meme-api.com/gimme');
            const meme = res.data;
            return interaction.editReply({ embeds: [createEmbed({
                title: meme.title,
                url: meme.postLink,
                image: meme.url,
                color: THEME.primary,
                footer: { text: `👍 ${meme.ups} | r/${meme.subreddit}` }
            })] });
        } catch (e) {
            return interaction.editReply({ embeds: [createEmbed({ context: guild, description: '❌ Could not fetch a meme.', color: THEME.error })] });
        }
    }
};