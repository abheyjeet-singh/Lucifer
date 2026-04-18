const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, THEME } = require('../../utils/embeds');
const { getUserEconomy, updateUserEconomy, hasItem } = require('../../database/db'); // Added hasItem

const CRIME_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour
const SUCCESS_CHANCE = 0.50; // 50% chance to win
const MIN_WIN = 500;
const MAX_WIN = 1500;
const MIN_FINE = 250;
const MAX_FINE = 500;

const CRIMES = [
    'Smuggled holy water out of Heaven',
    'Falsified a demon contract',
    'Stole feathers from angel wings',
    'Ran an illegal soul trading ring'
];

module.exports = {
    name: 'crime',
    description: 'Commit a crime for a chance at big Lux Coins! (High Risk)',
    data: new SlashCommandBuilder()
        .setName('crime')
        .setDescription('Commit a crime for a chance at big Lux Coins! (High Risk)'),

    async execute(message, args, client) {
        const eco = getUserEconomy(message.guild.id, message.author.id);
        const now = Date.now();
        const timeLeft = eco.last_crime + CRIME_COOLDOWN_MS - now;

        if (timeLeft > 0) {
            const timeLeftStr = `<t:${Math.floor((eco.last_crime + CRIME_COOLDOWN_MS) / 1000)}:R>`;
            return message.reply({ embeds: [createEmbed({ 
                title: '🚨 Demonic Crime',
                description: `⏳ You're laying low from your last heist!\nTry again ${timeLeftStr}.`, 
                color: THEME.accent
            })] });
        }

        const crime = CRIMES[Math.floor(Math.random() * CRIMES.length)];
        const success = Math.random() <= SUCCESS_CHANCE;
        eco.last_crime = now;

        if (success) {
            let winnings = Math.floor(Math.random() * (MAX_WIN - MIN_WIN + 1)) + MIN_WIN;

            // ── Check for Lucky Charm Buff ──
            let charmActive = false;
            if (hasItem(message.guild.id, message.author.id, 'lucky_charm')) {
                winnings *= 2; // Double the loot!
                charmActive = true;
            }

            eco.wallet += winnings;
            updateUserEconomy(message.guild.id, message.author.id, eco);

            let description = `🤫 **You ${crime}!**\n\n💰 **Loot:** ${winnings.toLocaleString()} LC\n💳 **Wallet Balance:** ${eco.wallet.toLocaleString()} LC`;
            if (charmActive) description += `\n🍀 **Lucky Charm active! Loot doubled!**`;

            return message.reply({ embeds: [createEmbed({ 
                title: '🚨 Demonic Crime',
                description: description, 
                color: THEME.success
            })] });
        } else {
            const fine = Math.floor(Math.random() * (MAX_FINE - MIN_FINE + 1)) + MIN_FINE;
            eco.wallet = Math.max(0, eco.wallet - fine); // Can't go below 0
            updateUserEconomy(message.guild.id, message.author.id, eco);

            return message.reply({ embeds: [createEmbed({ 
                title: '🚨 Demonic Crime',
                description: `🚔 **You got caught trying to ${crime}!**\n\n💸 **Fine Paid:** ${fine.toLocaleString()} LC\n💳 **Wallet Balance:** ${eco.wallet.toLocaleString()} LC`, 
                color: THEME.error
            })] });
        }
    },

    async interact(interaction, client) {
        const eco = getUserEconomy(interaction.guild.id, interaction.user.id);
        const now = Date.now();
        const timeLeft = eco.last_crime + CRIME_COOLDOWN_MS - now;

        if (timeLeft > 0) {
            const timeLeftStr = `<t:${Math.floor((eco.last_crime + CRIME_COOLDOWN_MS) / 1000)}:R>`;
            return interaction.reply({ embeds: [createEmbed({ 
                title: '🚨 Demonic Crime',
                description: `⏳ You're laying low from your last heist!\nTry again ${timeLeftStr}.`, 
                color: THEME.accent
            })], flags: 64 });
        }

        const crime = CRIMES[Math.floor(Math.random() * CRIMES.length)];
        const success = Math.random() <= SUCCESS_CHANCE;
        eco.last_crime = now;

        if (success) {
            let winnings = Math.floor(Math.random() * (MAX_WIN - MIN_WIN + 1)) + MIN_WIN;

            // ── Check for Lucky Charm Buff ──
            let charmActive = false;
            if (hasItem(interaction.guild.id, interaction.user.id, 'lucky_charm')) {
                winnings *= 2; // Double the loot!
                charmActive = true;
            }

            eco.wallet += winnings;
            updateUserEconomy(interaction.guild.id, interaction.user.id, eco);

            let description = `🤫 **You ${crime}!**\n\n💰 **Loot:** ${winnings.toLocaleString()} LC\n💳 **Wallet Balance:** ${eco.wallet.toLocaleString()} LC`;
            if (charmActive) description += `\n🍀 **Lucky Charm active! Loot doubled!**`;

            return interaction.reply({ embeds: [createEmbed({ 
                title: '🚨 Demonic Crime',
                description: description, 
                color: THEME.success
            })] });
        } else {
            const fine = Math.floor(Math.random() * (MAX_FINE - MIN_FINE + 1)) + MIN_FINE;
            eco.wallet = Math.max(0, eco.wallet - fine);
            updateUserEconomy(interaction.guild.id, interaction.user.id, eco);

            return interaction.reply({ embeds: [createEmbed({ 
                title: '🚨 Demonic Crime',
                description: `🚔 **You got caught trying to ${crime}!**\n\n💸 **Fine Paid:** ${fine.toLocaleString()} LC\n💳 **Wallet Balance:** ${eco.wallet.toLocaleString()} LC`, 
                color: THEME.error
            })] });
        }
    }
};