const { SlashCommandBuilder } = require('discord.js');
const axios = require('axios');
const { createEmbed, THEME } = require('../../utils/embeds');

module.exports = {
    name: 'define',
    description: 'Get the dictionary definition of a word',
    data: new SlashCommandBuilder()
        .setName('define')
        .setDescription('Look up a word in the dictionary')
        .addStringOption(o => o.setName('word').setDescription('The word to define').setRequired(true)),

    async execute(message, args, client) {
        const word = args.join(' ');
        if (!word) return message.reply({ embeds: [createEmbed({ description: '⚠️ Provide a word! Usage: `l!define hello`', color: THEME.accent })] });
        return this.fetchDefinition(word, message);
    },

    async interact(interaction, client) {
        const word = interaction.options.getString('word');
        return this.fetchDefinition(word, interaction);
    },

    async fetchDefinition(word, context) {
        try {
            const res = await axios.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
            const data = res.data[0];
            const meaning = data.meanings[0];
            const definition = meaning.definitions[0];

            return context.reply({ embeds: [createEmbed({
                title: `📖 ${data.word} (${meaning.partOfSpeech})`,
                description: definition.definition,
                fields: [
                    { name: '💡 Example', value: definition.example || 'No example provided', inline: false },
                    { name: '🔊 Pronunciation', value: data.phonetic || 'N/A', inline: true }
                ],
                color: THEME.primary,
                footer: { text: 'Powered by Free Dictionary API' }
            })] });
        } catch (e) {
            return context.reply({ embeds: [createEmbed({ description: '❌ No definition found for that word.', color: THEME.error })] });
        }
    }
};