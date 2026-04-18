const { createEmbed, THEME, modLog } = require('../../utils/embeds');
const { addTempban, isHardbanned } = require('../../database/db');

module.exports = {
    name: 'tempban',
    description: 'Temporarily exile a soul from this realm',
    category: 'moderation',
    usage: 'tempban @user <duration> [reason]',
    permissions: ['BanMembers'],

    parseDuration(str) {
        const regex = /^(\d+)(s|m|h|d)$/;
        const match = str.toLowerCase().match(regex);
        if (!match) return null;
        const num = parseInt(match[1]);
        const unit = { s: 1, m: 60, h: 3600, d: 86400 }[match[2]];
        return num * unit * 1000;
    },

    async execute(message, args, client) {
        const target = message.mentions.members.first() || await message.guild.members.fetch(args[0]).catch(() => null);
        if (!target) return message.reply({ embeds: [createEmbed({ description: '⚠️ Mention a valid soul to exile.', color: THEME.error })] });
        const durationStr = args[1];
        const ms = this.parseDuration(durationStr);
        if (!ms) return message.reply({ embeds: [createEmbed({ description: '⚠️ Invalid duration. Use format: `1m`, `1h`, `1d`', color: THEME.error })] });
        const reason = args.slice(2).join(' ') || 'No reason provided';
        return this.run(client, message.guild, message.member, target, ms, durationStr, reason, message);
    },

    async run(client, guild, moderator, target, ms, durationStr, reason, context) {
        if (!target.bannable) return context.reply({ embeds: [createEmbed({ description: '🚫 I cannot exile this soul.', color: THEME.error })] });
        if (isHardbanned(guild.id, target.id)) return context.reply({ embeds: [createEmbed({ description: '🔥 That soul is eternally damned. A temporary exile is pointless.', color: THEME.error })] });

        const unbanTimestamp = Date.now() + ms;
        addTempban(guild.id, target.id, unbanTimestamp);

        await target.ban({ reason: `[TEMPBAN ${durationStr}] ${moderator.user.tag}: ${reason}` });

        try { await target.send({ embeds: [createEmbed({ title: '⏳ Temporary Exile', description: `You have been exiled from **${guild.name}**\n**Duration:** ${durationStr}\n**Reason:** ${reason}\n**Return Time:** <t:${Math.floor(unbanTimestamp / 1000)}:R>`, color: THEME.secondary })] }); } catch {}

        modLog(client, guild, createEmbed({
            title: '⏳ Member Tempbanned',
            description: `**User:** ${target.user.tag} (${target.id})\n**Duration:** ${durationStr}\n**Returns:** <t:${Math.floor(unbanTimestamp / 1000)}:R>\n**Moderator:** ${moderator.user.tag}\n**Reason:** ${reason}`,
            color: THEME.accent,
        }));

        return context.reply({ embeds: [createEmbed({
            description: `⏳ **${target.user.tag}** has been temporarily exiled.\n⏱️ **Duration:** ${durationStr}\n📅 **Returns:** <t:${Math.floor(unbanTimestamp / 1000)}:R>\n📋 **Reason:** ${reason}`,
            color: THEME.primary,
            thumbnail: target.user.displayAvatarURL({ size: 256 }),
        })] });
    },
};