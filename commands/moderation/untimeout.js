const { createEmbed, THEME } = require('../../utils/embeds');

module.exports = {
    name: 'untimeout', description: 'Remove a user from the naughty corner', category: 'moderation', usage: 'untimeout @user [reason]', permissions: ['ModerateMembers'],
    
    async execute(message, args, client) {
        const target = message.mentions.members.first() || await message.guild.members.fetch(args[0]).catch(() => null);
        if (!target) return message.reply({ embeds: [createEmbed({ description: '⚠️ Mention a valid user.', color: THEME.error })] });
        const reason = args.slice(1).join(' ') || 'No reason provided';
        if (!target.isCommunicationDisabled()) return message.reply({ embeds: [createEmbed({ description: '⚠️ User is not timed out.', color: THEME.error })] });
        try {
            await target.timeout(null, reason);
            message.reply({ embeds: [createEmbed({ description: `🔊 **${target.user.tag}** timeout removed.\n> ${reason}`, color: THEME.success })] });
        } catch { message.reply({ embeds: [createEmbed({ description: '🚫 Cannot untimeout this user.', color: THEME.error })] }); }
    }
};