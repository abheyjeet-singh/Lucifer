const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, THEME } = require('../../utils/embeds');
const { generateQuote, STYLES } = require('../../utils/quoteGenerator');

// ── Resolve Discord Mentions to Real Names ──
function resolveMentions(text, msg) {
    if (!msg.guild) return text;

    text = text.replace(/<@&(\d+)>/g, (match, roleId) => {
        const role = msg.mentions.roles.get(roleId) || msg.guild.roles.cache.get(roleId);
        return role ? `@${role.name}` : '@deleted-role';
    });

    text = text.replace(/<@!?(\d+)>/g, (match, userId) => {
        const member = msg.mentions.members.get(userId) || msg.guild.members.cache.get(userId);
        if (member) return `@${member.displayName}`;
        const user = msg.mentions.users.get(userId) || msg.client.users.cache.get(userId);
        if (user) return `@${user.username}`;
        return '@unknown-user';
    });

    text = text.replace(/<#(\d+)>/g, (match, channelId) => {
        const channel = msg.mentions.channels.get(channelId) || msg.guild.channels.cache.get(channelId);
        return channel ? `#${channel.name}` : '#deleted-channel';
    });

    return text;
}

function extractFromLink(link) {
    const regex = /https:\/\/discord\.com\/channels\/(\d+)\/(\d+)\/(\d+)/;
    const match = link.match(regex);
    if (match) return { channelId: match[2], messageId: match[3] };
    return null;
}

module.exports = {
    name: 'quote',
    description: 'Turn a message into a beautiful quote card',
    category: 'fun',
    usage: 'quote [dark|light|lucifer] (reply to a message)',
    permissions: [],
    data: new SlashCommandBuilder()
        .setName('quote')
        .setDescription('Turn a message into a beautiful quote card')
        .addStringOption(o =>
            o.setName('message')
             .setDescription('Message ID or Message Link')
             .setRequired(true))
        .addStringOption(o =>
            o.setName('style')
             .setDescription('Visual style for the quote card')
             .setRequired(false)
             .addChoices(
                 { name: '😈 Lucifer', value: 'lucifer' },
                 { name: '🌑 Dark', value: 'dark' },
                 { name: '☀️ Light', value: 'light' }
             )),

    async execute(message, args, client) {
        let style = 'lucifer';
        const styleArg = args[0]?.toLowerCase();
        if (styleArg === 'dark' || styleArg === 'light' || styleArg === 'lucifer') {
            style = styleArg;
            args.shift();
        }

        if (!message.reference || !message.reference.messageId) {
            return message.reply({ embeds: [createEmbed({
                description: '⚠️ You must **reply** to a message to make it a quote!\nUsage: `l!quote [lucifer|dark|light]` (while replying)',
                color: THEME.error
            })] });
        }

        const referencedMsg = await message.channel.messages.fetch(message.reference.messageId).catch(() => null);
        if (!referencedMsg) {
            return message.reply({ embeds: [createEmbed({ context: message, description: '⚠️ Could not find that message.', color: THEME.error })] });
        }

        return this.createAndSend(client, message, referencedMsg, style);
    },

    async interact(interaction, client) {
        const messageInput = interaction.options.getString('message');
        const style = interaction.options.getString('style') || 'lucifer';

        let targetMsg = null;
        targetMsg = await interaction.channel.messages.fetch(messageInput).catch(() => null);

        if (!targetMsg) {
            const linkData = extractFromLink(messageInput);
            if (linkData) {
                const channel = await client.channels.fetch(linkData.channelId).catch(() => null);
                if (channel) targetMsg = await channel.messages.fetch(linkData.messageId).catch(() => null);
            }
        }

        if (!targetMsg) {
            return interaction.reply({ embeds: [createEmbed({
                description: '⚠️ Could not find that message. Provide a valid Message ID or Message Link.',
                color: THEME.error
            })], flags: 64 });
        }

        return this.createAndSend(client, interaction, targetMsg, style);
    },

    async createAndSend(client, context, targetMsg, style) {
        if (context.deferReply) await context.deferReply();

        const avatarURL = targetMsg.author.displayAvatarURL({ extension: 'png', size: 1024 });
        const displayName = targetMsg.member?.displayName || targetMsg.author.globalName || targetMsg.author.username;
        const username = targetMsg.author.username;

        const rawContent = targetMsg.content;
        const resolvedContent = resolveMentions(rawContent, targetMsg);

        if (!resolvedContent || resolvedContent.trim().length === 0) {
            const replyMethod = context.editReply ? 'editReply' : 'reply';
            return context[replyMethod]({ embeds: [createEmbed({
                description: '⚠️ That message has no text content to quote.',
                color: THEME.error
            })] });
        }

        try {
            const buffer = await generateQuote(avatarURL, displayName, username, resolvedContent, style);

            if (context.editReply) {
                await context.editReply({ files: [{ attachment: buffer, name: 'quote.png' }] });
            } else {
                await context.reply({ files: [{ attachment: buffer, name: 'quote.png' }] });
            }
        } catch (e) {
            console.error('Quote Generation Error:', e);
            const replyMethod = context.editReply ? 'editReply' : 'reply';
            await context[replyMethod]({ embeds: [createEmbed({
                description: '⚠️ Failed to generate quote image.',
                color: THEME.error
            })] });
        }
    }
};