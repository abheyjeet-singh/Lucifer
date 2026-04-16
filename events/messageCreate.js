const { getPrefix, getAutomod, addWarning, getAutoTranslateLang, isAfk, removeAfk, getAutoDelete, getCounting, updateCounting, getSticky, setSticky } = require('../database/db');
const { hasPermission } = require('../utils/permissions');
const { createEmbed, THEME } = require('../utils/embeds');
const translate = require('@iamtraction/google-translate');

const spamMap = new Map();

module.exports = {
    once: false,
    async execute(message, client) {
        if (message.author.bot) return;
        if (!message.guild) return;

        // ── 1. Remove AFK if user talks ──
        if (isAfk(message.author.id, message.guild.id)) {
            removeAfk(message.author.id, message.guild.id);
            message.member.setNickname(null).catch(() => {}); // Optional: remove [AFK] nick
            message.reply({ embeds: [createEmbed({ description: '✨ You have awakened from your slumber.', color: THEME.success })] }).then(m => setTimeout(() => m.delete().catch(() => {}), 5000));
        }

        // ── 2. Check AFK Mentions ──
        if (message.mentions.users.size > 0) {
            for (const [id] of message.mentions.users) {
                const afkData = isAfk(id, message.guild.id);
                if (afkData) message.reply({ embeds: [createEmbed({ description: `💤 <@${id}> is currently slumbering: ${afkData.reason} (<t:${Math.floor(afkData.timestamp / 1000)}:R>)`, color: THEME.dark })] }).then(m => setTimeout(() => m.delete().catch(() => {}), 10000));
            }
        }

        // ── 3. Auto-Delete Check ──
        const deleteSeconds = getAutoDelete(message.channel.id);
        if (deleteSeconds) {
            setTimeout(() => { message.deletable ? message.delete().catch(() => {}) : null; }, deleteSeconds * 1000);
        }

        // ── 4. Counting Channel Check ──
        const settings = require('../database/db').getGuildSettings(message.guild.id); // Quick fetch for counting channel id
        if (settings.counting_channel_id === message.channel.id) {
            const countingData = getCounting(message.guild.id);
            const num = parseInt(message.content);
            if (isNaN(num)) return message.delete().catch(() => {}); // Delete non-numbers
            if (message.author.id === countingData.last_user_id) return message.delete().catch(() => {}); // No double counting
            if (num !== countingData.count + 1) {
                await message.delete().catch(() => {});
                return message.channel.send(`💀 **${message.author}** ruined the count at **${countingData.count}**! Start from 1.`).then(m => setTimeout(() => m.delete().catch(() => {}), 5000));
            }
            updateCounting(message.guild.id, num, message.author.id);
            // React to valid counts
            message.react('✅').catch(() => {});
            return; // Stop processing commands in counting channel
        }

        // ── 5. Sticky Message Check ──
        const stickyContent = getSticky(message.channel.id);
        if (stickyContent) {
            // Delete the last sticky message sent by the bot
            const messages = await message.channel.messages.fetch({ limit: 10 });
            const lastSticky = messages.find(m => m.author.id === client.user.id && m.embeds[0]?.footer?.text?.includes('📌 Sticky Message'));
            if (lastSticky) await lastSticky.delete().catch(() => {});
            message.channel.send({ embeds: [createEmbed({ description: stickyContent, color: THEME.primary, footer: { text: '📌 Sticky Message' } })] });
        }

        // ── ANTI-SIN SYSTEM ──
        const automod = getAutomod(message.guild.id);
        if (automod.enabled && !hasPermission(message.member, 'ManageMessages')) {
            if (automod.anti_link) { const linkRegex = /(https?:\/\/|discord\.(gg|io|me|li)|discordapp\.com\/invite)\/[^\s]+/gi; if (linkRegex.test(message.content)) { await message.delete().catch(() => {}); return message.channel.send({ embeds: [createEmbed({ description: `🚫 ${message.author}, links are forbidden here.`, color: THEME.error })] }).then(m => setTimeout(() => m.delete().catch(() => {}), 5000)); } }
            if (automod.anti_massmention) { const mentions = message.mentions.users.size + message.mentions.roles.size; if (mentions >= 5) { await message.delete().catch(() => {}); addWarning(message.guild.id, message.author.id, client.user.id, 'Mass Mention'); return message.channel.send({ embeds: [createEmbed({ description: `🚫 ${message.author}, mass pinging is forbidden.`, color: THEME.accent })] }).then(m => setTimeout(() => m.delete().catch(() => {}), 5000)); } }
            if (automod.anti_badwords && automod.badwords.length > 0) { const lowerMsg = message.content.toLowerCase(); const found = automod.badwords.find(w => lowerMsg.includes(w)); if (found) { await message.delete().catch(() => {}); return message.channel.send({ embeds: [createEmbed({ description: `🚫 ${message.author}, that language is forbidden.`, color: THEME.error })] }).then(m => setTimeout(() => m.delete().catch(() => {}), 5000)); } }
            if (automod.anti_spam) { const key = `${message.guild.id}-${message.author.id}`; const userData = spamMap.get(key) || { count: 0, lastMessage: '' }; if (message.content === userData.lastMessage) { userData.count++; } else { userData.count = 1; } userData.lastMessage = message.content; spamMap.set(key, userData); if (userData.count >= 5) { const member = await message.guild.members.fetch(message.author.id).catch(() => null); if (member) await member.timeout(60000, 'Spamming').catch(() => {}); spamMap.delete(key); return message.channel.send({ embeds: [createEmbed({ description: `🔇 ${message.author}, muted for spamming.`, color: THEME.accent })] }).then(m => setTimeout(() => m.delete().catch(() => {}), 5000)); } setTimeout(() => { if (spamMap.has(key) && spamMap.get(key).count === userData.count) spamMap.delete(key); }, 5000); }
        }

        // ── AUTO-TRANSLATE ──
        const targetLang = getAutoTranslateLang(message.guild.id, message.channel.id);
        if (targetLang && message.content.length > 0) { try { const result = await translate(message.content, { to: targetLang }); if (result.from.language.iso && result.from.language.iso !== targetLang) { await message.reply({ embeds: [createEmbed({ description: `🌐 **${targetLang.toUpperCase()} Translation** (from ${result.from.language.iso.toUpperCase()}):\n> ${result.text.substring(0, 2048)}`, color: THEME.success })] }); } } catch {} }

        // ── COMMAND HANDLER ──
        const prefix = getPrefix(message.guild.id);
        const mentionRegex = new RegExp(`^<@!?${client.user.id}>`);
        let usedPrefix = null;
        if (message.content.startsWith(prefix)) usedPrefix = prefix;
        else if (mentionRegex.test(message.content)) usedPrefix = message.content.match(mentionRegex)[0];
        if (!usedPrefix) return;

        const args = message.content.slice(usedPrefix.length).trim().split(/ +/);
        let commandName = args.shift()?.toLowerCase();
        if (!commandName) return;

        const aliasMap = { 'fn': 'forcename', 'rfn': 'removeforcename', 'gstart': 'giveaway' };
        if (aliasMap[commandName]) commandName = aliasMap[commandName];

        const command = client.commands.get(commandName);
        if (!command) return;

        if (command.permissions && command.permissions.length > 0) { const missing = command.permissions.filter(p => !hasPermission(message.member, p)); if (missing.length > 0) { return message.reply({ embeds: [createEmbed({ description: `🚫 Missing: \`${missing.join(', ')}\``, color: THEME.error })] }); } }

        try { await command.execute(message, args, client); }
        catch (error) { console.error(error); message.reply({ embeds: [createEmbed({ description: '💀 Error occurred.', color: THEME.error })] }).catch(() => {}); }
    },
};
