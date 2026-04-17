const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, THEME } = require('../../utils/embeds');
const { getUserEconomy, updateUserEconomy } = require('../../database/db');

module.exports = {
    name: 'deposit',
    description: 'Deposit Lux Coins into your bank',
    aliases: ['dep'],
    data: new SlashCommandBuilder()
        .setName('deposit')
        .setDescription('Deposit Lux Coins into your bank')
        .addStringOption(o => o.setName('amount').setDescription('Amount to deposit or "max"').setRequired(true)),

    async execute(message, args, client) {
        const input = args[0];
        if (!input) return message.reply('⚠️ Usage: `l!deposit <amount | max>`');
        
        const eco = getUserEconomy(message.guild.id, message.author.id);
        const amount = input.toLowerCase() === 'max' || input.toLowerCase() === 'all' ? eco.wallet : parseInt(input);

        if (isNaN(amount) || amount <= 0) return message.reply({ embeds: [createEmbed({ description: '⚠️ Invalid amount.', color: THEME.error })] });
        if (eco.wallet < amount) return message.reply({ embeds: [createEmbed({ description: '⚠️ You don\'t have that much in your wallet!', color: THEME.error })] });

        eco.wallet -= amount;
        eco.bank += amount;
        updateUserEconomy(message.guild.id, message.author.id, eco);

        return message.reply({ embeds: [createEmbed({
            title: '🏦 The Infernal Bank',
            description: `✅ **Transaction Approved!**\n\n➡️ Deposited: **${amount.toLocaleString()} LC**\n💳 Wallet Balance: **${eco.wallet.toLocaleString()} LC**\n🏦 Bank Balance: **${eco.bank.toLocaleString()} LC**`,
            color: THEME.celestial,
            footer: { text: '🔥 Lucifer\'s Economy | Lord of Hell' }
        })] });
    },

    async interact(interaction, client) {
        const input = interaction.options.getString('amount');
        const eco = getUserEconomy(interaction.guild.id, interaction.user.id);
        const amount = input.toLowerCase() === 'max' || input.toLowerCase() === 'all' ? eco.wallet : parseInt(input);

        if (isNaN(amount) || amount <= 0) return interaction.reply({ embeds: [createEmbed({ description: '⚠️ Invalid amount.', color: THEME.error })], flags: 64 });
        if (eco.wallet < amount) return interaction.reply({ embeds: [createEmbed({ description: '⚠️ You don\'t have that much in your wallet!', color: THEME.error })], flags: 64 });

        eco.wallet -= amount;
        eco.bank += amount;
        updateUserEconomy(interaction.guild.id, interaction.user.id, eco);

        return interaction.reply({ embeds: [createEmbed({
            title: '🏦 The Infernal Bank',
            description: `✅ **Transaction Approved!**\n\n➡️ Deposited: **${amount.toLocaleString()} LC**\n💳 Wallet Balance: **${eco.wallet.toLocaleString()} LC**\n🏦 Bank Balance: **${eco.bank.toLocaleString()} LC**`,
            color: THEME.celestial,
            footer: { text: '🔥 Lucifer\'s Economy | Lord of Hell' }
        })] });
    }
};