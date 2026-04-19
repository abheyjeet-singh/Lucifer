const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, THEME } = require('../../utils/embeds');
const messageUpdateEvent = require('../../events/messageUpdate');

module.exports = {
    name: 'editsnipe', description: 'See the original text of an edited message', category: 'moderation', usage: 'editsnipe', permissions: ['ManageMessages'],
    data: new SlashCommandBuilder()
        .setName('editsnipe').setDescription('See the original text of an edited message')
        .setDefaultMemberPermissions(require('discord.js').PermissionFlagsBits.ManageMessages),
    
    async execute(message, args, client) {
        const snipe = messageUpdateEvent.getEditSnipes().get(message.channel.id);
        if (!snipe) return message.reply({ embeds: [createEmbed({ context: message, description: '👻 No edited messages found.', color: THEME.dark })] });
        
        message.reply({ embeds: [createEmbed({ context: message, 
            author: { name: snipe.author.tag, iconURL: snipe.author.displayAvatarURL() },
            description: `**Before:**\n${snipe.oldContent.substring(0, 1024) || '*Empty*'}\n\n**After:**\n${snipe.newContent.substring(0, 1024) || '*Empty*'}`,
            color: THEME.accent,
            footer: { text: `Edited at ${snipe.createdAt.toLocaleString()}` }
        })] });
    },
    async interact(interaction, client) {
        const snipe = messageUpdateEvent.getEditSnipes().get(interaction.channel.id);
        if (!snipe) return interaction.reply({ embeds: [createEmbed({ context: interaction, description: '👻 No edited messages found.', color: THEME.dark })], flags: 64 });
        
        interaction.reply({ embeds: [createEmbed({ context: interaction, 
            author: { name: snipe.author.tag, iconURL: snipe.author.displayAvatarURL() },
            description: `**Before:**\n${snipe.oldContent.substring(0, 1024) || '*Empty*'}\n\n**After:**\n${snipe.newContent.substring(0, 1024) || '*Empty*'}`,
            color: THEME.accent,
            footer: { text: `Edited at ${snipe.createdAt.toLocaleString()}` }
        })] });
    },
};