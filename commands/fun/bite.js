const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, THEME } = require('../../utils/embeds');
const axios = require('axios');

module.exports = {
    name: 'bite',
    description: 'Take a bite out of someone!',
    data: new SlashCommandBuilder().setName('bite').setDescription('Take a bite out of someone!').addUserOption(o => o.setName('target').setDescription('Who are you biting?').setRequired(true)),
    
    async execute(message, args, client) {
        const target = message.mentions.users.first();
        if (!target) return message.reply('⚠️ Mention someone to bite!');
        if (target.id === message.author.id) return message.reply("Biting yourself? You're no vampire, mortal.");
        
        try {
            const { data } = await axios.get('https://nekos.best/api/v2/bite');
            const gif = data.results[0].url;
            
            return message.reply({ 
                content: `🧛 **${message.author.username}** bites <@${target.id}>!`, 
                embeds: [createEmbed({ image: gif, color: THEME.accent })],
                allowedMentions: { parse: ['users'] } 
            });
        } catch (e) {
            console.error('Bite API Error:', e.message);
            return message.reply(`🧛 **${message.author.username}** bites <@${target.id}>! (GIF failed to load)`);
        }
    },

    async interact(interaction, client) {
        const target = interaction.options.getUser('target');
        if (target.id === interaction.user.id) return interaction.reply({ content: "Biting yourself? You're no vampire, mortal.", flags: 64 });
        
        try {
            const { data } = await axios.get('https://nekos.best/api/v2/bite');
            const gif = data.results[0].url;
            
            return interaction.reply({ 
                content: `🧛 **${interaction.user.username}** bites <@${target.id}>!`, 
                embeds: [createEmbed({ image: gif, color: THEME.accent })],
                allowedMentions: { parse: ['users'] } 
            });
        } catch (e) {
            console.error('Bite API Error:', e.message);
            return interaction.reply(`🧛 **${interaction.user.username}** bites <@${target.id}>! (GIF failed to load)`);
        }
    }
};