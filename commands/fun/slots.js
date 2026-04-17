const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, THEME } = require('../../utils/embeds');
const { getUserEconomy, updateUserEconomy } = require('../../database/db');

const SYMBOLS = ['👑', '🔥', '💀', '🍒', '🍋'];
const MULTIPLIERS = { '👑': 10, '🔥': 5, '💀': 3, '🍒': 2 }; // 🍋 is a dud!

function getRand() { return SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]; }

// ── Animation Frames ──
const spinFrames = [
    '🔄 | 🔄 | 🔄',
    '🔥 | 💀 | 🍋',
    '👑 | 🔥 | 🍒',
];

module.exports = {
    name: 'slots',
    description: 'Gamble your Lux Coins at the Devil\'s Casino!',
    aliases: ['slot', 'gamble'],
    data: new SlashCommandBuilder()
        .setName('slots')
        .setDescription('Gamble your Lux Coins at the Devil\'s Casino!')
        .addStringOption(o => o.setName('amount').setDescription('Amount to bet or "all"').setRequired(true)),

    async execute(message, args, client) {
        const input = args[0];
        if (!input) return message.reply('⚠️ Usage: `l!slots <amount | all>`');

        const eco = getUserEconomy(message.guild.id, message.author.id);
        const bet = input.toLowerCase() === 'all' || input.toLowerCase() === 'max' ? eco.wallet : parseInt(input);

        if (isNaN(bet) || bet <= 0) return message.reply({ embeds: [createEmbed({ description: '⚠️ Invalid bet amount.', color: THEME.error })] });
        if (eco.wallet < bet) return message.reply({ embeds: [createEmbed({ description: '⚠️ You don\'t have enough Lux Coins in your wallet!', color: THEME.error })] });

        // Deduct bet immediately to prevent double-gambling
        eco.wallet -= bet;
        updateUserEconomy(message.guild.id, message.author.id, eco);

        // Send initial spinning message
        const slotMsg = await message.reply({ 
            embeds: [createEmbed({
                title: '🎰 The Devil\'s Casino',
                description: `> 🔄 | 🔄 | 🔄\n\n**Spinning the reels...**\n💸 Bet: **${bet.toLocaleString()} LC**`,
                color: THEME.celestial,
                footer: { text: '🔥 Lucifer\'s Economy | Lord of Hell' }
            })]
        });

        await runSlotAnimation(slotMsg, eco, bet, message.author.id, message.guild.id);
    },

    async interact(interaction, client) {
        const input = interaction.options.getString('amount');
        const eco = getUserEconomy(interaction.guild.id, interaction.user.id);
        const bet = input.toLowerCase() === 'all' || input.toLowerCase() === 'max' ? eco.wallet : parseInt(input);

        if (isNaN(bet) || bet <= 0) return interaction.reply({ embeds: [createEmbed({ description: '⚠️ Invalid bet amount.', color: THEME.error })], flags: 64 });
        if (eco.wallet < bet) return interaction.reply({ embeds: [createEmbed({ description: '⚠️ You don\'t have enough Lux Coins in your wallet!', color: THEME.error })], flags: 64 });

        // Deduct bet immediately
        eco.wallet -= bet;
        updateUserEconomy(interaction.guild.id, interaction.user.id, eco);

        // Defer reply so we can edit it for the animation
        await interaction.deferReply();

        const slotMsg = await interaction.fetchReply();
        await runSlotAnimation(slotMsg, eco, bet, interaction.user.id, interaction.guild.id, interaction);
    }
};

// ════════════════════════════════════════
// ── ANIMATION LOGIC ──
// ════════════════════════════════════════

async function runSlotAnimation(slotMsg, eco, bet, userId, guildId, interaction = null) {
    const r1 = getRand();
    const r2 = getRand();
    const r3 = getRand();

    // Frame 1: Fast Spin
    await editSlotMessage(slotMsg, spinFrames[0], bet, THEME.celestial);
    await sleep(1000);

    // Frame 2: Fast Spin
    await editSlotMessage(slotMsg, spinFrames[1], bet, THEME.celestial);
    await sleep(1000);

    // Frame 3: First reel locks in
    await editSlotMessage(slotMsg, `${r1} | 🔄 | 🔄`, bet, THEME.celestial, r1);
    await sleep(1000);

    // Frame 4: Second reel locks in
    await editSlotMessage(slotMsg, `${r1} | ${r2} | 🔄`, bet, THEME.celestial, `${r1} ${r2}`);
    await sleep(1200);

    // ═══ FINAL RESULT ═══
    let winAmount = 0;
    let resultText = '';
    let resultColor = THEME.error;

    if (r1 === r2 && r2 === r3) {
        const mult = MULTIPLIERS[r1] || 0;
        winAmount = bet * mult;
        resultText = `🎉 **JACKPOT!** You matched 3x ${r1}!\n\n💰 **Won:** ${winAmount.toLocaleString()} LC`;
        resultColor = THEME.success;
    } else if (r1 === r2 || r2 === r3 || r1 === r3) {
        winAmount = Math.floor(bet * 1.5); // 1.5x for 2 matching
        resultText = `✨ **Small Win!** You matched 2 symbols!\n\n💰 **Won:** ${winAmount.toLocaleString()} LC`;
        resultColor = THEME.primary;
    } else {
        winAmount = 0;
        resultText = `💀 **Better luck next time!** No matches.\n\n💸 **Lost:** ${bet.toLocaleString()} LC`;
    }

    // Pay out winnings
    if (winAmount > 0) {
        eco.wallet += winAmount;
        updateUserEconomy(guildId, userId, eco);
    }

    // Final Edit
    const finalDesc = `> ${r1} | ${r2} | ${r3}\n\n${resultText}\n💳 **Wallet Balance:** ${eco.wallet.toLocaleString()} LC`;

    try {
        if (interaction) {
            await interaction.editReply({ 
                embeds: [createEmbed({
                    title: '🎰 The Devil\'s Casino',
                    description: finalDesc,
                    color: resultColor,
                    footer: { text: '🔥 Lucifer\'s Economy | Lord of Hell' }
                })]
            });
        } else {
            await slotMsg.edit({ 
                embeds: [createEmbed({
                    title: '🎰 The Devil\'s Casino',
                    description: finalDesc,
                    color: resultColor,
                    footer: { text: '🔥 Lucifer\'s Economy | Lord of Hell' }
                })]
            });
        }
    } catch (e) {
        console.error('Slot Animation Edit Error:', e);
    }
}

async function editSlotMessage(msg, reels, bet, color, lockedEmoji = null) {
    let desc = `> ${reels}\n\n**Spinning the reels...**\n💸 Bet: **${bet.toLocaleString()} LC**`;
    if (lockedEmoji) desc += `\n🔒 Locked: ${lockedEmoji}`;

    try {
        // Check if it's an interaction reply or a normal message
        if (msg.editReply) {
            await msg.editReply({ 
                embeds: [createEmbed({
                    title: '🎰 The Devil\'s Casino',
                    description: desc,
                    color: color,
                    footer: { text: '🔥 Lucifer\'s Economy | Lord of Hell' }
                })]
            });
        } else {
            await msg.edit({ 
                embeds: [createEmbed({
                    title: '🎰 The Devil\'s Casino',
                    description: desc,
                    color: color,
                    footer: { text: '🔥 Lucifer\'s Economy | Lord of Hell' }
                })]
            });
        }
    } catch (e) {
        // Ignore API errors if message was deleted during animation
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}