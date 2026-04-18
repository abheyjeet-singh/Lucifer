const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, THEME } = require('../../utils/embeds');
const { getUserEconomy } = require('../../database/db');

const SHOP_ITEMS = [
    { id: 'rob_shield', name: '🛡️ Rob Shield', desc: 'Blocks 1 rob attempt against you for 24h', price: 2000, duration: 24 * 60 * 60 * 1000 },
    { id: 'lucky_charm', name: '🍀 Lucky Charm', desc: 'Double your work/crime payouts for 1 hour', price: 5000, duration: 60 * 60 * 1000 },
    { id: 'custom_role', name: '🎨 Custom Role', desc: 'Create your own colored role!', price: 10000, duration: null }
];

module.exports = {
    name: 'shop',
    description: 'Spend your Lux Coins in the Infernal Shop!',
    aliases: ['store'],
    data: new SlashCommandBuilder()
        .setName('shop')
        .setDescription('Open the Infernal Shop'),

    async execute(message, args, client) {
        const eco = getUserEconomy(message.guild.id, message.author.id);
        const items = SHOP_ITEMS.map(i => `**${i.name}** — ${i.price.toLocaleString()} LC\n> ${i.desc}`).join('\n\n');
        
        return message.reply({ embeds: [createEmbed({
            title: '🛒 Infernal Shop',
            description: `**Your Wallet:** ${eco.wallet.toLocaleString()} LC\n\n${items}\n\nUse \`l!buy <item_id>\` to purchase!`,
            color: THEME.primary,
            footer: { text: 'Item IDs: rob_shield, lucky_charm, custom_role' }
        })] });
    },

    async interact(interaction, client) {
        const eco = getUserEconomy(interaction.guild.id, interaction.user.id);
        const items = SHOP_ITEMS.map(i => `**${i.name}** — ${i.price.toLocaleString()} LC\n> ${i.desc}`).join('\n\n');
        
        return interaction.reply({ embeds: [createEmbed({
            title: '🛒 Infernal Shop',
            description: `**Your Wallet:** ${eco.wallet.toLocaleString()} LC\n\n${items}\n\nUse \`/buy <item_id>\` to purchase!`,
            color: THEME.primary,
            footer: { text: 'Item IDs: rob_shield, lucky_charm, custom_role' }
        })] });
    }
};