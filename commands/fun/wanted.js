const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { createEmbed, THEME } = require('../../utils/embeds');
const { buildWantedCard } = require('../../utils/canvasBuilder');

module.exports = {
    name: 'wanted',
    description: 'Put a bounty on someone\'s head!',
    category: 'fun',
    usage: 'wanted [@user]',
    permissions: [],
    data: new SlashCommandBuilder()
        .setName('wanted')
        .setDescription('Put a bounty on someone\'s head!')
        .addUserOption(o => o.setName('target').setDescription('Who is wanted?').setRequired(true)),
    
    async execute(message, args, client) {
        const target = message.mentions.users.first();
        if (!target) return message.reply('⚠️ Mention someone to put a bounty on!');
        return this.run(client, target, message);
    },

    async interact(interaction, client) {
        const target = interaction.options.getUser('target');
        return this.run(client, target, interaction);
    },

    async run(client, target, context) {
        // Generate a random bounty between 1,000 and 100,000
        const bounty = (Math.floor(Math.random() * 100) + 1) * 1000; 
        
        try {
            const member = await context.guild.members.fetch(target.id).catch(() => null);
            if (!member) return context.reply({ embeds: [createEmbed({ context: context, description: '❌ User not found in this realm.', color: THEME.error })] });
            
            const imageBuffer = await buildWantedCard(member, bounty.toLocaleString());
            const attachment = new AttachmentBuilder(imageBuffer, { name: 'wanted.png' });
            return context.reply({ files: [attachment] });
        } catch (e) {
            console.error('Wanted Card Error:', e);
            return context.reply({ embeds: [createEmbed({ context: context, description: `💀 **${target.username}** is WANTED for ${bounty.toLocaleString()} LC!`, color: THEME.secondary })] });
        }
    }
};