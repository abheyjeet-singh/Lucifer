const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createEmbed, THEME } = require('../../utils/embeds');
const { getSuggestionChannel } = require('../../database/db');

module.exports = {
    name: 'suggest', description: 'Submit a prayer to the council', category: 'utility', usage: 'suggest <idea>', permissions: [],
    data: new SlashCommandBuilder().setName('suggest').setDescription('Submit a prayer to the council').addStringOption(o => o.setName('idea').setDescription('Your suggestion').setRequired(true)),
    async execute(message, args, client) { const idea = args.join(' '); if (!idea) return message.reply({ embeds: [createEmbed({ context: message, description: '⚠️ Provide an idea.', color: THEME.error })] }); return this.run(client, message.guild, message.author, idea, message); },
    async interact(interaction, client) { return this.run(client, interaction.guild, interaction.user, interaction.options.getString('idea'), interaction); },
    async run(client, guild, user, idea, context) {
        const chId = getSuggestionChannel(guild.id); if (!chId) return context.reply({ embeds: [createEmbed({ context: guild, description: '⚠️ Suggestions not configured.', color: THEME.error })] });
        const ch = guild.channels.cache.get(chId); if (!ch) return context.reply({ embeds: [createEmbed({ context: guild, description: '⚠️ Suggestion channel missing.', color: THEME.error })] });
        const embed = createEmbed({ context: guild, title: '🗳️ New Prayer', description: `**From:** ${user}\n\n${idea}`, color: THEME.celestial });
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('sug_up').setLabel('✅ Approve').setStyle(ButtonStyle.Success), new ButtonBuilder().setCustomId('sug_down').setLabel('❌ Deny').setStyle(ButtonStyle.Danger));
        await ch.send({ embeds: [embed], components: [row] });
        return context.reply({ embeds: [createEmbed({ context: guild, description: '🗳️ Your prayer has been submitted.', color: THEME.success })] });
    },
};
