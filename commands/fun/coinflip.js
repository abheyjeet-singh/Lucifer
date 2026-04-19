const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, THEME } = require('../../utils/embeds');
const { getUserEconomy, updateUserEconomy } = require('../../database/db');

module.exports = {
    name: 'coinflip',
    description: 'Flip a coin for Lux Coins!',
    aliases: ['cf'],
    data: new SlashCommandBuilder()
        .setName('coinflip')
        .setDescription('Flip a coin for Lux Coins!')
        .addStringOption(o => o.setName('amount').setDescription('Amount to bet or "all"').setRequired(true))
        .addStringOption(o => o.setName('choice').setDescription('Heads or Tails').setRequired(true).addChoices({ name: '👑 Heads', value: 'heads' }, { name: '💀 Tails', value: 'tails' })),

    async execute(message, args, client) {
        const amountInput = args[0];
        const choiceInput = args[1]?.toLowerCase();
        if (!amountInput || !choiceInput) return message.reply('⚠️ Usage: `l!coinflip <amount | all> <heads | tails>`');
        if (!['heads', 'tails'].includes(choiceInput)) return message.reply('⚠️ Choose `heads` or `tails`.');

        const eco = getUserEconomy(message.guild.id, message.author.id);
        const bet = amountInput.toLowerCase() === 'all' || amountInput.toLowerCase() === 'max' ? eco.wallet : parseInt(amountInput);

        if (isNaN(bet) || bet <= 0) return message.reply({ embeds: [createEmbed({ context: message, description: '⚠️ Invalid bet amount.', color: THEME.error })] });
        if (eco.wallet < bet) return message.reply({ embeds: [createEmbed({ context: message, description: '⚠️ Not enough Lux Coins in your wallet!', color: THEME.error })] });

        eco.wallet -= bet;
        updateUserEconomy(message.guild.id, message.author.id, eco);

        const flipMsg = await message.reply({ embeds: [createEmbed({ context: message, title: '🪙 Coinflip', description: `> 🔄 The coin is spinning...\n\n💸 Bet: **${bet.toLocaleString()} LC**\n🎯 Choice: **${choiceInput === 'heads' ? '👑 Heads' : '💀 Tails'}**`, color: THEME.celestial, footer: { text: '🔥 The Devil\'s Casino' } })] });

        await sleep(2000);

        const result = Math.random() < 0.5 ? 'heads' : 'tails';
        const won = result === choiceInput;
        const winAmount = bet * 2;
        let desc = '';

        if (won) {
            eco.wallet += winAmount;
            updateUserEconomy(message.guild.id, message.author.id, eco);
            desc = `> ${result === 'heads' ? '👑' : '💀'} It landed on **${result}**!\n\n✨ **You Won!**\n💰 **+${winAmount.toLocaleString()} LC**`;
        } else {
            desc = `> ${result === 'heads' ? '👑' : '💀'} It landed on **${result}**!\n\n💀 **You Lost!**\n💸 **-${bet.toLocaleString()} LC**`;
        }

        await flipMsg.edit({ embeds: [createEmbed({ context: guild, title: '🪙 Coinflip', description: `${desc}\n💳 Wallet: **${eco.wallet.toLocaleString()} LC**`, color: won ? THEME.success : THEME.error, footer: { text: '🔥 The Devil\'s Casino' } })] });
    },

    async interact(interaction, client) {
        const amountInput = interaction.options.getString('amount');
        const choiceInput = interaction.options.getString('choice');
        const eco = getUserEconomy(interaction.guild.id, interaction.user.id);
        const bet = amountInput.toLowerCase() === 'all' || amountInput.toLowerCase() === 'max' ? eco.wallet : parseInt(amountInput);

        if (isNaN(bet) || bet <= 0) return interaction.reply({ embeds: [createEmbed({ context: interaction, description: '⚠️ Invalid bet amount.', color: THEME.error })], flags: 64 });
        if (eco.wallet < bet) return interaction.reply({ embeds: [createEmbed({ context: interaction, description: '⚠️ Not enough Lux Coins in your wallet!', color: THEME.error })], flags: 64 });

        eco.wallet -= bet;
        updateUserEconomy(interaction.guild.id, interaction.user.id, eco);
        await interaction.deferReply();

        const flipMsg = await interaction.fetchReply();
        await flipMsg.edit({ embeds: [createEmbed({ context: guild, title: '🪙 Coinflip', description: `> 🔄 The coin is spinning...\n\n💸 Bet: **${bet.toLocaleString()} LC**\n🎯 Choice: **${choiceInput === 'heads' ? '👑 Heads' : '💀 Tails'}**`, color: THEME.celestial, footer: { text: '🔥 The Devil\'s Casino' } })] });

        await sleep(2000);

        const result = Math.random() < 0.5 ? 'heads' : 'tails';
        const won = result === choiceInput;
        const winAmount = bet * 2;
        let desc = '';

        if (won) {
            eco.wallet += winAmount;
            updateUserEconomy(interaction.guild.id, interaction.user.id, eco);
            desc = `> ${result === 'heads' ? '👑' : '💀'} It landed on **${result}**!\n\n✨ **You Won!**\n💰 **+${winAmount.toLocaleString()} LC**`;
        } else {
            desc = `> ${result === 'heads' ? '👑' : '💀'} It landed on **${result}**!\n\n💀 **You Lost!**\n💸 **-${bet.toLocaleString()} LC**`;
        }

        await interaction.editReply({ embeds: [createEmbed({ context: guild, title: '🪙 Coinflip', description: `${desc}\n💳 Wallet: **${eco.wallet.toLocaleString()} LC**`, color: won ? THEME.success : THEME.error, footer: { text: '🔥 The Devil\'s Casino' } })] });
    }
};

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }