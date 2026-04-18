const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { createEmbed, THEME } = require('../../utils/embeds');
const { getMarriage } = require('../../database/db');
const { buildMarriageCard } = require('../../utils/canvasBuilder');

module.exports = {
    name: 'marriageinfo',
    description: 'View the visual marriage card for a couple',
    data: new SlashCommandBuilder()
        .setName('marriageinfo')
        .setDescription('View a visual marriage card')
        .addUserOption(o => o.setName('user').setDescription('Check someone\'s marriage')),

    async execute(message, args, client) {
        const target = message.mentions.users.first() || message.author;
        return this.sendCard(client, message.guild, target, message);
    },

    async interact(interaction, client) {
        const target = interaction.options.getUser('user') || interaction.user;
        return this.sendCard(client, interaction.guild, target, interaction);
    },

    async sendCard(client, guild, target, context) {
        const marriage = getMarriage(target.id);
        if (!marriage) return context.reply({ embeds: [createEmbed({ description: '💔 That soul is not married.', color: THEME.error })] });

        const partner = await client.users.fetch(marriage.partner_id).catch(() => null);
        if (!partner) return context.reply({ embeds: [createEmbed({ description: '❌ Could not find partner.', color: THEME.error })] });

        const member1 = await guild.members.fetch(target.id).catch(() => null);
        const member2 = await guild.members.fetch(partner.id).catch(() => null);
        if (!member1 || !member2) return context.reply({ embeds: [createEmbed({ description: '❌ Members not found.', color: THEME.error })] });

        try {
            const imageBuffer = await buildMarriageCard(member1, member2, marriage.timestamp);
            const attachment = new AttachmentBuilder(imageBuffer, { name: 'marriage.png' });
            return context.reply({ files: [attachment] });
        } catch (e) {
            console.error(e);
            return context.reply({ embeds: [createEmbed({ description: `💍 **${target.username}** is married to **${partner.username}**!`, color: THEME.primary })] });
        }
    }
};