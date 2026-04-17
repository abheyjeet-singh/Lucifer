const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, THEME } = require('../../utils/embeds');
const { getUserEconomy, updateUserEconomy } = require('../../database/db');

module.exports = {
    name: 'send',
    description: 'Send Lux Coins to a friend!',
    aliases: ['pay', 'give'],
    data: new SlashCommandBuilder()
        .setName('send')
        .setDescription('Send Lux Coins to a friend!')
        .addUserOption(o => o.setName('target').setDescription('Who are you sending to?').setRequired(true))
        .addStringOption(o => o.setName('amount').setDescription('Amount to send or "all"').setRequired(true)),

    async execute(message, args, client) {
        const target = message.mentions.users.first();
        const amountInput = args[1];

        if (!target) return message.reply('⚠️ Usage: `l!send @user <amount | all>`');
        if (target.id === message.author.id) return message.reply({ embeds: [createEmbed({ description: '⚠️ You cannot send coins to yourself!', color: THEME.error })] });
        if (target.bot) return message.reply({ embeds: [createEmbed({ description: '⚠️ Bots don\'t have souls to hold Lux Coins!', color: THEME.error })] });
        if (!amountInput) return message.reply('⚠️ Usage: `l!send @user <amount | all>`');

        const senderEco = getUserEconomy(message.guild.id, message.author.id);
        const receiverEco = getUserEconomy(message.guild.id, target.id);
        
        const amount = amountInput.toLowerCase() === 'all' || amountInput.toLowerCase() === 'max' ? senderEco.wallet : parseInt(amountInput);

        if (isNaN(amount) || amount <= 0) return message.reply({ embeds: [createEmbed({ description: '⚠️ Invalid amount.', color: THEME.error })] });
        if (senderEco.wallet < amount) return message.reply({ embeds: [createEmbed({ description: '⚠️ You don\'t have enough Lux Coins in your wallet!', color: THEME.error })] });

        senderEco.wallet -= amount;
        receiverEco.wallet += amount;
        
        updateUserEconomy(message.guild.id, message.author.id, senderEco);
        updateUserEconomy(message.guild.id, target.id, receiverEco);

        return message.reply({ 
            content: `💸 <@${target.id}>, a divine transaction has arrived!`,
            embeds: [createEmbed({ 
                title: '👑 Royal Transfer',
                description: `🔥 **A transaction of power has occurred!**\n\n📤 **Sender:** ${message.author.username}\n📥 **Receiver:** ${target.username}\n\n💰 **Amount:** ${amount.toLocaleString()} LC`,
                color: THEME.primary,
                footer: { text: '🔥 Lucifer\'s Economy | Lord of Hell' }
            })],
            allowedMentions: { parse: ['users'] }
        });
    },

    async interact(interaction, client) {
        const target = interaction.options.getUser('target');
        const amountInput = interaction.options.getString('amount');

        if (target.id === interaction.user.id) return interaction.reply({ embeds: [createEmbed({ description: '⚠️ You cannot send coins to yourself!', color: THEME.error })], flags: 64 });
        if (target.bot) return interaction.reply({ embeds: [createEmbed({ description: '⚠️ Bots don\'t have souls to hold Lux Coins!', color: THEME.error })], flags: 64 });

        const senderEco = getUserEconomy(interaction.guild.id, interaction.user.id);
        const receiverEco = getUserEconomy(interaction.guild.id, target.id);
        
        const amount = amountInput.toLowerCase() === 'all' || amountInput.toLowerCase() === 'max' ? senderEco.wallet : parseInt(amountInput);

        if (isNaN(amount) || amount <= 0) return interaction.reply({ embeds: [createEmbed({ description: '⚠️ Invalid amount.', color: THEME.error })], flags: 64 });
        if (senderEco.wallet < amount) return interaction.reply({ embeds: [createEmbed({ description: '⚠️ You don\'t have enough Lux Coins in your wallet!', color: THEME.error })], flags: 64 });

        senderEco.wallet -= amount;
        receiverEco.wallet += amount;
        
        updateUserEconomy(interaction.guild.id, interaction.user.id, senderEco);
        updateUserEconomy(interaction.guild.id, target.id, receiverEco);

        return interaction.reply({ 
            content: `💸 <@${target.id}>, a divine transaction has arrived!`,
            embeds: [createEmbed({ 
                title: '👑 Royal Transfer',
                description: `🔥 **A transaction of power has occurred!**\n\n📤 **Sender:** ${interaction.user.username}\n📥 **Receiver:** ${target.username}\n\n💰 **Amount:** ${amount.toLocaleString()} LC`,
                color: THEME.primary,
                footer: { text: '🔥 Lucifer\'s Economy | Lord of Hell' }
            })],
            allowedMentions: { parse: ['users'] }
        });
    }
};