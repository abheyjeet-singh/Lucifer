const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, THEME } = require('../../utils/embeds');
const { getInventory, getUserEconomy, hasItem, addItem } = require('../../database/db');

const SHOP_ITEMS = [
    { id: 'bg_crimson', name: '🌑 Crimson Realm', url: 'https://images.unsplash.com/photo-1549833284-6a7df91c1f65?w=800&q=80' },
    { id: 'bg_frost', name: '❄️ Frozen Abyss', url: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=800&q=80' },
    { id: 'bg_aurora', name: '🌌 Northern Lights', url: 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=800&q=80' },
    { id: 'bg_volcano', name: '🌋 Volcanic Core', url: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=800&q=80' },
    { id: 'bg_cyber', name: '🌃 Neon City', url: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=800&q=80' },
    { id: 'bg_abyss', name: '🕳️ The Abyss', url: 'https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?w=800&q=80' },
    { id: 'bg_galaxy', name: '✨ Galactic Empire', url: 'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=800&q=80' },
    { id: 'bg_castle', name: '🏰 Gothic Castle', url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&q=80' },
    { id: 'bg_matrix', name: '💚 Digital Hell', url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&q=80' },
    { id: 'bg_royal', name: '👑 Royal Gold', url: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=800&q=80' }
];

module.exports = {
    name: 'collection',
    description: 'View your purchased profile backgrounds',
    aliases: ['backgrounds', 'bgs'],
    data: new SlashCommandBuilder()
        .setName('collection')
        .setDescription('View your purchased profile backgrounds'),

    async execute(message, args, client) {
        return this.run(client, message.guild, message.author.id, message);
    },

    async interact(interaction, client) {
        return this.run(client, interaction.guild, interaction.user.id, interaction);
    },

    async run(client, guild, userId, context) {
        const eco = getUserEconomy(guild.id, userId);
        
        // ── SELF-HEALING FIX ──
        // If they have a background equipped from the old system but it's not in their inventory, add it!
        if (eco.profile_bg) {
            const equippedBg = SHOP_ITEMS.find(bg => bg.url === eco.profile_bg);
            if (equippedBg && !hasItem(guild.id, userId, equippedBg.id)) {
                addItem(guild.id, userId, equippedBg.id, null);
            }
        }

        const inventory = getInventory(guild.id, userId);
        const ownedBgs = inventory.filter(i => i.item_id.startsWith('bg_'));

        if (ownedBgs.length === 0) {
            return context.reply({ embeds: [createEmbed({ 
                context: context, 
                description: '🖼️ Your collection is empty! Visit the shop to buy backgrounds.', 
                color: THEME.accent 
            })] });
        }

        const list = ownedBgs.map(bg => {
            const details = SHOP_ITEMS.find(s => s.id === bg.item_id);
            const name = details ? details.name : bg.item_id;
            const isEquipped = (eco.profile_bg && details && details.url === eco.profile_bg);
            return `${isEquipped ? '✅ **' : '• '}${name}${isEquipped ? '** (Equipped)' : ''}`;
        }).join('\n');

        return context.reply({ embeds: [createEmbed({
            context: context,
            title: `🖼️ ${context.user?.username || 'User'}'s Collection`,
            description: `You own **${ownedBgs.length}** background(s).\nUse \`/wear <name>\` to equip one!\n\n${list}`,
            color: THEME.celestial
        })] });
    }
};