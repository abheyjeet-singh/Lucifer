const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, THEME } = require('../../utils/embeds');
const { getUserEconomy, updateUserEconomy, hasItem, removeItem } = require('../../database/db');

const ROB_COOLDOWN_MS = 2 * 60 * 60 * 1000; // 2 hours
const SUCCESS_CHANCE = 0.40; // 40% chance to win
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
        if (!target) return message.reply({ embeds: [createEmbed({ description: '⚠️ You must mention someone to rob! Usage: `l!rob @user`', color: THEME.error })] });
        if (target.id === message.author.id) return message.reply({ embeds: [createEmbed({ description: '⚠️ You can\'t rob yourself!', color: THEME.error })] });
        if (target.bot) return message.reply({ embeds: [createEmbed({ description: '⚠️ You can\'t rob bots!', color: THEME.error })] });

        const eco = getUserEconomy(message.guild.id, message.author.id);
        const targetEco = getUserEconomy(message.guild.id, target.id);
        const now = Date.now();
        const timeLeft = eco.last_rob + ROB_COOLDOWN_MS - now;

        if (timeLeft > 0) {
            const timeLeftStr = `<t:${Math.floor((eco.last_rob + ROB_COOLDOWN_MS) / 1000)}:R>`;
            return message.reply({ embeds: [createEmbed({ 
                title: '🔪 Mugging',
                description: `⏳ You're hiding from the guards after your last robbery!\nTry again ${timeLeftStr}.`, 
                color: THEME.accent
            })] });
        }

        if (targetEco.wallet < MIN_TARGET_WALLET) {
            return message.reply({ embeds: [createEmbed({ 
                title: '🔪 Mugging',
                description: `🚫 **${target.username}** doesn't have enough LC in their wallet to make it worth your time! (They need at least ${MIN_TARGET_WALLET.toLocaleString()} LC)`, 
                color: THEME.accent
            })] });
        }

        // Check for Rob Shield
        if (hasItem(message.guild.id, target.id, 'rob_shield')) {
            removeItem(message.guild.id, target.id, 'rob_shield');
            eco.last_rob = now;
            updateUserEconomy(message.guild.id, message.author.id, eco);
            return message.reply({ embeds: [createEmbed({ 
                title: '🔪 Mugging',
                description: `🛡️ **${target.username}** had a Rob Shield! Your robbery was blocked, and you fled into the shadows.`, 
                color: THEME.accent
            })] });
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

            return message.reply({ embeds: [createEmbed({ 
                title: '🔪 Mugging',
                description: `🏃 **You successfully mugged ${target.username}!**\n\n💰 **Stolen:** ${stolenAmount.toLocaleString()} LC\n💳 **Your Wallet:** ${eco.wallet.toLocaleString()} LC`, 
                color: THEME.success
            })] });
        } else {
            eco.wallet = Math.max(0, eco.wallet - FINE_IF_CAUGHT);
            updateUserEconomy(message.guild.id, message.author.id, eco);

            return message.reply({ embeds: [createEmbed({ 
                title: '🔪 Mugging',
                description: `🚔 **You got caught trying to rob ${target.username}!**\n\n💸 **Fine Paid:** ${FINE_IF_CAUGHT.toLocaleString()} LC\n💳 **Your Wallet:** ${eco.wallet.toLocaleString()} LC`, 
                color: THEME.error
            })] });
        }
    },

    async interact(interaction, client) {
        const target = interaction.options.getUser('target');
        if (target.id === interaction.user.id) return interaction.reply({ embeds: [createEmbed({ description: '⚠️ You can\'t rob yourself!', color: THEME.error })], flags: 64 });
        if (target.bot) return interaction.reply({ embeds: [createEmbed({ description: '⚠️ You can\'t rob bots!', color: THEME.error })], flags: 64 });

        const eco = getUserEconomy(interaction.guild.id, interaction.user.id);
        const targetEco = getUserEconomy(interaction.guild.id, target.id);
        const now = Date.now();
        const timeLeft = eco.last_rob + ROB_COOLDOWN_MS - now;

        if (timeLeft > 0) {
            const timeLeftStr = `<t:${Math.floor((eco.last_rob + ROB_COOLDOWN_MS) / 1000)}:R>`;
            return interaction.reply({ embeds: [createEmbed({ 
                title: '🔪 Mugging',
                description: `⏳ You're hiding from the guards after your last robbery!\nTry again ${timeLeftStr}.`, 
                color: THEME.accent
            })], flags: 64 });
        }

        if (targetEco.wallet < MIN_TARGET_WALLET) {
            return interaction.reply({ embeds: [createEmbed({ 
                title: '🔪 Mugging',
                description: `🚫 **${target.username}** doesn't have enough LC in their wallet to make it worth your time! (They need at least ${MIN_TARGET_WALLET.toLocaleString()} LC)`, 
                color: THEME.accent
            })], flags: 64 });
        }

        // Check for Rob Shield
        if (hasItem(interaction.guild.id, target.id, 'rob_shield')) {
            removeItem(interaction.guild.id, target.id, 'rob_shield');
            eco.last_rob = now;
            updateUserEconomy(interaction.guild.id, interaction.user.id, eco);
            return interaction.reply({ embeds: [createEmbed({ 
                title: '🔪 Mugging',
                description: `🛡️ **${target.username}** had a Rob Shield! Your robbery was blocked.`, 
                color: THEME.accent
            })] });
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

            return interaction.reply({ embeds: [createEmbed({ 
                title: '🔪 Mugging',
                description: `🏃 **You successfully mugged ${target.username}!**\n\n💰 **Stolen:** ${stolenAmount.toLocaleString()} LC\n💳 **Your Wallet:** ${eco.wallet.toLocaleString()} LC`, 
                color: THEME.success
            })] });
        } else {
            eco.wallet = Math.max(0, eco.wallet - FINE_IF_CAUGHT);
            updateUserEconomy(interaction.guild.id, interaction.user.id, eco);

            return interaction.reply({ embeds: [createEmbed({ 
                title: '🔪 Mugging',
                description: `🚔 **You got caught trying to rob ${target.username}!**\n\n💸 **Fine Paid:** ${FINE_IF_CAUGHT.toLocaleString()} LC\n💳 **Your Wallet:** ${eco.wallet.toLocaleString()} LC`, 
                color: THEME.error
            })] });
        }
    }
};