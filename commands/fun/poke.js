const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, THEME } = require('../../utils/embeds');
const axios = require('axios');

module.exports = {
    name: 'poke',
    description: 'Annoy someone with a mischievous poke!',
    data: new SlashCommandBuilder().setName('poke').setDescription('Annoy someone with a poke!').addUserOption(o => o.setName('target').setDescription('Who are you poking?').setRequired(true)),
    
    async execute(message, args, client) {
        const target = message.mentions.users.first();
        if (!target) return message.reply('⚠️ Mention someone to poke!');
        if (target.id === message.author.id) return message.reply("Poking yourself? Bored already?");
        
        try {
            const { data } = await axios.get('https://nekos.best/api/v2/poke');
            const gif = data.results[0].url;
            
            return message.reply({ 
                content: `👆 **${message.author.username}** pokes <@${target.id}>!`, 
                embeds: [createEmbed({ context: message, image: gif, color: THEME.accent })],
                allowedMentions: { parse: ['users'] } 
            });
        } catch (e) {
            console.error('Poke API Error:', e.message);
            return message.reply(`👆 **${message.author.username}** pokes <@${target.id}>! (GIF failed to load)`);
        }
    },

    async interact(interaction, client) {
        const target = interaction.options.getUser('target');
        if (target.id === interaction.user.id) return interaction.reply({ content: "Poking yourself? Bored already?", flags: 64 });
        
        try {
            const { data } = await axios.get('https://nekos.best/api/v2/poke');
            const gif = data.results[0].url;
            
            return interaction.reply({ 
                content: `👆 **${interaction.user.username}** pokes <@${target.id}>!`, 
                embeds: [createEmbed({ context: interaction, image: gif, color: THEME.accent })],
                allowedMentions: { parse: ['users'] } 
            });
        } catch (e) {
            console.error('Poke API Error:', e.message);
            return interaction.reply(`👆 **${interaction.user.username}** pokes <@${target.id}>! (GIF failed to load)`);
        }
    }
};