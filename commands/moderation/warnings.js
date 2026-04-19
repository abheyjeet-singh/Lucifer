const { SlashCommandBuilder, PermissionFlagsBits, AttachmentBuilder } = require('discord.js');
const { createEmbed, THEME } = require('../../utils/embeds');
const { getWarnings } = require('../../database/db');
const { buildWarningsCard } = require('../../utils/canvasBuilder');

module.exports = {
    name: 'warnings',
    description: 'View a soul\'s recorded sins',
    category: 'moderation',
    usage: 'warnings @user',
    permissions: ['ModerateMembers'],
    data: new SlashCommandBuilder()
        .setName('warnings')
        .setDescription("View a soul's recorded sins")
        .addUserOption(o => o.setName('user').setDescription('The soul to inspect').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(message, args, client) {
        const target = message.mentions.members.first() || await message.guild.members.fetch(args[0]).catch(() => null);
        if (!target) return message.reply({ embeds: [createEmbed({ context: message, description: '⚠️ Mention a valid soul.', color: THEME.error })] });
        return this.run(client, message.guild, target, message);
    },

    async interact(interaction, client) {
        const user = interaction.options.getUser('user');
        const target = await interaction.guild.members.fetch(user.id).catch(() => null);
        if (!target) return interaction.reply({ embeds: [createEmbed({ context: interaction, description: '⚠️ Invalid soul.', color: THEME.error })], flags: 64 });
        return this.run(client, interaction.guild, target, interaction);
    },

    async run(client, guild, target, context) {
        const warnings = getWarnings(guild.id, target.id);

        if (!warnings.length) return context.reply({ embeds: [createEmbed({ context: guild, description: `✨ **${target.user.tag}** has a clean soul.`, color: THEME.success })] });

        try {
            const imageBuffer = await buildWarningsCard(target, warnings, `Sins of ${target.user.username}`);
            const attachment = new AttachmentBuilder(imageBuffer, { name: 'warnings.png' });
            return context.reply({ files: [attachment] });
        } catch (e) {
            console.error('Warnings Canvas Error:', e);
            const fields = warnings.slice(0, 10).map((w) => ({
                name: `#${w.id} — <t:${Math.floor(w.timestamp / 1000)}:R>`,
                value: `**Reason:** ${w.reason}\n**Moderator:** <@${w.moderator_id}>`,
                inline: false,
            }));
            return context.reply({ embeds: [createEmbed({ context: guild, title: `📜 Sins of ${target.user.tag}`, fields, color: THEME.accent })] });
        }
    },
};