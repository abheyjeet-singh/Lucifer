const { SlashCommandBuilder } = require('discord.js');
const axios = require('axios');
const { createEmbed, THEME } = require('../../utils/embeds');

module.exports = {
    name: 'anime',
    description: 'Look up an anime on MyAnimeList',
    aliases: ['mal'],
    data: new SlashCommandBuilder()
        .setName('anime')
        .setDescription('Look up an anime on MyAnimeList')
        .addStringOption(o => o.setName('title').setDescription('The anime title to search').setRequired(true)),

    async execute(message, args, client) {
        const query = args.join(' ');
        if (!query) return message.reply({ embeds: [createEmbed({ description: '⚠️ Please provide an anime name! Usage: `l!anime Naruto`', color: THEME.error })] });

        const msg = await message.reply({ embeds: [createEmbed({ description: '🔍 Searching the infernal archives...', color: THEME.accent })] });

        try {
            const res = await axios.get(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(query)}&limit=1&sfw=true`);
            const anime = res.data.data[0];

            if (!anime) {
                return msg.edit({ embeds: [createEmbed({ description: '❌ No anime found with that title.', color: THEME.error })] });
            }

            return msg.edit({ embeds: [createEmbed({
                title: `${anime.title} (${anime.type || 'Unknown'})`,
                url: anime.url,
                description: anime.synopsis ? (anime.synopsis.length > 400 ? anime.synopsis.substring(0, 400) + '...' : anime.synopsis) : 'No synopsis available.',
                color: THEME.primary,
                thumbnail: anime.images.jpg.image_url,
                fields: [
                    { name: '⭐ Score', value: anime.score?.toString() || 'N/A', inline: true },
                    { name: '📺 Episodes', value: anime.episodes?.toString() || 'N/A', inline: true },
                    { name: '📊 Status', value: anime.status || 'N/A', inline: true }
                ],
                footer: { text: `💜 Members: ${anime.members?.toLocaleString() || 'N/A'}` }
            })] });
        } catch (e) {
            return msg.edit({ embeds: [createEmbed({ description: '💀 Error fetching anime data. The API might be rate limited.', color: THEME.error })] });
        }
    },

    async interact(interaction, client) {
        const query = interaction.options.getString('title');

        await interaction.deferReply();

        try {
            const res = await axios.get(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(query)}&limit=1&sfw=true`);
            const anime = res.data.data[0];

            if (!anime) {
                return interaction.editReply({ embeds: [createEmbed({ description: '❌ No anime found with that title.', color: THEME.error })] });
            }

            return interaction.editReply({ embeds: [createEmbed({
                title: `${anime.title} (${anime.type || 'Unknown'})`,
                url: anime.url,
                description: anime.synopsis ? (anime.synopsis.length > 400 ? anime.synopsis.substring(0, 400) + '...' : anime.synopsis) : 'No synopsis available.',
                color: THEME.primary,
                thumbnail: anime.images.jpg.image_url,
                fields: [
                    { name: '⭐ Score', value: anime.score?.toString() || 'N/A', inline: true },
                    { name: '📺 Episodes', value: anime.episodes?.toString() || 'N/A', inline: true },
                    { name: '📊 Status', value: anime.status || 'N/A', inline: true }
                ],
                footer: { text: `💜 Members: ${anime.members?.toLocaleString() || 'N/A'}` }
            })] });
        } catch (e) {
            return interaction.editReply({ embeds: [createEmbed({ description: '💀 Error fetching anime data. The API might be rate limited.', color: THEME.error })] });
        }
    }
};