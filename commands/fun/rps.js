const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { createEmbed, THEME } = require('../../utils/embeds');
const { getUserEconomy, updateUserEconomy } = require('../../database/db');

function getEmoji(choice) {
    if (choice === 'rock') return '🪨';
    if (choice === 'paper') return '📄';
    if (choice === 'scissors') return '✂️';
    return '❓';
}

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

module.exports = {
    name: 'rps',
    description: 'Challenge someone to Rock Paper Scissors for Lux Coins!',
    aliases: ['rockpaperscissors'],
    data: new SlashCommandBuilder()
        .setName('rps')
        .setDescription('Challenge someone to Rock Paper Scissors for Lux Coins!')
        .addUserOption(o => o.setName('target').setDescription('Who are you challenging?').setRequired(true)),

    async execute(message, args, client) {
        const target = message.mentions.users.first();
        if (!target) return message.reply('⚠️ Usage: `l!rps @user`');
        
        if (target.id === message.author.id) return message.reply({ embeds: [createEmbed({ description: '⚠️ You cannot challenge yourself!', color: THEME.error })] });
        if (target.bot) return message.reply({ embeds: [createEmbed({ description: '⚠️ Bots cannot play!', color: THEME.error })] });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`rps_accept_${message.author.id}_${target.id}`).setLabel('⚔️ Accept Challenge').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId(`rps_decline_${message.author.id}_${target.id}`).setLabel('✖️ Decline').setStyle(ButtonStyle.Danger)
        );

        const msg = await message.reply({ 
            content: `⚔️ <@${target.id}>, you have been challenged!`,
            components: [row], 
            embeds: [createEmbed({
                title: '⚔️ Rock Paper Scissors',
                description: `🔥 **${message.author.username}** challenged **${target.username}**!\n\n> ${target.username}, click Accept to set your bet!`,
                color: THEME.accent,
                footer: { text: '🔥 The Devil\'s Casino | 2m to accept' }
            })]
        });

        startRPSGame(msg, message.author, target, message.guild.id);
    },

    async interact(interaction, client) {
        const target = interaction.options.getUser('target');
        
        if (target.id === interaction.user.id) return interaction.reply({ embeds: [createEmbed({ description: '⚠️ You cannot challenge yourself!', color: THEME.error })], flags: 64 });
        if (target.bot) return interaction.reply({ embeds: [createEmbed({ description: '⚠️ Bots cannot play!', color: THEME.error })], flags: 64 });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`rps_accept_${interaction.user.id}_${target.id}`).setLabel('⚔️ Accept Challenge').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId(`rps_decline_${interaction.user.id}_${target.id}`).setLabel('✖️ Decline').setStyle(ButtonStyle.Danger)
        );

        await interaction.reply({ 
            content: `⚔️ <@${target.id}>, you have been challenged!`,
            components: [row], 
            embeds: [createEmbed({
                title: '⚔️ Rock Paper Scissors',
                description: `🔥 **${interaction.user.username}** challenged **${target.username}**!\n\n> ${target.username}, click Accept to set your bet!`,
                color: THEME.accent,
                footer: { text: '🔥 The Devil\'s Casino | 2m to accept' }
            })],
            fetchReply: true
        });

        const msg = await interaction.fetchReply();
        startRPSGame(msg, interaction.user, target, interaction.guild.id);
    }
};

// ════════════════════════════════════════
// ── GAME LOGIC ──
// ════════════════════════════════════════

