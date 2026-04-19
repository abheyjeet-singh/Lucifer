const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { createEmbed, THEME } = require('../../utils/embeds');
const { getInventory, getUserEconomy } = require('../../database/db');
const { buildInventoryCard } = require('../../utils/canvasBuilder');

const ITEM_MAP = {
    'rob_shield': { name: 'Rob Shield', emoji: '🛡️' },
    'lucky_charm': { name: 'Lucky Charm', emoji: '🍀' },
    'custom_role': { name: 'Custom Role', emoji: '🎨' }
};

module.exports = {
    name: 'inventory',
    description: 'View your purchased items',
    aliases: ['inv', 'items'],
    data: new SlashCommandBuilder()
        .setName('inventory')
        .setDescription('View your purchased items')
        .addUserOption(o => o.setName('user').setDescription('View someone else\'s items')),

    async execute(message, args, client) {
        const target = message.mentions.members.first() || message.member;
        const items = getInventory(message.guild.id, target.id);
        
        try {
            const imageBuffer = await buildInventoryCard(target, items, ITEM_MAP);
            const attachment = new AttachmentBuilder(imageBuffer, { name: 'inventory.png' });
            return message.reply({ files: [attachment] });
        } catch (e) {
            console.error('Inventory Canvas Error:', e);
            const list = items.map(i => `• ${ITEM_MAP[i.item_id]?.name || i.item_id}`).join('\n') || 'Empty';
            return message.reply({ embeds: [createEmbed({ context: message, title: `🎒 ${target.user.username}'s Inventory`, description: list, color: THEME.primary })] });
        }
    },

    async interact(interaction, client) {
        const target = interaction.options.getMember('user') || interaction.member;
        const items = getInventory(interaction.guild.id, target.id);

        try {
            const imageBuffer = await buildInventoryCard(target, items, ITEM_MAP);
            const attachment = new AttachmentBuilder(imageBuffer, { name: 'inventory.png' });
            return interaction.reply({ files: [attachment] });
        } catch (e) {
            console.error('Inventory Canvas Error:', e);
            const list = items.map(i => `• ${ITEM_MAP[i.item_id]?.name || i.item_id}`).join('\n') || 'Empty';
            return interaction.reply({ embeds: [createEmbed({ context: interaction, title: `🎒 ${target.user.username}'s Inventory`, description: list, color: THEME.primary })] });
        }
    }
};