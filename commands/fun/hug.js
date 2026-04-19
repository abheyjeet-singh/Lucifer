const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, THEME } = require('../../utils/embeds');
const axios = require('axios');

module.exports = {
    name: 'hug',
    description: 'Give someone a warm infernal embrace!',
    data: new SlashCommandBuilder().setName('hug').setDescription('Give someone a warm infernal embrace!').addUserOption(o => o.setName('target').setDescription('Who are you hugging?').setRequired(true)),
    
    async execute(message, args, client) {
        const target = message.mentions.users.first();
        if (!target) return message.reply('⚠️ Mention someone to hug!');
        if (target.id === message.author.id) return message.reply("Hugging yourself? How lonely must you be...");
        
        try {
            const { data } = await axios.get('https://nekos.best/api/v2/hug');
            const gif = data.results[0].url;
            
            return message.reply({ 
                content: `🤗 **${message.author.username}** hugs <@${target.id}>!`, 
                embeds: [createEmbed({ context: message, image: gif, color: THEME.primary })],
                allowedMentions: { parse: ['users'] } 
            });
        } catch (e) {
            console.error('Hug API Error:', e.message);
            return message.reply(`🤗 **${message.author.username}** hugs <@${target.id}>! (GIF failed to load)`);
        }
    },

    async interact(interaction, client) {
        const target = interaction.options.getUser('target');
        if (target.id === interaction.user.id) return interaction.reply({ content: "Hugging yourself? How lonely must you be...", flags: 64 });
        
        try {
            const { data } = await axios.get('https://nekos.best/api/v2/hug');
            const gif = data.results[0].url;
            
            return interaction.reply({ 
                content: `🤗 **${interaction.user.username}** hugs <@${target.id}>!`, 
                embeds: [createEmbed({ context: interaction, image: gif, color: THEME.primary })],
                allowedMentions: { parse: ['users'] } 
            });
        } catch (e) {
            console.error('Hug API Error:', e.message);
            return interaction.reply(`🤗 **${interaction.user.username}** hugs <@${target.id}>! (GIF failed to load)`);
        }
    }
};