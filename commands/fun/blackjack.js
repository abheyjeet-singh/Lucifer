const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createEmbed, THEME } = require('../../utils/embeds');
const { getUserEconomy, updateUserEconomy } = require('../../database/db');

const SUITS = ['♠️', '♥️', '♦️', '♣️'];
const VALUES = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

function createDeck() {
    const deck = [];
    for (const suit of SUITS) for (const value of VALUES) deck.push({ suit, value });
    return deck.sort(() => Math.random() - 0.5); // Shuffle
}

function calculateHand(hand) {
    let value = 0;
    let aces = 0;
    for (const card of hand) {
        if (card.value === 'A') { aces++; value += 11; }
        else if (['K', 'Q', 'J'].includes(card.value)) value += 10;
        else value += parseInt(card.value);
    }
    while (value > 21 && aces > 0) { value -= 10; aces--; }
    return value;
}

function formatHand(hand, hideFirst = false) {
    return hand.map((c, i) => (i === 0 && hideFirst) ? '🂠' : `${c.value}${c.suit}`).join(' ');
}

module.exports = {
    name: 'blackjack',
    description: 'Play Blackjack against the Devil!',
    aliases: ['bj'],
    data: new SlashCommandBuilder()
        .setName('blackjack')
        .setDescription('Play Blackjack against the Devil!')
        .addStringOption(o => o.setName('amount').setDescription('Amount to bet or "all"').setRequired(true)),

    async execute(message, args, client) {
        const input = args[0];
        if (!input) return message.reply('⚠️ Usage: `l!blackjack <amount | all>`');

        const eco = getUserEconomy(message.guild.id, message.author.id);
        const bet = input.toLowerCase() === 'all' || input.toLowerCase() === 'max' ? eco.wallet : parseInt(input);

        if (isNaN(bet) || bet <= 0) return message.reply({ embeds: [createEmbed({ description: '⚠️ Invalid bet amount.', color: THEME.error })] });
        if (eco.wallet < bet) return message.reply({ embeds: [createEmbed({ description: '⚠️ Not enough Lux Coins in your wallet!', color: THEME.error })] });

        eco.wallet -= bet;
        updateUserEconomy(message.guild.id, message.author.id, eco);

        const deck = createDeck();
        const playerHand = [deck.pop(), deck.pop()];
        const dealerHand = [deck.pop(), deck.pop()];

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('bj_hit').setLabel('Hit').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('bj_stand').setLabel('Stand').setStyle(ButtonStyle.Danger)
        );

        const msg = await message.reply({ 
            components: [row],
            embeds: [createBJEmbed(playerHand, dealerHand, bet, false)]
        });

        startBJCollector(msg, message.author.id, deck, playerHand, dealerHand, bet, eco, message.guild.id);
    },

    async interact(interaction, client) {
        const input = interaction.options.getString('amount');
        const eco = getUserEconomy(interaction.guild.id, interaction.user.id);
        const bet = input.toLowerCase() === 'all' || input.toLowerCase() === 'max' ? eco.wallet : parseInt(input);

        if (isNaN(bet) || bet <= 0) return interaction.reply({ embeds: [createEmbed({ description: '⚠️ Invalid bet amount.', color: THEME.error })], flags: 64 });
        if (eco.wallet < bet) return interaction.reply({ embeds: [createEmbed({ description: '⚠️ Not enough Lux Coins in your wallet!', color: THEME.error })], flags: 64 });

        eco.wallet -= bet;
        updateUserEconomy(interaction.guild.id, interaction.user.id, eco);

        const deck = createDeck();
        const playerHand = [deck.pop(), deck.pop()];
        const dealerHand = [deck.pop(), deck.pop()];

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('bj_hit').setLabel('Hit').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('bj_stand').setLabel('Stand').setStyle(ButtonStyle.Danger)
        );

        await interaction.reply({ 
            components: [row],
            embeds: [createBJEmbed(playerHand, dealerHand, bet, false)]
        });

        const msg = await interaction.fetchReply();
        startBJCollector(msg, interaction.user.id, deck, playerHand, dealerHand, bet, eco, interaction.guild.id, interaction);
    }
};

