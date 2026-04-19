const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, THEME } = require('../../utils/embeds');

module.exports = {
    name: 'ping',
    description: 'Test my connection to the mortal realm',
    category: 'utility',
    usage: 'ping',
    permissions: [],
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Test my connection to the mortal realm'),

    async execute(message, args, client) {
        return this.run(client, message);
    },

    async interact(interaction, client) {
        return this.run(client, interaction);
    },

    async run(client, context) {
        const sent = await context.reply({ content: '🔥 Pinging...', fetchReply: true });
        const latency = sent.createdTimestamp - (context.createdTimestamp || Date.now());
        const apiLatency = Math.round(client.ws.ping);

        sent.edit({ content: null, embeds: [createEmbed({
            context: context,
            description: `🔥 **Latency:** ${latency}ms\n💫 **API:** ${apiLatency}ms`,
            color: THEME.success,
        })] });
    },
};