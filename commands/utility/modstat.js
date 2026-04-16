const { SlashCommandBuilder, AuditLogEvent } = require('discord.js');
const { createEmbed, THEME } = require('../../utils/embeds');
const { getWarnings, isHardbanned, getWarningCount } = require('../../database/db');

module.exports = {
    name: 'modstat',
    description: 'View the judgment record of a soul',
    category: 'utility',
    usage: 'modstat [@user]',
    permissions: ['ModerateMembers'],
    data: new SlashCommandBuilder()
        .setName('modstat')
        .setDescription('View the judgment record of a soul')
        .addUserOption(o => o.setName('user').setDescription('The soul to inspect').setRequired(true)),

    async execute(message, args, client) {
        const target = message.mentions.members.first() || message.member;
        return this.run(client, message.guild, target, message);
    },

    async interact(interaction, client) {
        const target = interaction.options.getMember('user');
        return this.run(client, interaction.guild, target, interaction);
    },

    async run(client, guild, target, context) {
        await context.reply({ embeds: [createEmbed({ description: '📜 Scrolling through the ancient records...', color: THEME.celestial })] });

        // 1. Fetch Data from our Database
        const warnings = getWarnings(guild.id, target.id);
        const warningCount = warnings.length;
        const hardbanned = isHardbanned(guild.id, target.id);
        const isMuted = target.isCommunicationDisabled();

        // 2. Fetch Data from Discord Audit Log
        let kickCount = 0;
        let banCount = 0;
        try {
            const auditLogs = await guild.fetchAuditLogs({ limit: 50 });
            kickCount = auditLogs.entries.filter(e => e.targetId === target.id && e.action === AuditLogEvent.MemberKick).size;
            banCount = auditLogs.entries.filter(e => e.targetId === target.id && e.action === AuditLogEvent.MemberBanAdd).size;
        } catch {
            // Bot lacks View Audit Log permission, gracefully skip
        }

        // 3. Determine Status Emojis
        let statusEmoji = '✨';
        let statusText = 'Clean Soul';
        if (hardbanned) { statusEmoji = '🔥'; statusText = 'Eternally Damned'; }
        else if (banCount > 0) { statusEmoji = '⚔️'; statusText = 'Banished'; }
        else if (isMuted) { statusEmoji = '🔇'; statusText = 'Silenced'; }
        else if (warningCount >= 3) { statusEmoji = '⚠️'; statusText = 'High Risk'; }
        else if (warningCount > 0) { statusEmoji = '🟡'; statusText = 'Minor Sinner'; }

        // 4. Build Recent Warnings List
        const recentWarnings = warnings.slice(0, 3).map((w, i) => {
            const mod = `<@${w.moderator_id}>`;
            return `**#${w.id}** • <t:${Math.floor(w.timestamp / 1000)}:R>\n> *${w.reason}*\n> 🗡️ By: ${mod}`;
        }).join('\n\n') || '*No recent warnings.*';

        // 5. Create the Embed
        const embed = createEmbed({
            author: { name: `${target.user.tag}'s Judgment Record`, iconURL: target.user.displayAvatarURL({ size: 128 }) },
            description: `${statusEmoji} **Status:** ${statusText}\n\nHere lies the documented history of this soul's misdeeds.`,
            color: hardbanned ? THEME.secondary : (warningCount > 0 ? THEME.accent : THEME.success),
            fields: [
                { 
                    name: '📊 Infraction Summary', 
                    value: `🟡 **Warnings:** ${warningCount}\n🥾 **Kicks:** ${kickCount}\n⚔️ **Bans:** ${banCount}`, 
                    inline: true 
                },
                {
                    name: '🛡️ Current State',
                    value: `🔥 **Hardbanned:** ${hardbanned ? 'Yes' : 'No'}\n🔇 **Muted:** ${isMuted ? 'Yes' : 'No'}\n⚖️ **Strikes:** ${warningCount}/3`,
                    inline: true
                },
                { name: '📜 Recent Warnings', value: recentWarnings, inline: false }
            ],
            thumbnail: target.user.displayAvatarURL({ size: 256 }),
            footer: { text: '🔥 Lucifer Morningstar | Grand Ledger of Sins' }
        });

        return context.editReply({ embeds: [embed] });
    },
};
