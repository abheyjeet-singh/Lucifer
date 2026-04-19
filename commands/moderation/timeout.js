const { createEmbed, THEME } = require('../../utils/embeds');

function parseDuration(str) { 
    const match = str?.toLowerCase().match(/^(\d+)(s|m|h|d)$/); 
    if (!match) return null; 
    const num = parseInt(match[1]); 
    const unit = { s: 1, m: 60, h: 3600, d: 86400 }[match[2]]; 
    return num * unit * 1000; 
}

module.exports = {
    name: 'timeout', description: 'Put a user in the naughty corner', category: 'moderation', usage: 'timeout @user <duration> [reason]', permissions: ['ModerateMembers'],
    
    async execute(message, args, client) {
        const target = message.mentions.members.first() || await message.guild.members.fetch(args[0]).catch(() => null);
        if (!target) return message.reply({ embeds: [createEmbed({ context: message, description: '⚠️ Mention a valid user.', color: THEME.error })] });
        const ms = parseDuration(args[1]);
        if (!ms) return message.reply({ embeds: [createEmbed({ context: message, description: '⚠️ Invalid duration (use 1m, 1h, 1d).', color: THEME.error })] });
        const reason = args.slice(2).join(' ') || 'No reason provided';
        if (ms > 2419200000) return message.reply({ embeds: [createEmbed({ context: message, description: '⚠️ Max timeout is 28 days.', color: THEME.error })] });
        try {
            await target.timeout(ms, reason);
            message.reply({ embeds: [createEmbed({ context: message, description: `🔇 **${target.user.tag}** timed out for **${args[1]}**.\n> ${reason}`, color: THEME.success })] });
        } catch { message.reply({ embeds: [createEmbed({ context: message, description: '🚫 Cannot timeout this user (check role hierarchy).', color: THEME.error })] }); }
    }
};