function startRPSGame(msg, p1, p2, guildId) {
    let currentBet = 0;
    let p1Paid = false;
    let p1Choice = null;
    let p2Choice = null;

    const collector = msg.createMessageComponentCollector({ time: 180000 }); // 3 mins total lifetime

    collector.on('collect', async (i) => {
        try {
            // ── 1. P2 ACCEPTS CHALLENGE ──
            if (i.customId === `rps_accept_${p1.id}_${p2.id}`) {
                if (i.user.id !== p2.id) return i.reply({ content: '⚠️ Only the challenged player can accept!', ephemeral: true });

                const modal = new ModalBuilder().setCustomId(`rps_bet_modal_${p1.id}_${p2.id}`).setTitle('Set Your Bet!');
                const betInput = new TextInputBuilder().setCustomId('bet_amount').setLabel("How many Lux Coins do you want to bet? (or 'all')").setStyle(TextInputStyle.Short).setPlaceholder('e.g., 500').setRequired(true);
                modal.addComponents(new ActionRowBuilder().addComponents(betInput));

                await i.showModal(modal);

                const modalSubmit = await i.awaitModalSubmit({ time: 60000 }).catch(() => null);
                if (!modalSubmit) {
                    return msg.edit({ components: [], embeds: [createEmbed({ title: '⚔️ RPS', description: '⏳ Timed out waiting for bet.', color: THEME.accent })] });
                }

                const amountStr = modalSubmit.fields.getTextInputValue('bet_amount');
                const p2Eco = getUserEconomy(guildId, p2.id);
                const bet = amountStr.toLowerCase() === 'all' ? p2Eco.wallet : parseInt(amountStr);

                if (isNaN(bet) || bet <= 0) return modalSubmit.reply({ embeds: [createEmbed({ description: '⚠️ Invalid amount. Challenge cancelled.', color: THEME.error })], ephemeral: true });
                if (p2Eco.wallet < bet) return modalSubmit.reply({ embeds: [createEmbed({ description: '⚠️ Not enough LC! Challenge cancelled.', color: THEME.error })], ephemeral: true });

                p2Eco.wallet -= bet;
                updateUserEconomy(guildId, p2.id, p2Eco);
                currentBet = bet;

                const matchRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId(`rps_match_${p1.id}_${p2.id}`).setLabel(`⚔️ Match ${bet.toLocaleString()} LC`).setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId(`rps_decline_${p1.id}_${p2.id}`).setLabel('✖️ Decline').setStyle(ButtonStyle.Danger)
                );

                await modalSubmit.update({
                    content: `⚔️ <@${p1.id}>, <@${p2.id}> wants to bet **${bet.toLocaleString()} LC**!`,
                    components: [matchRow],
                    embeds: [createEmbed({
                        title: '⚔️ Rock Paper Scissors',
                        description: `🔥 **${p2.username}** proposed a bet of **${bet.toLocaleString()} LC**!\n\n> ${p1.username}, do you accept?`,
                        color: THEME.celestial,
                        footer: { text: '🔥 The Devil\'s Casino' }
                    })]
                });
            }

            // ── 2. P1 MATCHES BET ──
            else if (i.customId === `rps_match_${p1.id}_${p2.id}`) {
                if (i.user.id !== p1.id) return i.reply({ content: '⚠️ Only the challenger can match!', ephemeral: true });
                await i.deferUpdate();

                const p1Eco = getUserEconomy(guildId, p1.id);
                if (p1Eco.wallet < currentBet) {
                    const p2Eco = getUserEconomy(guildId, p2.id);
                    p2Eco.wallet += currentBet;
                    updateUserEconomy(guildId, p2.id, p2Eco);
                    currentBet = 0; 
                    return msg.edit({ components: [], embeds: [createEmbed({ title: '⚔️ RPS', description: `⚠️ ${p1.username} doesn't have enough LC! Bet refunded to ${p2.username}.`, color: THEME.error })] });
                }

                p1Eco.wallet -= currentBet;
                updateUserEconomy(guildId, p1.id, p1Eco);
                p1Paid = true;

                const rpsRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('rps_rock').setLabel('🪨 Rock').setStyle(ButtonStyle.Primary),
                    new ButtonBuilder().setCustomId('rps_paper').setLabel('📄 Paper').setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId('rps_scissors').setLabel('✂️ Scissors').setStyle(ButtonStyle.Danger)
                );

                await msg.edit({
                    content: `⚔️ <@${p1.id}> vs <@${p2.id}>!`,
                    components: [rpsRow],
                    embeds: [createEmbed({
                        title: '⚔️ Rock Paper Scissors',
                        description: `🔥 Both players are in for **${currentBet.toLocaleString()} LC**!\n\n> Make your choices!\n\n✅ Waiting for both players...`,
                        color: THEME.primary,
                        footer: { text: '🔥 The Devil\'s Casino | 60s to choose' }
                    })]
                });
            }

            // ── 3. DECLINE ──
            else if (i.customId === `rps_decline_${p1.id}_${p2.id}`) {
                if (i.user.id !== p1.id && i.user.id !== p2.id) return i.reply({ content: '⚠️ Not your game!', ephemeral: true });
                await i.deferUpdate();

                if (currentBet > 0) { // P2 had bet, but P1 declined
                    const p2Eco = getUserEconomy(guildId, p2.id);
                    p2Eco.wallet += currentBet;
                    updateUserEconomy(guildId, p2.id, p2Eco);
                    currentBet = 0;
                }
                collector.stop('declined');
            }

            // ── 4. RPS CHOICES ──
            else if (i.customId.startsWith('rps_')) {
                await i.deferUpdate();
                const choice = i.customId.split('_')[1];

                if (i.user.id === p1.id && !p1Choice) {
                    p1Choice = choice;
                } else if (i.user.id === p2.id && !p2Choice) {
                    p2Choice = choice;
                } else {
                    return; // Already chose or wrong user
                }

                if (p1Choice && p2Choice) {
                    collector.stop('game_finished');
                } else {
                    await msg.edit({
                        components: [msg.components[0]], // Keep buttons
                        embeds: [createEmbed({
                            title: '⚔️ Rock Paper Scissors',
                            description: `🔥 Bet: **${currentBet.toLocaleString()} LC**\n\n> ${p1Choice ? `✅ ${p1.username} has chosen` : `⏳ ${p1.username} choosing...`}\n> ${p2Choice ? `✅ ${p2.username} has chosen` : `⏳ ${p2.username} choosing...`}`,
                            color: THEME.celestial,
                            footer: { text: '🔥 The Devil\'s Casino' }
                        })]
                    });
                }
            }
        } catch (e) {
            console.error('RPS Collector Error:', e);
        }
    });

    collector.on('end', async (collected, reason) => {
        if (reason === 'declined') {
            return msg.edit({ components: [], embeds: [createEmbed({ title: '⚔️ RPS', description: '🚫 Challenge declined.', color: THEME.accent })] }).catch(() => {});
        }
        
        if (reason === 'game_finished') {
            await msg.edit({ components: [], embeds: [createEmbed({ title: '⚔️ Rock Paper Scissors', description: `🔥 Reveal in...`, color: THEME.primary })] });
            await sleep(2000);

            let winner = null;
            if (p1Choice === p2Choice) winner = 'tie';
            else if ((p1Choice === 'rock' && p2Choice === 'scissors') || (p1Choice === 'paper' && p2Choice === 'rock') || (p1Choice === 'scissors' && p2Choice === 'paper')) winner = 'p1';
            else winner = 'p2';

            let resultText = '';
            const winAmount = currentBet * 2;

            if (winner === 'tie') {
                const p1Eco = getUserEconomy(guildId, p1.id); p1Eco.wallet += currentBet; updateUserEconomy(guildId, p1.id, p1Eco);
                const p2Eco = getUserEconomy(guildId, p2.id); p2Eco.wallet += currentBet; updateUserEconomy(guildId, p2.id, p2Eco);
                resultText = `🤝 **It's a Tie!** Both chose ${getEmoji(p1Choice)}. Bets returned.`;
            } else if (winner === 'p1') {
                const p1Eco = getUserEconomy(guildId, p1.id); p1Eco.wallet += winAmount; updateUserEconomy(guildId, p1.id, p1Eco);
                resultText = `🎉 **${p1.username} Wins!** ${getEmoji(p1Choice)} beats ${getEmoji(p2Choice)}.\n💰 **+${winAmount.toLocaleString()} LC**`;
            } else {
                const p2Eco = getUserEconomy(guildId, p2.id); p2Eco.wallet += winAmount; updateUserEconomy(guildId, p2.id, p2Eco);
                resultText = `🎉 **${p2.username} Wins!** ${getEmoji(p2Choice)} beats ${getEmoji(p1Choice)}.\n💰 **+${winAmount.toLocaleString()} LC**`;
            }

            return msg.edit({ embeds: [createEmbed({
                title: '⚔️ Rock Paper Scissors - Results',
                description: `🔥 **${p1.username}** chose ${getEmoji(p1Choice)}\n🔥 **${p2.username}** chose ${getEmoji(p2Choice)}\n\n━━━━━━━━━━━━━━━━━━━\n${resultText}`,
                color: winner === 'tie' ? THEME.accent : (winner === 'p1' ? THEME.success : THEME.error),
                footer: { text: '🔥 The Devil\'s Casino' }
            })] });
        }

        // ── Timed Out Refund Logic ──
        if (reason === 'time') {
            if (currentBet > 0 && !p1Paid) { // P2 bet, P1 didn't match
                const p2Eco = getUserEconomy(guildId, p2.id);
                p2Eco.wallet += currentBet;
                updateUserEconomy(guildId, p2.id, p2Eco);
            } else if (currentBet > 0 && p1Paid) { // Both paid, but didn't finish choosing
                const p1Eco = getUserEconomy(guildId, p1.id); p1Eco.wallet += currentBet; updateUserEconomy(guildId, p1.id, p1Eco);
                const p2Eco = getUserEconomy(guildId, p2.id); p2Eco.wallet += currentBet; updateUserEconomy(guildId, p2.id, p2Eco);
            }
            msg.edit({ components: [], embeds: [createEmbed({ title: '⚔️ RPS', description: '⏳ Game timed out. Bets refunded.', color: THEME.accent })] }).catch(() => {});
        }
    });
}