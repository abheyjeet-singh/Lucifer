const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createEmbed, THEME } = require('../../utils/embeds');
const { addReactionRole } = require('../../database/db');

module.exports = {
    name: 'reactionrole',
    description: 'Set up a reaction role',
    category: 'utility',
    usage: 'reactionrole <message_id> <emoji> <role>',
    permissions: ['Administrator'],
    data: new SlashCommandBuilder()
        .setName('reactionrole')
        .setDescription('Set up a reaction role')
        .addStringOption(o => o.setName('message_id').setDescription('The message ID to attach the role to').setRequired(true))
        .addStringOption(o => o.setName('emoji').setDescription('The emoji to react with').setRequired(true))
        .addRoleOption(o => o.setName('role').setDescription('The role to give').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(message, args, client) {
        if (args.length < 3) return message.reply({ embeds: [createEmbed({ context: message, description: '⚠️ Use: `l!reactionrole <message_id> <emoji> @role`', color: THEME.error })] });
        return this.run(client, message.guild, args[0], args[1], message.mentions.roles.first(), message);
    },

    async interact(interaction, client) {
        return this.run(client, interaction.guild, interaction.options.getString('message_id'), interaction.options.getString('emoji'), interaction.options.getRole('role'), interaction);
    },

    async run(client, guild, messageId, emoji, role, context) {
        if (!role) return context.reply({ embeds: [createEmbed({ context: guild, description: '⚠️ Mention a valid role.', color: THEME.error })] });

        try {
            // Fetch message to ensure it exists
            const channels = guild.channels.cache.filter(c => c.isTextBased());
            let targetMsg = null;
            for (const [, ch] of channels) {
                try { targetMsg = await ch.messages.fetch(messageId); if (targetMsg) break; } catch {}
            }
            if (!targetMsg) return context.reply({ embeds: [createEmbed({ context: guild, description: '⚠️ Message not found. Ensure the ID is correct and I can see the channel.', color: THEME.error })] });

            await targetMsg.react(emoji);
            addReactionRole(guild.id, messageId, emoji, role.id);

            return context.reply({ embeds: [createEmbed({ context: guild, description: `🎭 Sigil set!\n**Message:** [Jump](${targetMsg.url})\n**Emoji:** ${emoji}\n**Role:** ${role}`, color: THEME.success })] });
        } catch (error) {
            return context.reply({ embeds: [createEmbed({ context: guild, description: '💀 Failed to set sigil. I might not have access to react, or the emoji is invalid.', color: THEME.error })] });
        }
    },
};
