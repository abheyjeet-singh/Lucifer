const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createEmbed, THEME } = require('../../utils/embeds');
const { getBoosterRoles, addBoosterRole, removeBoosterRole, clearBoosterRoles } = require('../../database/db');
const { hasPermission } = require('../../utils/permissions');

module.exports = {
    name: 'boosterrole',
    description: 'Manage booster roles for bonus giveaway entries',
    category: 'utility',
    usage: 'boosterrole <add|remove|list|clear>',
    permissions: ['Administrator'],
    data: new SlashCommandBuilder()
        .setName('boosterrole')
        .setDescription('Manage booster roles for bonus giveaway entries')
        .addSubcommand(sc =>
            sc.setName('add')
              .setDescription('Add a booster role with bonus entries')
              .addRoleOption(o =>
                  o.setName('role')
                   .setDescription('The booster role')
                   .setRequired(true))
              .addIntegerOption(o =>
                  o.setName('bonus_entries')
                   .setDescription('Extra entries boosters get (e.g., 3 = 4x chance)')
                   .setRequired(true)
                   .setMinValue(1)
                   .setMaxValue(10)))
        .addSubcommand(sc =>
            sc.setName('remove')
              .setDescription('Remove a booster role')
              .addRoleOption(o =>
                  o.setName('role')
                   .setDescription('The booster role to remove')
                   .setRequired(true)))
        .addSubcommand(sc =>
            sc.setName('list')
              .setDescription('View all booster roles'))
        .addSubcommand(sc =>
            sc.setName('clear')
              .setDescription('Remove all booster roles'))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(message, args, client) {
        const sub = args[0]?.toLowerCase();
        if (sub === 'add') {
            const role = message.mentions.roles.first();
            const bonus = parseInt(args[2]);
            if (!role || isNaN(bonus) || bonus < 1) return message.reply({ embeds: [createEmbed({ context: message, description: '⚠️ Usage: `l!boosterrole add @role <1-10>`', color: THEME.error })] });
            return this.addRole(client, message.guild, message.member, role, bonus, message);
        }
        if (sub === 'remove') {
            const role = message.mentions.roles.first();
            if (!role) return message.reply({ embeds: [createEmbed({ context: message, description: '⚠️ Usage: `l!boosterrole remove @role`', color: THEME.error })] });
            return this.removeRole(client, message.guild, message.member, role, message);
        }
        if (sub === 'clear') return this.clearAll(client, message.guild, message.member, message);
        if (sub === 'list' || !sub) return this.showList(client, message.guild, message);
        return message.reply({ embeds: [createEmbed({ context: message, description: '⚠️ Use: `add`, `remove`, `list`, `clear`', color: THEME.error })] });
    },

    async interact(interaction, client) {
        const sub = interaction.options.getSubcommand();
        if (sub === 'add') {
            const role = interaction.options.getRole('role');
            const bonus = interaction.options.getInteger('bonus_entries');
            return this.addRole(client, interaction.guild, interaction.member, role, bonus, interaction);
        }
        if (sub === 'remove') {
            const role = interaction.options.getRole('role');
            return this.removeRole(client, interaction.guild, interaction.member, role, interaction);
        }
        if (sub === 'clear') return this.clearAll(client, interaction.guild, interaction.member, interaction);
        return this.showList(client, interaction.guild, interaction);
    },

    async addRole(client, guild, member, role, bonus, context) {
        if (!hasPermission(member, 'Administrator')) return context.reply({ embeds: [createEmbed({ context: guild, description: '🚫 Admin only.', color: THEME.error })] });
        if (role.id === guild.id) return context.reply({ embeds: [createEmbed({ context: guild, description: '⚠️ Cannot use @everyone.', color: THEME.error })] });

        const result = addBoosterRole(guild.id, role.id, bonus);
        if (result === false) return context.reply({ embeds: [createEmbed({ context: guild, description: `⚠️ ${role} is already a booster role. Remove it first to change the bonus.`, color: THEME.error })] });
        if (result === 'max') return context.reply({ embeds: [createEmbed({ context: guild, description: '⚠️ Maximum of 10 booster roles reached. Remove one first.', color: THEME.error })] });

        return context.reply({ embeds: [createEmbed({
            title: '🚀 Booster Role Added',
            description: `**Role:** ${role}\n**Bonus Entries:** +${bonus} (total ${bonus + 1}x chance per giveaway)\n\nMembers with this role will have ${bonus + 1}x the chance to win!`,
            color: THEME.success
        })] });
    },

    async removeRole(client, guild, member, role, context) {
        if (!hasPermission(member, 'Administrator')) return context.reply({ embeds: [createEmbed({ context: guild, description: '🚫 Admin only.', color: THEME.error })] });

        const current = getBoosterRoles(guild.id);
        const exists = current.find(b => b.role_id === role.id);
        if (!exists) return context.reply({ embeds: [createEmbed({ context: guild, description: `⚠️ ${role} is not a booster role.`, color: THEME.error })] });

        removeBoosterRole(guild.id, role.id);
        return context.reply({ embeds: [createEmbed({ context: guild, description: `🚀 Removed ${role} from booster roles. They now have normal chances.`, color: THEME.primary })] });
    },

    async clearAll(client, guild, member, context) {
        if (!hasPermission(member, 'Administrator')) return context.reply({ embeds: [createEmbed({ context: guild, description: '🚫 Admin only.', color: THEME.error })] });

        const current = getBoosterRoles(guild.id);
        if (current.length === 0) return context.reply({ embeds: [createEmbed({ context: guild, description: '⚠️ No booster roles to clear.', color: THEME.dark })] });

        clearBoosterRoles(guild.id);
        return context.reply({ embeds: [createEmbed({ context: guild, description: `🚀 Cleared all **${current.length}** booster role(s). Everyone now has equal chances.`, color: THEME.success })] });
    },

    async showList(client, guild, context) {
        const list = getBoosterRoles(guild.id);
        if (list.length === 0) return context.reply({ embeds: [createEmbed({ context: guild, description: '🚀 No booster roles set. Use `/boosterrole add` to add one.', color: THEME.dark })] });

        const items = list.map(b => {
            const role = guild.roles.cache.get(b.role_id);
            const name = role ? role.toString() : `<deleted-role>`;
            return `${name} → +${b.bonus_entries} entries (${b.bonus_entries + 1}x chance)`;
        }).join('\n');

        return context.reply({ embeds: [createEmbed({
            title: '🚀 Booster Roles',
            description: items,
            color: THEME.celestial,
            footer: { text: `${list.length}/10 booster roles` }
        })] });
    },
};