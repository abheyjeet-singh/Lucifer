const { SlashCommandBuilder, AuditLogEvent } = require('discord.js');
const { createEmbed, THEME } = require('../../utils/embeds');
const { getAllWarnings } = require('../../database/db');

module.exports = {
    name: 'modactions',
    description: 'View the moderation actions taken by a soul',
    category: 'utility',
    usage: 'modactions [@user]',
    permissions: ['ModerateMembers'],
    data: new SlashCommandBuilder()
        .setName('modactions')
        .setDescription('View the moderation actions taken by a soul')
        .addUserOption(o => o.setName('user').setDescription('The moderator to inspect (Defaults to yourself)')),

    async execute(message, args, client) {
        const target = message.mentions.members.first() || message.member;
        return this.run(client, message.guild, target, message);
    },

    async interact(interaction, client) {
        const target = interaction.options.getMember('user') || interaction.member;
        return this.run(client, interaction.guild, target, interaction);
    },

    async run(client, guild, target, context) {
        await context.reply({ embeds: [createEmbed({ description: '📜 Scrolling through the executioner\'s ledger...', color: THEME.celestial })] });

        // 1. Fetch Warnings issued by this mod from our Database
        const allWarnings = getAllWarnings(guild.id);
        const modWarnings = allWarnings.filter(w => w.moderator_id === target.id);
        const warnCount = modWarnings.length;

        // 2. Fetch Kicks and Bans from Discord Audit Log
        let kickCount = 0;
        let banCount = 0;
        let unbanCount = 0;

        try {
            // Fetch the last 100 audit log entries performed BY this target
            const auditLogs = await guild.fetchAuditLogs({ userId: target.id, limit: 100 });
            
            kickCount = auditLogs.entries.filter(e => e.action === AuditLogEvent.MemberKick).size;
            banCount = auditLogs.entries.filter(e => e.action === AuditLogEvent.MemberBanAdd).size;
            unbanCount = auditLogs.entries.filter(e => e.action === AuditLogEvent.MemberBanRemove).size;
        } catch {
            // Bot might lack View Audit Log permission, gracefully continue
        }

        // 3. Determine Activity Rank
        const totalActions = warnCount + kickCount + banCount;
        let rankEmoji = '💤';
        let rankText = 'Dormant';
        if (totalActions >= 50) { rankEmoji = '👑'; rankText = 'Grand Inquisitor'; }
        else if (totalActions >= 20) { rankEmoji = '🔥'; rankText = 'High Executioner'; }
        else if (totalActions >= 5) { rankEmoji = '⚔️'; rankText = 'Active Enforcer'; }
        else if (totalActions > 0) { rankEmoji = '🗡️'; rankText = 'Novice Punisher'; }

        // 4. Build Recent Actions List
        const recentActions = modWarnings.slice(0, 3).map((w, i) => {
            const user = `<@${w.user_id}>`;
            return `**#${w.id}** • <t:${Math.floor(w.timestamp / 1000)}:R>\n> ⚠️ Warned ${user}\n> *${w.reason}*`;
        }).join('\n\n') || '*No recent warnings issued.*';

        // 5. Create the Embed
        const embed = createEmbed({
            author: { name: `${target.user.tag}'s Execution Ledger`, iconURL: target.user.displayAvatarURL({ size: 128 }) },
            description: `${rankEmoji} **Rank:** ${rankText}\n\nA record of the judgments this soul has passed upon others.`,
            color: totalActions > 0 ? THEME.accent : THEME.dark,
            fields: [
                { 
                    name: '📊 Action Summary', 
                    value: `⚠️ **Warned:** ${warnCount}\n🥾 **Kicked:** ${kickCount}\n⚔️ **Banned:** ${banCount}\n✨ **Unbanned:** ${unbanCount}`, 
                    inline: true 
                },
                {
                    name: '⚖️ Total Judgments',
                    value: `**${totalActions}** actions taken`,
                    inline: true
                },
                { name: '📜 Recent Warnings Issued', value: recentActions, inline: false }
            ],
            thumbnail: target.user.displayAvatarURL({ size: 256 }),
            footer: { text: '🔥 Lucifer Morningstar | Staff Activity Ledger' }
        });

        return context.editReply({ embeds: [embed] });
    },
};
