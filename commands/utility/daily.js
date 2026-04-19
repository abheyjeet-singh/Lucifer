const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { createEmbed, THEME } = require('../../utils/embeds');
const { getUserEconomy, updateUserEconomy, getMarriage, addBadge, hasBadge } = require('../../database/db');
const { buildReceiptCard } = require('../../utils/canvasBuilder');
const { BADGES } = require('../../utils/badges');

const DAILY_AMOUNT = 500;
const COOLDOWN_MS = 24 * 60 * 60 * 1000; 
const STREAK_BUFFER = 48 * 60 * 60 * 1000; // 48h buffer to not lose streak instantly

module.exports = {
    name: 'daily',
    description: 'Claim your daily Lux Coins!',
    data: new SlashCommandBuilder()
        .setName('daily')
        .setDescription('Claim your daily Lux Coins!'),

    async execute(message, args, client) {
        const eco = getUserEconomy(message.guild.id, message.author.id);
        const member = message.member;
        const now = Date.now();
        const timeLeft = eco.last_daily + COOLDOWN_MS - now;

        if (timeLeft > 0) {
            const detail = `Come back <t:${Math.floor((eco.last_daily + COOLDOWN_MS) / 1000)}:R>.`;
            try {
                const imageBuffer = await buildReceiptCard(member, 'Soul Collection', 0, detail, false);
                const attachment = new AttachmentBuilder(imageBuffer, { name: 'cooldown.png' });
                return message.reply({ files: [attachment] });
            } catch (e) {
                return message.reply({ embeds: [createEmbed({ context: message, description: `⏳ Come back <t:${Math.floor((eco.last_daily + COOLDOWN_MS) / 1000)}:R>.`, color: THEME.accent })] });
            }
        }

        // ── Streak Logic ──
        if (eco.last_daily && (now - eco.last_daily <= STREAK_BUFFER)) {
            eco.daily_streak = (eco.daily_streak || 0) + 1;
        } else {
            eco.daily_streak = 1;
        }

        const marriage = getMarriage(message.author.id);
        const marriageMultiplier = marriage ? 1.1 : 1;
        const streakMultiplier = 1 + Math.min(eco.daily_streak * 0.1, 1.0); // +10% per day, max +100% (2x)
        
        const finalAmount = Math.floor(DAILY_AMOUNT * marriageMultiplier * streakMultiplier);
        let detail = `Streak: **${eco.daily_streak}** days 🔥 | Multiplier: **${(streakMultiplier * 100).toFixed(0)}%**`;
        if (marriage) detail += '\nIncluded +10% Marriage Bonus! 💍';
        
        eco.wallet += finalAmount;
        eco.last_daily = now;
        updateUserEconomy(message.guild.id, message.author.id, eco);

        // ── Badge Awards ──
        if (!hasBadge(message.guild.id, message.author.id, 'DAILY_1')) addBadge(message.guild.id, message.author.id, 'DAILY_1');
        if (eco.daily_streak >= 7 && !hasBadge(message.guild.id, message.author.id, 'DAILY_7')) addBadge(message.guild.id, message.author.id, 'DAILY_7');
        if (eco.daily_streak >= 30 && !hasBadge(message.guild.id, message.author.id, 'DAILY_30')) addBadge(message.guild.id, message.author.id, 'DAILY_30');

        try {
            const imageBuffer = await buildReceiptCard(member, 'Soul Collection', finalAmount, detail);
            const attachment = new AttachmentBuilder(imageBuffer, { name: 'daily.png' });
            return message.reply({ files: [attachment] });
        } catch (e) {
            return message.reply({ embeds: [createEmbed({ context: message, description: `💸 You claimed **${finalAmount.toLocaleString()} LC**!`, color: THEME.success })] });
        }
    },

    async interact(interaction, client) {
        const eco = getUserEconomy(interaction.guild.id, interaction.user.id);
        const member = interaction.member;
        const now = Date.now();
        const timeLeft = eco.last_daily + COOLDOWN_MS - now;

        if (timeLeft > 0) {
            const detail = `Come back <t:${Math.floor((eco.last_daily + COOLDOWN_MS) / 1000)}:R>.`;
            try {
                const imageBuffer = await buildReceiptCard(member, 'Soul Collection', 0, detail, false);
                const attachment = new AttachmentBuilder(imageBuffer, { name: 'cooldown.png' });
                return interaction.reply({ files: [attachment], flags: 64 });
            } catch (e) {
                return interaction.reply({ embeds: [createEmbed({ context: interaction, description: `⏳ Come back <t:${Math.floor((eco.last_daily + COOLDOWN_MS) / 1000)}:R>.`, color: THEME.accent })], flags: 64 });
            }
        }

        // ── Streak Logic ──
        if (eco.last_daily && (now - eco.last_daily <= STREAK_BUFFER)) {
            eco.daily_streak = (eco.daily_streak || 0) + 1;
        } else {
            eco.daily_streak = 1;
        }

        const marriage = getMarriage(interaction.user.id);
        const marriageMultiplier = marriage ? 1.1 : 1;
        const streakMultiplier = 1 + Math.min(eco.daily_streak * 0.1, 1.0);
        
        const finalAmount = Math.floor(DAILY_AMOUNT * marriageMultiplier * streakMultiplier);
        let detail = `Streak: **${eco.daily_streak}** days 🔥 | Multiplier: **${(streakMultiplier * 100).toFixed(0)}%**`;
        if (marriage) detail += '\nIncluded +10% Marriage Bonus! 💍';

        eco.wallet += finalAmount;
        eco.last_daily = now;
        updateUserEconomy(interaction.guild.id, interaction.user.id, eco);

        // ── Badge Awards ──
        if (!hasBadge(interaction.guild.id, interaction.user.id, 'DAILY_1')) addBadge(interaction.guild.id, interaction.user.id, 'DAILY_1');
        if (eco.daily_streak >= 7 && !hasBadge(interaction.guild.id, interaction.user.id, 'DAILY_7')) addBadge(interaction.guild.id, interaction.user.id, 'DAILY_7');
        if (eco.daily_streak >= 30 && !hasBadge(interaction.guild.id, interaction.user.id, 'DAILY_30')) addBadge(interaction.guild.id, interaction.user.id, 'DAILY_30');

        try {
            const imageBuffer = await buildReceiptCard(member, 'Soul Collection', finalAmount, detail);
            const attachment = new AttachmentBuilder(imageBuffer, { name: 'daily.png' });
            return interaction.reply({ files: [attachment] });
        } catch (e) {
            return interaction.reply({ embeds: [createEmbed({ context: interaction, description: `💸 You claimed **${finalAmount.toLocaleString()} LC**!`, color: THEME.success })] });
        }
    }
};