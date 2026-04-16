const { EmbedBuilder } = require('discord.js');
const { getGuildSettings } = require('../database/db');

const THEME = {
    primary:   '#FFD700',
    secondary: '#8B0000',
    dark:      '#1A0A2E',
    accent:    '#FF4500',
    success:   '#00FF7F',
    error:     '#DC143C',
    celestial: '#4B0082',
};

const LUCIFER_FOOTER = '🔥 Lucifer Morningstar | Lord of Hell';

function createEmbed({ title, description, color, thumbnail, image, fields, author }) {
    const embed = new EmbedBuilder().setColor(color || THEME.primary);

    if (title) embed.setTitle(title);
    if (description) embed.setDescription(description);
    if (thumbnail) embed.setThumbnail(thumbnail);
    if (image) embed.setImage(image);
    if (fields && fields.length) embed.addFields(fields);
    if (author) embed.setAuthor(author);

    embed.setFooter({ text: LUCIFER_FOOTER }).setTimestamp();
    return embed;
}

async function modLog(client, guild, data) {
    const settings = getGuildSettings(guild.id);
    if (!settings.log_channel_id) return;
    const channel = guild.channels.cache.get(settings.log_channel_id);
    if (!channel) return;

    const payload = {};
    // Support passing an object with { embed, files } OR just an embed directly
    if (data instanceof EmbedBuilder) {
        payload.embeds = [data];
    } else {
        if (data.embed) payload.embeds = [data.embed];
        if (data.files) payload.files = data.files;
    }

    try { await channel.send(payload); } catch {}
}

module.exports = { THEME, LUCIFER_FOOTER, createEmbed, modLog };
