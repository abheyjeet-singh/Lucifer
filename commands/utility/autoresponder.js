const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createEmbed, THEME } = require('../../utils/embeds');
const { getAutoResponders, addAutoResponder, removeAutoResponder, clearAutoResponders } = require('../../database/db');
const { hasPermission } = require('../../utils/permissions');
const axios = require('axios');

// ════════════════════════════════════════
// ── TENOR URL RESOLVER ──
// ════════════════════════════════════════
async function resolveImageUrl(url) {
    if (!url) return null;
    
    // If it's already a direct media URL, return it (swap MP4 for GIF on Tenor)
    if (/\.(gif|png|jpg|jpeg|webp|mp4)(\?.*)?$/i.test(url) && !url.includes('tenor.com/view')) {
        if (url.includes('media.tenor.com') && url.endsWith('.mp4')) return url.replace('.mp4', '.gif');
        return url;
    }
    
    // Handle Tenor shortlinks using the .gif redirect trick
    if (url.includes('tenor.com')) {
        try {
            let tenorUrl = url;
            if (!tenorUrl.endsWith('.gif')) tenorUrl += '.gif'; // Forces redirect to CDN
            
            const res = await axios.get(tenorUrl, { 
                maxRedirects: 5,
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
                timeout: 5000
            });
            
            // Grab the final URL after all redirects
            const finalUrl = res.request.res?.responseUrl || url;
            if (finalUrl.includes('media.tenor.com')) {
                return finalUrl.replace('.mp4', '.gif');
            }
            
            // Fallback regex if redirect didn't work as expected
            const match = res.data.match(/https:\/\/media\.tenor\.com\/[^"'\s]+/i);
            if (match) return match[0].replace('.mp4', '.gif');
            
        } catch (e) {
            console.error('Tenor Redirect Error:', e.message);
        }
    }
    
    return url;
}

module.exports = {
    name: 'autoresponder',
    description: 'Manage auto responses for trigger words',
    category: 'utility',
    usage: 'autoresponder <add|remove|list|clear>',
    permissions: ['ManageMessages'],
    data: new SlashCommandBuilder()
        .setName('autoresponder')
        .setDescription('Manage auto responses for trigger words')
        .addSubcommand(sc =>
            sc.setName('add')
              .setDescription('Add an auto response')
              .addStringOption(o =>
                  o.setName('trigger')
                   .setDescription('The word/phrase that triggers the response')
                   .setRequired(true))
              .addStringOption(o =>
                  o.setName('response')
                   .setDescription('What the bot should text reply (optional if emoji/image used)')
                   .setRequired(false))
              .addStringOption(o =>
                  o.setName('match')
                   .setDescription('How to match the trigger')
                   .setRequired(false)
                   .addChoices(
                       { name: 'Contains (anywhere in message)', value: 'contains' },
                       { name: 'Exact (whole message must match)', value: 'exact' },
                       { name: 'Starts With (message starts with trigger)', value: 'startswith' }
                   ))
              .addStringOption(o =>
                  o.setName('emoji')
                   .setDescription('Emoji to react with (e.g., 👋 or custom emoji)')
                   .setRequired(false))
              .addStringOption(o =>
                  o.setName('image_url')
                   .setDescription('Direct Image/GIF URL or Tenor link')
                   .setRequired(false)))
        .addSubcommand(sc =>
            sc.setName('remove')
              .setDescription('Remove an auto response by its ID')
              .addIntegerOption(o =>
                  o.setName('id')
                   .setDescription('The ID of the auto responder to remove')
                   .setRequired(true)))
        .addSubcommand(sc =>
            sc.setName('list')
              .setDescription('View all auto responses'))
        .addSubcommand(sc =>
            sc.setName('clear')
              .setDescription('Remove all auto responses'))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    async execute(message, args, client) {
        const sub = args[0]?.toLowerCase();
        if (sub === 'add') {
            const trigger = args[1];
            const response = args[2];
            const matchType = args[3]?.toLowerCase() || 'contains';
            if (!trigger) return message.reply({ embeds: [createEmbed({ description: '⚠️ Usage: `l!autoresponder add <trigger> [response] [contains|exact|startswith]`\n*(For emoji/GIF, use the `/autoresponder add` slash command)*', color: THEME.error })] });
            if (!response) return message.reply({ embeds: [createEmbed({ description: '⚠️ You must provide a response text via prefix. Use `/autoresponder add` for emoji/GIF options!', color: THEME.error })] });
            if (!['contains', 'exact', 'startswith'].includes(matchType)) return message.reply({ embeds: [createEmbed({ description: '⚠️ Match type must be: `contains`, `exact`, or `startswith`', color: THEME.error })] });
            return this.addResponse(client, message.guild, message.member, trigger, response, matchType, null, null, message);
        }
        if (sub === 'remove') {
            const id = parseInt(args[1]);
            if (isNaN(id)) return message.reply({ embeds: [createEmbed({ description: '⚠️ Provide a valid ID. Usage: `l!autoresponder remove <id>`', color: THEME.error })] });
            return this.removeResponse(client, message.guild, message.member, id, message);
        }
        if (sub === 'clear') return this.clearAll(client, message.guild, message.member, message);
        if (sub === 'list' || !sub) return this.showList(client, message.guild, message);
        return message.reply({ embeds: [createEmbed({ description: '⚠️ Unknown subcommand. Use: `add`, `remove`, `list`, `clear`', color: THEME.error })] });
    },

    async interact(interaction, client) {
        const sub = interaction.options.getSubcommand();
        if (sub === 'add') {
            const trigger = interaction.options.getString('trigger');
            const response = interaction.options.getString('response');
            const matchType = interaction.options.getString('match') || 'contains';
            const emoji = interaction.options.getString('emoji');
            const imageUrlInput = interaction.options.getString('image_url');

            if (!response && !emoji && !imageUrlInput) {
                return interaction.reply({ embeds: [createEmbed({ description: '⚠️ You must provide at least a response, emoji, or image URL!', color: THEME.error })], flags: 64 });
            }

            await interaction.deferReply({ ephemeral: false });
            
            let resolvedUrl = null;
            if (imageUrlInput) {
                resolvedUrl = await resolveImageUrl(imageUrlInput);
            }

            return this.addResponse(client, interaction.guild, interaction.member, trigger, response, matchType, resolvedUrl, emoji, interaction);
        }
        if (sub === 'remove') {
            const id = interaction.options.getInteger('id');
            return this.removeResponse(client, interaction.guild, interaction.member, id, interaction);
        }
        if (sub === 'clear') return this.clearAll(client, interaction.guild, interaction.member, interaction);
        return this.showList(client, interaction.guild, interaction);
    },

    async addResponse(client, guild, member, trigger, response, matchType, imageUrl, emoji, context) {
        if (!hasPermission(member, 'ManageMessages')) return context.reply({ embeds: [createEmbed({ description: '🚫 You need **Manage Messages** permission.', color: THEME.error })] });

        const current = getAutoResponders(guild.id);
        if (current.length >= 25) return context.reply({ embeds: [createEmbed({ description: '⚠️ Maximum of 25 auto responders reached. Remove some first.', color: THEME.error })] });

        const id = addAutoResponder(guild.id, trigger, response, matchType, imageUrl, emoji);
        const matchLabel = { contains: 'Contains', exact: 'Exact Match', startswith: 'Starts With' }[matchType];

        let desc = `**ID:** ${id}\n**Trigger:** \`${trigger}\`\n**Match:** ${matchLabel}`;
        if (response) desc += `\n**Response:** ${response}`;
        if (emoji) desc += `\n**React:** ${emoji}`;
        if (imageUrl) desc += `\n**Media:** [GIF/Image Link](${imageUrl})`;

        return context.editReply ? context.editReply({ embeds: [createEmbed({
            title: '✅ Auto Responder Added',
            description: desc,
            color: THEME.success
        })] }) : context.reply({ embeds: [createEmbed({
            title: '✅ Auto Responder Added',
            description: desc,
            color: THEME.success
        })] });
    },

    async removeResponse(client, guild, member, id, context) {
        if (!hasPermission(member, 'ManageMessages')) return context.reply({ embeds: [createEmbed({ description: '🚫 You need **Manage Messages** permission.', color: THEME.error })] });

        const current = getAutoResponders(guild.id);
        const exists = current.find(a => a.id === id);
        if (!exists) return context.reply({ embeds: [createEmbed({ description: '⚠️ No auto responder found with that ID.', color: THEME.error })] });

        removeAutoResponder(guild.id, id);
        return context.reply({ embeds: [createEmbed({ description: `✅ Removed auto responder **#${id}** (Trigger: \`${exists.trigger}\`)`, color: THEME.success })] });
    },

    async clearAll(client, guild, member, context) {
        if (!hasPermission(member, 'ManageMessages')) return context.reply({ embeds: [createEmbed({ description: '🚫 You need **Manage Messages** permission.', color: THEME.error })] });

        const current = getAutoResponders(guild.id);
        if (current.length === 0) return context.reply({ embeds: [createEmbed({ description: '⚠️ No auto responders to clear.', color: THEME.dark })] });

        clearAutoResponders(guild.id);
        return context.reply({ embeds: [createEmbed({ description: `✅ Cleared all **${current.length}** auto responder(s).`, color: THEME.success })] });
    },

    async showList(client, guild, context) {
        const list = getAutoResponders(guild.id);
        if (list.length === 0) return context.reply({ embeds: [createEmbed({ description: '📜 No auto responders set. Use `/autoresponder add` to create one.', color: THEME.dark })] });

        const matchLabel = { contains: 'Contains', exact: 'Exact', startswith: 'Starts' };
        const items = list.map(a => {
            const ml = matchLabel[a.match_type] || a.match_type;
            let str = `**#${a.id}** | \`${a.trigger}\` [${ml}]`;
            if (a.response) str += ` → ${a.response.length > 40 ? a.response.substring(0, 40) + '...' : a.response}`;
            if (a.emoji) str += ` | React: ${a.emoji}`;
            if (a.image_url) str += ` | 🖼️ GIF`;
            return str;
        }).join('\n');

        return context.reply({ embeds: [createEmbed({
            title: '📜 Auto Responders',
            description: items,
            color: THEME.celestial,
            footer: { text: `${list.length}/25 auto responders` }
        })] });
    },
};