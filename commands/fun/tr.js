const { SlashCommandBuilder } = require('discord.js');
const translate = require('@iamtraction/google-translate');
const { createEmbed, THEME } = require('../../utils/embeds');

module.exports = {
    name: 'tr',
    description: 'Translate mortal tongues (Reply to a message or provide text)',
    category: 'fun',
    usage: 'tr [language_code] <text>',
    permissions: [],
    data: new SlashCommandBuilder()
        .setName('tr')
        .setDescription('Translate mortal tongues')
        .addStringOption(o => o.setName('language').setDescription('Language to translate to (default: en)').setRequired(false))
        .addStringOption(o => o.setName('text').setDescription('The text to translate (or reply to a message)').setRequired(false)),

    async execute(message, args, client) {
        let lang = 'en';
        let text = args.join(' ');

        if (!text && message.reference && message.reference.messageId) {
            const referencedMsg = await message.channel.messages.fetch(message.reference.messageId).catch(() => null);
            if (referencedMsg) text = referencedMsg.content;
        } else if (args.length > 0 && /^[a-z]{2,3}$/i.test(args[0])) {
            lang = args[0].toLowerCase();
            text = args.slice(1).join(' ');
            if (!text && message.reference && message.reference.messageId) {
                const referencedMsg = await message.channel.messages.fetch(message.reference.messageId).catch(() => null);
                if (referencedMsg) text = referencedMsg.content;
            }
        }

        if (!text) return message.reply({ embeds: [createEmbed({ context: message, description: '⚠️ Provide text or reply to a message to translate.\nExample: `l!tr es Hello` or reply `l!tr`', color: THEME.error })] });
        return this.run(client, message.guild, lang, text, message);
    },

    async interact(interaction, client) {
        const lang = interaction.options.getString('language') || 'en';
        const text = interaction.options.getString('text');
        if (!text) return interaction.reply({ embeds: [createEmbed({ context: interaction, description: '⚠️ Please provide text or use `l!tr` by replying to a message.', color: THEME.error })], flags: 64 });
        return this.run(client, interaction.guild, lang, text, interaction);
    },

    async run(client, guild, lang, text, context) {
        // Send the "thinking" message (works for both message and interaction)
        const thinkingMsg = await context.reply({ embeds: [createEmbed({ context: guild, description: '🔮 Deciphering the mortal tongue...', color: THEME.celestial })], fetchReply: true });

        try {
            const result = await translate(text, { to: lang });
            
            const fromLang = result.from.language.iso?.toUpperCase() || '???';
            const toLang = lang.toUpperCase();

            const embed = createEmbed({
                title: '📜 Translation Decreed',
                fields: [
                    { name: `🟢 Original (${fromLang})`, value: text.substring(0, 1024) || '*No text content*', inline: false },
                    { name: `🔴 Translation (${toLang})`, value: result.text.substring(0, 1024) || '*Could not translate*', inline: false },
                ],
                color: THEME.success,
                footer: { text: '🔥 Lucifer Morningstar | Polyglot of the Underworld' }
            });

            // Edit the thinking message (check if it's an Interaction or a Message)
            if (context.editReply) {
                return context.editReply({ embeds: [embed] });
            } else if (thinkingMsg && thinkingMsg.edit) {
                return thinkingMsg.edit({ embeds: [embed] });
            }

        } catch (error) {
            console.error('Translation Error:', error);
            const errorEmbed = createEmbed({ context: guild, description: '💀 Failed to translate. Ensure you used a valid language code (e.g., `en`, `es`, `fr`, `ja`).', color: THEME.error });
            
            if (context.editReply) {
                return context.editReply({ embeds: [errorEmbed] });
            } else if (thinkingMsg && thinkingMsg.edit) {
                return thinkingMsg.edit({ embeds: [errorEmbed] });
            }
        }
    },
};
