const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createEmbed, THEME } = require('../../utils/embeds');
const { getAutoResponders, addAutoResponder, removeAutoResponder, clearAutoResponders } = require('../../database/db');
const { hasPermission } = require('../../utils/permissions');

module.exports = {
    name: 'autoresponder',
    description: 'Manage auto responses for trigger words',
    category: 'utility',
    usage: 'autoresponder <add|remove|list|clear>',
    permissions: ['ManageMessages'],
    data: new SlashCommandBuilder()
        .setName('autoresponder')
        .setDescription('Manage auto responses for trigger words')
        .addSubcommand(sc =>
            sc.setName('add')
              .setDescription('Add an auto response')
              .addStringOption(o =>
                  o.setName('trigger')
                   .setDescription('The word/phrase that triggers the response')
                   .setRequired(true))
              .addStringOption(o =>
                  o.setName('response')
                   .setDescription('What the bot should reply')
                   .setRequired(true))
              .addStringOption(o =>
                  o.setName('match')
                   .setDescription('How to match the trigger')
                   .setRequired(false)
                   .addChoices(
                       { name: 'Contains (anywhere in message)', value: 'contains' },
                       { name: 'Exact (whole message must match)', value: 'exact' },
                       { name: 'Starts With (message starts with trigger)', value: 'startswith' }
                   )))
        .addSubcommand(sc =>
            sc.setName('remove')
              .setDescription('Remove an auto response by its ID')
              .addIntegerOption(o =>
                  o.setName('id')
                   .setDescription('The ID of the auto responder to remove')
                   .setRequired(true)))
        .addSubcommand(sc =>
            sc.setName('list')
              .setDescription('View all auto responses'))
        .addSubcommand(sc =>
            sc.setName('clear')
              .setDescription('Remove all auto responses'))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    async execute(message, args, client) {
        const sub = args[0]?.toLowerCase();
        if (sub === 'add') {
            const trigger = args[1];
            const response = args[2];
            const matchType = args[3]?.toLowerCase() || 'contains';
            if (!trigger || !response) return message.reply({ embeds: [createEmbed({ description: '⚠️ Usage: `l!autoresponder add <trigger> <response> [contains|exact|startswith]`', color: THEME.error })] });
            if (!['contains', 'exact', 'startswith'].includes(matchType)) return message.reply({ embeds: [createEmbed({ description: '⚠️ Match type must be: `contains`, `exact`, or `startswith`', color: THEME.error })] });
            return this.addResponse(client, message.guild, message.member, trigger, response, matchType, message);
        }
        if (sub === 'remove') {
            const id = parseInt(args[1]);
            if (isNaN(id)) return message.reply({ embeds: [createEmbed({ description: '⚠️ Provide a valid ID. Usage: `l!autoresponder remove <id>`', color: THEME.error })] });
            return this.removeResponse(client, message.guild, message.member, id, message);
        }
        if (sub === 'clear') return this.clearAll(client, message.guild, message.member, message);
        if (sub === 'list' || !sub) return this.showList(client, message.guild, message);
        return message.reply({ embeds: [createEmbed({ description: '⚠️ Unknown subcommand. Use: `add`, `remove`, `list`, `clear`', color: THEME.error })] });
    },

    async interact(interaction, client) {
        const sub = interaction.options.getSubcommand();
        if (sub === 'add') {
            const trigger = interaction.options.getString('trigger');
            const response = interaction.options.getString('response');
            const matchType = interaction.options.getString('match') || 'contains';
            return this.addResponse(client, interaction.guild, interaction.member, trigger, response, matchType, interaction);
        }
        if (sub === 'remove') {
            const id = interaction.options.getInteger('id');
            return this.removeResponse(client, interaction.guild, interaction.member, id, interaction);
        }
        if (sub === 'clear') return this.clearAll(client, interaction.guild, interaction.member, interaction);
        return this.showList(client, interaction.guild, interaction);
    },

    async addResponse(client, guild, member, trigger, response, matchType, context) {
        if (!hasPermission(member, 'ManageMessages')) return context.reply({ embeds: [createEmbed({ description: '🚫 You need **Manage Messages** permission.', color: THEME.error })] });

        const current = getAutoResponders(guild.id);
        if (current.length >= 25) return context.reply({ embeds: [createEmbed({ description: '⚠️ Maximum of 25 auto responders reached. Remove some first.', color: THEME.error })] });

        const id = addAutoResponder(guild.id, trigger, response, matchType);
        const matchLabel = { contains: 'Contains', exact: 'Exact Match', startswith: 'Starts With' }[matchType];

        return context.reply({ embeds: [createEmbed({
            title: '✅ Auto Responder Added',
            description: `**ID:** ${id}\n**Trigger:** \`${trigger}\`\n**Response:** ${response}\n**Match:** ${matchLabel}`,
            color: THEME.success
        })] });
    },

    async removeResponse(client, guild, member, id, context) {
        if (!hasPermission(member, 'ManageMessages')) return context.reply({ embeds: [createEmbed({ description: '🚫 You need **Manage Messages** permission.', color: THEME.error })] });

        const current = getAutoResponders(guild.id);
        const exists = current.find(a => a.id === id);
        if (!exists) return context.reply({ embeds: [createEmbed({ description: '⚠️ No auto responder found with that ID.', color: THEME.error })] });

        removeAutoResponder(guild.id, id);
        return context.reply({ embeds: [createEmbed({ description: `✅ Removed auto responder **#${id}** (Trigger: \`${exists.trigger}\`)`, color: THEME.success })] });
    },

    async clearAll(client, guild, member, context) {
        if (!hasPermission(member, 'ManageMessages')) return context.reply({ embeds: [createEmbed({ description: '🚫 You need **Manage Messages** permission.', color: THEME.error })] });

        const current = getAutoResponders(guild.id);
        if (current.length === 0) return context.reply({ embeds: [createEmbed({ description: '⚠️ No auto responders to clear.', color: THEME.dark })] });

        clearAutoResponders(guild.id);
        return context.reply({ embeds: [createEmbed({ description: `✅ Cleared all **${current.length}** auto responder(s).`, color: THEME.success })] });
    },

    async showList(client, guild, context) {
        const list = getAutoResponders(guild.id);
        if (list.length === 0) return context.reply({ embeds: [createEmbed({ description: '📜 No auto responders set. Use `/autoresponder add` to create one.', color: THEME.dark })] });

        const matchLabel = { contains: 'Contains', exact: 'Exact', startswith: 'Starts' };
        const items = list.map(a => {
            const ml = matchLabel[a.match_type] || a.match_type;
            return `**#${a.id}** | \`${a.trigger}\` → ${a.response.length > 50 ? a.response.substring(0, 50) + '...' : a.response} [${ml}]`;
        }).join('\n');

        return context.reply({ embeds: [createEmbed({
            title: '📜 Auto Responders',
            description: items,
            color: THEME.celestial,
            footer: { text: `${list.length}/25 auto responders` }
        })] });
    },
};