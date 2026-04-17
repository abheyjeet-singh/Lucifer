const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, THEME } = require('../../utils/embeds');
const { getUserEconomy, updateUserEconomy } = require('../../database/db');

module.exports = {
    name: 'roulette',
    description: 'Spin the Devil\'s Roulette wheel!',
    aliases: ['roul'],
    data: new SlashCommandBuilder()
        .setName('roulette')
        .setDescription('Spin the Devil\'s Roulette wheel!')
        .addStringOption(o => o.setName('amount').setDescription('Amount to bet or "all"').setRequired(true))
        .addStringOption(o => o.setName('color').setDescription('Pick your color').setRequired(true).addChoices({ name: '🔴 Red (2x)', value: 'red' }, { name: '⚫ Black (2x)', value: 'black' }, { name: '🟢 Green (14x)', value: 'green' })),

    async execute(message, args, client) {
        const amountInput = args[0];
        const colorInput = args[1]?.toLowerCase();
        if (!amountInput || !colorInput) return message.reply('⚠️ Usage: `l!roulette <amount | all> <red | black | green>`');
        if (!['red', 'black', 'green'].includes(colorInput)) return message.reply('⚠️ Choose `red`, `black`, or `green`.');

        const eco = getUserEconomy(message.guild.id, message.author.id);
        const bet = amountInput.toLowerCase() === 'all' || amountInput.toLowerCase() === 'max' ? eco.wallet : parseInt(amountInput);

        if (isNaN(bet) || bet <= 0) return message.reply({ embeds: [createEmbed({ description: '⚠️ Invalid bet amount.', color: THEME.error })] });
        if (eco.wallet < bet) return message.reply({ embeds: [createEmbed({ description: '⚠️ Not enough Lux Coins in your wallet!', color: THEME.error })] });

        eco.wallet -= bet;
        updateUserEconomy(message.guild.id, message.author.id, eco);

        const colorEmoji = colorInput === 'red' ? '🔴' : colorInput === 'black' ? '⚫' : '🟢';
        const roulMsg = await message.reply({ embeds: [createEmbed({ title: '🎡 Devil\'s Roulette', description: `> 🔄 The wheel is spinning...\n\n💸 Bet: **${bet.toLocaleString()} LC**\n🎯 Choice: **${colorEmoji} ${colorInput.charAt(0).toUpperCase() + colorInput.slice(1)}**`, color: THEME.celestial, footer: { text: '🔥 The Devil\'s Casino' } })] });

        await sleep(3000);

        const rand = Math.random();
        let resultColor, resultEmoji;
        if (rand < 0.45) { resultColor = 'red'; resultEmoji = '🔴'; } 
        else if (rand < 0.90) { resultColor = 'black'; resultEmoji = '⚫'; } 
        else { resultColor = 'green'; resultEmoji = '🟢'; }

        const won = resultColor === colorInput;
        let winAmount = 0;
        let desc = '';

        if (won) {
            winAmount = resultColor === 'green' ? bet * 14 : bet * 2;
            eco.wallet += winAmount;
            updateUserEconomy(message.guild.id, message.author.id, eco);
            desc = `> The ball landed on ${resultEmoji} **${resultColor}**!\n\n✨ **JACKPOT!**\n💰 **+${winAmount.toLocaleString()} LC**`;
        } else {
            desc = `> The ball landed on ${resultEmoji} **${resultColor}**!\n\n💀 **You Lost!**\n💸 **-${bet.toLocaleString()} LC**`;
        }

        await roulMsg.edit({ embeds: [createEmbed({ title: '🎡 Devil\'s Roulette', description: `${desc}\n💳 Wallet: **${eco.wallet.toLocaleString()} LC**`, color: won ? THEME.success : THEME.error, footer: { text: '🔥 The Devil\'s Casino' } })] });
    },

    async interact(interaction, client) {
        const amountInput = interaction.options.getString('amount');
        const colorInput = interaction.options.getString('color');
        const eco = getUserEconomy(interaction.guild.id, interaction.user.id);
        const bet = amountInput.toLowerCase() === 'all' || amountInput.toLowerCase() === 'max' ? eco.wallet : parseInt(amountInput);

        if (isNaN(bet) || bet <= 0) return interaction.reply({ embeds: [createEmbed({ description: '⚠️ Invalid bet amount.', color: THEME.error })], flags: 64 });
        if (eco.wallet < bet) return interaction.reply({ embeds: [createEmbed({ description: '⚠️ Not enough Lux Coins in your wallet!', color: THEME.error })], flags: 64 });

        eco.wallet -= bet;
        updateUserEconomy(interaction.guild.id, interaction.user.id, eco);
        await interaction.deferReply();

        const roulMsg = await interaction.fetchReply();
        const colorEmoji = colorInput === 'red' ? '🔴' : colorInput === 'black' ? '⚫' : '🟢';
        await roulMsg.edit({ embeds: [createEmbed({ title: '🎡 Devil\'s Roulette', description: `> 🔄 The wheel is spinning...\n\n💸 Bet: **${bet.toLocaleString()} LC**\n🎯 Choice: **${colorEmoji} ${colorInput.charAt(0).toUpperCase() + colorInput.slice(1)}**`, color: THEME.celestial, footer: { text: '🔥 The Devil\'s Casino' } })] });

        await sleep(3000);

        const rand = Math.random();
        let resultColor, resultEmoji;
        if (rand < 0.45) { resultColor = 'red'; resultEmoji = '🔴'; } 
        else if (rand < 0.90) { resultColor = 'black'; resultEmoji = '⚫'; } 
        else { resultColor = 'green'; resultEmoji = '🟢'; }

        const won = resultColor === colorInput;
        let winAmount = 0;
        let desc = '';

        if (won) {
            winAmount = resultColor === 'green' ? bet * 14 : bet * 2;
            eco.wallet += winAmount;
            updateUserEconomy(interaction.guild.id, interaction.user.id, eco);
            desc = `> The ball landed on ${resultEmoji} **${resultColor}**!\n\n✨ **JACKPOT!**\n💰 **+${winAmount.toLocaleString()} LC**`;
        } else {
            desc = `> The ball landed on ${resultEmoji} **${resultColor}**!\n\n💀 **You Lost!**\n💸 **-${bet.toLocaleString()} LC**`;
        }

        await interaction.editReply({ embeds: [createEmbed({ title: '🎡 Devil\'s Roulette', description: `${desc}\n💳 Wallet: **${eco.wallet.toLocaleString()} LC**`, color: won ? THEME.success : THEME.error, footer: { text: '🔥 The Devil\'s Casino' } })] });
    }
};

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }