const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, THEME } = require('../../utils/embeds');
const { getUserEconomy, updateUserEconomy, addItem } = require('../../database/db');

const SHOP_ITEMS = [
    { id: 'rob_shield', name: '🛡️ Rob Shield', desc: 'Blocks 1 rob attempt for 24h', price: 2000, duration: 24 * 60 * 60 * 1000 },
    { id: 'lucky_charm', name: '🍀 Lucky Charm', desc: 'Double work/crime payouts for 1 hour', price: 5000, duration: 60 * 60 * 1000 },
    { id: 'custom_role', name: '🎨 Custom Role', desc: 'Create your own colored role!', price: 10000, duration: null }
];

module.exports = {
    name: 'buy',
    description: 'Buy an item from the shop',
    data: new SlashCommandBuilder()
        .setName('buy')
        .setDescription('Buy an item from the Infernal Shop')
        .addStringOption(o => o.setName('item').setDescription('Item ID to buy').setRequired(true))
        .addStringOption(o => o.setName('color').setDescription('Hex color for custom_role (e.g. #ff0000)'))
        .addStringOption(o => o.setName('name').setDescription('Name for custom_role')),

    async execute(message, args, client) {
        const itemId = args[0]?.toLowerCase();
        const item = SHOP_ITEMS.find(i => i.id === itemId);
        if (!item) return message.reply({ embeds: [createEmbed({ description: '❌ Invalid item ID. Check `l!shop`.', color: THEME.error })] });

        const eco = getUserEconomy(message.guild.id, message.author.id);
        if (eco.wallet < item.price) return message.reply({ embeds: [createEmbed({ description: '❌ You don\'t have enough LC in your wallet!', color: THEME.error })] });

        eco.wallet -= item.price;
        updateUserEconomy(message.guild.id, message.author.id, eco);
        addItem(message.guild.id, message.author.id, item.id, item.duration);

        if (item.id === 'custom_role') {
            const color = args[1] || '#8e44ad';
            const roleName = args.slice(2).join(' ') || `${message.author.username}'s Role`;
            try {
                const role = await message.guild.roles.create({ name: roleName, color, reason: `Custom role purchased by ${message.author.tag}` });
                await message.member.roles.add(role);
            } catch (e) {
                return message.reply({ embeds: [createEmbed({ description: '❌ Bought item, but failed to create role. Check my permissions and role hierarchy.', color: THEME.error })] });
            }
        }

        return message.reply({ embeds: [createEmbed({ description: `✅ You purchased **${item.name}** for ${item.price.toLocaleString()} LC!`, color: THEME.success })] });
    },

    async interact(interaction, client) {
        const itemId = interaction.options.getString('item').toLowerCase();
        const item = SHOP_ITEMS.find(i => i.id === itemId);
        if (!item) return interaction.reply({ embeds: [createEmbed({ description: '❌ Invalid item ID. Check `/shop`.', color: THEME.error })], flags: 64 });

        const eco = getUserEconomy(interaction.guild.id, interaction.user.id);
        if (eco.wallet < item.price) return interaction.reply({ embeds: [createEmbed({ description: '❌ You don\'t have enough LC in your wallet!', color: THEME.error })], flags: 64 });

        eco.wallet -= item.price;
        updateUserEconomy(interaction.guild.id, interaction.user.id, eco);
        addItem(interaction.guild.id, interaction.user.id, item.id, item.duration);

        if (item.id === 'custom_role') {
            const color = interaction.options.getString('color') || '#8e44ad';
            const roleName = interaction.options.getString('name') || `${interaction.user.username}'s Role`;
            try {
                const role = await interaction.guild.roles.create({ name: roleName, color, reason: `Custom role purchased by ${interaction.user.tag}` });
                await interaction.member.roles.add(role);
            } catch (e) {
                return interaction.reply({ embeds: [createEmbed({ description: '❌ Bought item, but failed to create role. Check my permissions.', color: THEME.error })], flags: 64 });
            }
        }

        return interaction.reply({ embeds: [createEmbed({ description: `✅ You purchased **${item.name}** for ${item.price.toLocaleString()} LC!`, color: THEME.success })] });
    }
};