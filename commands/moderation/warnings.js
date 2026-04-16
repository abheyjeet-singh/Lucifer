const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createEmbed, THEME } = require('../../utils/embeds');
const { getWarnings } = require('../../database/db');

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
        if (!target) return message.reply({ embeds: [createEmbed({ description: '⚠️ Mention a valid soul.', color: THEME.error })] });
        return this.run(client, message.guild, target, message);
    },

    async interact(interaction, client) {
        const user = interaction.options.getUser('user');
        return this.run(client, interaction.guild, { id: user.id, user }, interaction);
    },

    async run(client, guild, target, context) {
        const warnings = getWarnings(guild.id, target.id);

        if (!warnings.length) return context.reply({ embeds: [createEmbed({ description: `✨ **${target.user.tag}** has a clean soul. No sins recorded.`, color: THEME.success })] });

        const fields = warnings.slice(0, 10).map((w, i) => ({
            name: `#${w.id} — <t:${Math.floor(w.timestamp / 1000)}:R>`,
            value: `**Reason:** ${w.reason}\n**Moderator:** <@${w.moderator_id}>`,
            inline: false,
        }));

        return context.reply({ embeds: [createEmbed({
            title: `📜 Sins of ${target.user.tag}`,
            description: `**Total Warnings:** ${warnings.length}${warnings.length > 10 ? '\n*Showing latest 10*' : ''}`,
            fields,
            color: THEME.accent,
            thumbnail: target.user.displayAvatarURL({ size: 256 }),
        })] });
    },
};
