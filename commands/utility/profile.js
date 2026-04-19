const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { createEmbed, THEME } = require('../../utils/embeds');
const { getUserEconomy, getMarriage, getInventory, getUserBadges, addBadge, hasBadge } = require('../../database/db');
const { buildProfileCard } = require('../../utils/canvasBuilder');

module.exports = {
    name: 'profile',
    description: 'View your or someone else\'s visual profile card',
    data: new SlashCommandBuilder()
        .setName('profile')
        .setDescription('View a visual profile card')
        .addUserOption(o => o.setName('user').setDescription('Whose profile to view')),

    async execute(message, args, client) {
        const target = message.mentions.users.first() || message.author;
        const member = await message.guild.members.fetch(target.id).catch(() => null);
        if (!member) return;

        const eco = getUserEconomy(message.guild.id, target.id);
        const marriage = getMarriage(target.id);
        const inventory = getInventory(message.guild.id, target.id);
        const badges = getUserBadges(message.guild.id, target.id);

        // ── Auto-Award Wealth Badges ──
        const netWorth = eco.wallet + eco.bank;
        if (netWorth >= 10000 && !hasBadge(message.guild.id, target.id, 'WEALTH_10K')) addBadge(message.guild.id, target.id, 'WEALTH_10K');
        if (netWorth >= 100000 && !hasBadge(message.guild.id, target.id, 'WEALTH_100K')) addBadge(message.guild.id, target.id, 'WEALTH_100K');
        
        // Refetch badges in case we just awarded one
        const updatedBadges = getUserBadges(message.guild.id, target.id);

        try {
            const imageBuffer = await buildProfileCard(
                member, eco, marriage, member.joinedTimestamp, target.createdTimestamp, inventory.length, updatedBadges, eco.profile_bg
            );
            const attachment = new AttachmentBuilder(imageBuffer, { name: 'profile.png' });
            return message.reply({ files: [attachment] });
        } catch (e) {
            console.error('Profile Card Error:', e);
            return message.reply({ embeds: [createEmbed({ context: message, description: `👤 **${target.username}**\n💳 Wallet: ${eco.wallet.toLocaleString()} LC\n🏦 Bank: ${eco.bank.toLocaleString()} LC\n💍 Married: ${marriage ? 'Yes' : 'No'}`, color: THEME.primary })] });
        }
    },

    async interact(interaction, client) {
        const target = interaction.options.getUser('user') || interaction.user;
        const member = await interaction.guild.members.fetch(target.id).catch(() => null);
        if (!member) return interaction.reply({ embeds: [createEmbed({ context: interaction, description: '❌ User not found.', color: THEME.error })], flags: 64 });

        const eco = getUserEconomy(interaction.guild.id, target.id);
        const marriage = getMarriage(target.id);
        const inventory = getInventory(interaction.guild.id, target.id);
        let badges = getUserBadges(interaction.guild.id, target.id);

        // ── Auto-Award Wealth Badges ──
        const netWorth = eco.wallet + eco.bank;
        if (netWorth >= 10000 && !hasBadge(interaction.guild.id, target.id, 'WEALTH_10K')) addBadge(interaction.guild.id, target.id, 'WEALTH_10K');
        if (netWorth >= 100000 && !hasBadge(interaction.guild.id, target.id, 'WEALTH_100K')) addBadge(interaction.guild.id, target.id, 'WEALTH_100K');
        
        const updatedBadges = getUserBadges(interaction.guild.id, target.id);

        try {
            const imageBuffer = await buildProfileCard(
                member, eco, marriage, member.joinedTimestamp, target.createdTimestamp, inventory.length, updatedBadges, eco.profile_bg
            );
            const attachment = new AttachmentBuilder(imageBuffer, { name: 'profile.png' });
            return interaction.reply({ files: [attachment] });
        } catch (e) {
            console.error('Profile Card Error:', e);
            return interaction.reply({ embeds: [createEmbed({ context: interaction, description: `👤 **${target.username}**\n💳 Wallet: ${eco.wallet.toLocaleString()} LC\n🏦 Bank: ${eco.bank.toLocaleString()} LC\n💍 Married: ${marriage ? 'Yes' : 'No'}`, color: THEME.primary })], flags: 64 });
        }
    }
};