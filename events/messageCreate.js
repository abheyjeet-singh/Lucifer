const { AttachmentBuilder } = require('discord.js');
const axios = require('axios');
const { getPrefix, getAutomod, addWarning, getAutoTranslateLang, isAfk, removeAfk, getAutoDelete, getCounting, updateCounting, getSticky, setSticky, getAutoResponders, isAiMentionEnabled, getAiUsage, incrementAiUsage, AI_DAILY_LIMIT } = require('../database/db');
const { hasPermission } = require('../utils/permissions');
const { createEmbed, THEME } = require('../utils/embeds');
const translate = require('@iamtraction/google-translate');

const spamMap = new Map();

module.exports = {
    once: false,
    async execute(message, client) {
        if (message.author.bot) return;
        if (!message.guild) return;

        // ── AUTO RESPONDER ──
        const autoResponders = getAutoResponders(message.guild.id);
        if (autoResponders.length > 0) {
            const lowerContent = message.content.toLowerCase();
            for (const ar of autoResponders) {
                let matched = false;
                if (ar.match_type === 'exact') matched = lowerContent === ar.trigger;
                else if (ar.match_type === 'startswith') matched = lowerContent.startsWith(ar.trigger);
                else matched = lowerContent.includes(ar.trigger);
                
                if (matched) {
                    // 1. React with Emoji if set
                    if (ar.emoji) {
                        await message.react(ar.emoji).catch(() => {});
                    }
                    
                    // 2. Send Reply if Text or Image is set
                    if (ar.response || ar.image_url) {
                        const payload = {};
                        if (ar.response) payload.content = ar.response;
                        
                        // Download image and send as attachment to hide the URL completely
                        if (ar.image_url) {
                            try {
                                let finalUrl = ar.image_url;
                                
                                // Force Tenor MP4s to become GIFs
                                if (finalUrl.includes('media.tenor.com') && finalUrl.endsWith('.mp4')) {
                                    finalUrl = finalUrl.replace('.mp4', '.gif');
                                }
                                
                                let imgRes = await axios.get(finalUrl, { responseType: 'arraybuffer', timeout: 5000 });
                                let contentType = imgRes.headers['content-type'] || '';
                                
                                // ── ON-THE-FLY RESOLVER ──
                                // If the saved URL is a shortlink that returned HTML, resolve it on the fly
                                if (contentType.includes('text/html')) {
                                    let resolvedUrl = finalUrl;
                                    
                                    // Use the Tenor redirect trick
                                    if (resolvedUrl.includes('tenor.com')) {
                                        if (!resolvedUrl.endsWith('.gif')) resolvedUrl += '.gif';
                                        try {
                                            const redirRes = await axios.get(resolvedUrl, { maxRedirects: 5, headers: {'User-Agent': 'Mozilla/5.0'}, timeout: 5000 });
                                            resolvedUrl = redirRes.request.res?.responseUrl || resolvedUrl;
                                        } catch(e) {}
                                    }
                                    
                                    // If we successfully got the CDN link, download it
                                    if (resolvedUrl.includes('media.tenor.com')) {
                                        finalUrl = resolvedUrl.replace('.mp4', '.gif');
                                        imgRes = await axios.get(finalUrl, { responseType: 'arraybuffer', timeout: 5000 });
                                        contentType = imgRes.headers['content-type'] || '';
                                    }
                                }

                                if (contentType.includes('text/html') || contentType.includes('application/json')) {
                                    console.error('AR Safety: Downloaded content is HTML/JSON, not an image. Falling back to URL.');
                                    payload.content += (payload.content ? '\n' : '') + ar.image_url;
                                } else {
                                    // Determine file extension
                                    let ext = finalUrl.match(/\.(gif|png|jpg|jpeg|webp|mp4)/i)?.[0]?.substring(1);
                                    if (!ext) {
                                        ext = 'gif'; // Force GIF extension if unknown
                                    }
                                    const attachment = new AttachmentBuilder(Buffer.from(imgRes.data), { name: `response.${ext}` });
                                    payload.files = [attachment];
                                }
                            } catch (e) {
                                console.error('AR Image Download Error:', e.message);
                                // Fallback to raw URL if download fails
                                payload.content += (payload.content ? '\n' : '') + ar.image_url;
                            }
                        }
                        
                        await message.reply(payload).catch(() => {});
                    }
                    break; 
                }
            }
        }

        // ── 1. Remove AFK if user talks ──
        if (isAfk(message.author.id, message.guild.id)) {
            removeAfk(message.author.id, message.guild.id);
            message.member.setNickname(null).catch(() => {});
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
        if (deleteSeconds) { setTimeout(() => { message.deletable ? message.delete().catch(() => {}) : null; }, deleteSeconds * 1000); }

        // ── 4. Counting Channel Check ──
        const settings = require('../database/db').getGuildSettings(message.guild.id);
        if (settings.counting_channel_id === message.channel.id) {
            const countingData = getCounting(message.guild.id);
            const num = parseInt(message.content);
            if (isNaN(num)) return message.delete().catch(() => {});
            if (message.author.id === countingData.last_user_id) return message.delete().catch(() => {});
            if (num !== countingData.count + 1) {
                await message.delete().catch(() => {});
                return message.channel.send(`💀 **${message.author}** ruined the count at **${countingData.count}**! Start from 1.`).then(m => setTimeout(() => m.delete().catch(() => {}), 5000));
            }
            updateCounting(message.guild.id, num, message.author.id);
            message.react('✅').catch(() => {});
            return;
        }

        // ── 5. Sticky Message Check ──
        const stickyContent = getSticky(message.channel.id);
        if (stickyContent) {
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

        // ════════════════════════════════════════
        // ── LUCIFER AI — MENTION + SEQUENTIAL CHAT ──
        // ════════════════════════════════════════
        const botMentionRegex = new RegExp(`^<@!?${client.user.id}>`);
        const isBotMentioned = botMentionRegex.test(message.content) || message.mentions.has(client.user.id);
        const isAiOn = isAiMentionEnabled(message.guild.id);

        let isReplyToBot = false;
        if (message.reference && message.reference.messageId && isAiOn) {
            try {
                const referencedMsg = await message.channel.messages.fetch(message.reference.messageId).catch(() => null);
                if (referencedMsg && referencedMsg.author.id === client.user.id) {
                    const { getThread } = require('../utils/luciferAI');
                    const thread = getThread(message.channel.id, message.author.id);
                    if (thread) isReplyToBot = true;
                }
            } catch {}
        }

        if ((isBotMentioned || isReplyToBot) && isAiOn) {
            const currentUsage = getAiUsage(message.guild.id);
            if (currentUsage >= AI_DAILY_LIMIT) {
                return message.reply(`🔥 The gates of knowledge are closed for today. AI limit reached (\`${AI_DAILY_LIMIT}\`).`);
            }

            if (isBotMentioned && !isReplyToBot) {
                const contentAfterMention = message.content.replace(botMentionRegex, '').trim();
                const firstWord = contentAfterMention.split(/\s+/)[0]?.toLowerCase();
                const aliasMap = { 'fn': 'forcename', 'rfn': 'removeforcename', 'gstart': 'giveaway', 'ar': 'autoresponder' };
                const potentialCmd = aliasMap[firstWord] || firstWord;
                const knownCommand = client.commands.get(potentialCmd);

                if (!(knownCommand && contentAfterMention.length > 0)) {
                    try {
                        await message.channel.sendTyping().catch(() => {});
                        const { handleLuciferAI } = require('../utils/luciferAI');
                        const aiResponse = await handleLuciferAI(message, client, false);
                        incrementAiUsage(message.guild.id);
                        return message.reply({ content: aiResponse, allowedMentions: { parse: ['users', 'roles'] } }).catch(() => {});
                    } catch (e) {
                        console.error('AI Error:', e);
                        return message.reply('💀 The cosmic forces are interfering. Try again shortly.').catch(() => {});
                    }
                }
            }

            if (isReplyToBot) {
                try {
                    await message.channel.sendTyping().catch(() => {});
                    const { handleLuciferAI } = require('../utils/luciferAI');
                    const aiResponse = await handleLuciferAI(message, client, true);
                    incrementAiUsage(message.guild.id);
                    return message.reply({ content: aiResponse, allowedMentions: { parse: ['users', 'roles'] } }).catch(() => {});
                } catch (e) {
                    console.error('AI Error:', e);
                    return message.reply('💀 The cosmic forces are interfering.').catch(() => {});
                }
            }
        }

        // ── COMMAND HANDLER ──
        const prefix = getPrefix(message.guild.id);
        let usedPrefix = null;
        if (message.content.startsWith(prefix)) usedPrefix = prefix;
        else if (botMentionRegex.test(message.content)) usedPrefix = message.content.match(botMentionRegex)[0];
        if (!usedPrefix) return;

        const args = message.content.slice(usedPrefix.length).trim().split(/ +/);
        let commandName = args.shift()?.toLowerCase();
        if (!commandName) return;

        const aliasMap2 = { 'fn': 'forcename', 'rfn': 'removeforcename', 'gstart': 'giveaway', 'ar': 'autoresponder' };
        if (aliasMap2[commandName]) commandName = aliasMap2[commandName];

        const command = client.commands.get(commandName);
        if (!command) return;

        if (command.permissions && command.permissions.length > 0) { const missing = command.permissions.filter(p => !hasPermission(message.member, p)); if (missing.length > 0) { return message.reply({ embeds: [createEmbed({ description: `🚫 Missing: \`${missing.join(', ')}\``, color: THEME.error })] }); } }

        try { await command.execute(message, args, client); }
        catch (error) { console.error(error); message.reply({ embeds: [createEmbed({ description: '💀 Error occurred.', color: THEME.error })] }).catch(() => {}); }
    },
};