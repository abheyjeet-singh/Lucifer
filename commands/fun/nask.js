const { SlashCommandBuilder } = require('discord.js');
const axios = require('axios');
const { createEmbed, THEME } = require('../../utils/embeds');
const { getAiUsage, incrementAiUsage, AI_DAILY_LIMIT } = require('../../database/db');

module.exports = {
    name: 'nask',
    description: 'Ask a normal question without the Lucifer roleplay',
    category: 'fun',
    usage: 'nask <question>',
    permissions: [],
    data: new SlashCommandBuilder()
        .setName('nask')
        .setDescription('Ask a normal question without the Lucifer roleplay')
        .addStringOption(o => o.setName('question').setDescription('What do you want to know?').setRequired(true)),

    async execute(message, args, client) {
        const question = args.join(' ');
        if (!question) return message.reply({ embeds: [createEmbed({ description: '⚠️ You must ask a question.', color: THEME.error })] });
        return this.run(client, message.guild, message.author, question, message);
    },

    async interact(interaction, client) {
        const question = interaction.options.getString('question');
        return this.run(client, interaction.guild, interaction.user, question, interaction);
    },

    async run(client, guild, user, question, context) {
        const currentUsage = getAiUsage(guild.id);
        if (currentUsage >= AI_DAILY_LIMIT) {
            return context.reply({ embeds: [createEmbed({ description: `🔥 AI limit reached (\`${AI_DAILY_LIMIT}\`).`, color: THEME.secondary })] });
        }

        await context.reply({ embeds: [createEmbed({ description: '🤔 Thinking...', color: THEME.celestial })] });

        try {
            const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
                model: 'llama-3.1-8b-instant',
                messages: [
                    { role: 'system', content: 'You are a highly intelligent, helpful AI assistant. Answer questions accurately, clearly, and concisely. Do NOT roleplay. Use Markdown formatting for readability.' },
                    { role: 'user', content: question }
                ],
                max_tokens: 500
            }, {
                headers: {
                    'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
                    'Content-Type': 'application/json',
                }
            });

            let answer = response.data.choices?.[0]?.message?.content?.trim();
            if (!answer) answer = '*I could not generate a response for that.*';
            if (answer.length > 2000) answer = answer.substring(0, 1997) + '...';

            const newCount = incrementAiUsage(guild.id);

            return context.editReply({ embeds: [createEmbed({
                description: answer,
                color: THEME.success,
                footer: { text: `🤖 AI Answer • ${newCount}/${AI_DAILY_LIMIT} today` }
            })] });

        } catch (error) {
            console.error('Groq nask Error:', error.response?.data || error.message);
            return context.editReply({ embeds: [createEmbed({ description: '💀 The AI is currently unavailable. Try again shortly.', color: THEME.error })] });
        }
    },
};
