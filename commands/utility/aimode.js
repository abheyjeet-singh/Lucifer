const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createEmbed, THEME } = require('../../utils/embeds');
const { isAiMentionEnabled, setAiMentionEnabled } = require('../../database/db');
const { hasPermission } = require('../../utils/permissions');

module.exports = {
    name: 'aimode',
    description: 'Enable or disable Lucifer AI mention responses',
    category: 'utility',
    usage: 'aimode <enable|disable|show>',
    permissions: ['Administrator'],
    data: new SlashCommandBuilder()
        .setName('aimode')
        .setDescription('Enable or disable Lucifer AI mention responses')
        .addSubcommand(sc =>
            sc.setName('enable')
              .setDescription('Enable AI responses when Lucifer is mentioned'))
        .addSubcommand(sc =>
            sc.setName('disable')
              .setDescription('Disable AI responses when Lucifer is mentioned'))
        .addSubcommand(sc =>
            sc.setName('show')
              .setDescription('View current AI mention mode'))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(message, args, client) {
        const sub = args[0]?.toLowerCase();
        if (!sub || sub === 'show') return this.show(client, message.guild, message);
        if (sub === 'enable') return this.enable(client, message.guild, message.member, message);
        if (sub === 'disable') return this.disable(client, message.guild, message.member, message);
        return message.reply({ embeds: [createEmbed({ description: '⚠️ Use: `l!aimode enable/disable/show`', color: THEME.error })] });
    },

    async interact(interaction, client) {
        const sub = interaction.options.getSubcommand();
        if (sub === 'enable') return this.enable(client, interaction.guild, interaction.member, interaction);
        if (sub === 'disable') return this.disable(client, interaction.guild, interaction.member, interaction);
        return this.show(client, interaction.guild, interaction);
    },

    async enable(client, guild, member, context) {
        if (!hasPermission(member, 'Administrator')) return context.reply({ embeds: [createEmbed({ description: '🚫 Only administrators may configure AI mode.', color: THEME.error })] });
        if (isAiMentionEnabled(guild.id)) return context.reply({ embeds: [createEmbed({ description: '🔥 AI mention mode is already enabled.', color: THEME.dark })] });
        setAiMentionEnabled(guild.id, true);
        return context.reply({ embeds: [createEmbed({ description: '🔥 **AI Mention Mode Enabled.** Mention me in any message and I will respond — and act.\n\nExamples:\n• `@Lucifer mute @user he disrespected me for 10min`\n• `@Lucifer kick @user spamming`\n• `@Lucifer clear 5 messages`\n• `@Lucifer who is @user?`\n\nUse `/aimode disable` to turn off.', color: THEME.success })] });
    },

    async disable(client, guild, member, context) {
        if (!hasPermission(member, 'Administrator')) return context.reply({ embeds: [createEmbed({ description: '🚫 Only administrators may configure AI mode.', color: THEME.error })] });
        if (!isAiMentionEnabled(guild.id)) return context.reply({ embeds: [createEmbed({ description: '🔥 AI mention mode is already disabled.', color: THEME.dark })] });
        setAiMentionEnabled(guild.id, false);
        return context.reply({ embeds: [createEmbed({ description: '🔥 **AI Mention Mode Disabled.** I will no longer respond to mentions with AI.', color: THEME.primary })] });
    },

    async show(client, guild, context) {
        const enabled = isAiMentionEnabled(guild.id);
        const status = enabled ? '🟢 **Enabled**' : '🔴 **Disabled**';
        return context.reply({ embeds: [createEmbed({
            title: '🔥 AI Mention Mode',
            description: `**Status:** ${status}\n\nWhen enabled, mentioning Lucifer in any message will trigger an AI response. The AI can also execute moderation actions like mute, kick, ban, warn, clear, lock, and more.\n\n**Example:** \`@Lucifer mute @user he disrespected me for 10min\``,
            color: enabled ? THEME.success : THEME.dark
        })] });
    },
};