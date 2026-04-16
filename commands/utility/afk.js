const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, THEME } = require('../../utils/embeds');
const { setAfk, removeAfk } = require('../../database/db');

module.exports = {
    name: 'afk', description: 'Set your slumber status', category: 'utility', usage: 'afk [reason]', permissions: [],
    data: new SlashCommandBuilder().setName('afk').setDescription('Set your slumber status').addStringOption(o => o.setName('reason').setDescription('Why are you sleeping?')),
    async execute(message, args, client) { const reason = args.join(' ') || 'Slumbering'; setAfk(message.author.id, message.guild.id, reason); return message.reply({ embeds: [createEmbed({ description: `💤 ${message.author} is now AFK: ${reason}`, color: THEME.celestial })] }); },
    async interact(interaction, client) { const reason = interaction.options.getString('reason') || 'Slumbering'; setAfk(interaction.user.id, interaction.guild.id, reason); return interaction.reply({ embeds: [createEmbed({ description: `💤 ${interaction.user} is now AFK: ${reason}`, color: THEME.celestial })] }); },
};
