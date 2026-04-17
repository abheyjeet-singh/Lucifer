const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, THEME } = require('../../utils/embeds');
const axios = require('axios');

module.exports = {
    name: 'kill',
    description: 'Send someone straight to Hell!',
    data: new SlashCommandBuilder().setName('kill').setDescription('Send someone straight to Hell!').addUserOption(o => o.setName('target').setDescription('Who are you sending to Hell?').setRequired(true)),
    
    async execute(message, args, client) {
        const target = message.mentions.users.first();
        if (!target) return message.reply('⚠️ Mention someone to send to Hell!');
        if (target.id === message.author.id) return message.reply('Suicide is not the way. Let me do the killing.');
        
        try {
            const { data } = await axios.get('https://nekos.best/api/v2/kill');
            const gif = data.results[0].url;
            
            return message.reply({ 
                content: `💀🔥 **${message.author.username}** sends <@${target.id}> straight to Hell!`, 
                embeds: [createEmbed({ image: gif, color: THEME.secondary })],
                allowedMentions: { parse: ['users'] } 
            });
        } catch (e) {
            console.error('Kill API Error:', e.message);
            return message.reply(`💀🔥 **${message.author.username}** sends <@${target.id}> straight to Hell! (GIF failed to load)`);
        }
    },

    async interact(interaction, client) {
        const target = interaction.options.getUser('target');
        if (target.id === interaction.user.id) return interaction.reply({ content: 'Suicide is not the way. Let me do the killing.', flags: 64 });
        
        try {
            const { data } = await axios.get('https://nekos.best/api/v2/kill');
            const gif = data.results[0].url;
            
            return interaction.reply({ 
                content: `💀🔥 **${interaction.user.username}** sends <@${target.id}> straight to Hell!`, 
                embeds: [createEmbed({ image: gif, color: THEME.secondary })],
                allowedMentions: { parse: ['users'] } 
            });
        } catch (e) {
            console.error('Kill API Error:', e.message);
            return interaction.reply(`💀🔥 **${interaction.user.username}** sends <@${target.id}> straight to Hell! (GIF failed to load)`);
        }
    }
};