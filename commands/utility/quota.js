const { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, MessageFlags } = require('discord.js');
const { createEmbed, THEME } = require('../../utils/embeds');
const { getAiUsage, AI_DAILY_LIMIT } = require('../../database/db');

module.exports = {
    name: 'quota',
    description: 'Check or reload the AI wisdom quota',
    category: 'utility',
    usage: 'quota [reload]',
    permissions: ['Administrator'],
    data: new SlashCommandBuilder()
        .setName('quota')
        .setDescription('Check or reload the AI wisdom quota')
        .addSubcommand(sc => sc.setName('show').setDescription('View the remaining AI quota'))
        .addSubcommand(sc => sc.setName('reload').setDescription('Reset the quota to zero (Requires password)'))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(message, args, client) {
        const sub = args[0]?.toLowerCase();
        if (sub === 'reload') {
            return this.showReloadButton(client, message.guild, message.member, message);
        }
        return this.show(client, message.guild, message);
    },

    async interact(interaction, client) {
        const sub = interaction.options.getSubcommand();
        if (sub === 'show') return this.show(client, interaction.guild, interaction);
        if (sub === 'reload') return this.showReloadButton(client, interaction.guild, interaction.member, interaction);
    },

    async show(client, guild, context) {
        const currentUsage = getAiUsage(guild.id);
        const remaining = AI_DAILY_LIMIT - currentUsage;
        return context.reply({ embeds: [createEmbed({
            title: '🔮 AI Wisdom Quota',
            description: `✨ **${remaining}** / **${AI_DAILY_LIMIT}** requests remaining today.`,
            color: THEME.celestial,
        })] });
    },

    async showReloadButton(client, guild, member, context) {
        // Check if user is Admin (Double check for prefix command)
        if (!member.permissions.has(PermissionFlagsBits.Administrator)) {
            return context.reply({ embeds: [createEmbed({ description: '🚫 Only realm administrators may reset the cosmic limits.', color: THEME.error })] });
        }

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('open_quota_modal')
                .setLabel('🔑 Whisper the Incantation')
                .setStyle(ButtonStyle.Danger)
        );

        return context.reply({ 
            content: '⚠️ **Eternal Reset Initiated**\nTo refill the cosmic limits, you must provide the forbidden incantation.',
            components: [row],
            flags: MessageFlags.Ephemeral // Only the admin can see this prompt
        });
    },

    // This function will be called from our event handler when the modal is submitted
    async handleModalSubmit(interaction, client) {
        const password = interaction.fields.getTextInputValue('quota_password_input');
        
        if (password === 'momi') {
            const { resetAiUsage } = require('../../database/db');
            resetAiUsage(interaction.guild.id);
            return interaction.reply({ embeds: [createEmbed({
                description: '✨ **The cosmic limits have been replenished.** The AI quota is now back to full capacity.',
                color: THEME.success
            })], flags: MessageFlags.Ephemeral });
        } else {
            return interaction.reply({ embeds: [createEmbed({
                description: '🚫 **Wrong incantation.** The demons reject your request. The quota remains unchanged.',
                color: THEME.error
            })], flags: MessageFlags.Ephemeral });
        }
    }
};

// The Modal structure (built here so it can be called by the event handler)
module.exports.quotaModal = new ModalBuilder()
    .setCustomId('quota_modal')
    .setTitle('Forbidden Incantation')
    .addComponents(
        new ActionRowBuilder().addComponents(
            new TextInputBuilder()
                .setCustomId('quota_password_input')
                .setLabel('Enter the Secret Password')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setPlaceholder('The magic word...')
        )
    );
