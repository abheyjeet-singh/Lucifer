const { createEmbed, THEME, modLog } = require('../../utils/embeds');

module.exports = {
    name: 'kick',
    description: 'Expel a soul from paradise',
    category: 'moderation',
    usage: 'kick @user [reason]',
    permissions: ['KickMembers'],

    async execute(message, args, client) {
        const target = message.mentions.members.first() || await message.guild.members.fetch(args[0]).catch(() => null);
        if (!target) return message.reply({ embeds: [createEmbed({ context: message, description: '⚠️ Mention a valid soul to expel.', color: THEME.error })] });
        const reason = args.slice(1).join(' ') || 'No reason provided';
        return this.run(client, message.guild, message.member, target, reason, message);
    },

    async run(client, guild, moderator, target, reason, context) {
        if (!target.kickable) return context.reply({ embeds: [createEmbed({ context: guild, description: '🚫 I cannot expel this soul.', color: THEME.error })] });
        if (target.id === moderator.id) return context.reply({ embeds: [createEmbed({ context: guild, description: '🤔 Kicking yourself? Bold move.', color: THEME.secondary })] });

        try { await target.send({ embeds: [createEmbed({ context: guild, title: '🦅 You Have Been Expelled', description: `Kicked from **${guild.name}**\n**Reason:** ${reason}\n**Moderator:** ${moderator.user.tag}`, color: THEME.secondary })] }); } catch {}

        await target.kick(`${moderator.user.tag}: ${reason}`);

        modLog(client, guild, createEmbed({
            title: '🦅 Member Kicked',
            description: `**User:** ${target.user.tag} (${target.id})\n**Moderator:** ${moderator.user.tag}\n**Reason:** ${reason}`,
            color: THEME.accent,
        }));

        return context.reply({ embeds: [createEmbed({ context: guild, description: `🦅 **${target.user.tag}** has been expelled from paradise.\n📋 **Reason:** ${reason}\n🗡️ **Moderator:** ${moderator.user.tag}`, color: THEME.primary, thumbnail: target.user.displayAvatarURL({ size: 256 }) })] });
    },
};