const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, THEME } = require('../../utils/embeds');
const { getUserEconomy, updateUserEconomy } = require('../../database/db');

const DAILY_AMOUNT = 500;
const COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours

module.exports = {
    name: 'daily',
    description: 'Claim your daily Lux Coins!',
    data: new SlashCommandBuilder()
        .setName('daily')
        .setDescription('Claim your daily Lux Coins!'),

    async execute(message, args, client) {
        const eco = getUserEconomy(message.guild.id, message.author.id);
        const now = Date.now();
        const timeLeft = eco.last_daily + COOLDOWN_MS - now;

        if (timeLeft > 0) {
            const timeLeftStr = `<t:${Math.floor((eco.last_daily + COOLDOWN_MS) / 1000)}:R>`;
            return message.reply({ embeds: [createEmbed({ 
                title: '🔥 Soul Collection',
                description: `⏳ Your soul vault is currently empty!\nCome back ${timeLeftStr} to collect more tribute.`, 
                color: THEME.accent,
                footer: { text: '🔥 Lucifer\'s Economy | Lord of Hell' }
            })] });
        }

        eco.wallet += DAILY_AMOUNT;
        eco.last_daily = now;
        updateUserEconomy(message.guild.id, message.author.id, eco);

        return message.reply({ embeds: [createEmbed({ 
            title: '🔥 Soul Collection',
            description: `✨ **The dark lord grants you tribute!**\n\n💸 You claimed **${DAILY_AMOUNT.toLocaleString()} LC**!\n💳 Wallet Balance: **${eco.wallet.toLocaleString()} LC**`, 
            color: THEME.success,
            footer: { text: '🔥 Lucifer\'s Economy | Lord of Hell' }
        })] });
    },

    async interact(interaction, client) {
        const eco = getUserEconomy(interaction.guild.id, interaction.user.id);
        const now = Date.now();
        const timeLeft = eco.last_daily + COOLDOWN_MS - now;

        if (timeLeft > 0) {
            const timeLeftStr = `<t:${Math.floor((eco.last_daily + COOLDOWN_MS) / 1000)}:R>`;
            return interaction.reply({ embeds: [createEmbed({ 
                title: '🔥 Soul Collection',
                description: `⏳ Your soul vault is currently empty!\nCome back ${timeLeftStr} to collect more tribute.`, 
                color: THEME.accent,
                footer: { text: '🔥 Lucifer\'s Economy | Lord of Hell' }
            })], flags: 64 });
        }

        eco.wallet += DAILY_AMOUNT;
        eco.last_daily = now;
        updateUserEconomy(interaction.guild.id, interaction.user.id, eco);

        return interaction.reply({ embeds: [createEmbed({ 
            title: '🔥 Soul Collection',
            description: `✨ **The dark lord grants you tribute!**\n\n💸 You claimed **${DAILY_AMOUNT.toLocaleString()} LC**!\n💳 Wallet Balance: **${eco.wallet.toLocaleString()} LC**`, 
            color: THEME.success,
            footer: { text: '🔥 Lucifer\'s Economy | Lord of Hell' }
        })] });
    }
};