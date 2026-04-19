const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, THEME } = require('../../utils/embeds');
const quotes = require('../../assets/lucifer-quotes.json');

module.exports = {
    name: 'lucifer-quote',
    description: 'Hear the Devil speak',
    category: 'fun',
    usage: 'lucifer-quote',
    permissions: [],
    data: new SlashCommandBuilder()
        .setName('lucifer-quote')
        .setDescription('Hear the Devil speak'),

    async execute(message, args, client) {
        return this.run(client, message);
    },

    async interact(interaction, client) {
        return this.run(client, interaction);
    },

    async run(client, context) {
        const quote = quotes[Math.floor(Math.random() * quotes.length)];
        return context.reply({ embeds: [createEmbed({
            context: context,
            description: `🔥 *"${quote}"*\n— Lucifer Morningstar`,
            color: THEME.primary,
        })] });
    },
};