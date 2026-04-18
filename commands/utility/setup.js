const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { createEmbed, THEME } = require('../../utils/embeds');
const { setSuggestionChannel, setCountingChannel, setSticky, removeSticky, setAutoDelete, removeAutoDelete } = require('../../database/db'); // Removed setStarboard

module.exports = {
    name: 'setup', description: 'Configure QoL features', category: 'utility', usage: 'setup <feature> <value>', permissions: ['Administrator'],
    data: new SlashCommandBuilder().setName('setup').setDescription('Configure QoL features')
        // Removed starboard subcommand
        .addSubcommand(sc => sc.setName('suggestions').setDescription('Setup Suggestions').addChannelOption(o => o.setName('channel').setDescription('Suggestion channel').addChannelTypes(ChannelType.GuildText).setRequired(true)))
        .addSubcommand(sc => sc.setName('counting').setDescription('Setup Counting Channel').addChannelOption(o => o.setName('channel').setDescription('Counting channel').addChannelTypes(ChannelType.GuildText).setRequired(true)))
        .addSubcommand(sc => sc.setName('sticky').setDescription('Set a sticky message').addChannelOption(o => o.setName('channel').setDescription('Channel').addChannelTypes(ChannelType.GuildText).setRequired(true)).addStringOption(o => o.setName('text').setDescription('Sticky text (type "off" to remove)').setRequired(true)))
        .addSubcommand(sc => sc.setName('autodelete').setDescription('Auto-delete messages in a channel').addChannelOption(o => o.setName('channel').setDescription('Channel').addChannelTypes(ChannelType.GuildText).setRequired(true)).addIntegerOption(o => o.setName('seconds').setDescription('Seconds before delete (0 to disable)').setRequired(true)))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
        
    async execute(message, args, client) { return message.reply({ embeds: [createEmbed({ description: '⚠️ Use `/setup` slash commands.', color: THEME.error })] }); },
    async interact(interaction, client) {
        const sub = interaction.options.getSubcommand();
        // Removed starboard block
        if (sub === 'suggestions') { const ch = interaction.options.getChannel('channel'); setSuggestionChannel(interaction.guild.id, ch.id); return interaction.reply({ embeds: [createEmbed({ description: `🗳️ Suggestions set to ${ch}`, color: THEME.success })] }); }
        if (sub === 'counting') { const ch = interaction.options.getChannel('channel'); setCountingChannel(interaction.guild.id, ch.id); return interaction.reply({ embeds: [createEmbed({ description: `🔢 Counting set to ${ch}`, color: THEME.success })] }); }
        if (sub === 'sticky') { const ch = interaction.options.getChannel('channel'); const txt = interaction.options.getString('text'); if (txt.toLowerCase() === 'off') { removeSticky(ch.id); return interaction.reply({ embeds: [createEmbed({ description: `📌 Sticky removed from ${ch}`, color: THEME.accent })] }); } setSticky(ch.id, txt); return interaction.reply({ embeds: [createEmbed({ description: `📌 Sticky set in ${ch}`, color: THEME.success })] }); }
        if (sub === 'autodelete') { const ch = interaction.options.getChannel('channel'); const sec = interaction.options.getInteger('seconds'); if (sec === 0) { removeAutoDelete(ch.id); return interaction.reply({ embeds: [createEmbed({ description: `🗑️ Auto-delete disabled in ${ch}`, color: THEME.accent })] }); } setAutoDelete(ch.id, sec); return interaction.reply({ embeds: [createEmbed({ description: `🗑️ Auto-delete set to ${sec}s in ${ch}`, color: THEME.success })] }); }
    },
};