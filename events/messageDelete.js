const https = require('https');
const { createEmbed, THEME, modLog } = require('../utils/embeds');
const { getGuildSettings } = require('../database/db');

function downloadBuffer(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            if (res.statusCode === 302 || res.statusCode === 301) {
                return downloadBuffer(res.headers.location).then(resolve).catch(reject);
            }
            if (res.statusCode !== 200) return reject(new Error(`Failed: ${res.statusCode}`));
            const data = [];
            res.on('data', chunk => data.push(chunk));
            res.on('end', () => resolve(Buffer.concat(data)));
        }).on('error', reject);
    });
}

module.exports = {
    once: false,
    async execute(message, client) {
        if (!message.guild || message.author?.bot) return;

        // ── 1. Update Snipe Command ──
        client.snipes.set(`${message.guild.id}-${message.channel.id}`, {
            authorId: message.author?.id,
            authorTag: message.author?.tag,
            content: message.content || '*No text content*',
            image: message.attachments.find(a => a.contentType?.startsWith('image'))?.url || null,
            timestamp: Date.now(),
        });

        // ── 2. Send to Log Channel ──
        const settings = getGuildSettings(message.guild.id);
        if (!settings.log_channel_id) return;
        const logChannel = message.guild.channels.cache.get(settings.log_channel_id);
        if (!logChannel) return;

        const embed = createEmbed({
            title: '🗑️ Message Vanished',
            description: `**Author:** ${message.author} (${message.author?.id})\n**Channel:** ${message.channel}\n**Sent At:** <t:${Math.floor(message.createdTimestamp / 1000)}:R>`,
            color: THEME.accent,
        });

        if (message.content) {
            embed.addFields({ name: '📝 Content', value: message.content.substring(0, 1024) || '\u200B' });
        }

        // ── 3. Download & Re-upload Attachments ──
        const files = [];
        if (message.attachments.size > 0) {
            const attachmentsText = message.attachments.map(a => {
                const type = a.contentType?.startsWith('image') ? '🖼️ Image' : 
                             a.contentType?.startsWith('video') ? '🎬 Video' : 
                             a.contentType?.startsWith('audio') ? '🔊 Audio' : '📄 File';
                return `${type}: [${a.name}](${a.url}) (${(a.size / 1024).toFixed(1)} KB)`;
            }).join('\n');
            embed.addFields({ name: '📎 Attachments', value: attachmentsText.substring(0, 1024) });

            for (const attachment of message.attachments.values()) {
                // Skip files larger than 25MB (Discord upload limit)
                if (attachment.size > 24 * 1024 * 1024) continue; 
                
                try {
                    const buffer = await downloadBuffer(attachment.url);
                    files.push({ attachment: buffer, name: attachment.name });
                } catch (e) {
                    console.error(`Failed to download attachment: ${e.message}`);
                }
            }
        }

        try {
            await logChannel.send({ embeds: [embed], files });
        } catch (error) {
            console.error("Failed to send delete log:", error.message);
        }
    },
};
