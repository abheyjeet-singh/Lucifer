const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, THEME } = require('../../utils/embeds');

module.exports = {
    name: 'poll', description: 'Ask the mortals a question', category: 'utility', usage: 'poll <question>', permissions: [],
    data: new SlashCommandBuilder().setName('poll').setDescription('Ask the mortals a question').addStringOption(o => o.setName('question').setDescription('The question').setRequired(true)),
    async execute(message, args, client) { const q = args.join(' '); if (!q) return message.reply({ embeds: [createEmbed({ description: '⚠️ Ask a question.', color: THEME.error })] }); return this.run(client, message, q); },
    async interact(interaction, client) { return this.run(client, interaction, interaction.options.getString('question')); },
    async run(client, context, question) {
        const embed = createEmbed({ title: '📊 Divine Poll', description: question, color: THEME.celestial });
        const msg = await context.reply({ embeds: [embed], fetchReply: true });
        await msg.react('✅'); await msg.react('❌');
    },
};
