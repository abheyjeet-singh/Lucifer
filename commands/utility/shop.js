const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { createEmbed, THEME } = require('../../utils/embeds');
const { getUserEconomy } = require('../../database/db');
const { buildShopCard } = require('../../utils/canvasBuilder');

const SHOP_ITEMS = [
    // ── Power-Ups ──
    { id: 'rob_shield', name: '🛡️ Rob Shield', desc: 'Blocks 1 rob attempt for 24h', price: 2000, duration: 24 * 60 * 60 * 1000, type: 'item' },
    { id: 'lucky_charm', name: '🍀 Lucky Charm', desc: 'Double work/crime payouts for 1 hour', price: 5000, duration: 60 * 60 * 1000, type: 'item' },
    { id: 'custom_role', name: '🎨 Custom Role', desc: 'Create your own colored role!', price: 10000, duration: null, type: 'item' },

    // ── Profile Backgrounds (Tier 1: 15,000 LC) ──
    { id: 'bg_crimson', name: '🌑 Crimson Realm', desc: 'Blood-red infernal background', price: 15000, duration: null, type: 'background', url: 'https://images.unsplash.com/photo-1549833284-6a7df91c1f65?w=800&q=80' },
    { id: 'bg_frost', name: '❄️ Frozen Abyss', desc: 'Cold blue icy caverns', price: 15000, duration: null, type: 'background', url: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=800&q=80' },

    // ── Profile Backgrounds (Tier 2: 25,000 LC) ──
    { id: 'bg_aurora', name: '🌌 Northern Lights', desc: 'Dancing aurora borealis', price: 25000, duration: null, type: 'background', url: 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=800&q=80' },
    { id: 'bg_volcano', name: '🌋 Volcanic Core', desc: 'Flowing lava and ash', price: 25000, duration: null, type: 'background', url: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=800&q=80' }, // Re-using a cool gradient, swap URL if desired

    // ── Profile Backgrounds (Tier 3: 50,000 LC) ──
    { id: 'bg_cyber', name: '🌃 Neon City', desc: 'Cyberpunk profile background', price: 50000, duration: null, type: 'background', url: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=800&q=80' },
    { id: 'bg_abyss', name: '🕳️ The Abyss', desc: 'Dark void profile background', price: 50000, duration: null, type: 'background', url: 'https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?w=800&q=80' },

    // ── Profile Backgrounds (Tier 4: 75,000 LC) ──
    { id: 'bg_galaxy', name: '✨ Galactic Empire', desc: 'Deep space nebula', price: 75000, duration: null, type: 'background', url: 'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=800&q=80' },
    { id: 'bg_castle', name: '🏰 Gothic Castle', desc: 'Dark medieval architecture', price: 75000, duration: null, type: 'background', url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&q=80' },

    // ── Profile Backgrounds (Tier 5: 150,000 LC) ──
    { id: 'bg_matrix', name: '💚 Digital Hell', desc: 'Falling code aesthetic', price: 150000, duration: null, type: 'background', url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&q=80' },
    { id: 'bg_royal', name: '👑 Royal Gold', desc: 'Pure luxury gold texture', price: 150000, duration: null, type: 'background', url: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=800&q=80' }
];

module.exports = {
    name: 'shop',
    description: 'Spend your Lux Coins in the Infernal Shop!',
    aliases: ['store'],
    data: new SlashCommandBuilder().setName('shop').setDescription('Open the Infernal Shop'),

    async execute(message, args, client) {
        const eco = getUserEconomy(message.guild.id, message.author.id);
        try {
            const imageBuffer = await buildShopCard(eco, SHOP_ITEMS);
            const attachment = new AttachmentBuilder(imageBuffer, { name: 'shop.png' });
            return message.reply({ files: [attachment] });
        } catch (e) {
            console.error('Shop Canvas Error:', e);
            const items = SHOP_ITEMS.map(i => `**${i.name}** — ${i.price.toLocaleString()} LC\n> ${i.desc}`).join('\n\n');
            return message.reply({ embeds: [createEmbed({ context: message, title: '🛒 Infernal Shop', description: `**Your Wallet:** ${eco.wallet.toLocaleString()} LC\n\n${items}`, color: THEME.primary })] });
        }
    },

    async interact(interaction, client) {
        const eco = getUserEconomy(interaction.guild.id, interaction.user.id);
        try {
            const imageBuffer = await buildShopCard(eco, SHOP_ITEMS);
            const attachment = new AttachmentBuilder(imageBuffer, { name: 'shop.png' });
            return interaction.reply({ files: [attachment] });
        } catch (e) {
            console.error('Shop Canvas Error:', e);
            const items = SHOP_ITEMS.map(i => `**${i.name}** — ${i.price.toLocaleString()} LC\n> ${i.desc}`).join('\n\n');
            return interaction.reply({ embeds: [createEmbed({ context: interaction, title: '🛒 Infernal Shop', description: `**Your Wallet:** ${eco.wallet.toLocaleString()} LC\n\n${items}`, color: THEME.primary })] });
        }
    }
};