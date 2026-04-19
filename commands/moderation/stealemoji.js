const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const https = require('https');
const { createEmbed, THEME, modLog } = require('../../utils/embeds');

function downloadBuffer(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            if (res.statusCode !== 200) return reject(new Error(`Failed: ${res.statusCode}`));
            const data = [];
            res.on('data', chunk => data.push(chunk));
            res.on('end', () => resolve(Buffer.concat(data)));
        }).on('error', reject);
    });
}

module.exports = {
    name: 'stealemoji',
    description: 'Steal a relic (emoji) from another realm',
    category: 'moderation',
    usage: 'stealemoji <custom_emoji> [new_name]',
    permissions: ['ManageEmojisAndStickers'],
    data: new SlashCommandBuilder()
        .setName('stealemoji')
        .setDescription('Steal a relic (emoji) from another realm')
        .addStringOption(o => o.setName('emoji').setDescription('The custom emoji to steal').setRequired(true))
        .addStringOption(o => o.setName('new_name').setDescription('Rename the emoji on steal (optional)'))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageEmojisAndStickers),

    async execute(message, args, client) {
        const content = message.content;
        
        // Scan the entire raw message for the emoji format
        const emojiMatch = content.match(/<?(a)?:?(\w{2,32}):(\d{17,20})>?/);
        if (!emojiMatch) return message.reply({ embeds: [createEmbed({ context: message, description: '⚠️ That is not a valid custom emoji. Standard unicode emojis cannot be stolen.', color: THEME.error })] });

        const emojiStr = emojiMatch[0];
        
        // Remove the command prefix and the emoji code from the message. Whatever is left is the custom name!
        const prefixRegex = new RegExp(`^<@!?\\d+>|^${message.client.prefix || 'l!'}`, 'i');
        let customName = content.replace(prefixRegex, '') // Remove prefix/bot mention
                                 .replace(emojiStr, '')    // Remove the emoji code
                                 .trim()                   // Clean up spaces
                                 .replace(/ /g, '_')       // Replace spaces with underscores
                                 .toLowerCase();           // Discord names are lowercase

        if (customName === '') customName = null; // If nothing is left, return null so it uses the original name

        return this.run(client, message.guild, message.member, emojiStr, customName, message);
    },

    async interact(interaction, client) {
        const emojiStr = interaction.options.getString('emoji');
        const customName = interaction.options.getString('new_name')?.toLowerCase();
        return this.run(client, interaction.guild, interaction.member, emojiStr, customName, interaction);
    },

    async run(client, guild, moderator, emojiStr, customName, context) {
        const emojiRegex = /<?(a)?:?(\w{2,32}):(\d{17,20})>?/;
        const match = emojiStr.match(emojiRegex);

        if (!match) return context.reply({ embeds: [createEmbed({ context: guild, description: '⚠️ That is not a valid custom emoji.', color: THEME.error })] });

        const isAnimated = !!match[1];
        const originalName = match[2];
        const id = match[3];
        const ext = isAnimated ? 'gif' : 'png';
        const url = `https://cdn.discordapp.com/emojis/${id}.${ext}`;

        await guild.emojis.fetch();

        // ── 1. If a custom name was provided, use it and skip the collision prompt ──
        if (customName) {
            if (!/^[a-z0-9_]{2,32}$/.test(customName)) {
                return context.reply({ embeds: [createEmbed({ context: guild, description: '⚠️ Invalid name. Must be 2-32 characters, only lowercase letters, numbers, and underscores.', color: THEME.error })] });
            }
            if (guild.emojis.cache.some(e => e.name === customName)) {
                return context.reply({ embeds: [createEmbed({ context: guild, description: `⚠️ An emoji named \`${customName}\` already exists in this realm.`, color: THEME.error })] });
            }

            return this.createEmoji(client, guild, moderator, url, customName, context);
        }

        // ── 2. If no custom name, check if original name collides ──
        const existingEmoji = guild.emojis.cache.find(e => e.name === originalName);

        if (existingEmoji) {
            const emojiListStr = guild.emojis.cache.map(e => e.toString()).join(' ');
            const nameListStr = guild.emojis.cache.map(e => `\`${e.name}\``).join(', ');
            
            let currentEmojisDisplay = emojiListStr.length <= 1000 
                ? emojiListStr 
                : (nameListStr.length <= 1000 ? nameListStr : nameListStr.substring(0, 1000) + '...');

            const promptEmbed = createEmbed({
                title: '⚠️ Name Collision',
                description: `An emoji named \`${originalName}\` already exists in this realm.\nPlease type a **new name** for it, or type \`cancel\` to abort.\n\n**Current Emojis:**\n${currentEmojisDisplay}`,
                color: THEME.accent
            });

            await context.reply({ embeds: [promptEmbed] });

            const channel = context.channel;
            const filter = m => m.author.id === moderator.id;
            const collector = channel.createMessageCollector({ filter, time: 30000, max: 1 });

            collector.on('collect', async (msg) => {
                const newName = msg.content.trim().toLowerCase().replace(/ /g, '_');
                
                if (newName === 'cancel') {
                    return msg.reply({ embeds: [createEmbed({ context: guild, description: '🚫 Emoji steal cancelled.', color: THEME.error })] });
                }
                
                if (!/^[a-z0-9_]{2,32}$/.test(newName)) {
                    return msg.reply({ embeds: [createEmbed({ context: guild, description: '⚠️ Invalid name. Must be 2-32 characters, only lowercase letters, numbers, and underscores.', color: THEME.error })] });
                }
                
                await guild.emojis.fetch();
                if (guild.emojis.cache.some(e => e.name === newName)) {
                    return msg.reply({ embeds: [createEmbed({ context: guild, description: `⚠️ The name \`${newName}\` is also taken. Please try the command again.`, color: THEME.error })] });
                }

                await this.createEmoji(client, guild, moderator, url, newName, msg);
            });

            collector.on('end', (collected, reason) => {
                if (reason === 'time' && collected.size === 0) {
                    if (channel) {
                        channel.send({ embeds: [createEmbed({ context: guild, description: '⏳ Timed out. Emoji steal cancelled.', color: THEME.accent })] }).catch(() => {});
                    }
                }
            });

            return;
        }

        // ── 3. If no collision and no custom name, proceed normally ──
        await this.createEmoji(client, guild, moderator, url, originalName, context);
    },

    async createEmoji(client, guild, moderator, url, name, context) {
        try {
            const buffer = await downloadBuffer(url);
            const newEmoji = await guild.emojis.create({ attachment: buffer, name: name });

            modLog(client, guild, createEmbed({
                title: '🖼️ Relic Stolen',
                description: `**Emoji:** ${newEmoji} (\`${newEmoji.name}\`)\n**Stolen by:** ${moderator.user.tag}`,
                color: THEME.success,
            }));

            return context.reply({ embeds: [createEmbed({ context: guild, description: `🖼️ The relic ${newEmoji} has been claimed and added to the realm as \`${newEmoji.name}\`.`, color: THEME.success })] });
        } catch (error) {
            console.error('Steal Emoji Error:', error);
            return context.reply({ embeds: [createEmbed({ context: guild, description: '💀 Failed to steal the relic. Check if I have the **Manage Emojis** permission and if there are empty emoji slots.', color: THEME.error })] });
        }
    },
};