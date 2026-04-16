const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createEmbed, THEME } = require('../../utils/embeds');
const { getPrefix, setPrefix } = require('../../database/db');

module.exports = {
    name: 'prefix',
    description: 'View or change my summoning word',
    category: 'utility',
    usage: 'prefix [new_prefix]',
    permissions: [],
    data: new SlashCommandBuilder()
        .setName('prefix')
        .setDescription('View or change my summoning word')
        .addSubcommand(sc =>
            sc.setName('show')
              .setDescription('View the current prefix'))
        .addSubcommand(sc =>
            sc.setName('set')
              .setDescription('Change the prefix')
              .addStringOption(o =>
                  o.setName('new_prefix')
                   .setDescription('The new prefix (1-5 chars)')
                   .setRequired(true)
                   .setMinLength(1)
                   .setMaxLength(5))),

    async execute(message, args, client) {
        if (!args.length) return this.show(client, message.guild, message);
        const newPrefix = args[0];
        return this.set(client, message.guild, message.member, newPrefix, message);
    },

    async interact(interaction, client) {
        const sub = interaction.options.getSubcommand();
        if (sub === 'show') return this.show(client, interaction.guild, interaction);
        const newPrefix = interaction.options.getString('new_prefix');
        return this.set(client, interaction.guild, interaction.member, newPrefix, interaction);
    },

    async show(client, guild, context) {
        const prefix = getPrefix(guild.id);
        return context.reply({ embeds: [createEmbed({
            description: `🏛️ My current summoning word is: \`${prefix}\`\n\nUse \`${prefix}prefix <new>\` or \`/prefix set\` to change it.`,
            color: THEME.celestial,
        })] });
    },

    async set(client, guild, member, newPrefix, context) {
        const { hasPermission } = require('../../utils/permissions');
        if (!hasPermission(member, 'Administrator')) {
            return context.reply({ embeds: [createEmbed({ description: '🚫 Only realm administrators may alter my summoning word.', color: THEME.error })], ephemeral: true });
        }

        if (newPrefix.includes(' ')) return context.reply({ embeds: [createEmbed({ description: '⚠️ The prefix cannot contain spaces.', color: THEME.error })] });

        setPrefix(guild.id, newPrefix);

        return context.reply({ embeds: [createEmbed({
            description: `🏛️ My summoning word is now: \`${newPrefix}\``,
            color: THEME.success,
        })] });
    },
};
