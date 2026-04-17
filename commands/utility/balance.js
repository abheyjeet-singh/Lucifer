const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, THEME } = require('../../utils/embeds');
const { getUserEconomy } = require('../../database/db');

function formatCoins(amount) {
    return amount.toLocaleString();
}

module.exports = {
    name: 'balance',
    description: 'Check your Lux Coins balance',
    aliases: ['bal', 'wallet'],
    data: new SlashCommandBuilder()
        .setName('balance')
        .setDescription('Check your Lux Coins balance')
        .addUserOption(o => o.setName('user').setDescription('Check someone else\'s balance')),

    async execute(message, args, client) {
        const target = message.mentions.users.first() || message.author;
        const eco = getUserEconomy(message.guild.id, target.id);
        
        await client.user.fetch(true).catch(() => {});
        const bannerURL = client.user.bannerURL({ size: 1024 }) || null;

        return message.reply({ embeds: [createEmbed({
            title: `👑 ${target.username}'s Vault`,
            description: `🔥 **Welcome to the Infernal Bank**\n\n💳 **Wallet:** ${formatCoins(eco.wallet)} LC\n🏦 **Bank:** ${formatCoins(eco.bank)} LC\n\n━━━━━━━━━━━━━━━━━━━\n💎 **Net Worth:** ${formatCoins(eco.bank + eco.wallet)} LC`,
            color: THEME.primary,
            image: bannerURL,
            footer: { text: '🔥 Lucifer\'s Economy | Lord of Hell' }
        })] });
    },

    async interact(interaction, client) {
        const target = interaction.options.getUser('user') || interaction.user;
        const eco = getUserEconomy(interaction.guild.id, target.id);
        
        await client.user.fetch(true).catch(() => {});
        const bannerURL = client.user.bannerURL({ size: 1024 }) || null;

        return interaction.reply({ embeds: [createEmbed({
            title: `👑 ${target.username}'s Vault`,
            description: `🔥 **Welcome to the Infernal Bank**\n\n💳 **Wallet:** ${formatCoins(eco.wallet)} LC\n🏦 **Bank:** ${formatCoins(eco.bank)} LC\n\n━━━━━━━━━━━━━━━━━━━\n💎 **Net Worth:** ${formatCoins(eco.bank + eco.wallet)} LC`,
            color: THEME.primary,
            image: bannerURL,
            footer: { text: '🔥 Lucifer\'s Economy | Lord of Hell' }
        })] });
    }
};