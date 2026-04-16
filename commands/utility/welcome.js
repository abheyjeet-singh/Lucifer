const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { createEmbed, THEME } = require('../../utils/embeds');
const { getWelcome, setWelcome } = require('../../database/db');

module.exports = {
    name: 'welcome',
    description: 'Set up welcome and leave messages',
    category: 'utility',
    usage: 'welcome <channel> <role>',
    permissions: ['Administrator'],
    data: new SlashCommandBuilder()
        .setName('welcome')
        .setDescription('Set up welcome and leave messages')
        .addSubcommand(sc => sc.setName('set').setDescription('Set welcome channel, auto-role, and leave channel')
            .addChannelOption(o => o.setName('channel').setDescription('Welcome channel').addChannelTypes(ChannelType.GuildText).setRequired(true))
            .addRoleOption(o => o.setName('role').setDescription('Auto-role for new members').setRequired(true))
            .addChannelOption(o => o.setName('leave_channel').setDescription('Channel for leave messages').addChannelTypes(ChannelType.GuildText).setRequired(false)))
        .addSubcommand(sc => sc.setName('off').setDescription('Disable welcome system'))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(message, args, client) { return message.reply({ embeds: [createEmbed({ description: '⚠️ Use `/welcome` slash command.', color: THEME.error })] }); },
    async interact(interaction, client) {
        const sub = interaction.options.getSubcommand();
        if (sub === 'off') {
            setWelcome(interaction.guild.id, { channel_id: null, role_id: null, message: null, leave_channel_id: null });
            return interaction.reply({ embeds: [createEmbed({ description: '🚪 Welcome & Leave system disabled.', color: THEME.accent })] });
        }
        const channel = interaction.options.getChannel('channel');
        const role = interaction.options.getRole('role');
        const leaveChannel = interaction.options.getChannel('leave_channel') || channel; // Defaults to welcome channel

        setWelcome(interaction.guild.id, { channel_id: channel.id, role_id: role.id, message: null, leave_channel_id: leaveChannel.id });

        return interaction.reply({ embeds: [createEmbed({ description: `🚪 Gatekeeper configured!\n\n**Welcome Channel:** ${channel}\n**Auto-Role:** ${role}\n**Leave Channel:** ${leaveChannel}`, color: THEME.success })] });
    },
};
