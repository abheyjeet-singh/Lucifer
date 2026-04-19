const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, THEME } = require('../../utils/embeds');
const axios = require('axios');

module.exports = {
    name: 'dropkick',
    description: 'Dropkick someone out of the Lux!',
    data: new SlashCommandBuilder().setName('dropkick').setDescription('Dropkick someone out of the Lux!').addUserOption(o => o.setName('target').setDescription('Who are you dropkicking?').setRequired(true)),
    
    async execute(message, args, client) {
        const target = message.mentions.users.first();
        if (!target) return message.reply('⚠️ Mention someone to dropkick!');
        if (target.id === message.author.id) return message.reply("You can't dropkick yourself... just walk out the door.");
        
        try {
            const { data } = await axios.get('https://nekos.best/api/v2/kick');
            const gif = data.results[0].url;
            
            return message.reply({ 
                content: `🦶 **${message.author.username}** dropkicks <@${target.id}>!`, 
                embeds: [createEmbed({ context: message, image: gif, color: THEME.accent })],
                allowedMentions: { parse: ['users'] } 
            });
        } catch (e) {
            console.error('Dropkick API Error:', e.message);
            return message.reply(`🦶 **${message.author.username}** dropkicks <@${target.id}>! (GIF failed to load)`);
        }
    },

    async interact(interaction, client) {
        const target = interaction.options.getUser('target');
        if (target.id === interaction.user.id) return interaction.reply({ content: "You can't dropkick yourself... just walk out the door.", flags: 64 });
        
        try {
            const { data } = await axios.get('https://nekos.best/api/v2/kick');
            const gif = data.results[0].url;
            
            return interaction.reply({ 
                content: `🦶 **${interaction.user.username}** dropkicks <@${target.id}>!`, 
                embeds: [createEmbed({ context: interaction, image: gif, color: THEME.accent })],
                allowedMentions: { parse: ['users'] } 
            });
        } catch (e) {
            console.error('Dropkick API Error:', e.message);
            return interaction.reply(`🦶 **${interaction.user.username}** dropkicks <@${target.id}>! (GIF failed to load)`);
        }
    }
};