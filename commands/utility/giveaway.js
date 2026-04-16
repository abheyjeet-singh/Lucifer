const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { createEmbed, THEME } = require('../../utils/embeds');
const { addGiveaway, removeGiveaway, getActiveGiveaways, getBoosterRoles } = require('../../database/db');

function parseDuration(str) { 
    const regex = /^(\d+)(s|m|h|d)$/; 
    const match = str?.toLowerCase().match(regex); 
    if (!match) return null; 
    const num = parseInt(match[1]); 
    const unit = { s: 1, m: 60, h: 3600, d: 86400 }[match[2]]; 
    return num * unit * 1000; 
}

function getBotBanner(client) {
    return client.user.bannerURL({ size: 1024, extension: 'png' }) || null;
}

// ── Active Timeout Tracker ──
const activeTimeouts = new Map();

function addTimeout(messageId, timeoutId) { activeTimeouts.set(messageId, timeoutId); }
function cancelTimeout(messageId) {
    const timeout = activeTimeouts.get(messageId);
    if (timeout) { clearTimeout(timeout); activeTimeouts.delete(messageId); return true; }
    return false;
}

// ── Weighted Winner Selection (Multi-Booster) ──
function pickWeightedWinners(validUsers, guild, winnerCount) {
    const boosterRoles = getBoosterRoles(guild.id);

    const candidatePool = [];
    for (const user of validUsers.values()) {
        const member = guild.members.cache.get(user.id);
        let entries = 1;
        if (member) {
            for (const br of boosterRoles) {
                if (member.roles.cache.has(br.role_id)) {
                    entries += br.bonus_entries;
                }
            }
        }
        for (let i = 0; i < entries; i++) {
            candidatePool.push(user);
        }
    }

    if (candidatePool.length === 0) return [];

    const actualWinners = Math.min(winnerCount, validUsers.size);
    const winnerArray = [];
    const pickedIds = new Set();
    let attempts = 0;
    const maxAttempts = candidatePool.length * 3;

    while (winnerArray.length < actualWinners && attempts < maxAttempts) {
        const winner = candidatePool[Math.floor(Math.random() * candidatePool.length)];
        if (!pickedIds.has(winner.id)) {
            winnerArray.push(winner);
            pickedIds.add(winner.id);
        }
        attempts++;
    }

    return winnerArray;
}

