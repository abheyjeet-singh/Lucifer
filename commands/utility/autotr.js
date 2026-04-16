const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { createEmbed, THEME } = require('../../utils/embeds');
const { getAutoTranslateLang, addAutoTranslateChannel, removeAutoTranslateChannel } = require('../../database/db');

module.exports = {
    name: 'autotr',
    description: 'Toggle auto-translation in a channel',
    category: 'utility',
    usage: 'autotr [language_code] [#channel]',
    permissions: ['Administrator'],
    data: new SlashCommandBuilder()
        .setName('autotr')
        .setDescription('Toggle auto-translation in a channel')
        .addStringOption(o => o.setName('language').setDescription('Target language code (default: en)').setRequired(false))
        .addChannelOption(o => o.setName('channel').setDescription('The channel to toggle (Defaults to current)').addChannelTypes(ChannelType.GuildText).setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(message, args, client) {
        let lang = 'en';
        let ch = message.channel;

        // Parse language and channel from args
        if (args.length > 0) {
            if (/^[a-z]{2,3}$/i.test(args[0])) {
                lang = args[0].toLowerCase();
                const mentionedCh = message.mentions.channels.first();
                if (mentionedCh) ch = mentionedCh;
            } else if (message.mentions.channels.first()) {
                ch = message.mentions.channels.first();
                if (args[1] && /^[a-z]{2,3}$/i.test(args[1])) lang = args[1].toLowerCase();
            }
        }
        return this.run(client, message.guild, ch, lang, message);
    },

    async interact(interaction, client) {
        const lang = interaction.options.getString('language') || 'en';
        const ch = interaction.options.getChannel('channel') || interaction.channel;
        return this.run(client, interaction.guild, ch, lang, interaction);
    },

    async run(client, guild, channel, lang, context) {
        const currentLang = getAutoTranslateLang(guild.id, channel.id);

        if (currentLang) {
            // If it's already enabled, disable it
            removeAutoTranslateChannel(guild.id, channel.id);
            return context.reply({ embeds: [createEmbed({ description: `🔴 Auto-Translate disabled in ${channel}.`, color: THEME.accent })] });
        } else {
            // Enable it with the chosen language
            addAutoTranslateChannel(guild.id, channel.id, lang);
            return context.reply({ embeds: [createEmbed({ description: `🟢 Auto-Translate enabled in ${channel}.\nTarget Language: **${lang.toUpperCase()}**\n\nAny message not in ${lang.toUpperCase()} will be translated automatically.`, color: THEME.success })] });
        }
    },
};
