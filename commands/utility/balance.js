const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { createEmbed, THEME } = require('../../utils/embeds');
const { getUserEconomy } = require('../../database/db');
const { buildBalanceCard } = require('../../utils/canvasBuilder');

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
        const member = await message.guild.members.fetch(target.id).catch(() => null);
        if (!member) return;

        const eco = getUserEconomy(message.guild.id, target.id);

        try {
            const imageBuffer = await buildBalanceCard(member, eco);
            const attachment = new AttachmentBuilder(imageBuffer, { name: 'balance.png' });
            return message.reply({ files: [attachment] });
        } catch (e) {
            console.error('Balance Canvas Error:', e);
            // Fallback to text embed if canvas fails
            const bannerURL = client.user.bannerURL({ size: 1024 }) || null;
            return message.reply({ embeds: [createEmbed({
                title: `👑 ${target.username}'s Vault`,
                description: `🔥 **Welcome to the Infernal Bank**\n\n💳 **Wallet:** ${formatCoins(eco.wallet)} LC\n🏦 **Bank:** ${formatCoins(eco.bank)} LC\n\n━━━━━━━━━━━━━━━━━━━\n💎 **Net Worth:** ${formatCoins(eco.bank + eco.wallet)} LC`,
                color: THEME.primary,
                image: bannerURL,
                footer: { text: '🔥 Lucifer\'s Economy | Lord of Hell' }
            })] });
        }
    },

    async interact(interaction, client) {
        const target = interaction.options.getUser('user') || interaction.user;
        const member = await interaction.guild.members.fetch(target.id).catch(() => null);
        if (!member) return interaction.reply({ embeds: [createEmbed({ context: interaction, description: '❌ User not found.', color: THEME.error })], flags: 64 });

        const eco = getUserEconomy(interaction.guild.id, target.id);

        try {
            const imageBuffer = await buildBalanceCard(member, eco);
            const attachment = new AttachmentBuilder(imageBuffer, { name: 'balance.png' });
            return interaction.reply({ files: [attachment] });
        } catch (e) {
            console.error('Balance Canvas Error:', e);
            // Fallback to text embed if canvas fails
            const bannerURL = client.user.bannerURL({ size: 1024 }) || null;
            return interaction.reply({ embeds: [createEmbed({
                title: `👑 ${target.username}'s Vault`,
                description: `🔥 **Welcome to the Infernal Bank**\n\n💳 **Wallet:** ${formatCoins(eco.wallet)} LC\n🏦 **Bank:** ${formatCoins(eco.bank)} LC\n\n━━━━━━━━━━━━━━━━━━━\n💎 **Net Worth:** ${formatCoins(eco.bank + eco.wallet)} LC`,
                color: THEME.primary,
                image: bannerURL,
                footer: { text: '🔥 Lucifer\'s Economy | Lord of Hell' }
            })], flags: 64 });
        }
    }
};