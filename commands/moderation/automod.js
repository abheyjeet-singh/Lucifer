const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createEmbed, THEME } = require('../../utils/embeds');
const { getAutomod, setAutomod } = require('../../database/db');

module.exports = {
    name: 'automod',
    description: 'Configure the Anti-Sin system',
    category: 'moderation',
    usage: 'automod <feature> <on/off>',
    permissions: ['Administrator'],
    data: new SlashCommandBuilder()
        .setName('automod')
        .setDescription('Configure the Anti-Sin system')
        .addSubcommand(sc => sc.setName('show').setDescription('View current Anti-Sin settings'))
        .addSubcommand(sc => sc.setName('toggle').setDescription('Enable or disable Anti-Sin globally').addBooleanOption(o => o.setName('enabled').setDescription('Enable or disable').setRequired(true)))
        .addSubcommand(sc => sc.setName('antilink').setDescription('Block Discord invites and URLs').addBooleanOption(o => o.setName('enabled').setDescription('Enable or disable').setRequired(true)))
        .addSubcommand(sc => sc.setName('antispam').setDescription('Mute users who spam').addBooleanOption(o => o.setName('enabled').setDescription('Enable or disable').setRequired(true)))
        .addSubcommand(sc => sc.setName('antimassmention').setDescription('Block mass pings').addBooleanOption(o => o.setName('enabled').setDescription('Enable or disable').setRequired(true)))
        .addSubcommand(sc => sc.setName('badwords').setDescription('Add or remove bad words').addStringOption(o => o.setName('action').setDescription('add or remove').setRequired(true).addChoices({name: 'Add', value: 'add'}, {name: 'Remove', value: 'remove'}, {name: 'List', value: 'list'}, {name: 'Clear', value: 'clear'})).addStringOption(o => o.setName('word').setDescription('The word (Not needed for list/clear)')))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(message, args, client) {
        const sub = args[0]?.toLowerCase();
        if (sub === 'show' || !sub) return this.show(client, message.guild, message);
        return message.reply({ embeds: [createEmbed({ description: '⚠️ Please use Slash Command for `/automod` configuration.', color: THEME.error })] });
    },

    async interact(interaction, client) {
        const sub = interaction.options.getSubcommand();
        const automod = getAutomod(interaction.guild.id);

        if (sub === 'show') {
            return interaction.reply({ embeds: [createEmbed({
                title: '🛡️ Anti-Sin System',
                description: `**Global:** ${automod.enabled ? '✅ Enabled' : '❌ Disabled'}\n**Anti-Link:** ${automod.anti_link ? '✅' : '❌'}\n**Anti-Spam:** ${automod.anti_spam ? '✅' : '❌'}\n**Anti-MassMention:** ${automod.anti_massmention ? '✅' : '❌'}\n**Bad Words:** ${automod.anti_badwords ? '✅' : '❌'} (${automod.badwords.length} words)`,
                color: automod.enabled ? THEME.success : THEME.error
            })] });
        }

        if (sub === 'toggle') { automod.enabled = interaction.options.getBoolean('enabled'); }
        else if (sub === 'antilink') { automod.anti_link = interaction.options.getBoolean('enabled'); }
        else if (sub === 'antispam') { automod.anti_spam = interaction.options.getBoolean('enabled'); }
        else if (sub === 'antimassmention') { automod.anti_massmention = interaction.options.getBoolean('enabled'); }
        else if (sub === 'badwords') {
            const action = interaction.options.getString('action');
            const word = interaction.options.getString('word')?.toLowerCase();
            if (action === 'add' && word) { automod.anti_badwords = true; if (!automod.badwords.includes(word)) automod.badwords.push(word); }
            else if (action === 'remove' && word) { automod.badwords = automod.badwords.filter(w => w !== word); }
            else if (action === 'clear') { automod.badwords = []; automod.anti_badwords = false; }
            else if (action === 'list') { return interaction.reply({ embeds: [createEmbed({ description: `🛡️ Bad Words: ${automod.badwords.map(w => `\`${w}\``).join(', ') || 'None'}` })], ephemeral: true }); }
        }

        setAutomod(interaction.guild.id, automod);
        return interaction.reply({ embeds: [createEmbed({ description: `🛡️ Anti-Sin settings updated.`, color: THEME.success })] });
    },
};
