const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createEmbed, THEME } = require('../../utils/embeds');
const { getVerify, setVerify } = require('../../database/db');

module.exports = {
    name: 'verify',
    description: 'Set up the verification system',
    category: 'utility',
    usage: 'verify <channel> <role>',
    permissions: ['Administrator'],
    data: new SlashCommandBuilder()
        .setName('verify')
        .setDescription('Set up the verification system')
        .addSubcommand(sc => sc.setName('set').setDescription('Set verify channel and role').addChannelOption(o => o.setName('channel').setDescription('Verify channel').addChannelTypes(ChannelType.GuildText).setRequired(true)).addRoleOption(o => o.setName('role').setDescription('Verified role').setRequired(true)))
        .addSubcommand(sc => sc.setName('off').setDescription('Disable verification'))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(message, args, client) { return message.reply({ embeds: [createEmbed({ description: '⚠️ Use `/verify` slash command.', color: THEME.error })] }); },
    async interact(interaction, client) {
        const sub = interaction.options.getSubcommand();
        if (sub === 'off') {
            setVerify(interaction.guild.id, { channel_id: null, role_id: null, message_id: null });
            return interaction.reply({ embeds: [createEmbed({ description: '🛡️ Verification system disabled.', color: THEME.accent })] });
        }
        const channel = interaction.options.getChannel('channel');
        const role = interaction.options.getRole('role');

        const embed = createEmbed({
            title: '🛡️ Prove Your Worth',
            description: 'Click the button below to pledge your soul and gain access to the realm.',
            color: THEME.celestial,
        });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('verify_button').setLabel('✅ Pledge My Soul').setStyle(ButtonStyle.Success)
        );

        const msg = await channel.send({ embeds: [embed], components: [row] });
        setVerify(interaction.guild.id, { channel_id: channel.id, role_id: role.id, message_id: msg.id });

        return interaction.reply({ embeds: [createEmbed({ description: `🛡️ Verification panel created in ${channel}.\n**Verified Role:** ${role}`, color: THEME.success })] });
    },
};
