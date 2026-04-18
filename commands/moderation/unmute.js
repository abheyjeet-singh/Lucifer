const { createEmbed, THEME, modLog } = require('../../utils/embeds');

module.exports = {
    name: 'unmute',
    description: 'Release a soul from silence',
    category: 'moderation',
    usage: 'unmute @user [reason]',
    permissions: ['ModerateMembers'],

    async execute(message, args, client) {
        const target = message.mentions.members.first() || await message.guild.members.fetch(args[0]).catch(() => null);
        if (!target) return message.reply({ embeds: [createEmbed({ description: '⚠️ Mention a valid soul.', color: THEME.error })] });
        const reason = args.slice(1).join(' ') || 'No reason provided';
        return this.run(client, message.guild, message.member, target, reason, message);
    },

    async run(client, guild, moderator, target, reason, context) {
        if (!target.isCommunicationDisabled()) return context.reply({ embeds: [createEmbed({ description: '⚠️ That soul is not silenced.', color: THEME.error })] });

        await target.timeout(null, `${moderator.user.tag}: ${reason}`);

        modLog(client, guild, createEmbed({
            title: '🔊 Member Unmuted',
            description: `**User:** ${target.user.tag} (${target.id})\n**Moderator:** ${moderator.user.tag}\n**Reason:** ${reason}`,
            color: THEME.success,
        }));

        return context.reply({ embeds: [createEmbed({ description: `🔊 **${target.user.tag}** has been released from silence.`, color: THEME.success })] });
    },
};