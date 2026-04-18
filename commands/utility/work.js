const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, THEME } = require('../../utils/embeds');
const { getUserEconomy, updateUserEconomy, hasItem } = require('../../database/db'); // Added hasItem

const WORK_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour
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
        const now = Date.now();
        const timeLeft = eco.last_work + WORK_COOLDOWN_MS - now;

        if (timeLeft > 0) {
            const timeLeftStr = `<t:${Math.floor((eco.last_work + WORK_COOLDOWN_MS) / 1000)}:R>`;
            return message.reply({ embeds: [createEmbed({ 
                title: '🔥 Infernal Labor',
                description: `⏳ You're still exhausted from your last shift!\nReturn to work ${timeLeftStr}.`, 
                color: THEME.accent
            })] });
        }

        let pay = Math.floor(Math.random() * (MAX_PAY - MIN_PAY + 1)) + MIN_PAY;
        const job = JOBS[Math.floor(Math.random() * JOBS.length)];

        // ── Check for Lucky Charm Buff ──
        let charmActive = false;
        if (hasItem(message.guild.id, message.author.id, 'lucky_charm')) {
            pay *= 2; // Double the earnings!
            charmActive = true;
        }

        eco.wallet += pay;
        eco.last_work = now;
        updateUserEconomy(message.guild.id, message.author.id, eco);

        let description = `⚒️ **You worked as a ${job}!**\n\n💸 **Earned:** ${pay.toLocaleString()} LC\n💳 **Wallet Balance:** ${eco.wallet.toLocaleString()} LC`;
        if (charmActive) description += `\n🍀 **Lucky Charm active! Earnings doubled!**`;

        return message.reply({ embeds: [createEmbed({ 
            title: '🔥 Infernal Labor',
            description: description, 
            color: THEME.success
        })] });
    },

    async interact(interaction, client) {
        const eco = getUserEconomy(interaction.guild.id, interaction.user.id);
        const now = Date.now();
        const timeLeft = eco.last_work + WORK_COOLDOWN_MS - now;

        if (timeLeft > 0) {
            const timeLeftStr = `<t:${Math.floor((eco.last_work + WORK_COOLDOWN_MS) / 1000)}:R>`;
            return interaction.reply({ embeds: [createEmbed({ 
                title: '🔥 Infernal Labor',
                description: `⏳ You're still exhausted from your last shift!\nReturn to work ${timeLeftStr}.`, 
                color: THEME.accent
            })], flags: 64 });
        }

        let pay = Math.floor(Math.random() * (MAX_PAY - MIN_PAY + 1)) + MIN_PAY;
        const job = JOBS[Math.floor(Math.random() * JOBS.length)];

        // ── Check for Lucky Charm Buff ──
        let charmActive = false;
        if (hasItem(interaction.guild.id, interaction.user.id, 'lucky_charm')) {
            pay *= 2; // Double the earnings!
            charmActive = true;
        }

        eco.wallet += pay;
        eco.last_work = now;
        updateUserEconomy(interaction.guild.id, interaction.user.id, eco);

        let description = `⚒️ **You worked as a ${job}!**\n\n💸 **Earned:** ${pay.toLocaleString()} LC\n💳 **Wallet Balance:** ${eco.wallet.toLocaleString()} LC`;
        if (charmActive) description += `\n🍀 **Lucky Charm active! Earnings doubled!**`;

        return interaction.reply({ embeds: [createEmbed({ 
            title: '🔥 Infernal Labor',
            description: description, 
            color: THEME.success
        })] });
    }
};