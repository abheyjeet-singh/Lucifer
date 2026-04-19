const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { createEmbed, THEME } = require('../../utils/embeds');
const { getUserEconomy, updateUserEconomy } = require('../../database/db');
const { buildReceiptCard } = require('../../utils/canvasBuilder');

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

        if (isNaN(amount) || amount <= 0) {
            try {
                const imageBuffer = await buildReceiptCard(message.member, 'Infernal Bank', 'ERROR', 'Invalid amount provided.', false);
                return message.reply({ files: [new AttachmentBuilder(imageBuffer, { name: 'withdraw.png' })] });
            } catch { return message.reply({ embeds: [createEmbed({ context: message, description: '⚠️ Invalid amount.', color: THEME.error })] }); }
        }

        if (eco.bank < amount) {
            try {
                const imageBuffer = await buildReceiptCard(message.member, 'Infernal Bank', 'INSUFFICIENT', 'You don\'t have that much in your bank!', false);
                return message.reply({ files: [new AttachmentBuilder(imageBuffer, { name: 'withdraw.png' })] });
            } catch { return message.reply({ embeds: [createEmbed({ context: message, description: '⚠️ Not enough LC in bank!', color: THEME.error })] }); }
        }

        eco.bank -= amount;
        eco.wallet += amount;
        updateUserEconomy(message.guild.id, message.author.id, eco);

        const detail = `🏦 Bank: ${eco.bank.toLocaleString()} LC\n💳 Wallet: ${eco.wallet.toLocaleString()} LC`;
        try {
            const imageBuffer = await buildReceiptCard(message.member, 'Infernal Bank', `💳 +${amount.toLocaleString()} LC`, detail, true);
            return message.reply({ files: [new AttachmentBuilder(imageBuffer, { name: 'withdraw.png' })] });
        } catch { return message.reply({ embeds: [createEmbed({ context: message, description: `💸 Withdrew **${amount.toLocaleString()} LC**.`, color: THEME.accent })] }); }
    },

    async interact(interaction, client) {
        const input = interaction.options.getString('amount');
        const eco = getUserEconomy(interaction.guild.id, interaction.user.id);
        const amount = input.toLowerCase() === 'all' || input.toLowerCase() === 'max' ? eco.bank : parseInt(input);

        if (isNaN(amount) || amount <= 0) {
            try {
                const imageBuffer = await buildReceiptCard(interaction.member, 'Infernal Bank', 'ERROR', 'Invalid amount provided.', false);
                return interaction.reply({ files: [new AttachmentBuilder(imageBuffer, { name: 'withdraw.png' })], flags: 64 });
            } catch { return interaction.reply({ embeds: [createEmbed({ context: interaction, description: '⚠️ Invalid amount.', color: THEME.error })], flags: 64 }); }
        }

        if (eco.bank < amount) {
            try {
                const imageBuffer = await buildReceiptCard(interaction.member, 'Infernal Bank', 'INSUFFICIENT', 'You don\'t have that much in your bank!', false);
                return interaction.reply({ files: [new AttachmentBuilder(imageBuffer, { name: 'withdraw.png' })], flags: 64 });
            } catch { return interaction.reply({ embeds: [createEmbed({ context: interaction, description: '⚠️ Not enough LC in bank!', color: THEME.error })], flags: 64 }); }
        }

        eco.bank -= amount;
        eco.wallet += amount;
        updateUserEconomy(interaction.guild.id, interaction.user.id, eco);

        const detail = `🏦 Bank: ${eco.bank.toLocaleString()} LC\n💳 Wallet: ${eco.wallet.toLocaleString()} LC`;
        try {
            const imageBuffer = await buildReceiptCard(interaction.member, 'Infernal Bank', `💳 +${amount.toLocaleString()} LC`, detail, true);
            return interaction.reply({ files: [new AttachmentBuilder(imageBuffer, { name: 'withdraw.png' })] });
        } catch { return interaction.reply({ embeds: [createEmbed({ context: interaction, description: `💸 Withdrew **${amount.toLocaleString()} LC**.`, color: THEME.accent })] }); }
    }
};