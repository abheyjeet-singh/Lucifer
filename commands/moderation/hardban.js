const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createEmbed, THEME, modLog } = require('../../utils/embeds');
const { addHardban } = require('../../database/db');

module.exports = {
    name: 'hardban',
    description: 'Eternal damnation — Ban forever, immune to normal unban',
    category: 'moderation',
    usage: 'hardban @user [reason]',
    permissions: ['BanMembers'],

    async execute(message, args, client) {
        const target = message.mentions.members.first() || await message.guild.members.fetch(args[0]).catch(() => null);
        if (!target) return message.reply({ embeds: [createEmbed({ description: '⚠️ Mention a valid soul to damn eternally.', color: THEME.error })] });
        const reason = args.slice(1).join(' ') || 'Eternal damnation';
        return this.run(client, message.guild, message.member, target, reason, message);
    },

    async run(client, guild, moderator, target, reason, context) {
        if (!target.bannable) return context.reply({ embeds: [createEmbed({ description: '🚫 I cannot damn this soul. They may outrank me.', color: THEME.error })] });
        if (target.id === moderator.id) return context.reply({ embeds: [createEmbed({ description: '🤔 Damning yourself to eternity? Dramatic.', color: THEME.secondary })] });

        // Add to hardban DB BEFORE banning so the event listener doesn't accidentally re-ban on hardunban
        addHardban(guild.id, target.id);

        await target.ban({ reason: `[ETERNAL DAMNATION] ${moderator.user.tag}: ${reason}` });

        try { await target.send({ embeds: [createEmbed({ title: '🔥 Eternal Damnation', description: `You have been eternally banished from **${guild.name}**.\nNo mortal can undo this.\n**Reason:** ${reason}\n**Moderator:** ${moderator.user.tag}`, color: THEME.secondary })] }); } catch {}

        const embed = createEmbed({
            title: '🔥 Eternal Damnation Passed',
            description: `**${target.user.tag}** has been cast into the eternal fire.\n\n📋 **Reason:** ${reason}\n🗡️ **Moderator:** ${moderator.user.tag}\n\n⚠️ *Only Administrators can use \`hardunban\` to grant clemency.*`,
            color: THEME.accent,
            thumbnail: target.user.displayAvatarURL({ size: 256 }),
        });

        modLog(client, guild, createEmbed({
            title: '🔥 Member Hardbanned (Eternally Damned)',
            description: `**User:** ${target.user.tag} (${target.id})\n**Moderator:** ${moderator.user.tag}\n**Reason:** ${reason}`,
            color: THEME.secondary,
        }));

        return context.reply({ embeds: [embed] });
    },
};