module.exports = {
    name: 'giveaway', 
    description: 'The Devil\'s Lottery', 
    category: 'utility', 
    usage: 'giveaway <duration> <winners> <prize> [#channel]', 
    permissions: ['ManageMessages'],
    
    data: new SlashCommandBuilder()
        .setName('giveaway')
        .setDescription('The Devil\'s Lottery')
        .addSubcommand(sc =>
            sc.setName('start')
              .setDescription('Start a new giveaway')
              .addStringOption(o => o.setName('duration').setDescription('e.g., 1h, 1d').setRequired(true))
              .addIntegerOption(o => o.setName('winners').setDescription('Number of winners').setRequired(true).setMinValue(1))
              .addStringOption(o => o.setName('prize').setDescription('What are we giving away?').setRequired(true))
              .addChannelOption(o =>
                  o.setName('channel')
                   .setDescription('Channel to post the giveaway in (defaults to current)')
                   .setRequired(false)
                   .addChannelTypes(ChannelType.GuildText)))
        .addSubcommand(sc =>
            sc.setName('list')
              .setDescription('View all active giveaways'))
        .addSubcommand(sc =>
            sc.setName('cancel')
              .setDescription('Cancel an active giveaway')
              .addStringOption(o => o.setName('id').setDescription('The giveaway message ID').setRequired(true)))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    async execute(message, args, client) { 
        const sub = args[0]?.toLowerCase();
        
        if (sub === 'list') return this.showList(client, message.guild, message);
        if (sub === 'cancel') {
            const id = args[1];
            if (!id) return message.reply({ embeds: [createEmbed({ description: '⚠️ Usage: `l!giveaway cancel <message_id>`', color: THEME.error })] });
            return this.cancelGiveaway(client, message.guild, message.member, id, message);
        }

        // Default: start giveaway
        const ms = parseDuration(args[0]); 
        const winners = parseInt(args[1]); 
        const prize = args.slice(2).join(' '); 

        // Check for channel mention at the end
        const channelMention = message.mentions.channels.first();
        const targetChannel = channelMention || message.channel;

        // If channel was mentioned, strip it from the prize text
        let cleanPrize = prize;
        if (channelMention) {
            cleanPrize = prize.replace(/<#\d+>/g, '').trim();
        }

        if (!ms || isNaN(winners) || !cleanPrize) {
            return message.reply({ embeds: [createEmbed({ description: '⚠️ `l!giveaway 1h 1 Nitro [#channel]` or `l!giveaway list` or `l!giveaway cancel <id>`', color: THEME.error })] }); 
        }
        return this.startGiveaway(client, message.guild, targetChannel, ms, winners, cleanPrize, message); 
    },

    async interact(interaction, client) { 
        const sub = interaction.options.getSubcommand();
        if (sub === 'list') return this.showList(client, interaction.guild, interaction);
        if (sub === 'cancel') return this.cancelGiveaway(client, interaction.guild, interaction.member, interaction.options.getString('id'), interaction);
        // start
        const ms = parseDuration(interaction.options.getString('duration')); 
        const winners = interaction.options.getInteger('winners'); 
        const prize = interaction.options.getString('prize'); 
        const targetChannel = interaction.options.getChannel('channel') || interaction.channel;
        if (!ms) return interaction.reply({ embeds: [createEmbed({ description: '⚠️ Invalid duration.', color: THEME.error })], flags: 64 }); 
        return this.startGiveaway(client, interaction.guild, targetChannel, ms, winners, prize, interaction); 
    },

    // ════════════════════════════════════════
    // ── LIST ACTIVE GIVEAWAYS ──
    // ════════════════════════════════════════
    async showList(client, guild, context) {
        const giveaways = getActiveGiveaways().filter(g => g.guildId === guild.id);
        
        if (giveaways.length === 0) {
            return context.reply({ embeds: [createEmbed({ description: '🎁 No active giveaways running.', color: THEME.dark })] });
        }

        const items = giveaways.map((g, i) => {
            const endsAt = Math.floor(g.endsAt / 1000);
            const timeLeft = g.endsAt - Date.now();
            const status = timeLeft <= 0 ? '⏰ Ending soon...' : `<t:${endsAt}:R>`;
            const ch = guild.channels.cache.get(g.channelId);
            const chName = ch ? `<#${ch.id}>` : 'Unknown';
            return `**#${i + 1}** ─ ${g.prize}\n📝 ID: \`${g.messageId}\` | 🏆 ${g.winners} winner(s) | 📍 ${chName} | ⏰ ${status}`;
        }).join('\n\n');

        return context.reply({ embeds: [createEmbed({
            title: `🎁 Active Giveaways (${giveaways.length})`,
            description: items,
            color: THEME.celestial,
            footer: { text: 'Use /giveaway cancel <id> to cancel one' }
        })] });
    },

    // ════════════════════════════════════════
    // ── CANCEL GIVEAWAY ──
    // ════════════════════════════════════════
    async cancelGiveaway(client, guild, member, messageId, context) {
        if (!member.permissions.has('ManageMessages')) return context.reply({ embeds: [createEmbed({ description: '🚫 You need Manage Messages permission.', color: THEME.error })] });

        const giveaways = getActiveGiveaways().filter(g => g.guildId === guild.id);
        const giveaway = giveaways.find(g => g.messageId === messageId);

        if (!giveaway) {
            return context.reply({ embeds: [createEmbed({ description: '⚠️ No active giveaway found with that ID. Use `/giveaway list` to see active ones.', color: THEME.error })] });
        }

        cancelTimeout(messageId);
        removeGiveaway(messageId);

        try {
            const channel = await client.channels.fetch(giveaway.channelId).catch(() => null);
            if (channel) {
                const msg = await channel.messages.fetch(messageId).catch(() => null);
                if (msg) {
                    await client.user.fetch(true).catch(() => {});
                    const bannerURL = getBotBanner(client);

                    msg.edit({ embeds: [createEmbed({
                        title: '🎁 Giveaway Cancelled',
                        description: `**Prize:** ${giveaway.prize}\n**Winners:** ${giveaway.winners}\n**Host:** <@${giveaway.hostId}>\n\n❌ This giveaway has been cancelled.`,
                        color: THEME.error,
                        image: bannerURL,
                        footer: { text: `🔥 The Devil's Lottery` }
                    })] });
                }
            }
        } catch {}

        return context.reply({ embeds: [createEmbed({ description: `🎁 Giveaway for **${giveaway.prize}** has been cancelled.`, color: THEME.primary })] });
    },

    // ════════════════════════════════════════
    // ── START GIVEAWAY ──
    // ════════════════════════════════════════
    async startGiveaway(client, guild, targetChannel, ms, winners, prize, context) {
        const endsAtMs = Date.now() + ms;
        const endsAtDiscord = Math.floor(endsAtMs / 1000);
        const hostId = context.author?.id || context.user?.id;
        const hostMention = `<@${hostId}>`;

        // Check bot permissions in target channel
        if (!targetChannel.permissionsFor(client.user)?.has(['ViewChannel', 'SendMessages', 'EmbedLinks', 'AddReactions'])) {
            return context.reply({ embeds: [createEmbed({ description: `⚠️ I don't have permission to send messages or add reactions in ${targetChannel}.`, color: THEME.error })] });
        }

        await client.user.fetch(true).catch(() => {});
        const bannerURL = getBotBanner(client);

        // Build booster info
        const boosterRoles = getBoosterRoles(guild.id);
        let boosterInfo = '';
        if (boosterRoles.length > 0) {
            const lines = boosterRoles.map(br => `🚀 <@&${br.role_id}>: +${br.bonus_entries} entries`);
            boosterInfo = '\n\n**🚀 Booster Bonuses:**\n' + lines.join('\n');
        }

        const startEmbed = createEmbed({ 
            title: '🎁 The Devil\'s Lottery', 
            description: `**Prize:** ${prize}\n**Winners:** ${winners}\n**Host:** ${hostMention}\n**Ends:** <t:${endsAtDiscord}:R>${boosterInfo}\n\nReact with 🎉 to enter!`, 
            color: THEME.primary,
            image: bannerURL,
            footer: { text: `🔥 Hosted by the Lord of Hell` }
        });
        
        const msg = await targetChannel.send({ embeds: [startEmbed] });
        await msg.react('🎉');
        
        addGiveaway({ guildId: guild.id, channelId: targetChannel.id, messageId: msg.id, endsAt: endsAtMs, winners, prize, hostId });
        
        // Different reply depending on if it's in the same channel or different
        const channelInfo = targetChannel.id !== (context.channel?.id) ? ` in ${targetChannel}` : '';
        await context.reply({ embeds: [createEmbed({ description: `🎁 Giveaway started${channelInfo}! ID: \`${msg.id}\``, color: THEME.success })] });

        // ── End Giveaway ──
        const endGiveaway = async () => {
            const currentGiveaways = getActiveGiveaways();
            if (!currentGiveaways.find(g => g.messageId === msg.id)) return;

            removeGiveaway(msg.id);
            activeTimeouts.delete(msg.id);

            const fetched = await msg.fetch().catch(() => null);
            if (!fetched) return;

            await client.user.fetch(true).catch(() => {});
            const endBannerURL = getBotBanner(client);

            const reaction = fetched.reactions.cache.get('🎉');
            
            if (!reaction) {
                fetched.edit({ embeds: [createEmbed({
                    title: '🎁 Giveaway Ended',
                    description: `**Prize:** ${prize}\n**Host:** ${hostMention}\n\n❌ No one reacted.`,
                    color: THEME.accent,
                    image: endBannerURL,
                    footer: { text: `🔥 The Devil's Lottery` }
                })] });
                return targetChannel.send({
                    content: `🎁 Giveaway for **${prize}** ended, but no one reacted. ${hostMention}`,
                    allowedMentions: { parse: ['users'] }
                });
            }
            
            const users = await reaction.users.fetch();
            const valid = users.filter(u => !u.bot);
            
            if (valid.size === 0) {
                fetched.edit({ embeds: [createEmbed({
                    title: '🎁 Giveaway Ended',
                    description: `**Prize:** ${prize}\n**Host:** ${hostMention}\n\n❌ No valid participants entered.`,
                    color: THEME.accent,
                    image: endBannerURL,
                    footer: { text: `🔥 The Devil's Lottery` }
                })] });
                return targetChannel.send({
                    content: `🎁 Giveaway for **${prize}** ended, but no valid participants entered. ${hostMention}`,
                    allowedMentions: { parse: ['users'] }
                });
            }
            
            const winnerArray = pickWeightedWinners(valid, guild, winners);
            if (winnerArray.length === 0) {
                return targetChannel.send({ content: `🎁 Giveaway for **${prize}** ended, but winner selection failed. ${hostMention}`, allowedMentions: { parse: ['users'] } });
            }

            const winnerMentions = winnerArray.map(w => `<@${w.id}>`).join(', ');
            const actualWinners = winnerArray.length;

            fetched.edit({ embeds: [createEmbed({
                title: '🎁 Giveaway Ended',
                description: `**Prize:** ${prize}\n**Winner(s):** ${winnerMentions}\n**Host:** ${hostMention}${actualWinners < winners ? `\n\n⚠️ Only ${actualWinners} out of ${winners} requested winners entered` : ''}`,
                color: THEME.success,
                image: endBannerURL,
                footer: { text: `🔥 The Devil's Lottery` }
            })] });

            let resultMessage;
            if (actualWinners < winners) {
                resultMessage = `🎉 Congratulations ${winnerMentions}! You won **${prize}**!\n*(Only ${actualWinners} out of ${winners} requested winners entered)*\n📢 ${hostMention}, your giveaway has ended!`;
            } else {
                resultMessage = `🎉 Congratulations ${winnerMentions}! You won **${prize}**!\n📢 ${hostMention}, your giveaway has ended!`;
            }
            
            targetChannel.send({ content: resultMessage, allowedMentions: { parse: ['users'] } });
        };

        const timeoutId = setTimeout(endGiveaway, ms);
        addTimeout(msg.id, timeoutId);
    },

    // Resume giveaway on bot restart
    async resumeGiveaway(client, data) {
        const channel = await client.channels.fetch(data.channelId).catch(() => null);
        if (!channel) return removeGiveaway(data.messageId);
        
        const msg = await channel.messages.fetch(data.messageId).catch(() => null);
        if (!msg) return removeGiveaway(data.messageId);

        const timeLeft = data.endsAt - Date.now();
        const hostId = data.hostId;
        const hostMention = `<@${hostId}>`;

        const endGiveaway = async () => {
            const currentGiveaways = getActiveGiveaways();
            if (!currentGiveaways.find(g => g.messageId === msg.id)) return;

            removeGiveaway(msg.id);
            activeTimeouts.delete(msg.id);

            const fetched = await msg.fetch().catch(() => null);
            if (!fetched) return;

            await client.user.fetch(true).catch(() => {});
            const endBannerURL = getBotBanner(client);

            const reaction = fetched.reactions.cache.get('🎉');
            
            if (!reaction) {
                fetched.edit({ embeds: [createEmbed({
                    title: '🎁 Giveaway Ended',
                    description: `**Prize:** ${data.prize}\n**Host:** ${hostMention}\n\n❌ No one reacted.`,
                    color: THEME.accent,
                    image: endBannerURL,
                    footer: { text: `🔥 The Devil's Lottery` }
                })] });
                return channel.send({
                    content: `🎁 Giveaway for **${data.prize}** ended, but no one reacted. ${hostMention}`,
                    allowedMentions: { parse: ['users'] }
                });
            }
            
            const users = await reaction.users.fetch();
            const valid = users.filter(u => !u.bot);
            
            if (valid.size === 0) {
                fetched.edit({ embeds: [createEmbed({
                    title: '🎁 Giveaway Ended',
                    description: `**Prize:** ${data.prize}\n**Host:** ${hostMention}\n\n❌ No valid participants entered.`,
                    color: THEME.accent,
                    image: endBannerURL,
                    footer: { text: `🔥 The Devil's Lottery` }
                })] });
                return channel.send({
                    content: `🎁 Giveaway for **${data.prize}** ended, but no valid participants entered. ${hostMention}`,
                    allowedMentions: { parse: ['users'] }
                });
            }
            
            const winnerArray = pickWeightedWinners(valid, channel.guild, data.winners);
            if (winnerArray.length === 0) {
                return channel.send({ content: `🎁 Giveaway for **${data.prize}** ended, but winner selection failed. ${hostMention}`, allowedMentions: { parse: ['users'] } });
            }

            const winnerMentions = winnerArray.map(w => `<@${w.id}>`).join(', ');
            const actualWinners = winnerArray.length;

            fetched.edit({ embeds: [createEmbed({
                title: '🎁 Giveaway Ended',
                description: `**Prize:** ${data.prize}\n**Winner(s):** ${winnerMentions}\n**Host:** ${hostMention}${actualWinners < data.winners ? `\n\n⚠️ Only ${actualWinners} out of ${data.winners} requested winners entered` : ''}`,
                color: THEME.success,
                image: endBannerURL,
                footer: { text: `🔥 The Devil's Lottery` }
            })] });

            let resultMessage;
            if (actualWinners < data.winners) {
                resultMessage = `🎉 Congratulations ${winnerMentions}! You won **${data.prize}**!\n*(Only ${actualWinners} out of ${data.winners} requested winners entered)*\n📢 ${hostMention}, your giveaway has ended!`;
            } else {
                resultMessage = `🎉 Congratulations ${winnerMentions}! You won **${data.prize}**!\n📢 ${hostMention}, your giveaway has ended!`;
            }
            
            channel.send({ content: resultMessage, allowedMentions: { parse: ['users'] } });
        };

        if (timeLeft <= 0) {
            await endGiveaway();
        } else {
            const timeoutId = setTimeout(endGiveaway, timeLeft);
            addTimeout(data.messageId, timeoutId);
        }
    }
};