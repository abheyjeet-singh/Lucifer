const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createEmbed, THEME } = require('../../utils/embeds');
const { removeStarboard, removeSuggestionChannel, removeCountingChannel, removeLogChannel, removeWelcome, removeVerify, removeDynamicVcHub } = require('../../database/db');

module.exports = {
    name: 'unset', 
    description: 'Disable QoL feature setups', 
    category: 'utility', 
    usage: 'unset <feature>', 
    permissions: ['Administrator'],
    
    data: new SlashCommandBuilder()
        .setName('unset')
        .setDescription('Disable QoL feature setups')
        .addSubcommand(sc => sc.setName('starboard').setDescription('Disable the Starboard'))
        .addSubcommand(sc => sc.setName('suggestions').setDescription('Disable the Suggestion channel'))
        .addSubcommand(sc => sc.setName('counting').setDescription('Disable the Counting channel'))
        .addSubcommand(sc => sc.setName('logchannel').setDescription('Disable the Mod Log channel'))
        .addSubcommand(sc => sc.setName('welcome').setDescription('Disable Welcome/Leave messages'))
        .addSubcommand(sc => sc.setName('verify').setDescription('Disable the Verify system'))
        .addSubcommand(sc => sc.setName('dynamicvc').setDescription('Disable the Dynamic VC hub'))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
        
    async execute(message, args, client) { 
        return message.reply({ embeds: [createEmbed({ description: '⚠️ Use `/unset` slash commands.', color: THEME.error })] }); 
    },
    
    async interact(interaction, client) {
        const sub = interaction.options.getSubcommand();
        
        if (sub === 'starboard') { 
            removeStarboard(interaction.guild.id); 
            return interaction.reply({ embeds: [createEmbed({ description: '⭐ Starboard has been disabled.', color: THEME.accent })] }); 
        }
        if (sub === 'suggestions') { 
            removeSuggestionChannel(interaction.guild.id); 
            return interaction.reply({ embeds: [createEmbed({ description: '🗳️ Suggestion channel has been disabled.', color: THEME.accent })] }); 
        }
        if (sub === 'counting') { 
            removeCountingChannel(interaction.guild.id); 
            return interaction.reply({ embeds: [createEmbed({ description: '🔢 Counting channel has been disabled.', color: THEME.accent })] }); 
        }
        if (sub === 'logchannel') { 
            removeLogChannel(interaction.guild.id); 
            return interaction.reply({ embeds: [createEmbed({ description: '📜 Mod Log channel has been disabled.', color: THEME.accent })] }); 
        }
        if (sub === 'welcome') { 
            removeWelcome(interaction.guild.id); 
            return interaction.reply({ embeds: [createEmbed({ description: '👋 Welcome/Leave system has been disabled.', color: THEME.accent })] }); 
        }
        if (sub === 'verify') { 
            removeVerify(interaction.guild.id); 
            return interaction.reply({ embeds: [createEmbed({ description: '✅ Verify system has been disabled.', color: THEME.accent })] }); 
        }
        if (sub === 'dynamicvc') { 
            removeDynamicVcHub(interaction.guild.id); 
            return interaction.reply({ embeds: [createEmbed({ description: '🔊 Dynamic VC hub has been disabled.', color: THEME.accent })] }); 
        }
    },
};