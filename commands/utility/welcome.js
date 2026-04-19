const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { createEmbed, THEME } = require('../../utils/embeds');
const { getWelcome, setWelcome } = require('../../database/db');

module.exports = {
    name: 'welcome',
    description: 'Set up welcome and leave messages',
    category: 'utility',
    permissions: ['Administrator'],
    data: new SlashCommandBuilder()
        .setName('welcome')
        .setDescription('Set up welcome and leave messages')
        .addSubcommand(sc => sc.setName('set').setDescription('Initial setup: Set channels and auto-role')
            .addChannelOption(o => o.setName('channel').setDescription('Welcome channel').addChannelTypes(ChannelType.GuildText).setRequired(true))
            .addRoleOption(o => o.setName('role').setDescription('Auto-role for new members').setRequired(true))
            .addChannelOption(o => o.setName('leave_channel').setDescription('Channel for leave messages').addChannelTypes(ChannelType.GuildText).setRequired(false)))
        .addSubcommand(sc => sc.setName('message').setDescription('Set custom welcome message')
            .addStringOption(o => o.setName('text').setDescription('Use {user}, {server}, {count}').setRequired(true)))
        .addSubcommand(sc => sc.setName('leavemessage').setDescription('Set custom leave message')
            .addStringOption(o => o.setName('text').setDescription('Use {user}, {server}, {count}').setRequired(true)))
        .addSubcommand(sc => sc.setName('off').setDescription('Disable welcome system'))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(message, args, client) { return message.reply({ embeds: [createEmbed({ context: message, description: '⚠️ Use `/welcome` slash command.', color: THEME.error })] }); },
    
    async interact(interaction, client) {
        const sub = interaction.options.getSubcommand();
        const currentData = getWelcome(interaction.guild.id);

        if (sub === 'off') {
            setWelcome(interaction.guild.id, { channel_id: null, role_id: null, message: null, leave_channel_id: null, leave_message: null });
            return interaction.reply({ embeds: [createEmbed({ context: interaction, description: '🚪 Welcome & Leave system disabled.', color: THEME.accent })] });
        }

        if (sub === 'set') {
            const channel = interaction.options.getChannel('channel');
            const role = interaction.options.getRole('role');
            const leaveChannel = interaction.options.getChannel('leave_channel') || channel; 
            
            currentData.channel_id = channel.id;
            currentData.role_id = role.id;
            currentData.leave_channel_id = leaveChannel.id;
            setWelcome(interaction.guild.id, currentData);

            return interaction.reply({ embeds: [createEmbed({ context: interaction, 
                description: `🚪 Gatekeeper configured!\n\n**Welcome Channel:** ${channel}\n**Auto-Role:** ${role}\n**Leave Channel:** ${leaveChannel}`, 
                color: THEME.success 
            })] });
        }

        if (sub === 'message') {
            const text = interaction.options.getString('text');
            currentData.message = text;
            setWelcome(interaction.guild.id, currentData);
            return interaction.reply({ embeds: [createEmbed({ context: interaction, 
                description: `✅ Welcome message updated!\n\`${text.replace(/{user}/g, '@user').replace(/{server}/g, interaction.guild.name).replace(/{count}/g, '123')}\``, 
                color: THEME.success 
            })] });
        }

        if (sub === 'leavemessage') {
            const text = interaction.options.getString('text');
            currentData.leave_message = text;
            setWelcome(interaction.guild.id, currentData);
            return interaction.reply({ embeds: [createEmbed({ context: interaction, 
                description: `✅ Leave message updated!\n\`${text.replace(/{user}/g, '@user').replace(/{server}/g, interaction.guild.name).replace(/{count}/g, '122')}\``, 
                color: THEME.success 
            })] });
        }
    },
};