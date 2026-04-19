const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { createEmbed, THEME } = require('../../utils/embeds');
const { setDynamicVcHub, getDynamicVcHub } = require('../../database/db');

module.exports = {
    name: 'createvc',
    description: 'Set the voice channel that creates temporary private rooms',
    category: 'utility',
    usage: 'createvc #channel',
    permissions: ['Administrator'],
    data: new SlashCommandBuilder()
        .setName('createvc')
        .setDescription('Set the voice channel that creates temporary private rooms')
        .addSubcommand(sc => sc.setName('set').setDescription('Set the hub channel').addChannelOption(o => o.setName('channel').setDescription('The Hub voice channel').addChannelTypes(ChannelType.GuildVoice).setRequired(true)))
        .addSubcommand(sc => sc.setName('show').setDescription('View the current hub channel'))
        .addSubcommand(sc => sc.setName('off').setDescription('Disable dynamic VCs'))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(message, args, client) {
        const sub = args[0]?.toLowerCase();
        if (sub === 'off') return this.off(client, message.guild, message);
        if (sub === 'show' || !sub) return this.show(client, message.guild, message);
        const ch = message.mentions.channels.first();
        if (!ch) return message.reply({ embeds: [createEmbed({ context: message, description: '⚠️ Mention a voice channel.', color: THEME.error })] });
        return this.set(client, message.guild, ch, message);
    },

    async interact(interaction, client) {
        const sub = interaction.options.getSubcommand();
        if (sub === 'show') return this.show(client, interaction.guild, interaction);
        if (sub === 'off') return this.off(client, interaction.guild, interaction);
        return this.set(client, interaction.guild, interaction.options.getChannel('channel'), interaction);
    },

    async show(client, guild, context) {
        const hubId = getDynamicVcHub(guild.id);
        if (!hubId) return context.reply({ embeds: [createEmbed({ context: guild, description: '⚠️ Dynamic VCs are not set up.', color: THEME.dark })] });
        const ch = guild.channels.cache.get(hubId);
        return context.reply({ embeds: [createEmbed({ context: guild, description: `⭐ Dynamic VC Hub: ${ch || 'Unknown Channel'}`, color: THEME.celestial })] });
    },

    async set(client, guild, channel, context) {
        setDynamicVcHub(guild.id, channel.id);
        await channel.setName('⭐ Create Room');
        return context.reply({ embeds: [createEmbed({ context: guild, description: `⭐ Dynamic VC Hub set to ${channel}.\nWhen users join it, they will get their own private room!`, color: THEME.success })] });
    },

    async off(client, guild, context) {
        setDynamicVcHub(guild.id, null);
        return context.reply({ embeds: [createEmbed({ context: guild, description: '⭐ Dynamic VCs have been disabled.', color: THEME.accent })] });
    },
};
