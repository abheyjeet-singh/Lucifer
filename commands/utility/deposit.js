const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { createEmbed, THEME } = require('../../utils/embeds');
const { getUserEconomy, updateUserEconomy } = require('../../database/db');
const { buildReceiptCard } = require('../../utils/canvasBuilder');

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

        if (isNaN(amount) || amount <= 0) {
            try {
                const imageBuffer = await buildReceiptCard(message.member, 'Infernal Bank', 'ERROR', 'Invalid amount provided.', false);
                return message.reply({ files: [new AttachmentBuilder(imageBuffer, { name: 'deposit.png' })] });
            } catch { return message.reply({ embeds: [createEmbed({ context: message, description: '⚠️ Invalid amount.', color: THEME.error })] }); }
        }
        
        if (eco.wallet < amount) {
            try {
                const imageBuffer = await buildReceiptCard(message.member, 'Infernal Bank', 'INSUFFICIENT', 'You don\'t have that much in your wallet!', false);
                return message.reply({ files: [new AttachmentBuilder(imageBuffer, { name: 'deposit.png' })] });
            } catch { return message.reply({ embeds: [createEmbed({ context: message, description: '⚠️ Not enough LC in wallet!', color: THEME.error })] }); }
        }

        eco.wallet -= amount;
        eco.bank += amount;
        updateUserEconomy(message.guild.id, message.author.id, eco);

        const detail = `💳 Wallet: ${eco.wallet.toLocaleString()} LC\n🏦 Bank: ${eco.bank.toLocaleString()} LC`;
        try {
            const imageBuffer = await buildReceiptCard(message.member, 'Infernal Bank', `🏦 +${amount.toLocaleString()} LC`, detail, true);
            return message.reply({ files: [new AttachmentBuilder(imageBuffer, { name: 'deposit.png' })] });
        } catch { return message.reply({ embeds: [createEmbed({ context: message, description: `✅ Deposited **${amount.toLocaleString()} LC**.`, color: THEME.celestial })] }); }
    },

    async interact(interaction, client) {
        const input = interaction.options.getString('amount');
        const eco = getUserEconomy(interaction.guild.id, interaction.user.id);
        const amount = input.toLowerCase() === 'max' || input.toLowerCase() === 'all' ? eco.wallet : parseInt(input);

        if (isNaN(amount) || amount <= 0) {
            try {
                const imageBuffer = await buildReceiptCard(interaction.member, 'Infernal Bank', 'ERROR', 'Invalid amount provided.', false);
                return interaction.reply({ files: [new AttachmentBuilder(imageBuffer, { name: 'deposit.png' })], flags: 64 });
            } catch { return interaction.reply({ embeds: [createEmbed({ context: interaction, description: '⚠️ Invalid amount.', color: THEME.error })], flags: 64 }); }
        }

        if (eco.wallet < amount) {
            try {
                const imageBuffer = await buildReceiptCard(interaction.member, 'Infernal Bank', 'INSUFFICIENT', 'You don\'t have that much in your wallet!', false);
                return interaction.reply({ files: [new AttachmentBuilder(imageBuffer, { name: 'deposit.png' })], flags: 64 });
            } catch { return interaction.reply({ embeds: [createEmbed({ context: interaction, description: '⚠️ Not enough LC in wallet!', color: THEME.error })], flags: 64 }); }
        }

        eco.wallet -= amount;
        eco.bank += amount;
        updateUserEconomy(interaction.guild.id, interaction.user.id, eco);

        const detail = `💳 Wallet: ${eco.wallet.toLocaleString()} LC\n🏦 Bank: ${eco.bank.toLocaleString()} LC`;
        try {
            const imageBuffer = await buildReceiptCard(interaction.member, 'Infernal Bank', `🏦 +${amount.toLocaleString()} LC`, detail, true);
            return interaction.reply({ files: [new AttachmentBuilder(imageBuffer, { name: 'deposit.png' })] });
        } catch { return interaction.reply({ embeds: [createEmbed({ context: interaction, description: `✅ Deposited **${amount.toLocaleString()} LC**.`, color: THEME.celestial })] }); }
    }
};