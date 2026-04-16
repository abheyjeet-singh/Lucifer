const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const axios = require('axios');
const { createEmbed, THEME } = require('../../utils/embeds');
const { getAiUsage, incrementAiUsage, AI_DAILY_LIMIT } = require('../../database/db');

module.exports = {
    name: 'ask',
    description: 'Seek wisdom from the Devil himself',
    category: 'fun',
    usage: 'ask <question>',
    permissions: [],
    data: new SlashCommandBuilder()
        .setName('ask')
        .setDescription('Seek wisdom from the Devil himself')
        .addStringOption(o => o.setName('question').setDescription('What do you wish to know?').setRequired(true)),

    async execute(message, args, client) {
        const question = args.join(' ');
        if (!question) return message.reply({ embeds: [createEmbed({ description: '⚠️ You must ask a question, mortal.', color: THEME.error })] });
        return this.run(client, message.guild, message.author, question, message);
    },

    async interact(interaction, client) {
        const question = interaction.options.getString('question');
        return this.run(client, interaction.guild, interaction.user, question, interaction);
    },

    async run(client, guild, user, question, context) {
        const currentUsage = getAiUsage(guild.id);
        if (currentUsage >= AI_DAILY_LIMIT) {
            return context.reply({ embeds: [createEmbed({ description: `🔥 The gates of knowledge are closed for today. Limit reached (\`${AI_DAILY_LIMIT}\`).`, color: THEME.secondary })] });
        }

        await context.reply({ embeds: [createEmbed({ description: '🔮 Consulting the ancient texts...', color: THEME.celestial })] });

        const modCache = guild.members.cache.filter(m => m.permissions.has(PermissionFlagsBits.Administrator) || m.permissions.has(PermissionFlagsBits.ModerateMembers));
        const modList = modCache.map(m => `${m.user.tag}`).join(', ') || 'None found';
        const commandList = [...client.commands.values()].map(cmd => `!${cmd.name}: ${cmd.description}`).join('\n');

        const serverContext = `
LIVE SERVER DATA:
- Server Name: ${guild.name}
- Total Members: ${guild.memberCount}
- Moderators/Admins: ${modList}

YOUR OWN CAPABILITIES (You have these commands available):
 ${commandList}`;

        const systemPrompt = `You are Lucifer Morningstar from the TV show. You are witty, charming, slightly arrogant, and speak with sophistication. You reference Hell, the Silver City, and divine matters. Keep answers concise (under 3 paragraphs). Never break character.
        
CRITICAL FORMATTING RULES:
1. You MUST use heavy Discord Markdown: **bold** for emphasis, *italics* for dramatic effect, and \`code blocks\` for specific terms.
2. You MUST use thematic emojis frequently to add flair (🔥, 👑, ⚔️, 🦅, 🌌, 🍷, 📜, 👁️).
3. Structure your responses beautifully. Use bullet points or numbered lists if giving multiple points.
4. Make it sound like a decree from the Lord of Hell.
5. Output ONLY your answer. No conversational filler.\n\n${serverContext}`;

        try {
            const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
                model: 'llama-3.1-8b-instant', // Groq's Smartest Llama 3 Model
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: question }
                ],
                max_tokens: 300
            }, {
                headers: {
                    'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
                    'Content-Type': 'application/json',
                }
            });

            const choice = response.data.choices?.[0];
            let answer = choice?.message?.content?.trim();
            
            if (!answer) answer = '*My mind went blank... a rare occurrence.* 💭';
            if (answer.length > 2000) answer = answer.substring(0, 1997) + '...';

            const newCount = incrementAiUsage(guild.id);

            return context.editReply({ embeds: [createEmbed({
                author: { name: `${user.username} sought wisdom...`, iconURL: user.displayAvatarURL() },
                description: `> ${question}\n\n🔥 **Lucifer speaks:**\n${answer}`,
                color: THEME.primary,
                footer: { text: `🔥 Vessel: Llama 3.1 8B • ${newCount}/${AI_DAILY_LIMIT} today` }
            })] });

        } catch (error) {
            console.error('Groq API Error:', error.response?.data || error.message);
            return context.editReply({ embeds: [createEmbed({ description: '💀 The cosmic queue is overflowing. Try again shortly.', color: THEME.accent })] });
        }
    },
};
