const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
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
    data: new SlashCommandBuilder()
        .setName('timeout').setDescription('Put a user in the naughty corner')
        .addUserOption(o => o.setName('user').setDescription('User to timeout').setRequired(true))
        .addStringOption(o => o.setName('duration').setDescription('Duration (e.g., 1m, 1h, 1d)').setRequired(true))
        .addStringOption(o => o.setName('reason').setDescription('Reason for timeout').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    
    async execute(message, args, client) {
        const target = message.mentions.members.first() || await message.guild.members.fetch(args[0]).catch(() => null);
        if (!target) return message.reply({ embeds: [createEmbed({ description: '⚠️ Mention a valid user.', color: THEME.error })] });
        const ms = parseDuration(args[1]);
        if (!ms) return message.reply({ embeds: [createEmbed({ description: '⚠️ Invalid duration (use 1m, 1h, 1d).', color: THEME.error })] });
        const reason = args.slice(2).join(' ') || 'No reason provided';
        if (ms > 2419200000) return message.reply({ embeds: [createEmbed({ description: '⚠️ Max timeout is 28 days.', color: THEME.error })] });
        try {
            await target.timeout(ms, reason);
            message.reply({ embeds: [createEmbed({ description: `🔇 **${target.user.tag}** timed out for **${args[1]}**.\n> ${reason}`, color: THEME.success })] });
        } catch { message.reply({ embeds: [createEmbed({ description: '🚫 Cannot timeout this user (check role hierarchy).', color: THEME.error })] }); }
    },
    async interact(interaction, client) {
        const target = interaction.options.getMember('user');
        const ms = parseDuration(interaction.options.getString('duration'));
        const reason = interaction.options.getString('reason') || 'No reason provided';
        if (!ms) return interaction.reply({ embeds: [createEmbed({ description: '⚠️ Invalid duration.', color: THEME.error })], flags: 64 });
        if (ms > 2419200000) return interaction.reply({ embeds: [createEmbed({ description: '⚠️ Max timeout is 28 days.', color: THEME.error })], flags: 64 });
        try {
            await target.timeout(ms, reason);
            interaction.reply({ embeds: [createEmbed({ description: `🔇 **${target.user.tag}** timed out for **${interaction.options.getString('duration')}**.\n> ${reason}`, color: THEME.success })] });
        } catch { interaction.reply({ embeds: [createEmbed({ description: '🚫 Cannot timeout this user.', color: THEME.error })], flags: 64 }); }
    },
};