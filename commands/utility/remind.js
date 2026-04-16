const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, THEME } = require('../../utils/embeds');
const { addReminder } = require('../../database/db');

function parseDuration(str) { const regex = /^(\d+)(s|m|h|d)$/; const match = str?.toLowerCase().match(regex); if (!match) return null; const num = parseInt(match[1]); const unit = { s: 1, m: 60, h: 3600, d: 86400 }[match[2]]; return num * unit * 1000; }

module.exports = {
    name: 'remind', description: 'Set a divine alarm', category: 'utility', usage: 'remind <duration> <reason>', permissions: [],
    data: new SlashCommandBuilder().setName('remind').setDescription('Set a divine alarm').addStringOption(o => o.setName('duration').setDescription('e.g., 1h, 30m').setRequired(true)).addStringOption(o => o.setName('reason').setDescription('What to remember').setRequired(true)),
    async execute(message, args, client) { if (args.length < 2) return message.reply({ embeds: [createEmbed({ description: '⚠️ `l!remind 30m Check oven`', color: THEME.error })] }); const ms = parseDuration(args[0]); if (!ms) return message.reply({ embeds: [createEmbed({ description: '⚠️ Invalid duration.', color: THEME.error })] }); const reason = args.slice(1).join(' '); addReminder(message.author.id, message.channel.id, Date.now() + ms, reason); return message.reply({ embeds: [createEmbed({ description: `⏰ I will remind you in ${args[0]}.`, color: THEME.success })] }); },
    async interact(interaction, client) { const dur = interaction.options.getString('duration'); const ms = parseDuration(dur); if (!ms) return interaction.reply({ embeds: [createEmbed({ description: '⚠️ Invalid duration.', color: THEME.error })], flags: 64 }); const reason = interaction.options.getString('reason'); addReminder(interaction.user.id, interaction.channel.id, Date.now() + ms, reason); return interaction.reply({ embeds: [createEmbed({ description: `⏰ I will remind you in ${dur}.`, color: THEME.success })] }); },
};
