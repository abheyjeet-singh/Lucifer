const { createEmbed, THEME } = require('../../utils/embeds');
const { getUserEconomy, updateUserEconomy } = require('../../database/db');

module.exports = {
    name: 'givecoins',
    description: 'Give Lux Coins to a user (Bot Owner Only)',
    category: 'utility',
    usage: 'givecoins <@user> <amount>',
    // data: REMOVED — Saves a slash command slot! Use l!givecoins instead.

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
    }
};