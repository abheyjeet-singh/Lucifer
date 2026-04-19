const { SlashCommandBuilder } = require('discord.js');
const axios = require('axios');
const { createEmbed, THEME } = require('../../utils/embeds');

module.exports = {
    name: 'weather',
    description: 'Get the weather for a city',
    data: new SlashCommandBuilder()
        .setName('weather')
        .setDescription('Get the weather forecast')
        .addStringOption(o => o.setName('city').setDescription('The city name').setRequired(true)),

    async execute(message, args, client) {
        const city = args.join(' ');
        if (!city) return message.reply({ embeds: [createEmbed({ context: message, description: '⚠️ Please provide a city! Usage: `l!weather London`', color: THEME.accent })] });
        return this.fetchWeather(city, message);
    },

    async interact(interaction, client) {
        const city = interaction.options.getString('city');
        return this.fetchWeather(city, interaction);
    },

    async fetchWeather(city, context) {
        try {
            const res = await axios.get(`https://wttr.in/${encodeURIComponent(city)}?format=j1`);
            const current = res.data.current_condition[0];
            const area = res.data.nearest_area[0];

            return context.reply({ embeds: [createEmbed({
                title: `🌍 Weather in ${area.areaName[0].value}`,
                description: `**${current.weatherDesc[0].value}**`,
                fields: [
                    { name: '🌡️ Temperature', value: `${current.temp_C}°C / ${current.temp_F}°F`, inline: true },
                    { name: '🤔 Feels Like', value: `${current.FeelsLikeC}°C / ${current.FeelsLikeF}°F`, inline: true },
                    { name: '💧 Humidity', value: `${current.humidity}%`, inline: true },
                    { name: '💨 Wind', value: `${current.windspeedKmph} km/h`, inline: true }
                ],
                color: THEME.primary
            })] });
        } catch (e) {
            return context.reply({ embeds: [createEmbed({ context: guild, description: '❌ Could not find weather data for that location.', color: THEME.error })] });
        }
    }
};