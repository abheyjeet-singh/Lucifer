const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, THEME } = require('../../utils/embeds');
const axios = require('axios');

module.exports = {
    name: 'slap',
    description: 'Slap someone across the face!',
    data: new SlashCommandBuilder().setName('slap').setDescription('Slap someone across the face!').addUserOption(o => o.setName('target').setDescription('Who are you slapping?').setRequired(true)),
    
    async execute(message, args, client) {
        const target = message.mentions.users.first();
        if (!target) return message.reply('⚠️ Mention someone to slap!');
        if (target.id === message.author.id) return message.reply('Why are you slapping yourself? Strange mortal...');
        
        try {
            // Using nekos.best API - extremely reliable for Discord bots
            const { data } = await axios.get('https://nekos.best/api/v2/slap');
            const gif = data.results[0].url; // Gets the direct .gif URL
            
            return message.reply({ 
                content: `👋 **${message.author.username}** slaps <@${target.id}>!`, 
                embeds: [createEmbed({ image: gif, color: THEME.accent })],
                allowedMentions: { parse: ['users'] } 
            });
        } catch (e) {
            console.error('Slap API Error:', e.message);
            return message.reply(`👋 **${message.author.username}** slaps <@${target.id}>! (GIF failed to load)`);
        }
    },

    async interact(interaction, client) {
        const target = interaction.options.getUser('target');
        if (target.id === interaction.user.id) return interaction.reply({ content: 'Why are you slapping yourself? Strange mortal...', flags: 64 });
        
        try {
            const { data } = await axios.get('https://nekos.best/api/v2/slap');
            const gif = data.results[0].url;
            
            return interaction.reply({ 
                content: `👋 **${interaction.user.username}** slaps <@${target.id}>!`, 
                embeds: [createEmbed({ image: gif, color: THEME.accent })],
                allowedMentions: { parse: ['users'] } 
            });
        } catch (e) {
            console.error('Slap API Error:', e.message);
            return interaction.reply(`👋 **${interaction.user.username}** slaps <@${target.id}>! (GIF failed to load)`);
        }
    }
};