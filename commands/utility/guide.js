const { SlashCommandBuilder } = require('discord.js');
const axios = require('axios');
const { createEmbed, THEME } = require('../../utils/embeds');
const { getAiUsage, incrementAiUsage, AI_DAILY_LIMIT } = require('../../database/db');

module.exports = {
    name: 'guide',
    description: 'Send a Lucifer-themed guide of commands to a soul via DM',
    category: 'utility',
    usage: 'guide @user',
    permissions: ['Administrator'],
    data: new SlashCommandBuilder()
        .setName('guide')
        .setDescription('Send a Lucifer-themed guide of commands to a soul via DM')
        .addUserOption(o => o.setName('user').setDescription('The soul to receive the guide').setRequired(true)),

    async execute(message, args, client) {
        const target = message.mentions.users.first();
        if (!target) return message.reply({ embeds: [createEmbed({ description: '⚠️ Mention a user. `l!guide @user`', color: THEME.error })] });
        return this.run(client, message.guild, message.author, target, message);
    },

    async interact(interaction, client) {
        const target = interaction.options.getUser('user');
        return this.run(client, interaction.guild, interaction.user, target, interaction);
    },

    async run(client, guild, author, target, context) {
        const currentUsage = getAiUsage(guild.id);
        if (currentUsage >= AI_DAILY_LIMIT) {
            return context.reply({ embeds: [createEmbed({ description: `🔥 AI limit reached (\`${AI_DAILY_LIMIT}\`).`, color: THEME.secondary })] });
        }

        await context.reply({ embeds: [createEmbed({ description: `📜 Penning a letter to ${target.tag}...`, color: THEME.celestial })] });

        const commandList = [...client.commands.values()].map(cmd => `!${cmd.name}: ${cmd.description}`).join('\n');

        try {
            const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
                model: 'llama-3.1-8b-instant',
                messages: [
                    {
                        role: 'system',
                        content: `You are Lucifer Morningstar. Write a formal, elegant letter to a mortal explaining your powers (commands). Use rich Discord markdown and emojis (🔥, ⚔️, 📜). Structure as a decree. Here are your powers:\n\n${commandList}\n\nCRITICAL: Output ONLY the letter text. No filler like "Here is the letter".`
                    },
                    { role: 'user', content: `Write the guide letter. Sign it as Lucifer Morningstar, Lord of Hell.` }
                ],
                max_tokens: 1500
            }, {
                headers: {
                    'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
                    'Content-Type': 'application/json',
                }
            });

            let letter = response.data.choices?.[0]?.message?.content?.trim();
            if (!letter) return context.editReply({ embeds: [createEmbed({ description: '💀 The ink dried up.', color: THEME.error })] });

            const chunks = letter.match(/[\s\S]{1,1999}/g) || [];
            let dmFailed = false;
            for (const chunk of chunks) {
                await target.send({ content: chunk }).catch(() => { dmFailed = true; });
                if (dmFailed) break;
            }

            if (dmFailed) {
                return context.editReply({ embeds: [createEmbed({ description: `🚫 Cannot DM ${target.tag}. Their doors are locked.`, color: THEME.error })] });
            }

            const newCount = incrementAiUsage(guild.id);
            return context.editReply({ embeds: [createEmbed({ description: `✉️ The decree has been slipped under ${target}'s door.\n🔥 **AI Quota:** ${newCount}/${AI_DAILY_LIMIT}`, color: THEME.success })] });

        } catch (error) {
            console.error('Groq guide Error:', error.response?.data || error.message);
            return context.editReply({ embeds: [createEmbed({ description: '💀 The cosmic scribe is asleep. Try again shortly.', color: THEME.error })] });
        }
    },
};
