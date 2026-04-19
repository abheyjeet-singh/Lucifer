const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createEmbed, THEME } = require('../../utils/embeds');
const { isStickyRolesEnabled, setStickyRolesEnabled, getStickyRolesIgnore, setStickyRolesIgnore, removeStickyRolesConfig } = require('../../database/db');
const { hasPermission } = require('../../utils/permissions');

module.exports = {
    name: 'stickyrole',
    description: 'Manage the Sticky Role system — restore roles when members rejoin',
    category: 'utility',
    usage: 'stickyrole <enable | disable | ignore | ignorelist | show>',
    permissions: ['Administrator'],
    data: new SlashCommandBuilder()
        .setName('stickyrole')
        .setDescription('Manage the Sticky Role system')
        .addSubcommand(sc =>
            sc.setName('enable')
              .setDescription('Enable sticky roles — roles will be restored on rejoin'))
        .addSubcommand(sc =>
            sc.setName('disable')
              .setDescription('Disable sticky roles and clear saved data'))
        .addSubcommand(sc =>
            sc.setName('ignore')
              .setDescription('Add or remove a role from the ignore list')
              .addRoleOption(o =>
                  o.setName('role')
                   .setDescription('The role to add/remove from ignore list')
                   .setRequired(true)))
        .addSubcommand(sc =>
            sc.setName('ignorelist')
              .setDescription('View roles on the ignore list'))
        .addSubcommand(sc =>
            sc.setName('show')
              .setDescription('View current sticky role settings'))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(message, args, client) {
        const sub = args[0]?.toLowerCase();
        if (!sub || sub === 'show') return this.show(client, message.guild, message);
        if (sub === 'enable') return this.enable(client, message.guild, message.member, message);
        if (sub === 'disable') return this.disable(client, message.guild, message.member, message);
        if (sub === 'ignore') {
            const role = message.mentions.roles.first();
            if (!role) return message.reply({ embeds: [createEmbed({ context: message, description: '⚠️ Mention a role to ignore.', color: THEME.error })] });
            return this.toggleIgnore(client, message.guild, message.member, role, message);
        }
        if (sub === 'ignorelist') return this.showIgnore(client, message.guild, message);
        return message.reply({ embeds: [createEmbed({ context: message, description: '⚠️ Unknown subcommand. Use: `enable`, `disable`, `ignore`, `ignorelist`, `show`', color: THEME.error })] });
    },

    async interact(interaction, client) {
        const sub = interaction.options.getSubcommand();
        if (sub === 'enable') return this.enable(client, interaction.guild, interaction.member, interaction);
        if (sub === 'disable') return this.disable(client, interaction.guild, interaction.member, interaction);
        if (sub === 'ignore') return this.toggleIgnore(client, interaction.guild, interaction.member, interaction.options.getRole('role'), interaction);
        if (sub === 'ignorelist') return this.showIgnore(client, interaction.guild, interaction);
        return this.show(client, interaction.guild, interaction);
    },

    async enable(client, guild, member, context) {
        if (!hasPermission(member, 'Administrator')) return context.reply({ embeds: [createEmbed({ context: guild, description: '🚫 Only administrators may configure sticky roles.', color: THEME.error })] });
        if (isStickyRolesEnabled(guild.id)) return context.reply({ embeds: [createEmbed({ context: guild, description: '📌 Sticky roles are already enabled.', color: THEME.dark })] });
        setStickyRolesEnabled(guild.id, true);
        return context.reply({ embeds: [createEmbed({ context: guild, description: '📌 Sticky roles **enabled**. Members who leave will have their roles saved and restored on rejoin.', color: THEME.success })] });
    },

    async disable(client, guild, member, context) {
        if (!hasPermission(member, 'Administrator')) return context.reply({ embeds: [createEmbed({ context: guild, description: '🚫 Only administrators may configure sticky roles.', color: THEME.error })] });
        if (!isStickyRolesEnabled(guild.id)) return context.reply({ embeds: [createEmbed({ context: guild, description: '📌 Sticky roles are already disabled.', color: THEME.dark })] });
        removeStickyRolesConfig(guild.id);
        return context.reply({ embeds: [createEmbed({ context: guild, description: '📌 Sticky roles **disabled**. All saved role data has been cleared.', color: THEME.primary })] });
    },

    async toggleIgnore(client, guild, member, role, context) {
        if (!hasPermission(member, 'Administrator')) return context.reply({ embeds: [createEmbed({ context: guild, description: '🚫 Only administrators may configure sticky roles.', color: THEME.error })] });
        if (role.id === guild.id) return context.reply({ embeds: [createEmbed({ context: guild, description: '⚠️ Cannot ignore the @everyone role — it is always excluded automatically.', color: THEME.error })] });

        const ignored = getStickyRolesIgnore(guild.id);
        if (ignored.includes(role.id)) {
            const updated = ignored.filter(id => id !== role.id);
            setStickyRolesIgnore(guild.id, updated);
            return context.reply({ embeds: [createEmbed({ context: guild, description: `📌 ${role} removed from the ignore list. It will now be saved and restored.`, color: THEME.success })] });
        } else {
            ignored.push(role.id);
            setStickyRolesIgnore(guild.id, ignored);
            return context.reply({ embeds: [createEmbed({ context: guild, description: `📌 ${role} added to the ignore list. It will NOT be saved or restored.`, color: THEME.celestial })] });
        }
    },

    async showIgnore(client, guild, context) {
        const ignored = getStickyRolesIgnore(guild.id);
        if (ignored.length === 0) return context.reply({ embeds: [createEmbed({ context: guild, description: '📌 No roles are on the ignore list. All roles (except @everyone) will be saved.', color: THEME.dark })] });
        const roleList = ignored.map(id => {
            const role = guild.roles.cache.get(id);
            return role ? role.toString() : `<deleted-role:${id}>`;
        }).join('\n');
        return context.reply({ embeds: [createEmbed({ context: guild, title: '📌 Sticky Roles — Ignore List', description: roleList, color: THEME.celestial })] });
    },

    async show(client, guild, context) {
        const enabled = isStickyRolesEnabled(guild.id);
        const ignored = getStickyRolesIgnore(guild.id);
        const status = enabled ? '🟢 **Enabled**' : '🔴 **Disabled**';
        const ignoreStr = ignored.length > 0
            ? ignored.map(id => { const r = guild.roles.cache.get(id); return r ? r.toString() : `<deleted:${id}>`; }).join(', ')
            : 'None';
        return context.reply({ embeds: [createEmbed({
            title: '📌 Sticky Roles Settings',
            description: `**Status:** ${status}\n**Ignored Roles:** ${ignoreStr}`,
            color: enabled ? THEME.success : THEME.dark,
        })] });
    },
};