const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, THEME } = require('../../utils/embeds');
const axios = require('axios');

module.exports = {
    name: 'pat',
    description: 'Give someone a gentle headpat!',
    data: new SlashCommandBuilder().setName('pat').setDescription('Give someone a gentle headpat!').addUserOption(o => o.setName('target').setDescription('Who are you patting?').setRequired(true)),
    
    async execute(message, args, client) {
        const target = message.mentions.users.first();
        if (!target) return message.reply('⚠️ Mention someone to pat!');
        if (target.id === message.author.id) return message.reply("Patting yourself? Are you okay?");
        
        try {
            const { data } = await axios.get('https://nekos.best/api/v2/pat');
            const gif = data.results[0].url;
            
            return message.reply({ 
                content: `🥺 **${message.author.username}** pats <@${target.id}>!`, 
                embeds: [createEmbed({ context: message, image: gif, color: THEME.celestial })],
                allowedMentions: { parse: ['users'] } 
            });
        } catch (e) {
            console.error('Pat API Error:', e.message);
            return message.reply(`🥺 **${message.author.username}** pats <@${target.id}>! (GIF failed to load)`);
        }
    },

    async interact(interaction, client) {
        const target = interaction.options.getUser('target');
        if (target.id === interaction.user.id) return interaction.reply({ content: "Patting yourself? Are you okay?", flags: 64 });
        
        try {
            const { data } = await axios.get('https://nekos.best/api/v2/pat');
            const gif = data.results[0].url;
            
            return interaction.reply({ 
                content: `🥺 **${interaction.user.username}** pats <@${target.id}>!`, 
                embeds: [createEmbed({ context: interaction, image: gif, color: THEME.celestial })],
                allowedMentions: { parse: ['users'] } 
            });
        } catch (e) {
            console.error('Pat API Error:', e.message);
            return interaction.reply(`🥺 **${interaction.user.username}** pats <@${target.id}>! (GIF failed to load)`);
        }
    }
};