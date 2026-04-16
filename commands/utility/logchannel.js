const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { createEmbed, THEME } = require('../../utils/embeds');
const { setLogChannel, removeLogChannel, getGuildSettings } = require('../../database/db');
const { hasPermission } = require('../../utils/permissions');

module.exports = {
    name: 'logchannel',
    description: 'Set the hall of judgment (mod logs)',
    category: 'utility',
    usage: 'logchannel <#channel | off>',
    permissions: ['Administrator'],
    data: new SlashCommandBuilder()
        .setName('logchannel')
        .setDescription('Set the hall of judgment (mod logs)')
        .addSubcommand(sc =>
            sc.setName('set')
              .setDescription('Set the log channel')
              .addChannelOption(o =>
                  o.setName('channel')
                   .setDescription('The channel for mod logs')
                   .setRequired(true)
                   .addChannelTypes(ChannelType.GuildText)))
        .addSubcommand(sc =>
            sc.setName('show')
              .setDescription('View current log channel'))
        .addSubcommand(sc =>
            sc.setName('off')
              .setDescription('Disable mod logging'))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(message, args, client) {
        const sub = args[0]?.toLowerCase();
        if (!sub || sub === 'show') return this.show(client, message.guild, message);
        if (sub === 'off') return this.off(client, message.guild, message.member, message);
        const channel = message.mentions.channels.first();
        if (!channel) return message.reply({ embeds: [createEmbed({ description: '⚠️ Mention a channel.', color: THEME.error })] });
        return this.setCh(client, message.guild, message.member, channel, message);
    },

    async interact(interaction, client) {
        const sub = interaction.options.getSubcommand();
        if (sub === 'show') return this.show(client, interaction.guild, interaction);
        if (sub === 'off') return this.off(client, interaction.guild, interaction.member, interaction);
        const channel = interaction.options.getChannel('channel');
        return this.setCh(client, interaction.guild, interaction.member, channel, interaction);
    },

    async show(client, guild, context) {
        const settings = getGuildSettings(guild.id);
        if (!settings.log_channel_id) return context.reply({ embeds: [createEmbed({ description: '📜 No hall of judgment has been set.', color: THEME.dark })] });
        const ch = guild.channels.cache.get(settings.log_channel_id);
        return context.reply({ embeds: [createEmbed({ description: `📜 Hall of Judgment: ${ch || 'Unknown channel'}`, color: THEME.celestial })] });
    },

    async setCh(client, guild, member, channel, context) {
        if (!hasPermission(member, 'Administrator')) return context.reply({ embeds: [createEmbed({ description: '🚫 Only administrators may set the log channel.', color: THEME.error })] });
        setLogChannel(guild.id, channel.id);
        return context.reply({ embeds: [createEmbed({ description: `📜 Hall of Judgment set to ${channel}.`, color: THEME.success })] });
    },

    async off(client, guild, member, context) {
        if (!hasPermission(member, 'Administrator')) return context.reply({ embeds: [createEmbed({ description: '🚫 Only administrators may disable logging.', color: THEME.error })] });
        removeLogChannel(guild.id);
        return context.reply({ embeds: [createEmbed({ description: '📜 Hall of Judgment has been disbanded.', color: THEME.primary })] });
    },
};