function createBJEmbed(playerHand, dealerHand, bet, gameOver, resultText = '') {
    const playerValue = calculateHand(playerHand);
    const dealerValue = calculateHand(dealerHand);
    let desc = '';

    if (gameOver) {
        desc = `**👑 Dealer's Hand** (${dealerValue})\n> ${formatHand(dealerHand)}\n\n**🃏 Your Hand** (${playerValue})\n> ${formatHand(playerHand)}\n\n━━━━━━━━━━━━━━━━━━━\n${resultText}\n💸 Bet: **${bet.toLocaleString()} LC**`;
    } else {
        desc = `**👑 Dealer's Hand** (?)\n> ${formatHand(dealerHand, true)}\n\n**🃏 Your Hand** (${playerValue})\n> ${formatHand(playerHand)}\n\n━━━━━━━━━━━━━━━━━━━\n🔥 Click **Hit** or **Stand**\n💸 Bet: **${bet.toLocaleString()} LC**`;
    }

    return createEmbed({
        title: '🃏 Devil\'s Blackjack',
        description: desc,
        color: gameOver ? (resultText.includes('Won') ? THEME.success : THEME.error) : THEME.primary,
        footer: { text: '🔥 The Devil\'s Casino' }
    });
}

function startBJCollector(msg, userId, deck, playerHand, dealerHand, bet, eco, guildId, interaction = null) {
    const filter = i => i.user.id === userId && (i.customId === 'bj_hit' || i.customId === 'bj_stand');
    
    const collector = msg.createMessageComponentCollector({ filter, time: 60000 });

    collector.on('collect', async (i) => {
        await i.deferUpdate();

        if (i.customId === 'bj_hit') {
            playerHand.push(deck.pop());
            const playerValue = calculateHand(playerHand);

            if (playerValue > 21) {
                collector.stop('bust');
            } else if (playerValue === 21) {
                collector.stop('stand');
            } else {
                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('bj_hit').setLabel('Hit').setStyle(ButtonStyle.Primary),
                    new ButtonBuilder().setCustomId('bj_stand').setLabel('Stand').setStyle(ButtonStyle.Danger)
                );
                await msg.edit({ components: [row], embeds: [createBJEmbed(playerHand, dealerHand, bet, false)] });
            }
        } else if (i.customId === 'bj_stand') {
            collector.stop('stand');
        }
    });

    collector.on('end', async (collected, reason) => {
        // If they just didn't click anything in time, it's a stand
        const finalReason = reason === 'time' ? 'stand' : reason;

        const playerValue = calculateHand(playerHand);
        let resultText = '';
        let winAmount = 0;

        if (finalReason === 'bust') {
            resultText = '💀 **BUST!** You went over 21.';
        } else {
            // Dealer plays
            while (calculateHand(dealerHand) < 17) {
                dealerHand.push(deck.pop());
            }
            const dealerValue = calculateHand(dealerHand);

            if (dealerValue > 21) {
                winAmount = bet * 2;
                resultText = `✨ **Dealer Busted!** You won!`;
            } else if (playerValue > dealerValue) {
                winAmount = bet * 2;
                resultText = `✨ **You Won!** ${playerValue} beats ${dealerValue}.`;
            } else if (playerValue === dealerValue) {
                winAmount = bet; // Push
                resultText = `🤝 **Push!** Tied at ${playerValue}. Bet returned.`;
            } else {
                winAmount = 0;
                resultText = `💀 **Dealer Wins.** ${dealerValue} beats ${playerValue}.`;
            }
        }

        if (winAmount > 0) {
            eco.wallet += winAmount;
            updateUserEconomy(guildId, userId, eco);
        }

        resultText += `\n💳 Wallet: **${eco.wallet.toLocaleString()} LC**`;

        try {
            await msg.edit({ 
                components: [], 
                embeds: [createBJEmbed(playerHand, dealerHand, bet, true, resultText)] 
            });
        } catch (e) {}
    });
}