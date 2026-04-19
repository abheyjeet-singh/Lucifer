const { SlashCommandBuilder, PermissionFlagsBits, AttachmentBuilder } = require('discord.js');
const { createEmbed, THEME } = require('../../utils/embeds');
const { getAllWarnings } = require('../../database/db');
const { buildWarningsCard } = require('../../utils/canvasBuilder');

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

        if (!warnings.length) return context.reply({ embeds: [createEmbed({ context: guild, description: '✨ This realm has a clean conscience.', color: THEME.success })] });

        // We mock a "target" object to reuse the buildWarningsCard function cleanly
        const mockTarget = { user: { username: guild.name, displayAvatarURL: () => guild.iconURL({ extension: 'png', size: 256 }) } };

        try {
            const imageBuffer = await buildWarningsCard(mockTarget, warnings, 'Grand Ledger of Sins');
            const attachment = new AttachmentBuilder(imageBuffer, { name: 'infractions.png' });
            return context.reply({ files: [attachment] });
        } catch (e) {
            console.error('Infractions Canvas Error:', e);
            const fields = warnings.slice(0, 10).map((w) => ({
                name: `#${w.id} — <@${w.user_id}>`,
                value: `**Reason:** ${w.reason}\n**By:** <@${w.moderator_id}> • <t:${Math.floor(w.timestamp / 1000)}:R>`,
                inline: false,
            }));
            return context.reply({ embeds: [createEmbed({ context: guild, title: '📖 Grand Ledger of Sins', fields, color: THEME.secondary })] });
        }
    },
};