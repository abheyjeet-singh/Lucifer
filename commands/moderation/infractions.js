const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createEmbed, THEME } = require('../../utils/embeds');
const { getAllWarnings } = require('../../database/db');

module.exports = {
    name: 'infractions',
    description: 'View the grand ledger of sins',
    category: 'moderation',
    usage: 'infractions',
    permissions: ['Administrator'],
    data: new SlashCommandBuilder()
        .setName('infractions')
        .setDescription('View the grand ledger of sins')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(message, args, client) {
        return this.run(client, message.guild, message);
    },

    async interact(interaction, client) {
        return this.run(client, interaction.guild, interaction);
    },

    async run(client, guild, context) {
        const warnings = getAllWarnings(guild.id);

        if (!warnings.length) return context.reply({ embeds: [createEmbed({ description: '✨ This realm has a clean conscience. No infractions recorded.', color: THEME.success })] });

        const fields = warnings.slice(0, 10).map((w, i) => ({
            name: `#${w.id} — <@${w.user_id}>`,
            value: `**Reason:** ${w.reason}\n**By:** <@${w.moderator_id}> • <t:${Math.floor(w.timestamp / 1000)}:R>`,
            inline: false,
        }));

        return context.reply({ embeds: [createEmbed({
            title: '📖 Grand Ledger of Sins',
            description: `**Total Infractions:** ${warnings.length}${warnings.length > 10 ? '\n*Showing latest 10*' : ''}`,
            fields,
            color: THEME.secondary,
        })] });
    },
};
