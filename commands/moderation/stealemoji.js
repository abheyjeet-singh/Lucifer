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
    usage: 'stealemoji <custom_emoji>',
    permissions: ['ManageEmojisAndStickers'],
    data: new SlashCommandBuilder()
        .setName('stealemoji')
        .setDescription('Steal a relic (emoji) from another realm')
        .addStringOption(o => o.setName('emoji').setDescription('The custom emoji to steal').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageEmojisAndStickers),

    async execute(message, args, client) {
        const emojiStr = args[0];
        if (!emojiStr) return message.reply({ embeds: [createEmbed({ description: '⚠️ Provide a custom emoji to steal.', color: THEME.error })] });
        return this.run(client, message.guild, message.member, emojiStr, message);
    },

    async interact(interaction, client) {
        const emojiStr = interaction.options.getString('emoji');
        return this.run(client, interaction.guild, interaction.member, emojiStr, interaction);
    },

    async run(client, guild, moderator, emojiStr, context) {
        // Regex to extract custom emoji details: <(a):name:id>
        const emojiRegex = /<?(a)?:?(\w{2,32}):(\d{17,20})>?/;
        const match = emojiStr.match(emojiRegex);

        if (!match) return context.reply({ embeds: [createEmbed({ description: '⚠️ That is not a valid custom emoji. Standard unicode emojis cannot be stolen.', color: THEME.error })] });

        const isAnimated = !!match[1];
        const name = match[2];
        const id = match[3];
        const ext = isAnimated ? 'gif' : 'png';
        const url = `https://cdn.discordapp.com/emojis/${id}.${ext}`;

        if (guild.emojis.cache.some(e => e.name === name)) {
            return context.reply({ embeds: [createEmbed({ description: `⚠️ An emoji named \`${name}\` already exists in this realm.`, color: THEME.error })] });
        }

        try {
            const buffer = await downloadBuffer(url);
            const newEmoji = await guild.emojis.create({ attachment: buffer, name: name });

            modLog(client, guild, createEmbed({
                title: '🖼️ Relic Stolen',
                description: `**Emoji:** ${newEmoji} (\`${newEmoji.name}\`)\n**Stolen by:** ${moderator.user.tag}`,
                color: THEME.success,
            }));

            return context.reply({ embeds: [createEmbed({ description: `🖼️ The relic ${newEmoji} has been claimed and added to the realm as \`${newEmoji.name}\`.`, color: THEME.success })] });
        } catch (error) {
            console.error('Steal Emoji Error:', error);
            return context.reply({ embeds: [createEmbed({ description: '💀 Failed to steal the relic. Check if I have the **Manage Emojis** permission and if there are empty emoji slots.', color: THEME.error })] });
        }
    },
};
