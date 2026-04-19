const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, THEME } = require('../../utils/embeds');
const axios = require('axios');

module.exports = {
    name: 'punch',
    description: 'Throw a heavy punch at someone!',
    data: new SlashCommandBuilder().setName('punch').setDescription('Throw a heavy punch at someone!').addUserOption(o => o.setName('target').setDescription('Who are you punching?').setRequired(true)),
    
    async execute(message, args, client) {
        const target = message.mentions.users.first();
        if (!target) return message.reply('⚠️ Mention someone to punch!');
        if (target.id === message.author.id) return message.reply('Punching yourself? The Devil approves of the pain.');
        
        try {
            const { data } = await axios.get('https://nekos.best/api/v2/punch');
            const gif = data.results[0].url;
            
            return message.reply({ 
                content: `👊 **${message.author.username}** punches <@${target.id}>!`, 
                embeds: [createEmbed({ context: message, image: gif, color: THEME.accent })],
                allowedMentions: { parse: ['users'] } 
            });
        } catch (e) {
            console.error('Punch API Error:', e.message);
            return message.reply(`👊 **${message.author.username}** punches <@${target.id}>! (GIF failed to load)`);
        }
    },

    async interact(interaction, client) {
        const target = interaction.options.getUser('target');
        if (target.id === interaction.user.id) return interaction.reply({ content: 'Punching yourself? The Devil approves of the pain.', flags: 64 });
        
        try {
            const { data } = await axios.get('https://nekos.best/api/v2/punch');
            const gif = data.results[0].url;
            
            return interaction.reply({ 
                content: `👊 **${interaction.user.username}** punches <@${target.id}>!`, 
                embeds: [createEmbed({ context: interaction, image: gif, color: THEME.accent })],
                allowedMentions: { parse: ['users'] } 
            });
        } catch (e) {
            console.error('Punch API Error:', e.message);
            return interaction.reply(`👊 **${interaction.user.username}** punches <@${target.id}>! (GIF failed to load)`);
        }
    }
};