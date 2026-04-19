const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, THEME } = require('../../utils/embeds');
const axios = require('axios');

module.exports = {
    name: 'kiss',
    description: 'Give someone a sinful kiss!',
    data: new SlashCommandBuilder().setName('kiss').setDescription('Give someone a sinful kiss!').addUserOption(o => o.setName('target').setDescription('Who are you kissing?').setRequired(true)),
    
    async execute(message, args, client) {
        const target = message.mentions.users.first();
        if (!target) return message.reply('⚠️ Mention someone to kiss!');
        if (target.id === message.author.id) return message.reply('Kissing yourself? How utterly narcissistic. I like it.');
        
        try {
            const { data } = await axios.get('https://nekos.best/api/v2/kiss');
            const gif = data.results[0].url;
            
            return message.reply({ 
                content: `💋 **${message.author.username}** kisses <@${target.id}>!`, 
                embeds: [createEmbed({ context: message, image: gif, color: THEME.primary })],
                allowedMentions: { parse: ['users'] } 
            });
        } catch (e) {
            console.error('Kiss API Error:', e.message);
            return message.reply(`💋 **${message.author.username}** kisses <@${target.id}>! (GIF failed to load)`);
        }
    },

    async interact(interaction, client) {
        const target = interaction.options.getUser('target');
        if (target.id === interaction.user.id) return interaction.reply({ content: 'Kissing yourself? How utterly narcissistic. I like it.', flags: 64 });
        
        try {
            const { data } = await axios.get('https://nekos.best/api/v2/kiss');
            const gif = data.results[0].url;
            
            return interaction.reply({ 
                content: `💋 **${interaction.user.username}** kisses <@${target.id}>!`, 
                embeds: [createEmbed({ context: interaction, image: gif, color: THEME.primary })],
                allowedMentions: { parse: ['users'] } 
            });
        } catch (e) {
            console.error('Kiss API Error:', e.message);
            return interaction.reply(`💋 **${interaction.user.username}** kisses <@${target.id}>! (GIF failed to load)`);
        }
    }
};