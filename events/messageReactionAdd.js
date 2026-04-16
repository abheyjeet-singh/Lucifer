const { getReactionRoles, getStarboard } = require('../database/db');
const { createEmbed, THEME } = require('../utils/embeds');

module.exports = {
    once: false,
    async execute(reaction, user, client) {
        if (user.bot) return;
        if (!reaction.message.guild) return;

        try { if (reaction.partial) await reaction.fetch(); if (reaction.message.partial) await reaction.message.fetch(); } catch { return; }

        // ── 1. Reaction Roles ──
        const rrList = getReactionRoles(reaction.message.id);
        if (rrList.length > 0) {
            const rr = rrList.find(r => r.emoji === reaction.emoji.name || r.emoji === reaction.emoji.toString());
            if (rr) {
                const member = await reaction.message.guild.members.fetch(user.id).catch(() => null);
                const role = reaction.message.guild.roles.cache.get(rr.role_id);
                if (member && role) try { await member.roles.add(role); } catch {}
            }
        }

        // ── 2. Starboard ──
        const starboard = getStarboard(reaction.message.guild.id);
        if (starboard.channel_id && reaction.emoji.name === starboard.emoji) {
            if (reaction.count >= starboard.threshold) {
                const ch = reaction.message.guild.channels.cache.get(starboard.channel_id);
                if (!ch) return;
                
                // Prevent duplicate starboard posts by checking channel history
                const existing = await ch.messages.fetch({ limit: 10 });
                if (existing.some(m => m.embeds[0]?.footer?.text?.includes(reaction.message.id))) return;

                const starEmbed = createEmbed({
                    author: { name: reaction.message.author?.tag, iconURL: reaction.message.author?.displayAvatarURL() },
                    description: reaction.message.content || '*No text*',
                    fields: [{ name: '⭐ Source', value: `[Jump](${reaction.message.url})`, inline: true }, { name: '📊 Stars', value: `${reaction.count}`, inline: true }],
                    color: THEME.primary,
                    footer: { text: `🔥 Golden Idol | ID: ${reaction.message.id}` },
                    image: reaction.message.attachments.first()?.url || null,
                    timestamp: Date.now()
                });

                ch.send({ embeds: [starEmbed] }).catch(() => {});
            }
        }
    },
};
