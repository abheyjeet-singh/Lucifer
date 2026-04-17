const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, THEME } = require('../../utils/embeds');
const { getUserEconomy, updateUserEconomy } = require('../../database/db');

module.exports = {
    name: 'givecoins',
    description: 'Give Lux Coins to a user (Bot Owner Only)',
    category: 'utility',
    usage: 'givecoins <@user> <amount>',
    data: new SlashCommandBuilder()
        .setName('givecoins')
        .setDescription('Give Lux Coins to a user (Bot Owner Only)')
        .addUserOption(o =>
            o.setName('user')
             .setDescription('The user to give coins to')
             .setRequired(true))
        .addIntegerOption(o =>
            o.setName('amount')
             .setDescription('The amount of Lux Coins to give')
             .setRequired(true)),

    async execute(message, args, client) {
        if (message.author.id !== process.env.BOT_OWNER_ID) {
            return message.reply({ embeds: [createEmbed({ description: '🚫 Only the Bot Owner can use this command.', color: THEME.error })] });
        }

        const target = message.mentions.users.first();
        const amount = parseInt(args[1]);

        if (!target) return message.reply({ embeds: [createEmbed({ description: '⚠️ Usage: `l!givecoins @user amount`', color: THEME.error })] });
        if (isNaN(amount) || amount <= 0) return message.reply({ embeds: [createEmbed({ description: '⚠️ Invalid amount.', color: THEME.error })] });

        const eco = getUserEconomy(message.guild.id, target.id);
        eco.wallet += amount;
        updateUserEconomy(message.guild.id, target.id, eco);

        return message.reply({ embeds: [createEmbed({ 
            description: `✅ Added **${amount.toLocaleString()} LC** to ${target}'s wallet.\n💳 **New Wallet Balance:** ${eco.wallet.toLocaleString()} LC`, 
            color: THEME.success 
        })] });
    },

    async interact(interaction, client) {
        if (interaction.user.id !== process.env.BOT_OWNER_ID) {
            return interaction.reply({ embeds: [createEmbed({ description: '🚫 Only the Bot Owner can use this command.', color: THEME.error })], flags: 64 });
        }

        const target = interaction.options.getUser('user');
        const amount = interaction.options.getInteger('amount');

        if (amount <= 0) return interaction.reply({ embeds: [createEmbed({ description: '⚠️ Amount must be greater than 0.', color: THEME.error })], flags: 64 });

        const eco = getUserEconomy(interaction.guild.id, target.id);
        eco.wallet += amount;
        updateUserEconomy(interaction.guild.id, target.id, eco);

        return interaction.reply({ embeds: [createEmbed({ 
            description: `✅ Added **${amount.toLocaleString()} LC** to ${target}'s wallet.\n💳 **New Wallet Balance:** ${eco.wallet.toLocaleString()} LC`, 
            color: THEME.success 
        })] });
    }
};