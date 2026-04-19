const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { createEmbed, THEME } = require('../../utils/embeds');
const { getUserEconomy, updateUserEconomy, hasItem, removeItem } = require('../../database/db');
const { buildReceiptCard } = require('../../utils/canvasBuilder');

const ROB_COOLDOWN_MS = 2 * 60 * 60 * 1000; 
const SUCCESS_CHANCE = 0.40; 
const MIN_TARGET_WALLET = 500;
const FINE_IF_CAUGHT = 500;

module.exports = {
    name: 'rob',
    description: 'Rob another user\'s wallet! (Bank is safe)',
    data: new SlashCommandBuilder()
        .setName('rob')
        .setDescription('Rob another user\'s wallet! (Bank is safe)')
        .addUserOption(o => o.setName('target').setDescription('Who are you robbing?').setRequired(true)),

    async execute(message, args, client) {
        const target = message.mentions.users.first();
        if (!target) return message.reply({ embeds: [createEmbed({ context: message, description: '⚠️ Mention someone to rob! Usage: `l!rob @user`', color: THEME.error })] });
        if (target.id === message.author.id || target.bot) return message.reply({ embeds: [createEmbed({ context: message, description: '⚠️ Invalid target.', color: THEME.error })] });

        const eco = getUserEconomy(message.guild.id, message.author.id);
        const targetEco = getUserEconomy(message.guild.id, target.id);
        const now = Date.now();
        const timeLeft = eco.last_rob + ROB_COOLDOWN_MS - now;

        if (timeLeft > 0) {
            const detail = `Hiding from guards. Try again <t:${Math.floor((eco.last_rob + ROB_COOLDOWN_MS) / 1000)}:R>.`;
            try {
                const imageBuffer = await buildReceiptCard(message.member, 'Mugging', 'COOLDOWN', detail, false);
                return message.reply({ files: [new AttachmentBuilder(imageBuffer, { name: 'rob.png' })] });
            } catch { return message.reply({ embeds: [createEmbed({ context: message, description: detail, color: THEME.accent })] }); }
        }

        if (targetEco.wallet < MIN_TARGET_WALLET) {
            const detail = `${target.username} doesn't have enough LC in their wallet! (Needs ${MIN_TARGET_WALLET.toLocaleString()} LC)`;
            try {
                const imageBuffer = await buildReceiptCard(message.member, 'Mugging', 'NOT WORTH IT', detail, false);
                return message.reply({ files: [new AttachmentBuilder(imageBuffer, { name: 'rob.png' })] });
            } catch { return message.reply({ embeds: [createEmbed({ context: message, description: detail, color: THEME.accent })] }); }
        }

        if (hasItem(message.guild.id, target.id, 'rob_shield')) {
            removeItem(message.guild.id, target.id, 'rob_shield');
            eco.last_rob = now;
            updateUserEconomy(message.guild.id, message.author.id, eco);
            const detail = `${target.username} had a Rob Shield! Your robbery was blocked.`;
            try {
                const imageBuffer = await buildReceiptCard(message.member, 'Mugging', 'BLOCKED 🛡️', detail, false);
                return message.reply({ files: [new AttachmentBuilder(imageBuffer, { name: 'rob.png' })] });
            } catch { return message.reply({ embeds: [createEmbed({ context: message, description: detail, color: THEME.accent })] }); }
        }

        const success = Math.random() <= SUCCESS_CHANCE;
        eco.last_rob = now;

        if (success) {
            const percentage = Math.random() * 0.15 + 0.10; 
            const stolenAmount = Math.floor(targetEco.wallet * percentage);
            eco.wallet += stolenAmount;
            targetEco.wallet -= stolenAmount;
            updateUserEconomy(message.guild.id, message.author.id, eco);
            updateUserEconomy(message.guild.id, target.id, targetEco);

            const detail = `Successfully mugged ${target.username}! 💳 Wallet: ${eco.wallet.toLocaleString()} LC`;
            try {
                const imageBuffer = await buildReceiptCard(message.member, 'Mugging', `+${stolenAmount.toLocaleString()} LC`, detail, true);
                return message.reply({ files: [new AttachmentBuilder(imageBuffer, { name: 'rob.png' })] });
            } catch { return message.reply({ embeds: [createEmbed({ context: message, description: detail, color: THEME.success })] }); }
        } else {
            eco.wallet = Math.max(0, eco.wallet - FINE_IF_CAUGHT);
            updateUserEconomy(message.guild.id, message.author.id, eco);

            const detail = `Caught robbing ${target.username}! 💳 Wallet: ${eco.wallet.toLocaleString()} LC`;
            try {
                const imageBuffer = await buildReceiptCard(message.member, 'Mugging', `-${FINE_IF_CAUGHT.toLocaleString()} LC`, detail, false);
                return message.reply({ files: [new AttachmentBuilder(imageBuffer, { name: 'rob.png' })] });
            } catch { return message.reply({ embeds: [createEmbed({ context: message, description: detail, color: THEME.error })] }); }
        }
    },

    async interact(interaction, client) {
        const target = interaction.options.getUser('target');
        if (target.id === interaction.user.id || target.bot) return interaction.reply({ embeds: [createEmbed({ context: interaction, description: '⚠️ Invalid target.', color: THEME.error })], flags: 64 });

        const eco = getUserEconomy(interaction.guild.id, interaction.user.id);
        const targetEco = getUserEconomy(interaction.guild.id, target.id);
        const now = Date.now();
        const timeLeft = eco.last_rob + ROB_COOLDOWN_MS - now;

        if (timeLeft > 0) {
            const detail = `Hiding from guards. Try again <t:${Math.floor((eco.last_rob + ROB_COOLDOWN_MS) / 1000)}:R>.`;
            try {
                const imageBuffer = await buildReceiptCard(interaction.member, 'Mugging', 'COOLDOWN', detail, false);
                return interaction.reply({ files: [new AttachmentBuilder(imageBuffer, { name: 'rob.png' })], flags: 64 });
            } catch { return interaction.reply({ embeds: [createEmbed({ context: interaction, description: detail, color: THEME.accent })], flags: 64 }); }
        }

        if (targetEco.wallet < MIN_TARGET_WALLET) {
            const detail = `${target.username} doesn't have enough LC! (Needs ${MIN_TARGET_WALLET.toLocaleString()} LC)`;
            try {
                const imageBuffer = await buildReceiptCard(interaction.member, 'Mugging', 'NOT WORTH IT', detail, false);
                return interaction.reply({ files: [new AttachmentBuilder(imageBuffer, { name: 'rob.png' })], flags: 64 });
            } catch { return interaction.reply({ embeds: [createEmbed({ context: interaction, description: detail, color: THEME.accent })], flags: 64 }); }
        }

        if (hasItem(interaction.guild.id, target.id, 'rob_shield')) {
            removeItem(interaction.guild.id, target.id, 'rob_shield');
            eco.last_rob = now;
            updateUserEconomy(interaction.guild.id, interaction.user.id, eco);
            const detail = `${target.username} had a Rob Shield! Your robbery was blocked.`;
            try {
                const imageBuffer = await buildReceiptCard(interaction.member, 'Mugging', 'BLOCKED 🛡️', detail, false);
                return interaction.reply({ files: [new AttachmentBuilder(imageBuffer, { name: 'rob.png' })], flags: 64 });
            } catch { return interaction.reply({ embeds: [createEmbed({ context: interaction, description: detail, color: THEME.accent })], flags: 64 }); }
        }

        const success = Math.random() <= SUCCESS_CHANCE;
        eco.last_rob = now;

        if (success) {
            const percentage = Math.random() * 0.15 + 0.10; 
            const stolenAmount = Math.floor(targetEco.wallet * percentage);
            eco.wallet += stolenAmount;
            targetEco.wallet -= stolenAmount;
            updateUserEconomy(interaction.guild.id, interaction.user.id, eco);
            updateUserEconomy(interaction.guild.id, target.id, targetEco);

            const detail = `Successfully mugged ${target.username}! 💳 Wallet: ${eco.wallet.toLocaleString()} LC`;
            try {
                const imageBuffer = await buildReceiptCard(interaction.member, 'Mugging', `+${stolenAmount.toLocaleString()} LC`, detail, true);
                return interaction.reply({ files: [new AttachmentBuilder(imageBuffer, { name: 'rob.png' })] });
            } catch { return interaction.reply({ embeds: [createEmbed({ context: interaction, description: detail, color: THEME.success })] }); }
        } else {
            eco.wallet = Math.max(0, eco.wallet - FINE_IF_CAUGHT);
            updateUserEconomy(interaction.guild.id, interaction.user.id, eco);

            const detail = `Caught robbing ${target.username}! 💳 Wallet: ${eco.wallet.toLocaleString()} LC`;
            try {
                const imageBuffer = await buildReceiptCard(interaction.member, 'Mugging', `-${FINE_IF_CAUGHT.toLocaleString()} LC`, detail, false);
                return interaction.reply({ files: [new AttachmentBuilder(imageBuffer, { name: 'rob.png' })] });
            } catch { return interaction.reply({ embeds: [createEmbed({ context: interaction, description: detail, color: THEME.error })] }); }
        }
    }
};