const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createEmbed, THEME, modLog } = require('../../utils/embeds');
const { clearWarning, getWarnings, clearUserWarnings } = require('../../database/db');

module.exports = {
    name: 'clearwarn',
    description: 'Pardon a soul\'s sins',
    category: 'moderation',
    usage: 'clearwarn <warning_id | @user | all>',
    permissions: ['Administrator'],
    data: new SlashCommandBuilder()
        .setName('clearwarn')
        .setDescription("Pardon a soul's sins")
        .addSubcommand(sc => sc.setName('id').setDescription('Remove a specific warning').addIntegerOption(o => o.setName('warning_id').setDescription('The warning ID').setRequired(true)))
        .addSubcommand(sc => sc.setName('user').setDescription('Clear all warnings for a user').addUserOption(o => o.setName('user').setDescription('The soul to pardon').setRequired(true)))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(message, args, client) {
        const sub = args[0];
        if (!sub) return message.reply({ embeds: [createEmbed({ context: message, description: '⚠️ Use: `clearwarn <id> | @user`', color: THEME.error })] });

        if (sub.toLowerCase() === 'all') {
            const target = message.mentions.members.first() || await message.guild.members.fetch(args[1]).catch(() => null);
            if (!target) return message.reply({ embeds: [createEmbed({ context: message, description: '⚠️ Mention a user.', color: THEME.error })] });
            clearUserWarnings(message.guild.id, target.id);
            return message.reply({ embeds: [createEmbed({ context: message, description: `✨ All sins of **${target.user.tag}** have been pardoned.`, color: THEME.success })] });
        }

        const id = parseInt(sub);
        if (isNaN(id)) {
            const target = message.mentions.members.first();
            if (!target) return message.reply({ embeds: [createEmbed({ context: message, description: '⚠️ Provide a warning ID or mention a user.', color: THEME.error })] });
            clearUserWarnings(message.guild.id, target.id);
            return message.reply({ embeds: [createEmbed({ context: message, description: `✨ All sins of **${target.user.tag}** have been pardoned.`, color: THEME.success })] });
        }

        const removed = clearWarning(id);
        if (!removed) return message.reply({ embeds: [createEmbed({ context: message, description: '⚠️ No warning found with that ID.', color: THEME.error })] });
        return message.reply({ embeds: [createEmbed({ context: message, description: `✨ Warning #${id} has been pardoned.`, color: THEME.success })] });
    },

    async interact(interaction, client) {
        const sub = interaction.options.getSubcommand();

        if (sub === 'id') {
            const id = interaction.options.getInteger('warning_id');
            const removed = clearWarning(id);
            if (!removed) return interaction.reply({ embeds: [createEmbed({ context: interaction, description: '⚠️ No warning found with that ID.', color: THEME.error })], ephemeral: true });
            return interaction.reply({ embeds: [createEmbed({ context: interaction, description: `✨ Warning #${id} has been pardoned.`, color: THEME.success })] });
        }

        if (sub === 'user') {
            const user = interaction.options.getUser('user');
            clearUserWarnings(interaction.guild.id, user.id);
            return interaction.reply({ embeds: [createEmbed({ context: interaction, description: `✨ All sins of **${user.tag}** have been pardoned.`, color: THEME.success })] });
        }
    },
};
