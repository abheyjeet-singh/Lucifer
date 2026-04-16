const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, THEME } = require('../../utils/embeds');

module.exports = {
    name: 'snipe',
    description: 'Catch the last deleted message',
    category: 'moderation',
    usage: 'snipe',
    permissions: [],
    data: new SlashCommandBuilder()
        .setName('snipe')
        .setDescription('Catch the last deleted message in this channel'),

    async execute(message, args, client) {
        return this.run(client, message.guild, message.channel, message);
    },

    async interact(interaction, client) {
        return this.run(client, interaction.guild, interaction.channel, interaction);
    },

    async run(client, guild, channel, context) {
        const snipe = client.snipes.get(`${guild.id}-${channel.id}`);

        if (!snipe) return context.reply({ embeds: [createEmbed({ description: '💀 Nothing to snipe. The shadows are empty.', color: THEME.dark })] });

        return context.reply({ embeds: [createEmbed({
            author: { name: snipe.authorTag, iconURL: snipe.avatar },
            description: snipe.content,
            color: THEME.celestial,
            footer: { text: `🔥 Lucifer Morningstar | Deleted <t:${Math.floor(snipe.timestamp / 1000)}:R>` },
        })] });
    },
};
