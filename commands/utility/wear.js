const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, THEME } = require('../../utils/embeds');
const { getUserEconomy, updateUserEconomy, hasItem } = require('../../database/db');

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

function findBg(query) {
    const q = query.toLowerCase();
    if (q === 'none' || q === 'default' || q === 'reset') return 'reset';
    let item = SHOP_ITEMS.find(i => i.id === q);
    if (item) return item;
    item = SHOP_ITEMS.find(i => i.name.replace(/[^\w\s]/g, '').toLowerCase().includes(q));
    return item;
}

module.exports = {
    name: 'wear',
    description: 'Equip a profile background from your collection',
    data: new SlashCommandBuilder()
        .setName('wear')
        .setDescription('Equip a profile background')
        .addStringOption(o => o.setName('background').setDescription('Name or ID of the background (or "none" to reset)').setRequired(true)),

    async execute(message, args, client) {
        const query = args.join(' ');
        if (!query) return message.reply({ embeds: [createEmbed({ context: message, description: '⚠️ Specify a background name/ID, or type `none` to reset.', color: THEME.error })] });
        return this.run(client, message.guild, message.author.id, query, message);
    },

    async interact(interaction, client) {
        const query = interaction.options.getString('background');
        return this.run(client, interaction.guild, interaction.user.id, query, interaction);
    },

    async run(client, guild, userId, query, context) {
        const eco = getUserEconomy(guild.id, userId);
        const bg = findBg(query);

        // Reset to default
        if (bg === 'reset') {
            eco.profile_bg = null;
            updateUserEconomy(guild.id, userId, eco);
            return context.reply({ embeds: [createEmbed({ context: context, description: '🔄 Profile background reset to default!', color: THEME.success })] });
        }

        if (!bg) {
            return context.reply({ embeds: [createEmbed({ context: context, description: '❌ Background not found. Check `/collection` for your items.', color: THEME.error })] });
        }

        if (!hasItem(guild.id, userId, bg.id)) {
            return context.reply({ embeds: [createEmbed({ context: context, description: `❌ You don't own **${bg.name}**! Visit the shop to buy it.`, color: THEME.error })] });
        }

        eco.profile_bg = bg.url;
        updateUserEconomy(guild.id, userId, eco);

        return context.reply({ embeds: [createEmbed({ 
            context: context, 
            description: `✅ Equipped **${bg.name}**! Check it out with \`/profile\``, 
            color: THEME.success 
        })] });
    }
};