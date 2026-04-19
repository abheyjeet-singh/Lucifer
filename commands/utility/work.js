const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { createEmbed, THEME } = require('../../utils/embeds');
const { getUserEconomy, updateUserEconomy, hasItem, addBadge, hasBadge } = require('../../database/db');
const { buildReceiptCard } = require('../../utils/canvasBuilder');

const WORK_COOLDOWN_MS = 60 * 60 * 1000; 
const WORK_BUFFER = 2 * 60 * 60 * 1000; // 2h buffer to keep streak
const MIN_PAY = 200;
const MAX_PAY = 800;

const JOBS = [
    'Soul Harvester', 'Crossroad Demon Negotiator', 'Hellfire Stoker', 
    'Maze Keeper', 'Demon Bail Bondsman', 'Lucifer\'s Personal Assistant',
    'Pentagram Janitor', 'Torture Chamber Technician'
];

module.exports = {
    name: 'work',
    description: 'Work an infernal job to earn Lux Coins!',
    data: new SlashCommandBuilder()
        .setName('work')
        .setDescription('Work an infernal job to earn Lux Coins!'),

    async execute(message, args, client) {
        const eco = getUserEconomy(message.guild.id, message.author.id);
        const member = message.member;
        const now = Date.now();
        const timeLeft = eco.last_work + WORK_COOLDOWN_MS - now;

        if (timeLeft > 0) {
            const detail = `Exhausted. Return <t:${Math.floor((eco.last_work + WORK_COOLDOWN_MS) / 1000)}:R>.`;
            try {
                const imageBuffer = await buildReceiptCard(member, 'Infernal Labor', 0, detail, false);
                const attachment = new AttachmentBuilder(imageBuffer, { name: 'cooldown.png' });
                return message.reply({ files: [attachment] });
            } catch (e) {
                return message.reply({ embeds: [createEmbed({ context: message, description: `⏳ Return to work <t:${Math.floor((eco.last_work + WORK_COOLDOWN_MS) / 1000)}:R>.`, color: THEME.accent })] });
            }
        }

        // ── Streak Logic ──
        if (eco.last_work && (now - eco.last_work <= WORK_BUFFER)) {
            eco.work_streak = (eco.work_streak || 0) + 1;
        } else {
            eco.work_streak = 1;
        }

        let pay = Math.floor(Math.random() * (MAX_PAY - MIN_PAY + 1)) + MIN_PAY;
        const job = JOBS[Math.floor(Math.random() * JOBS.length)];

        let charmActive = hasItem(message.guild.id, message.author.id, 'lucky_charm');
        const streakMultiplier = 1 + Math.min(eco.work_streak * 0.05, 0.5); // +5% per shift, max +50%
        
        if (charmActive) pay *= 2; 
        pay = Math.floor(pay * streakMultiplier);
        
        let detail = `Worked as **${job}**.${charmActive ? ' 🍀 Lucky Charm!' : ''}\nStreak: **${eco.work_streak}** shifts ⚒️ | Multiplier: **${(streakMultiplier * 100).toFixed(0)}%**`;

        eco.wallet += pay;
        eco.last_work = now;
        updateUserEconomy(message.guild.id, message.author.id, eco);

        // ── Badge Awards ──
        if (!hasBadge(message.guild.id, message.author.id, 'WORK_1')) addBadge(message.guild.id, message.author.id, 'WORK_1');
        if (eco.work_streak >= 10 && !hasBadge(message.guild.id, message.author.id, 'WORK_10')) addBadge(message.guild.id, message.author.id, 'WORK_10');

        try {
            const imageBuffer = await buildReceiptCard(member, 'Infernal Labor', pay, detail);
            const attachment = new AttachmentBuilder(imageBuffer, { name: 'work.png' });
            return message.reply({ files: [attachment] });
        } catch (e) {
            return message.reply({ embeds: [createEmbed({ context: message, description: `⚒️ Worked as ${job}! Earned **${pay.toLocaleString()} LC**!`, color: THEME.success })] });
        }
    },

    async interact(interaction, client) {
        const eco = getUserEconomy(interaction.guild.id, interaction.user.id);
        const member = interaction.member;
        const now = Date.now();
        const timeLeft = eco.last_work + WORK_COOLDOWN_MS - now;

        if (timeLeft > 0) {
            const detail = `Exhausted. Return <t:${Math.floor((eco.last_work + WORK_COOLDOWN_MS) / 1000)}:R>.`;
            try {
                const imageBuffer = await buildReceiptCard(member, 'Infernal Labor', 0, detail, false);
                const attachment = new AttachmentBuilder(imageBuffer, { name: 'cooldown.png' });
                return interaction.reply({ files: [attachment], flags: 64 });
            } catch (e) {
                return interaction.reply({ embeds: [createEmbed({ context: interaction, description: `⏳ Return to work <t:${Math.floor((eco.last_work + WORK_COOLDOWN_MS) / 1000)}:R>.`, color: THEME.accent })], flags: 64 });
            }
        }

        // ── Streak Logic ──
        if (eco.last_work && (now - eco.last_work <= WORK_BUFFER)) {
            eco.work_streak = (eco.work_streak || 0) + 1;
        } else {
            eco.work_streak = 1;
        }

        let pay = Math.floor(Math.random() * (MAX_PAY - MIN_PAY + 1)) + MIN_PAY;
        const job = JOBS[Math.floor(Math.random() * JOBS.length)];

        let charmActive = hasItem(interaction.guild.id, interaction.user.id, 'lucky_charm');
        const streakMultiplier = 1 + Math.min(eco.work_streak * 0.05, 0.5);

        if (charmActive) pay *= 2; 
        pay = Math.floor(pay * streakMultiplier);

        let detail = `Worked as **${job}**.${charmActive ? ' 🍀 Lucky Charm!' : ''}\nStreak: **${eco.work_streak}** shifts ⚒️ | Multiplier: **${(streakMultiplier * 100).toFixed(0)}%**`;

        eco.wallet += pay;
        eco.last_work = now;
        updateUserEconomy(interaction.guild.id, interaction.user.id, eco);

        // ── Badge Awards ──
        if (!hasBadge(interaction.guild.id, interaction.user.id, 'WORK_1')) addBadge(interaction.guild.id, interaction.user.id, 'WORK_1');
        if (eco.work_streak >= 10 && !hasBadge(interaction.guild.id, interaction.user.id, 'WORK_10')) addBadge(interaction.guild.id, interaction.user.id, 'WORK_10');

        try {
            const imageBuffer = await buildReceiptCard(member, 'Infernal Labor', pay, detail);
            const attachment = new AttachmentBuilder(imageBuffer, { name: 'work.png' });
            return interaction.reply({ files: [attachment] });
        } catch (e) {
            return interaction.reply({ embeds: [createEmbed({ context: interaction, description: `⚒️ Worked as ${job}! Earned **${pay.toLocaleString()} LC**!`, color: THEME.success })] });
        }
    }
};