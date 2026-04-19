const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { createEmbed, THEME } = require('../../utils/embeds');
const { getShip, addShip } = require('../../database/db');
const { buildShipCard } = require('../../utils/canvasBuilder');

module.exports = {
    name: 'ship',
    description: 'Ship two users together or try your luck!',
    data: new SlashCommandBuilder()
        .setName('ship')
        .setDescription('Celestial Matchmaker')
        .addSubcommand(sc => sc.setName('users')
            .setDescription('Ship two users together')
            .addUserOption(o => o.setName('user1').setDescription('First user').setRequired(true))
            .addUserOption(o => o.setName('user2').setDescription('Second user (Defaults to you)')))
        .addSubcommand(sc => sc.setName('random')
            .setDescription('Ship yourself with a random server member')),

    async execute(message, args, client) {
        // Basic prefix fallback
        return message.reply({ embeds: [createEmbed({ context: message, description: '⚠️ Please use `/ship users` or `/ship random`!', color: THEME.accent })] });
    },

    async interact(interaction, client) {
        const sub = interaction.options.getSubcommand();

        if (sub === 'random') {
            const members = await interaction.guild.members.fetch({ limit: 50 });
            const filtered = members.filter(m => !m.user.bot && m.id !== interaction.user.id);
            if (filtered.size === 0) return interaction.reply({ embeds: [createEmbed({ context: interaction, description: '❌ Not enough humans to ship!', color: THEME.error })], flags: 64 });
            
            const randomMember = filtered.random();
            return this.processShip(interaction, interaction.member, randomMember);
        } 
        
        if (sub === 'users') {
            const user1 = interaction.options.getMember('user1');
            const user2 = interaction.options.getMember('user2') || interaction.member;

            if (user1.id === user2.id) return interaction.reply({ embeds: [createEmbed({ context: interaction, description: '⚠️ You cannot ship someone with themselves!', color: THEME.error })], flags: 64 });
            if (user1.user.bot || user2.user.bot) return interaction.reply({ embeds: [createEmbed({ context: interaction, description: '⚠️ Celestial rules forbid bot shipping.', color: THEME.error })], flags: 64 });

            return this.processShip(interaction, user1, user2);
        }
    },

    async processShip(context, member1, member2) {
        await context.deferReply();

        // Check DB for existing ship data
        let shipData = getShip(context.guild.id, member1.id, member2.id);
        
        if (!shipData) {
            // Generate random percentage and save to DB
            const percentage = Math.floor(Math.random() * 101);
            addShip(context.guild.id, member1.id, member2.id, percentage);
            shipData = { percentage };
        }

        try {
            const imageBuffer = await buildShipCard(member1, member2, shipData.percentage);
            const attachment = new AttachmentBuilder(imageBuffer, { name: 'ship.png' });
            return context.editReply({ content: `${member1} ${member2}`, files: [attachment] });
        } catch (e) {
            console.error(e);
            return context.editReply({ embeds: [createEmbed({ context: guild, description: `💕 **${member1.user.username}** x **${member2.user.username}** = **${shipData.percentage}%**`, color: THEME.primary })] });
        }
    }
};