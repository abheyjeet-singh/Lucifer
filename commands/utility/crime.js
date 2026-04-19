const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { createEmbed, THEME } = require('../../utils/embeds');
const { getUserEconomy, updateUserEconomy, hasItem } = require('../../database/db');
const { buildReceiptCard } = require('../../utils/canvasBuilder');

const CRIME_COOLDOWN_MS = 60 * 60 * 1000; 
const SUCCESS_CHANCE = 0.50; 
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
            const detail = `Laying low from last heist. Try again <t:${Math.floor((eco.last_crime + CRIME_COOLDOWN_MS) / 1000)}:R>.`;
            try {
                const imageBuffer = await buildReceiptCard(message.member, 'Demonic Crime', 'COOLDOWN', detail, false);
                return message.reply({ files: [new AttachmentBuilder(imageBuffer, { name: 'crime.png' })] });
            } catch { return message.reply({ embeds: [createEmbed({ context: message, description: detail, color: THEME.accent })] }); }
        }

        const crime = CRIMES[Math.floor(Math.random() * CRIMES.length)];
        const success = Math.random() <= SUCCESS_CHANCE;
        eco.last_crime = now;

        if (success) {
            let winnings = Math.floor(Math.random() * (MAX_WIN - MIN_WIN + 1)) + MIN_WIN;
            let charmActive = hasItem(message.guild.id, message.author.id, 'lucky_charm');
            if (charmActive) winnings *= 2; 

            eco.wallet += winnings;
            updateUserEconomy(message.guild.id, message.author.id, eco);

            const detail = `You ${crime}!${charmActive ? ' 🍀 Lucky Charm doubled loot!' : ''} 💳 Wallet: ${eco.wallet.toLocaleString()} LC`;
            try {
                const imageBuffer = await buildReceiptCard(message.member, 'Demonic Crime', `+${winnings.toLocaleString()} LC`, detail, true);
                return message.reply({ files: [new AttachmentBuilder(imageBuffer, { name: 'crime.png' })] });
            } catch { return message.reply({ embeds: [createEmbed({ context: message, description: detail, color: THEME.success })] }); }
        } else {
            const fine = Math.floor(Math.random() * (MAX_FINE - MIN_FINE + 1)) + MIN_FINE;
            eco.wallet = Math.max(0, eco.wallet - fine);
            updateUserEconomy(message.guild.id, message.author.id, eco);

            const detail = `Caught trying to ${crime}! 💳 Wallet: ${eco.wallet.toLocaleString()} LC`;
            try {
                const imageBuffer = await buildReceiptCard(message.member, 'Demonic Crime', `-${fine.toLocaleString()} LC`, detail, false);
                return message.reply({ files: [new AttachmentBuilder(imageBuffer, { name: 'crime.png' })] });
            } catch { return message.reply({ embeds: [createEmbed({ context: message, description: detail, color: THEME.error })] }); }
        }
    },

    async interact(interaction, client) {
        const eco = getUserEconomy(interaction.guild.id, interaction.user.id);
        const now = Date.now();
        const timeLeft = eco.last_crime + CRIME_COOLDOWN_MS - now;

        if (timeLeft > 0) {
            const detail = `Laying low from last heist. Try again <t:${Math.floor((eco.last_crime + CRIME_COOLDOWN_MS) / 1000)}:R>.`;
            try {
                const imageBuffer = await buildReceiptCard(interaction.member, 'Demonic Crime', 'COOLDOWN', detail, false);
                return interaction.reply({ files: [new AttachmentBuilder(imageBuffer, { name: 'crime.png' })], flags: 64 });
            } catch { return interaction.reply({ embeds: [createEmbed({ context: interaction, description: detail, color: THEME.accent })], flags: 64 }); }
        }

        const crime = CRIMES[Math.floor(Math.random() * CRIMES.length)];
        const success = Math.random() <= SUCCESS_CHANCE;
        eco.last_crime = now;

        if (success) {
            let winnings = Math.floor(Math.random() * (MAX_WIN - MIN_WIN + 1)) + MIN_WIN;
            let charmActive = hasItem(interaction.guild.id, interaction.user.id, 'lucky_charm');
            if (charmActive) winnings *= 2; 

            eco.wallet += winnings;
            updateUserEconomy(interaction.guild.id, interaction.user.id, eco);

            const detail = `You ${crime}!${charmActive ? ' 🍀 Lucky Charm doubled loot!' : ''} 💳 Wallet: ${eco.wallet.toLocaleString()} LC`;
            try {
                const imageBuffer = await buildReceiptCard(interaction.member, 'Demonic Crime', `+${winnings.toLocaleString()} LC`, detail, true);
                return interaction.reply({ files: [new AttachmentBuilder(imageBuffer, { name: 'crime.png' })] });
            } catch { return interaction.reply({ embeds: [createEmbed({ context: interaction, description: detail, color: THEME.success })] }); }
        } else {
            const fine = Math.floor(Math.random() * (MAX_FINE - MIN_FINE + 1)) + MIN_FINE;
            eco.wallet = Math.max(0, eco.wallet - fine);
            updateUserEconomy(interaction.guild.id, interaction.user.id, eco);

            const detail = `Caught trying to ${crime}! 💳 Wallet: ${eco.wallet.toLocaleString()} LC`;
            try {
                const imageBuffer = await buildReceiptCard(interaction.member, 'Demonic Crime', `-${fine.toLocaleString()} LC`, detail, false);
                return interaction.reply({ files: [new AttachmentBuilder(imageBuffer, { name: 'crime.png' })] });
            } catch { return interaction.reply({ embeds: [createEmbed({ context: interaction, description: detail, color: THEME.error })] }); }
        }
    }
};