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

function createEmbed({ title, description, color, thumbnail, image, fields, author, context }) {
    const embed = new EmbedBuilder().setColor(color || THEME.primary);

    if (title) embed.setTitle(title);
    if (description) embed.setDescription(description);
    if (thumbnail) embed.setThumbnail(thumbnail);
    if (image) embed.setImage(image);
    if (fields && fields.length) embed.addFields(fields);
    if (author) embed.setAuthor(author);

    // ── Smart Dynamic Footer Logic ──
    let guild = null;
    if (context) {
        if (context.guild) guild = context.guild; // Handles Message & Interaction
        else if (context.name && context.id) guild = context; // Handles raw Guild object
    }

    let footerText;
    if (guild) {
        const botName = guild.members?.me?.displayName || 'Lucifer';
        footerText = `🔥 ${botName} • ${guild.name}`;
    } else {
        footerText = `🔥 Lucifer Morningstar`;
    }

    embed.setFooter({ text: footerText }).setTimestamp();
    return embed;
}

async function modLog(client, guild, data) {
    const settings = getGuildSettings(guild.id);
    if (!settings.log_channel_id) return;
    const channel = guild.channels.cache.get(settings.log_channel_id);
    if (!channel) return;

    const botName = guild.members?.me?.displayName || 'Lucifer';
    const dynamicFooter = `🔥 ${botName} • ${guild.name}`;

    const payload = {};
    if (data instanceof EmbedBuilder) {
        data.setFooter({ text: dynamicFooter });
        payload.embeds = [data];
    } else {
        if (data.embed) {
            data.embed.setFooter({ text: dynamicFooter });
            payload.embeds = [data.embed];
        }
        if (data.files) payload.files = data.files;
    }

    try { await channel.send(payload); } catch {}
}

module.exports = { THEME, createEmbed, modLog };