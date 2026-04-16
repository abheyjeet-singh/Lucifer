const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createEmbed, THEME, modLog } = require('../../utils/embeds');

module.exports = {
    name: 'massban',
    description: 'The Plague — Banish multiple sinners at once',
    category: 'moderation',
    usage: 'massban <userid1> <userid2> <userid3>...',
    permissions: ['BanMembers'],
    data: new SlashCommandBuilder()
        .setName('massban')
        .setDescription('The Plague — Banish multiple sinners at once')
        .addStringOption(o => o.setName('user_ids').setDescription('User IDs separated by spaces or commas').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

    async execute(message, args, client) {
        if (args.length === 0) return message.reply({ embeds: [createEmbed({ description: '⚠️ Provide user IDs to mass ban.', color: THEME.error })] });
        const rawIds = args.join(' ').split(/[\s,]+/);
        return this.run(client, message.guild, message.member, rawIds, message);
    },

    async interact(interaction, client) {
        const rawIds = interaction.options.getString('user_ids').split(/[\s,]+/);
        return this.run(client, interaction.guild, interaction.member, rawIds, interaction);
    },

    async run(client, guild, moderator, rawIds, context) {
        const validIds = rawIds.filter(id => /^\d{17,20}$/.test(id));
        if (validIds.length === 0) return context.reply({ embeds: [createEmbed({ description: '⚠️ No valid user IDs found.', color: THEME.error })] });

        const banned = [];
        const failed = [];

        for (const id of validIds) {
            try {
                await guild.bans.create(id, { reason: `Massban by ${moderator.user.tag}` });
                banned.push(id);
            } catch {
                failed.push(id);
            }
        }

        let description = `🦠 **The Plague has swept the realm.**\n\n✅ **Banished:** ${banned.length} soul(s)\n${banned.map(id => `> <@${id}> (\`${id}\`)`).join('\n')}`;
        if (failed.length > 0) {
            description += `\n\n❌ **Immune/Failed:** ${failed.length} soul(s)\n${failed.map(id => `> \`${id}\``).join('\n')}`;
        }

        modLog(client, guild, createEmbed({
            title: '🦠 Mass Banishment Executed',
            description: `**Moderator:** ${moderator.user.tag}\n**Banished:** ${banned.length}\n**Failed:** ${failed.length}`,
            color: THEME.secondary,
        }));

        return context.reply({ embeds: [createEmbed({ description, color: THEME.accent })] });
    },
};
