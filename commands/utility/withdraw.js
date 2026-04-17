const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, THEME } = require('../../utils/embeds');
const { getUserEconomy, updateUserEconomy } = require('../../database/db');

module.exports = {
    name: 'withdraw',
    description: 'Withdraw Lux Coins from your bank',
    aliases: ['with'],
    data: new SlashCommandBuilder()
        .setName('withdraw')
        .setDescription('Withdraw Lux Coins from your bank')
        .addStringOption(o => o.setName('amount').setDescription('Amount to withdraw or "all"').setRequired(true)),

    async execute(message, args, client) {
        const input = args[0];
        if (!input) return message.reply('⚠️ Usage: `l!withdraw <amount | all>`');
        
        const eco = getUserEconomy(message.guild.id, message.author.id);
        const amount = input.toLowerCase() === 'all' || input.toLowerCase() === 'max' ? eco.bank : parseInt(input);

        if (isNaN(amount) || amount <= 0) return message.reply({ embeds: [createEmbed({ description: '⚠️ Invalid amount.', color: THEME.error })] });
        if (eco.bank < amount) return message.reply({ embeds: [createEmbed({ description: '⚠️ You don\'t have that much in your bank!', color: THEME.error })] });

        eco.bank -= amount;
        eco.wallet += amount;
        updateUserEconomy(message.guild.id, message.author.id, eco);

        return message.reply({ embeds: [createEmbed({
            title: '🏦 The Infernal Bank',
            description: `💸 **Withdrawal Complete!**\n\n⬅️ Withdrew: **${amount.toLocaleString()} LC**\n💳 Wallet Balance: **${eco.wallet.toLocaleString()} LC**\n🏦 Bank Balance: **${eco.bank.toLocaleString()} LC**`,
            color: THEME.accent,
            footer: { text: '🔥 Lucifer\'s Economy | Lord of Hell' }
        })] });
    },

    async interact(interaction, client) {
        const input = interaction.options.getString('amount');
        const eco = getUserEconomy(interaction.guild.id, interaction.user.id);
        const amount = input.toLowerCase() === 'all' || input.toLowerCase() === 'max' ? eco.bank : parseInt(input);

        if (isNaN(amount) || amount <= 0) return interaction.reply({ embeds: [createEmbed({ description: '⚠️ Invalid amount.', color: THEME.error })], flags: 64 });
        if (eco.bank < amount) return interaction.reply({ embeds: [createEmbed({ description: '⚠️ You don\'t have that much in your bank!', color: THEME.error })], flags: 64 });

        eco.bank -= amount;
        eco.wallet += amount;
        updateUserEconomy(interaction.guild.id, interaction.user.id, eco);

        return interaction.reply({ embeds: [createEmbed({
            title: '🏦 The Infernal Bank',
            description: `💸 **Withdrawal Complete!**\n\n⬅️ Withdrew: **${amount.toLocaleString()} LC**\n💳 Wallet Balance: **${eco.wallet.toLocaleString()} LC**\n🏦 Bank Balance: **${eco.bank.toLocaleString()} LC**`,
            color: THEME.accent,
            footer: { text: '🔥 Lucifer\'s Economy | Lord of Hell' }
        })] });
    }
};