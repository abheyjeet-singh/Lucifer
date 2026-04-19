const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { createEmbed, THEME } = require('../../utils/embeds');
const { getUserEconomy, updateUserEconomy, addItem, hasItem } = require('../../database/db');
const { buildReceiptCard } = require('../../utils/canvasBuilder');

const SHOP_ITEMS = [
    { id: 'rob_shield', name: '🛡️ Rob Shield', desc: 'Blocks 1 rob attempt for 24h', price: 2000, duration: 24 * 60 * 60 * 1000, type: 'item' },
    { id: 'lucky_charm', name: '🍀 Lucky Charm', desc: 'Double work/crime payouts for 1 hour', price: 5000, duration: 60 * 60 * 1000, type: 'item' },
    { id: 'custom_role', name: '🎨 Custom Role', desc: 'Create your own colored role!', price: 10000, duration: null, type: 'item' },
    { id: 'bg_crimson', name: '🌑 Crimson Realm', desc: 'Blood-red infernal background', price: 15000, duration: null, type: 'background', url: 'https://images.unsplash.com/photo-1549833284-6a7df91c1f65?w=800&q=80' },
    { id: 'bg_frost', name: '❄️ Frozen Abyss', desc: 'Cold blue icy caverns', price: 15000, duration: null, type: 'background', url: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=800&q=80' },
    { id: 'bg_aurora', name: '🌌 Northern Lights', desc: 'Dancing aurora borealis', price: 25000, duration: null, type: 'background', url: 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=800&q=80' },
    { id: 'bg_volcano', name: '🌋 Volcanic Core', desc: 'Flowing lava and ash', price: 25000, duration: null, type: 'background', url: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=800&q=80' },
    { id: 'bg_cyber', name: '🌃 Neon City', desc: 'Cyberpunk profile background', price: 50000, duration: null, type: 'background', url: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=800&q=80' },
    { id: 'bg_abyss', name: '🕳️ The Abyss', desc: 'Dark void profile background', price: 50000, duration: null, type: 'background', url: 'https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?w=800&q=80' },
    { id: 'bg_galaxy', name: '✨ Galactic Empire', desc: 'Deep space nebula', price: 75000, duration: null, type: 'background', url: 'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=800&q=80' },
    { id: 'bg_castle', name: '🏰 Gothic Castle', desc: 'Dark medieval architecture', price: 75000, duration: null, type: 'background', url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&q=80' },
    { id: 'bg_matrix', name: '💚 Digital Hell', desc: 'Falling code aesthetic', price: 150000, duration: null, type: 'background', url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&q=80' },
    { id: 'bg_royal', name: '👑 Royal Gold', desc: 'Pure luxury gold texture', price: 150000, duration: null, type: 'background', url: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=800&q=80' }
];

function findItem(query) {
    const q = query.toLowerCase();
    let item = SHOP_ITEMS.find(i => i.id === q);
    if (item) return item;
    item = SHOP_ITEMS.find(i => i.name.replace(/[^\w\s]/g, '').toLowerCase().includes(q));
    return item;
}

module.exports = {
    name: 'buy',
    description: 'Buy an item from the shop',
    data: new SlashCommandBuilder()
        .setName('buy')
        .setDescription('Buy an item from the Infernal Shop')
        .addStringOption(o => o.setName('item').setDescription('Item ID or Name to buy').setRequired(true))
        .addStringOption(o => o.setName('color').setDescription('Hex color for custom_role (e.g. #ff0000)'))
        .addStringOption(o => o.setName('name').setDescription('Name for custom_role')),

    async execute(message, args, client) {
        const query = args.join(' ');
        const item = findItem(query);
        if (!item) return message.reply({ embeds: [createEmbed({ context: message, description: '❌ Invalid item. Check `l!shop` for IDs and names.', color: THEME.error })] });

        const eco = getUserEconomy(message.guild.id, message.author.id);
        const member = message.member;

        if (item.type === 'background' && hasItem(message.guild.id, message.author.id, item.id)) {
            return message.reply({ embeds: [createEmbed({ context: message, description: '⚠️ You already own this background! Use `l!wear` to equip it.', color: THEME.accent })] });
        }

        if (eco.wallet < item.price) {
            try {
                const imageBuffer = await buildReceiptCard(member, 'Purchase Failed', item.price - eco.wallet, `You need ${item.price - eco.wallet} more LC.`, false);
                const attachment = new AttachmentBuilder(imageBuffer, { name: 'failed.png' });
                return message.reply({ files: [attachment] });
            } catch (e) {
                return message.reply({ embeds: [createEmbed({ context: message, description: '❌ You don\'t have enough LC in your wallet!', color: THEME.error })] });
            }
        }

        eco.wallet -= item.price;

        if (item.type === 'background') {
            addItem(message.guild.id, message.author.id, item.id, null); // Permanent
            eco.profile_bg = item.url; // Auto-equip on purchase
        } else {
            addItem(message.guild.id, message.author.id, item.id, item.duration);
        }

        updateUserEconomy(message.guild.id, message.author.id, eco);

        if (item.id === 'custom_role') {
            const color = args[1] || '#8e44ad';
            const roleName = args.slice(2).join(' ') || `${message.author.username}'s Role`;
            try {
                const role = await message.guild.roles.create({ name: roleName, color, reason: `Custom role purchased by ${message.author.tag}` });
                await message.member.roles.add(role);
            } catch (e) {
                return message.reply({ embeds: [createEmbed({ context: message, description: '❌ Bought item, but failed to create role. Check my permissions.', color: THEME.error })] });
            }
        }

        try {
            const imageBuffer = await buildReceiptCard(member, 'Item Purchased', item.price, `Successfully bought ${item.name}!`);
            const attachment = new AttachmentBuilder(imageBuffer, { name: 'purchase.png' });
            return message.reply({ files: [attachment] });
        } catch (e) {
            return message.reply({ embeds: [createEmbed({ context: message, description: `✅ You purchased **${item.name}** for ${item.price.toLocaleString()} LC!`, color: THEME.success })] });
        }
    },

    async interact(interaction, client) {
        const query = interaction.options.getString('item');
        const item = findItem(query);
        if (!item) return interaction.reply({ embeds: [createEmbed({ context: interaction, description: '❌ Invalid item. Check `/shop` for IDs and names.', color: THEME.error })], flags: 64 });

        const eco = getUserEconomy(interaction.guild.id, interaction.user.id);
        const member = interaction.member;

        if (item.type === 'background' && hasItem(interaction.guild.id, interaction.user.id, item.id)) {
            return interaction.reply({ embeds: [createEmbed({ context: interaction, description: '⚠️ You already own this background! Use `/wear` to equip it.', color: THEME.accent })], flags: 64 });
        }

        if (eco.wallet < item.price) {
            try {
                const imageBuffer = await buildReceiptCard(member, 'Purchase Failed', item.price - eco.wallet, `You need ${item.price - eco.wallet} more LC.`, false);
                const attachment = new AttachmentBuilder(imageBuffer, { name: 'failed.png' });
                return interaction.reply({ files: [attachment], flags: 64 });
            } catch (e) {
                return interaction.reply({ embeds: [createEmbed({ context: interaction, description: '❌ You don\'t have enough LC!', color: THEME.error })], flags: 64 });
            }
        }

        eco.wallet -= item.price;

        if (item.type === 'background') {
            addItem(interaction.guild.id, interaction.user.id, item.id, null);
            eco.profile_bg = item.url; // Auto-equip on purchase
        } else {
            addItem(interaction.guild.id, interaction.user.id, item.id, item.duration);
        }

        updateUserEconomy(interaction.guild.id, interaction.user.id, eco);

        if (item.id === 'custom_role') {
            const color = interaction.options.getString('color') || '#8e44ad';
            const roleName = interaction.options.getString('name') || `${interaction.user.username}'s Role`;
            try {
                const role = await interaction.guild.roles.create({ name: roleName, color, reason: `Custom role purchased by ${interaction.user.tag}` });
                await interaction.member.roles.add(role);
            } catch (e) {
                return interaction.reply({ embeds: [createEmbed({ context: interaction, description: '❌ Bought item, but failed to create role.', color: THEME.error })], flags: 64 });
            }
        }

        try {
            const imageBuffer = await buildReceiptCard(member, 'Item Purchased', item.price, `Successfully bought ${item.name}!`);
            const attachment = new AttachmentBuilder(imageBuffer, { name: 'purchase.png' });
            return interaction.reply({ files: [attachment] });
        } catch (e) {
            return interaction.reply({ embeds: [createEmbed({ context: interaction, description: `✅ You purchased **${item.name}** for ${item.price.toLocaleString()} LC!`, color: THEME.success })] });
        }
    }
};