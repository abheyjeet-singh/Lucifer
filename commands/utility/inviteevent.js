const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createEmbed, THEME } = require('../../utils/embeds');
const {
    addInviteEvent, removeInviteEvent, getActiveInviteEvents, getInviteEventById,
    getActiveInviteEventsByGuild, setInviteEventEnded, incrementInviteEventEntry,
    getInviteEventLeaderboard, getInviteEventEntries, updateInviteEventSnapshot,
    updateInviteEventMessage,
    getInviteEventPingRole, setInviteEventPingRole, removeInviteEventPingRole
} = require('../../database/db');

function parseDuration(str) {
    const regex = /^(\d+)(s|min|m|h|d)$/;
    const match = str?.toLowerCase().match(regex);
    if (!match) return null;
    const num = parseInt(match[1]);
    const unit = { s: 1, min: 60, m: 60, h: 3600, d: 86400 }[match[2]];
    return num * unit * 1000;
}

function formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    const parts = [];
    if (d > 0) parts.push(`${d} day${d !== 1 ? 's' : ''}`);
    if (h > 0) parts.push(`${h} hour${h !== 1 ? 's' : ''}`);
    if (m > 0) parts.push(`${m} min${m !== 1 ? 's' : ''}`);
    if (s > 0 && d === 0) parts.push(`${s} sec${s !== 1 ? 's' : ''}`);
    return parts.join(' ') || '0s';
}

function getBotBanner(client) {
    return client.user.bannerURL({ size: 1024, extension: 'png' }) || null;
}

function getEventImage(client, imageUrl) {
    return imageUrl || getBotBanner(client);
}

// ── In-Memory State ──
const activeTimeouts = new Map();
const inviteSnapshots = new Map();
const guildEventIndex = new Map();
const rerollCleanupTimeouts = new Map();

// ── Snapshot Helpers ──
function loadSnapshot(eventId, snapshotJSON) {
    try { inviteSnapshots.set(eventId, JSON.parse(snapshotJSON)); }
    catch { inviteSnapshots.set(eventId, {}); }
}

function getSnapshot(eventId) {
    return inviteSnapshots.get(eventId) || {};
}

function saveSnapshot(eventId) {
    const snapshot = inviteSnapshots.get(eventId);
    if (snapshot) updateInviteEventSnapshot(eventId, JSON.stringify(snapshot));
}

function addToGuildIndex(guildId, eventId) {
    if (!guildEventIndex.has(guildId)) guildEventIndex.set(guildId, new Set());
    guildEventIndex.get(guildId).add(eventId);
}

function removeFromGuildIndex(guildId, eventId) {
    const set = guildEventIndex.get(guildId);
    if (set) {
        set.delete(eventId);
        if (set.size === 0) guildEventIndex.delete(guildId);
    }
}

function getActiveEventIdsForGuild(guildId) {
    return guildEventIndex.get(guildId) || new Set();
}

// ── Safe Reply Helper (fixes Unknown Interaction) ──
async function safeReply(context, payload) {
    try {
        if (context.replied || context.deferred) {
            return await context.editReply(payload);
        }
        return await context.reply(payload);
    } catch {
        try { return await context.followUp(payload); } catch {}
    }
}

// ── Pick Winners (weighted by invite count) ──
function pickWeightedWinners(entries, winnerCount) {
    if (entries.length === 0) return [];

    const pool = [];
    for (const entry of entries) {
        for (let i = 0; i < entry.invites; i++) {
            pool.push(entry);
        }
    }
    if (pool.length === 0) return [];

    const actualWinners = Math.min(winnerCount, entries.length);
    const winners = [];
    const picked = new Set();
    let attempts = 0;

    while (winners.length < actualWinners && attempts < pool.length * 3) {
        const entry = pool[Math.floor(Math.random() * pool.length)];
        if (!picked.has(entry.user_id)) {
            winners.push(entry);
            picked.add(entry.user_id);
        }
        attempts++;
    }
    return winners;
}

// ── Reroll Button Cleanup ──
function startRerollCleanup(client, channelId, eventId) {
    if (rerollCleanupTimeouts.has(eventId)) clearTimeout(rerollCleanupTimeouts.get(eventId));

    const timeoutId = setTimeout(async () => {
        try {
            const channel = await client.channels.fetch(channelId).catch(() => null);
            if (channel) {
                const messages = await channel.messages.fetch({ limit: 10 }).catch(() => null);
                if (messages) {
                    for (const [, msg] of messages) {
                        if (msg.components.length > 0 && msg.components[0].components.some(c => c.customId === `reroll_inviteevent_${eventId}`)) {
                            await msg.edit({ components: [] }).catch(() => {});
                            break;
                        }
                    }
                }
            }
        } catch (e) { console.error('InviteEvent Reroll Cleanup Error:', e); }
        rerollCleanupTimeouts.delete(eventId);
    }, 3600000);

    rerollCleanupTimeouts.set(eventId, timeoutId);
}

// ── Build Invite Snapshot ──
async function buildSnapshot(guild) {
    const invites = await guild.invites.fetch().catch(() => null);
    if (!invites) return null;

    const snapshot = {};
    let totalExistingUses = 0;
    let inviteCount = 0;

    for (const [code, invite] of invites) {
        if (invite.inviter) {
            snapshot[code] = { uses: invite.uses, inviterId: invite.inviter.id };
            totalExistingUses += invite.uses;
            inviteCount++;
        }
    }
    return { snapshot, totalExistingUses, inviteCount };
}

// ── Format Leaderboard ──
function formatLeaderboard(entries, max = 10) {
    const medals = ['🥇', '🥈', '🥉'];
    const slice = entries.slice(0, max);
    return slice.map((e, i) => {
        const prefix = medals[i] || `\`${i + 1}.\``;
        return `${prefix} <@${e.user_id}> — **${e.invites}** invite${e.invites !== 1 ? 's' : ''}`;
    }).join('\n');
}

// ── Format Leaderboard with Contribution % ──
function formatLeaderboardDetailed(entries, max = 10, totalInvites = 0) {
    const medals = ['🥇', '🥈', '🥉'];
    const slice = entries.slice(0, max);
    return slice.map((e, i) => {
        const prefix = medals[i] || `\`${i + 1}.\``;
        const pct = totalInvites > 0 ? Math.round((e.invites / totalInvites) * 100) : 0;
        const bar = '█'.repeat(Math.max(1, Math.round(pct / 10))) + '░'.repeat(Math.max(0, 10 - Math.round(pct / 10)));
        return `${prefix} <@${e.user_id}> — **${e.invites}** invite${e.invites !== 1 ? 's' : ''} \`${bar}\` ${pct}%`;
    }).join('\n');
}

// ════════════════════════════════════════
// ── COMMAND DEFINITION ──
// ════════════════════════════════════════

module.exports = {
    name: 'inviteevent',
    description: 'Invite Event System — Compete by inviting!',
    category: 'utility',
    usage: 'inviteevent <start|list|cancel|restore|leaderboard|reroll|pingrole> [args]',
    permissions: ['ManageMessages'],

    data: new SlashCommandBuilder()
        .setName('inviteevent')
        .setDescription('Invite Event System — Compete by inviting!')
        .addSubcommand(sc =>
            sc.setName('start')
              .setDescription('Start a new invite event')
              .addStringOption(o => o.setName('duration').setDescription('e.g., 10min, 1h, 1d').setRequired(true))
              .addIntegerOption(o => o.setName('winners').setDescription('Number of winners (top inviters)').setRequired(true).setMinValue(1))
              .addStringOption(o => o.setName('prize').setDescription('What are they competing for?').setRequired(true))
              .addStringOption(o => o.setName('image').setDescription('Custom image URL for the event embed').setRequired(false))
              .addChannelOption(o =>
                  o.setName('channel')
                   .setDescription('Channel for the event (defaults to current)')
                   .setRequired(false)
                   .addChannelTypes(ChannelType.GuildText)))
        .addSubcommand(sc =>
            sc.setName('list')
              .setDescription('View all active invite events'))
        .addSubcommand(sc =>
            sc.setName('cancel')
              .setDescription('Cancel an active invite event')
              .addIntegerOption(o => o.setName('id').setDescription('The event ID').setRequired(true)))
        .addSubcommand(sc =>
            sc.setName('restore')
              .setDescription('Restore a deleted invite event message!')
              .addIntegerOption(o => o.setName('id').setDescription('The ORIGINAL event ID').setRequired(true))
              .addChannelOption(o =>
                  o.setName('channel')
                   .setDescription('Channel to repost it in (defaults to current)')
                   .setRequired(false)
                   .addChannelTypes(ChannelType.GuildText)))
        .addSubcommand(sc =>
            sc.setName('leaderboard')
              .setDescription('View the invite leaderboard for an event')
              .addIntegerOption(o => o.setName('id').setDescription('The event ID').setRequired(true)))
        .addSubcommand(sc =>
            sc.setName('reroll')
              .setDescription('Reroll winners for an ended invite event')
              .addIntegerOption(o => o.setName('id').setDescription('The event ID').setRequired(true)))
        .addSubcommand(sc =>
            sc.setName('pingrole')
              .setDescription('Set or remove the role pinged when invite events start')
              .addRoleOption(o => o.setName('role').setDescription('Role to ping (omit to remove current)').setRequired(false)))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    // ── PREFIX HANDLER ──
    async execute(message, args, client) {
        const sub = args[0]?.toLowerCase();

        if (sub === 'list') return this.showList(client, message.guild, message);
        if (sub === 'cancel') {
            const id = parseInt(args[1]);
            if (!id) return message.reply({ embeds: [createEmbed({ context: message, description: '⚠️ Usage: `l!inviteevent cancel <id>`', color: THEME.error })] });
            return this.cancelEvent(client, message.guild, message.member, id, message);
        }
        if (sub === 'restore') {
            const id = parseInt(args[1]);
            if (!id) return message.reply({ embeds: [createEmbed({ context: message, description: '⚠️ Usage: `l!inviteevent restore <id> [#channel]`', color: THEME.error })] });
            const channelMention = message.mentions.channels.first();
            const targetChannel = channelMention || message.channel;
            return this.restoreEvent(client, message.guild, targetChannel, id, message);
        }
        if (sub === 'leaderboard') {
            const id = parseInt(args[1]);
            if (!id) return message.reply({ embeds: [createEmbed({ context: message, description: '⚠️ Usage: `l!inviteevent leaderboard <id>`', color: THEME.error })] });
            return this.showLeaderboard(client, message.guild, id, message);
        }
        if (sub === 'reroll') {
            const id = parseInt(args[1]);
            if (!id) return message.reply({ embeds: [createEmbed({ context: message, description: '⚠️ Usage: `l!inviteevent reroll <id>`', color: THEME.error })] });
            return this.rerollEvent(client, message.guild, message.member, id, message);
        }
        if (sub === 'pingrole') {
            const role = message.mentions.roles.first();
            return this.configurePingRole(client, message.guild, role, message);
        }

        if (sub === 'start') {
            const ms = parseDuration(args[1]);
            const winners = parseInt(args[2]);
            let restArgs = args.slice(3).join(' ');

            const channelMention = message.mentions.channels.first();
            const targetChannel = channelMention || message.channel;
            if (channelMention) restArgs = restArgs.replace(/<#\d+>/g, '').trim();

            // Check for image URL at the end of the args
            const urlMatch = restArgs.match(/\s*(https?:\/\/\S+)$/i);
            let imageUrl = null;
            let prize = restArgs;
            if (urlMatch) {
                imageUrl = urlMatch[1];
                prize = restArgs.slice(0, restArgs.length - urlMatch[0].length).trim();
            }

            if (!ms || isNaN(winners) || !prize) {
                return message.reply({ embeds: [createEmbed({ context: message, description: '⚠️ `l!inviteevent start <duration> <winners> <prize> [image_url] [#channel]`\nExample: `l!inviteevent start 1h 3 Nitro`', color: THEME.error })] });
            }
            return this.startEvent(client, message.guild, targetChannel, ms, winners, prize, message, imageUrl);
        }

        return message.reply({ embeds: [createEmbed({ context: message, description: '⚠️ Unknown subcommand. Use `start`, `list`, `cancel`, `restore`, `leaderboard`, `reroll`, or `pingrole`.', color: THEME.error })] });
    },

    // ── SLASH HANDLER ──
    async interact(interaction, client) {
        const sub = interaction.options.getSubcommand();

        if (sub === 'list') return this.showList(client, interaction.guild, interaction);
        if (sub === 'cancel') return this.cancelEvent(client, interaction.guild, interaction.member, interaction.options.getInteger('id'), interaction);
        if (sub === 'restore') {
            const targetChannel = interaction.options.getChannel('channel') || interaction.channel;
            return this.restoreEvent(client, interaction.guild, targetChannel, interaction.options.getInteger('id'), interaction);
        }
        if (sub === 'leaderboard') return this.showLeaderboard(client, interaction.guild, interaction.options.getInteger('id'), interaction);
        if (sub === 'reroll') return this.rerollEvent(client, interaction.guild, interaction.member, interaction.options.getInteger('id'), interaction);
        if (sub === 'pingrole') {
            const role = interaction.options.getRole('role');
            return this.configurePingRole(client, interaction.guild, role, interaction);
        }

        const ms = parseDuration(interaction.options.getString('duration'));
        const winners = interaction.options.getInteger('winners');
        const prize = interaction.options.getString('prize');
        const imageUrl = interaction.options.getString('image') || null;
        const targetChannel = interaction.options.getChannel('channel') || interaction.channel;

        if (!ms) return interaction.reply({ embeds: [createEmbed({ context: interaction, description: '⚠️ Invalid duration. Use s, min, h, or d.', color: THEME.error })], flags: 64 });
        return this.startEvent(client, interaction.guild, targetChannel, ms, winners, prize, interaction, imageUrl);
    },

    // ════════════════════════════════════════
    // ── CONFIGURE PING ROLE ──
    // ════════════════════════════════════════
    async configurePingRole(client, guild, role, context) {
        if (role) {
            setInviteEventPingRole(guild.id, role.id);
            return safeReply(context, { embeds: [createEmbed({ context: guild, description: `🔔 Invite event ping role set to ${role}.\nMembers with this role will be pinged when an event starts or is restored.`, color: THEME.success })] });
        } else {
            const current = getInviteEventPingRole(guild.id);
            if (current) {
                removeInviteEventPingRole(guild.id);
                return safeReply(context, { embeds: [createEmbed({ context: guild, description: `🔔 Invite event ping role removed (was <@&${current}>).`, color: THEME.success })] });
            } else {
                return safeReply(context, { embeds: [createEmbed({ context: guild, description: '🔔 No invite event ping role is currently set.\nUse `/inviteevent pingrole @role` to set one, or omit the role to remove.', color: THEME.dark })] });
            }
        }
    },

    // ════════════════════════════════════════
    // ── START EVENT ──
    // ════════════════════════════════════════
    async startEvent(client, guild, targetChannel, ms, winners, prize, context, imageUrl = null) {
        // Defer immediately to prevent Unknown Interaction
        const isInteraction = context.isCommand !== undefined;
        if (isInteraction) await context.deferReply();

        if (!guild.members.me.permissions.has('ManageGuild')) {
            return safeReply(context, { embeds: [createEmbed({ context: guild, description: '⚠️ I need **Manage Server** permission to track invites. Without it, the invite event cannot function.', color: THEME.error })] });
        }

        const snapshotData = await buildSnapshot(guild);
        if (snapshotData === null) {
            return safeReply(context, { embeds: [createEmbed({ context: guild, description: '⚠️ Failed to fetch server invites. Make sure I have **Manage Server** permission.', color: THEME.error })] });
        }

        const { snapshot, totalExistingUses, inviteCount } = snapshotData;

        if (!targetChannel.permissionsFor(client.user)?.has(['ViewChannel', 'SendMessages', 'EmbedLinks'])) {
            return safeReply(context, { embeds: [createEmbed({ context: guild, description: `⚠️ I don't have permission to send messages in ${targetChannel}.`, color: THEME.error })] });
        }

        const now = Date.now();
        const endsAtMs = now + ms;
        const endsAtDiscord = Math.floor(endsAtMs / 1000);
        const startsAtDiscord = Math.floor(now / 1000);
        const hostId = context.author?.id || context.user?.id;

        const eventImage = getEventImage(client, imageUrl);

        const startEmbed = createEmbed({
            title: '🔥 Invite Event Started!',
            description: `Invite people to this server to climb the leaderboard!\nThe top ${winners} invit${winners === 1 ? 'er wins' : 'ers win'} when the event ends!`,
            color: THEME.primary,
            image: eventImage,
            fields: [
                { name: '🎁 Prize', value: `**${prize}**`, inline: true },
                { name: '🏆 Winners', value: `${winners} top invit${winners === 1 ? 'er' : 'ers'}`, inline: true },
                { name: '👑 Host', value: `<@${hostId}>`, inline: true },
                { name: '⏰ Duration', value: formatDuration(ms), inline: true },
                { name: '🗓️ Starts', value: `<t:${startsAtDiscord}:F>`, inline: true },
                { name: '🗓️ Ends', value: `<t:${endsAtDiscord}:F> (<t:${endsAtDiscord}:R>)`, inline: true },
                { name: '📊 Baseline', value: `${inviteCount} existing invite links with **${totalExistingUses}** total uses snapshotted.\nOnly invites from this point forward will count.`, inline: false },
            ],
            footer: { text: `🔥 Event #ID shown below | Hosted by the Lord of Hell` }
        });

        const pingRoleId = getInviteEventPingRole(guild.id);
        const pingContent = pingRoleId ? `🔔 <@&${pingRoleId}> A new invite event has started!` : '';

        const msg = await targetChannel.send({
            content: pingContent,
            embeds: [startEmbed],
            allowedMentions: { parse: ['users', 'roles'] }
        });

        const eventId = addInviteEvent({
            guild_id: guild.id,
            channel_id: targetChannel.id,
            message_id: msg.id,
            host_id: hostId,
            prize,
            winner_count: winners,
            start_time: now,
            end_time: endsAtMs,
            invite_snapshot: JSON.stringify(snapshot),
            image_url: imageUrl
        });

        // Edit footer with actual event ID
        await msg.edit({
            embeds: [createEmbed({
                title: '🔥 Invite Event Started!',
                description: `Invite people to this server to climb the leaderboard!\nThe top ${winners} invit${winners === 1 ? 'er wins' : 'ers win'} when the event ends!`,
                color: THEME.primary,
                image: eventImage,
                fields: [
                    { name: '🎁 Prize', value: `**${prize}**`, inline: true },
                    { name: '🏆 Winners', value: `${winners} top invit${winners === 1 ? 'er' : 'ers'}`, inline: true },
                    { name: '👑 Host', value: `<@${hostId}>`, inline: true },
                    { name: '⏰ Duration', value: formatDuration(ms), inline: true },
                    { name: '🗓️ Starts', value: `<t:${startsAtDiscord}:F>`, inline: true },
                    { name: '🗓️ Ends', value: `<t:${endsAtDiscord}:F> (<t:${endsAtDiscord}:R>)`, inline: true },
                    { name: '📊 Baseline', value: `${inviteCount} existing invite links with **${totalExistingUses}** total uses snapshotted.\nOnly invites from this point forward will count.`, inline: false },
                ],
                footer: { text: `🔥 Event #${eventId} | Hosted by the Lord of Hell` }
            })]
        });

        loadSnapshot(eventId, JSON.stringify(snapshot));
        addToGuildIndex(guild.id, eventId);

        const channelInfo = targetChannel.id !== (context.channel?.id) ? ` in ${targetChannel}` : '';
        return safeReply(context, { embeds: [createEmbed({ context: guild, description: `🔥 Invite event started${channelInfo}! Event ID: **#${eventId}**`, color: THEME.success })] });

        const endFn = async () => {
            const event = getInviteEventById(eventId);
            if (!event || event.status !== 'active') return;
            await this.endInviteEvent(client, event);
        };

        const timeoutId = setTimeout(endFn, ms);
        activeTimeouts.set(eventId, timeoutId);
    },

    // ════════════════════════════════════════
    // ── END EVENT ──
    // ════════════════════════════════════════
    async endInviteEvent(client, eventData) {
        // Final catch-up
        try {
            const guild = client.guilds.cache.get(eventData.guild_id);
            if (guild) {
                const currentInvites = await guild.invites.fetch().catch(() => null);
                if (currentInvites) {
                    const snapshot = getSnapshot(eventData.id);
                    let updated = false;

                    for (const [code, invite] of currentInvites) {
                        if (!invite.inviter) continue;
                        const snap = snapshot[code];
                        if (snap && invite.uses > snap.uses) {
                            incrementInviteEventEntry(eventData.id, invite.inviter.id, invite.uses - snap.uses);
                            snapshot[code] = { uses: invite.uses, inviterId: invite.inviter.id };
                            updated = true;
                        } else if (!snap && invite.uses > 0) {
                            incrementInviteEventEntry(eventData.id, invite.inviter.id, invite.uses);
                            snapshot[code] = { uses: invite.uses, inviterId: invite.inviter.id };
                            updated = true;
                        }
                    }
                    if (updated) {
                        inviteSnapshots.set(eventData.id, snapshot);
                        saveSnapshot(eventData.id);
                    }
                }
            }
        } catch (e) { console.error('InviteEvent final catch-up error:', e); }

        setInviteEventEnded(eventData.id);

        activeTimeouts.delete(eventData.id);
        inviteSnapshots.delete(eventData.id);
        removeFromGuildIndex(eventData.guild_id, eventData.id);

        const guild = client.guilds.cache.get(eventData.guild_id);
        if (!guild) return;

        const channel = guild.channels.cache.get(eventData.channel_id);
        if (!channel) return;

        const eventImage = getEventImage(client, eventData.image_url);

        const entries = getInviteEventEntries(eventData.id);
        const winnerCount = eventData.winner_count;
        const winners = entries.slice(0, winnerCount);
        const totalInvites = entries.reduce((sum, e) => sum + e.invites, 0);
        const duration = eventData.end_time - eventData.start_time;
        const startedAt = Math.floor(eventData.start_time / 1000);
        const endedAt = Math.floor(eventData.end_time / 1000);

        if (winners.length === 0) {
            const endEmbed = createEmbed({
                title: '🔥 Invite Event Ended',
                description: `Nobody invited anyone during this event.`,
                color: THEME.accent,
                image: eventImage,
                fields: [
                    { name: '🎁 Prize', value: `**${eventData.prize}**`, inline: true },
                    { name: '👑 Host', value: `<@${eventData.host_id}>`, inline: true },
                    { name: '⏰ Duration', value: formatDuration(duration), inline: true },
                    { name: '🗓️ Ran From', value: `<t:${startedAt}:F> → <t:${endedAt}:F>`, inline: false },
                    { name: '📊 Stats', value: `👥 **0** participants • **0** total invites`, inline: false },
                ],
                footer: { text: `🔥 Event #${eventData.id} | Better luck next time` }
            });

            try {
                const msg = await channel.messages.fetch(eventData.message_id).catch(() => null);
                if (msg) await msg.edit({ embeds: [endEmbed] }).catch(() => {});
            } catch {}

            await channel.send({
                content: `🔥 Invite event for **${eventData.prize}** ended, but no one invited anyone. <@${eventData.host_id}>`,
                allowedMentions: { parse: ['users'] }
            });
            return;
        }

        const medals = ['🥇', '🥈', '🥉'];
        const winnersDetailed = winners.map((w, i) => {
            const pct = totalInvites > 0 ? Math.round((w.invites / totalInvites) * 100) : 0;
            return `${medals[i] || '🏆'} <@${w.user_id}> — **${w.invites}** invite${w.invites !== 1 ? 's' : ''} (${pct}%)`;
        }).join('\n');

        const remaining = entries.slice(winnerCount);
        const remainingStr = remaining.slice(0, 7).map((w, i) => {
            const pct = totalInvites > 0 ? Math.round((w.invites / totalInvites) * 100) : 0;
            return `\`${winnerCount + i + 1}.\` <@${w.user_id}> — **${w.invites}** invite${w.invites !== 1 ? 's' : ''} (${pct}%)`;
        }).join('\n');
        const extraCount = remaining.length - 7;

        const endEmbed = createEmbed({
            title: '🔥 Invite Event Ended',
            description: winnersDetailed,
            color: THEME.success,
            image: eventImage,
            fields: [
                { name: '🎁 Prize', value: `**${eventData.prize}**`, inline: true },
                { name: '👑 Host', value: `<@${eventData.host_id}>`, inline: true },
                { name: '⏰ Duration', value: formatDuration(duration), inline: true },
                { name: '🗓️ Ran From', value: `<t:${startedAt}:F> → <t:${endedAt}:F>`, inline: false },
                { name: '📊 Event Stats', value: `👥 **${entries.length}** participant${entries.length !== 1 ? 's' : ''} • **${totalInvites}** total invite${totalInvites !== 1 ? 's' : ''}${winners.length < winnerCount ? `\n⚠️ Only ${winners.length} out of ${winnerCount} requested winners had invites` : ''}`, inline: false },
                { name: '📉 Full Leaderboard', value: remainingStr ? `${remainingStr}${extraCount > 0 ? `\n... and **${extraCount}** more` : ''}` : 'No other participants', inline: false },
            ],
            footer: { text: `🔥 Event #${eventData.id} | The Devil rewards the ambitious` }
        });

        try {
            const msg = await channel.messages.fetch(eventData.message_id).catch(() => null);
            if (msg) await msg.edit({ embeds: [endEmbed] }).catch(() => {});
        } catch {}

        const winnerMentions = winners.map(w => `<@${w.user_id}>`).join(', ');

        const rerollButton = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`reroll_inviteevent_${eventData.id}`)
                .setLabel('🔄 Reroll')
                .setStyle(ButtonStyle.Primary)
        );

        const topWinner = winners[0];
        const topPct = totalInvites > 0 ? Math.round((topWinner.invites / totalInvites) * 100) : 0;

        const announceEmbed = createEmbed({
            title: '🎉 Invite Event Winners!',
            description: `🥇 **<@${topWinner.user_id}>** dominated with **${topWinner.invites}** invite${topWinner.invites !== 1 ? 's' : ''} (${topPct}% of all invites)!\n\n🏆 **Winners:**\n${winnersDetailed}`,
            color: THEME.success,
            image: eventImage,
            fields: [
                { name: '🎁 Prize', value: `**${eventData.prize}**`, inline: true },
                { name: '👑 Host', value: `<@${eventData.host_id}>`, inline: true },
                { name: '📊 Total', value: `**${totalInvites}** invites by **${entries.length}** people`, inline: true },
            ],
            footer: { text: `🔥 Event #${eventData.id} | Reroll expires in 1h` }
        });

        await channel.send({
            content: `🎉 The invite event has ended! Congratulations ${winnerMentions}! You won **${eventData.prize}**!\n📢 <@${eventData.host_id}>, your invite event has ended!`,
            embeds: [announceEmbed],
            components: [rerollButton],
            allowedMentions: { parse: ['users'] }
        });

        startRerollCleanup(client, channel.id, eventData.id);
    },

    // ════════════════════════════════════════
    // ── SHOW LIST ──
    // ════════════════════════════════════════
    async showList(client, guild, context) {
        const events = getActiveInviteEventsByGuild(guild.id);

        if (events.length === 0) {
            return safeReply(context, { embeds: [createEmbed({ context: guild, description: '🔥 No active invite events running.', color: THEME.dark })] });
        }

        const items = events.map((e) => {
            const endsAt = Math.floor(e.end_time / 1000);
            const startsAt = Math.floor(e.start_time / 1000);
            const timeLeft = e.end_time - Date.now();
            const status = timeLeft <= 0 ? '⏰ Ending soon...' : `<t:${endsAt}:R>`;
            const ch = guild.channels.cache.get(e.channel_id);
            const chName = ch ? `<#${ch.id}>` : 'Unknown';
            const elapsed = Date.now() - e.start_time;
            const total = e.end_time - e.start_time;
            const progress = Math.min(100, Math.round((elapsed / total) * 100));
            const filled = '█'.repeat(Math.round(progress / 10)) + '░'.repeat(10 - Math.round(progress / 10));

            return `**#${e.id}** ─ ${e.prize}\n🏆 ${e.winner_count} winner(s) | 📍 ${chName}\n⏰ Ends ${status} | Progress: \`${filled}\` ${progress}%\n🗓️ <t:${startsAt}:F> → <t:${endsAt}:F>`;
        }).join('\n\n');

        const pingRoleId = getInviteEventPingRole(guild.id);
        const pingInfo = pingRoleId ? `\n\n🔔 Ping Role: <@&${pingRoleId}>` : '';

        return safeReply(context, { embeds: [createEmbed({
            title: `🔥 Active Invite Events (${events.length})`,
            description: items + pingInfo,
            color: THEME.celestial,
            footer: { text: 'Use /inviteevent cancel <id> to cancel • /inviteevent leaderboard <id> to check rankings' }
        })] });
    },

    // ════════════════════════════════════════
    // ── CANCEL EVENT ──
    // ════════════════════════════════════════
    async cancelEvent(client, guild, member, eventId, context) {
        if (!member.permissions.has('ManageMessages')) {
            return safeReply(context, { embeds: [createEmbed({ context: guild, description: '🚫 You need Manage Messages permission.', color: THEME.error })] });
        }

        const event = getInviteEventById(eventId);
        if (!event || event.guild_id !== guild.id || event.status !== 'active') {
            return safeReply(context, { embeds: [createEmbed({ context: guild, description: '⚠️ No active invite event found with that ID. Use `/inviteevent list` to see active ones.', color: THEME.error })] });
        }

        const timeout = activeTimeouts.get(eventId);
        if (timeout) { clearTimeout(timeout); activeTimeouts.delete(eventId); }

        const entries = getInviteEventEntries(eventId);
        const totalInvites = entries.reduce((sum, e) => sum + e.invites, 0);
        const duration = Date.now() - event.start_time;
        const startedAt = Math.floor(event.start_time / 1000);

        inviteSnapshots.delete(eventId);
        removeFromGuildIndex(guild.id, eventId);
        removeInviteEvent(eventId);

        try {
            const channel = guild.channels.cache.get(event.channel_id);
            if (channel) {
                const msg = await channel.messages.fetch(event.message_id).catch(() => null);
                if (msg) {
                    const eventImage = getEventImage(client, event.image_url);
                    await msg.edit({
                        embeds: [createEmbed({
                            title: '🔥 Invite Event Cancelled',
                            description: `This event has been cancelled by a moderator.`,
                            color: THEME.error,
                            image: eventImage,
                            fields: [
                                { name: '🎁 Prize', value: `~~${event.prize}~~`, inline: true },
                                { name: '👑 Host', value: `<@${event.host_id}>`, inline: true },
                                { name: '⏰ Ran For', value: formatDuration(duration), inline: true },
                                { name: '📊 Stats Before Cancel', value: `👥 **${entries.length}** participant${entries.length !== 1 ? 's' : ''} • **${totalInvites}** total invite${totalInvites !== 1 ? 's' : ''}`, inline: false },
                                { name: '🗓️ Started', value: `<t:${startedAt}:F>`, inline: true },
                                { name: '❌ Cancelled', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                            ],
                            footer: { text: `🔥 Event #${eventId} | Cancelled` }
                        })],
                        components: []
                    }).catch(() => {});
                }
            }
        } catch {}

        return safeReply(context, { embeds: [createEmbed({ context: guild, description: `🔥 Invite event **#${eventId}** for **${event.prize}** has been cancelled.\n📊 **${entries.length}** participants and **${totalInvites}** invites were tracked before cancellation.`, color: THEME.primary })] });
    },

    // ════════════════════════════════════════
    // ── RESTORE EVENT ──
    // ════════════════════════════════════════
    async restoreEvent(client, guild, targetChannel, eventId, context) {
        const isInteraction = context.isCommand !== undefined;
        if (isInteraction) await context.deferReply();

        const event = getInviteEventById(eventId);

        if (!event) {
            return safeReply(context, { embeds: [createEmbed({ context: guild, description: '⚠️ No invite event data found for that ID. It may have already been cancelled or cleaned up.', color: THEME.error })] });
        }

        if (event.status === 'ended') {
            return safeReply(context, { embeds: [createEmbed({ context: guild, description: '⚠️ That invite event has already ended and cannot be restored.', color: THEME.error })] });
        }

        if (event.guild_id !== guild.id) {
            return safeReply(context, { embeds: [createEmbed({ context: guild, description: '⚠️ That invite event does not belong to this server.', color: THEME.error })] });
        }

        const timeout = activeTimeouts.get(eventId);
        if (timeout) { clearTimeout(timeout); activeTimeouts.delete(eventId); }
        inviteSnapshots.delete(eventId);
        removeFromGuildIndex(guild.id, eventId);

        const endsAtDiscord = Math.floor(event.end_time / 1000);
        const hostMention = `<@${event.host_id}>`;
        const duration = event.end_time - event.start_time;
        const elapsed = Date.now() - event.start_time;
        const remaining = event.end_time - Date.now();

        const eventImage = getEventImage(client, event.image_url);

        const entries = getInviteEventLeaderboard(eventId, 10);
        const allEntries = getInviteEventEntries(eventId);
        const totalInvites = allEntries.reduce((sum, e) => sum + e.invites, 0);

        let leaderboardSection = '';
        if (entries.length > 0) {
            leaderboardSection = `\n\n📊 **Live Leaderboard:**\n${formatLeaderboardDetailed(entries, 10, totalInvites)}`;
        } else {
            leaderboardSection = '\n\n📊 No invites tracked yet — be the first!';
        }

        const progress = Math.min(100, Math.round((elapsed / duration) * 100));
        const filled = '█'.repeat(Math.round(progress / 10)) + '░'.repeat(10 - Math.round(progress / 10));

        const restoreEmbed = createEmbed({
            title: '🔥 Invite Event Started! [RESTORED]',
            description: `Invite people to this server to climb the leaderboard!\nThe top ${event.winner_count} invit${event.winner_count === 1 ? 'er wins' : 'ers win'} when the event ends!${leaderboardSection}`,
            color: THEME.primary,
            image: eventImage,
            fields: [
                { name: '🎁 Prize', value: `**${event.prize}**`, inline: true },
                { name: '🏆 Winners', value: `${event.winner_count} top invit${event.winner_count === 1 ? 'er' : 'ers'}`, inline: true },
                { name: '👑 Host', value: hostMention, inline: true },
                { name: '⏰ Duration', value: formatDuration(duration), inline: true },
                { name: '🗓️ Ends', value: `<t:${endsAtDiscord}:F> (<t:${endsAtDiscord}:R>)`, inline: true },
                { name: '📈 Progress', value: `\`${filled}\` ${progress}% complete — ${formatDuration(remaining)} remaining`, inline: false },
                { name: '📊 Current Stats', value: `👥 **${allEntries.length}** participant${allEntries.length !== 1 ? 's' : ''} • **${totalInvites}** invite${totalInvites !== 1 ? 's' : ''} tracked`, inline: false },
            ],
            footer: { text: `🔥 Event #${event.id} | Restored | Hosted by the Lord of Hell` }
        });

        const pingRoleId = getInviteEventPingRole(guild.id);
        const pingContent = pingRoleId ? `🔔 <@&${pingRoleId}> An invite event has been restored!` : '';

        const msg = await targetChannel.send({
            content: pingContent,
            embeds: [restoreEmbed],
            allowedMentions: { parse: ['users', 'roles'] }
        });

        updateInviteEventMessage(eventId, msg.id, targetChannel.id);

        loadSnapshot(eventId, event.invite_snapshot);
        addToGuildIndex(guild.id, eventId);

        this.resumeInviteEvent(client, getInviteEventById(eventId));

        return safeReply(context, { embeds: [createEmbed({ context: guild, description: `🔥 Invite event restored in ${targetChannel}! Event ID: **#${eventId}**\n📊 All **${allEntries.length}** participants and **${totalInvites}** invites have been preserved.`, color: THEME.success })] });
    },

    // ════════════════════════════════════════
    // ── SHOW LEADERBOARD ──
    // ════════════════════════════════════════
    async showLeaderboard(client, guild, eventId, context) {
        const event = getInviteEventById(eventId);
        if (!event || event.guild_id !== guild.id) {
            return safeReply(context, { embeds: [createEmbed({ context: guild, description: '⚠️ No invite event found with that ID.', color: THEME.error })] });
        }

        const entries = getInviteEventLeaderboard(eventId, 15);
        const allEntries = getInviteEventEntries(eventId);
        const totalInvites = allEntries.reduce((sum, e) => sum + e.invites, 0);
        const startedAt = Math.floor(event.start_time / 1000);
        const endsAt = Math.floor(event.end_time / 1000);

        if (entries.length === 0) {
            const statusText = event.status === 'active' ? 'No invites tracked yet — be the first to invite someone!' : 'No one invited anyone during this event.';
            return safeReply(context, { embeds: [createEmbed({
                title: `📊 Invite Event #${eventId} Leaderboard`,
                description: `**Prize:** ${event.prize}\n\n❌ ${statusText}`,
                color: THEME.dark,
                fields: event.status === 'active' ? [
                    { name: '🗓️ Started', value: `<t:${startedAt}:F>`, inline: true },
                    { name: '🗓️ Ends', value: `<t:${endsAt}:R>`, inline: true },
                    { name: '👑 Host', value: `<@${event.host_id}>`, inline: true },
                ] : [],
                footer: { text: `🔥 Event #${eventId}` }
            })] });
        }

        const leaderboardStr = formatLeaderboardDetailed(entries, 15, totalInvites);
        const topInviteCount = entries[0].invites;
        const avgInvites = (totalInvites / allEntries.length).toFixed(1);

        let statusFields = [];
        if (event.status === 'active') {
            const elapsed = Date.now() - event.start_time;
            const remaining = event.end_time - Date.now();
            const total = event.end_time - event.start_time;
            const progress = Math.min(100, Math.round((elapsed / total) * 100));
            const filled = '█'.repeat(Math.round(progress / 10)) + '░'.repeat(10 - Math.round(progress / 10));

            statusFields = [
                { name: '📈 Progress', value: `\`${filled}\` ${progress}% — ${formatDuration(remaining)} remaining`, inline: false },
                { name: '🗓️ Ends', value: `<t:${endsAt}:F> (<t:${endsAt}:R>)`, inline: true },
                { name: '👑 Host', value: `<@${event.host_id}>`, inline: true },
                { name: '🏆 Winners', value: `Top ${event.winner_count}`, inline: true },
            ];
        } else {
            const duration = event.end_time - event.start_time;
            statusFields = [
                { name: '✅ Status', value: 'Ended', inline: true },
                { name: '👑 Host', value: `<@${event.host_id}>`, inline: true },
                { name: '⏰ Duration', value: formatDuration(duration), inline: true },
            ];
        }

        return safeReply(context, { embeds: [createEmbed({
            title: `📊 Invite Event #${eventId} Leaderboard`,
            description: `**Prize:** ${event.prize}\n\n${leaderboardStr}`,
            color: THEME.celestial,
            fields: [
                ...statusFields,
                { name: '📊 Statistics', value: `👥 **${allEntries.length}** participant${allEntries.length !== 1 ? 's' : ''} • **${totalInvites}** total invite${totalInvites !== 1 ? 's' : ''}\n🥇 Best: **${topInviteCount}** invites • 📈 Average: **${avgInvites}** invites/person`, inline: false },
            ],
            footer: { text: `🔥 Event #${eventId} | Use /inviteevent leaderboard <id> to refresh` }
        })] });
    },

    // ════════════════════════════════════════
    // ── REROLL (Command) ──
    // ════════════════════════════════════════
    async rerollEvent(client, guild, member, eventId, context) {
        if (!member.permissions.has('ManageMessages')) {
            return safeReply(context, { embeds: [createEmbed({ context: guild, description: '🚫 You need Manage Messages permission.', color: THEME.error })] });
        }

        const event = getInviteEventById(eventId);
        if (!event || event.guild_id !== guild.id) {
            return safeReply(context, { embeds: [createEmbed({ context: guild, description: '⚠️ No invite event found with that ID.', color: THEME.error })] });
        }

        if (event.status !== 'ended') {
            return safeReply(context, { embeds: [createEmbed({ context: guild, description: '⚠️ You can only reroll ended events.', color: THEME.error })] });
        }

        const entries = getInviteEventEntries(eventId);
        if (entries.length === 0) {
            return safeReply(context, { embeds: [createEmbed({ context: guild, description: '⚠️ No entries to reroll from.', color: THEME.error })] });
        }

        const winners = pickWeightedWinners(entries, event.winner_count);
        if (winners.length === 0) {
            return safeReply(context, { embeds: [createEmbed({ context: guild, description: '⚠️ Reroll failed to select winners.', color: THEME.error })] });
        }

        const winnerMentions = winners.map(w => `<@${w.user_id}>`).join(', ');
        const medals = ['🥇', '🥈', '🥉'];
        const totalInvites = entries.reduce((sum, e) => sum + e.invites, 0);
        const winnersStr = winners.map((w, i) => {
            const pct = totalInvites > 0 ? Math.round((w.invites / totalInvites) * 100) : 0;
            return `${medals[i] || '🏆'} <@${w.user_id}> — **${w.invites}** invite${w.invites !== 1 ? 's' : ''} (${pct}%)`;
        }).join('\n');

        const eventImage = getEventImage(client, event.image_url);

        const rerollEmbed = createEmbed({
            title: '🔄 Invite Event Rerolled!',
            description: `🏆 **New Winners:**\n${winnersStr}`,
            color: THEME.success,
            image: eventImage,
            fields: [
                { name: '🎁 Prize', value: `**${event.prize}**`, inline: true },
                { name: '👑 Host', value: `<@${event.host_id}>`, inline: true },
                { name: '📊 Pool', value: `**${entries.length}** participants • **${totalInvites}** invites`, inline: true },
            ],
            footer: { text: `🔥 Event #${eventId} | Rerolled` }
        });

        return safeReply(context, {
            content: `🔄 Rerolled! Congratulations ${winnerMentions}! You won **${event.prize}**!`,
            embeds: [rerollEmbed],
            allowedMentions: { parse: ['users'] }
        });
    },

    // ════════════════════════════════════════
    // ── REROLL (Button) ──
    // ════════════════════════════════════════
    async handleButton(interaction, client) {
        if (!interaction.customId.startsWith('reroll_inviteevent_')) return;

        const eventId = parseInt(interaction.customId.split('_')[2]);
        const event = getInviteEventById(eventId);

        if (!event) {
            return interaction.reply({ content: '⚠️ This invite event data no longer exists.', flags: 64 });
        }

        const botOwnerId = process.env.BOT_OWNER_ID;
        const isHost = interaction.user.id === event.host_id;
        const isGuildOwner = interaction.user.id === interaction.guild.ownerId;
        const isBotOwner = botOwnerId && interaction.user.id === botOwnerId;

        if (!isHost && !isGuildOwner && !isBotOwner) {
            return interaction.reply({ content: '🚫 Only the event host, server owner, or bot owner can reroll!', flags: 64 });
        }

        await interaction.deferReply();

        const entries = getInviteEventEntries(eventId);
        if (entries.length === 0) {
            return interaction.editReply('⚠️ No entries to reroll from.');
        }

        const winners = pickWeightedWinners(entries, event.winner_count);
        if (winners.length === 0) {
            return interaction.editReply('⚠️ Reroll failed to select winners.');
        }

        const winnerMentions = winners.map(w => `<@${w.user_id}>`).join(', ');
        const medals = ['🥇', '🥈', '🥉'];
        const totalInvites = entries.reduce((sum, e) => sum + e.invites, 0);
        const winnersStr = winners.map((w, i) => {
            const pct = totalInvites > 0 ? Math.round((w.invites / totalInvites) * 100) : 0;
            return `${medals[i] || '🏆'} <@${w.user_id}> — **${w.invites}** invite${w.invites !== 1 ? 's' : ''} (${pct}%)`;
        }).join('\n');

        const eventImage = getEventImage(client, event.image_url);

        const rerollEmbed = createEmbed({
            title: '🔄 Invite Event Rerolled!',
            description: `🏆 **New Winners:**\n${winnersStr}`,
            color: THEME.success,
            image: eventImage,
            fields: [
                { name: '🎁 Prize', value: `**${event.prize}**`, inline: true },
                { name: '👑 Host', value: `<@${event.host_id}>`, inline: true },
                { name: '📊 Pool', value: `**${entries.length}** participants • **${totalInvites}** invites`, inline: true },
            ],
            footer: { text: `🔥 Event #${eventId} | Rerolled` }
        });

        await interaction.editReply({
            content: `🔄 Rerolled! Congratulations ${winnerMentions}! You won **${event.prize}**!`,
            embeds: [rerollEmbed],
            allowedMentions: { parse: ['users'] }
        });

        startRerollCleanup(client, interaction.channel.id, eventId);
    },

    // ════════════════════════════════════════
    // ── HANDLE MEMBER JOIN ──
    // ════════════════════════════════════════
    async handleMemberJoin(guild, client) {
        const eventIds = getActiveEventIdsForGuild(guild.id);
        if (eventIds.size === 0) return;

        const currentInvites = await guild.invites.fetch().catch(() => null);
        if (!currentInvites) return;

        for (const eventId of eventIds) {
            const snapshot = getSnapshot(eventId);
            let updated = false;

            for (const [code, invite] of currentInvites) {
                if (!invite.inviter) continue;

                const snap = snapshot[code];
                if (snap && invite.uses > snap.uses) {
                    const newInvites = invite.uses - snap.uses;
                    incrementInviteEventEntry(eventId, invite.inviter.id, newInvites);
                    snapshot[code] = { uses: invite.uses, inviterId: invite.inviter.id };
                    updated = true;
                } else if (!snap && invite.uses > 0) {
                    incrementInviteEventEntry(eventId, invite.inviter.id, invite.uses);
                    snapshot[code] = { uses: invite.uses, inviterId: invite.inviter.id };
                    updated = true;
                } else if (!snap) {
                    snapshot[code] = { uses: 0, inviterId: invite.inviter.id };
                    updated = true;
                }
            }

            for (const code of Object.keys(snapshot)) {
                if (!currentInvites.has(code)) {
                    delete snapshot[code];
                    updated = true;
                }
            }

            if (updated) {
                inviteSnapshots.set(eventId, snapshot);
                saveSnapshot(eventId);
            }
        }
    },

    // ════════════════════════════════════════
    // ── HANDLE INVITE CREATE ──
    // ════════════════════════════════════════
    handleInviteCreate(invite) {
        if (!invite.inviter) return;

        const eventIds = getActiveEventIdsForGuild(invite.guild.id);
        if (eventIds.size === 0) return;

        for (const eventId of eventIds) {
            const snapshot = getSnapshot(eventId);
            if (!snapshot[invite.code]) {
                snapshot[invite.code] = { uses: invite.uses, inviterId: invite.inviter.id };
                inviteSnapshots.set(eventId, snapshot);
                saveSnapshot(eventId);
            }
        }
    },

    // ════════════════════════════════════════
    // ── HANDLE INVITE DELETE ──
    // ════════════════════════════════════════
    handleInviteDelete(invite) {
        const eventIds = getActiveEventIdsForGuild(invite.guild.id);
        if (eventIds.size === 0) return;

        for (const eventId of eventIds) {
            const snapshot = getSnapshot(eventId);
            const snap = snapshot[invite.code];

            if (snap && invite.uses > snap.uses) {
                const newInvites = invite.uses - snap.uses;
                incrementInviteEventEntry(eventId, snap.inviterId, newInvites);
            }

            delete snapshot[invite.code];
            inviteSnapshots.set(eventId, snapshot);
            saveSnapshot(eventId);
        }
    },

    // ════════════════════════════════════════
    // ── RESUME SINGLE EVENT ──
    // ════════════════════════════════════════
    async resumeInviteEvent(client, event) {
        const channel = await client.channels.fetch(event.channel_id).catch(() => null);
        if (!channel) {
            removeInviteEvent(event.id);
            return;
        }

        const msg = await channel.messages.fetch(event.message_id).catch(() => null);
        if (!msg) {
            loadSnapshot(event.id, event.invite_snapshot);
            addToGuildIndex(event.guild_id, event.id);

            const timeLeft = event.end_time - Date.now();
            if (timeLeft <= 0) {
                await this.endInviteEvent(client, event);
            } else {
                const timeoutId = setTimeout(async () => {
                    const current = getInviteEventById(event.id);
                    if (!current || current.status !== 'active') return;
                    await this.endInviteEvent(client, current);
                }, timeLeft);
                activeTimeouts.set(event.id, timeoutId);
            }
            return;
        }

        loadSnapshot(event.id, event.invite_snapshot);
        addToGuildIndex(event.guild_id, event.id);

        try {
            const guild = client.guilds.cache.get(event.guild_id);
            if (guild) {
                const currentInvites = await guild.invites.fetch().catch(() => null);
                if (currentInvites) {
                    const snapshot = getSnapshot(event.id);
                    let updated = false;

                    for (const [code, invite] of currentInvites) {
                        if (!invite.inviter) continue;
                        const snap = snapshot[code];
                        if (snap && invite.uses > snap.uses) {
                            incrementInviteEventEntry(event.id, invite.inviter.id, invite.uses - snap.uses);
                            snapshot[code] = { uses: invite.uses, inviterId: invite.inviter.id };
                            updated = true;
                        } else if (!snap && invite.uses > 0) {
                            incrementInviteEventEntry(event.id, invite.inviter.id, invite.uses);
                            snapshot[code] = { uses: invite.uses, inviterId: invite.inviter.id };
                            updated = true;
                        }
                    }

                    if (updated) {
                        inviteSnapshots.set(event.id, snapshot);
                        saveSnapshot(event.id);
                    }
                }
            }
        } catch (e) {
            console.error(`InviteEvent catch-up error for #${event.id}:`, e);
        }

        const timeLeft = event.end_time - Date.now();
        if (timeLeft <= 0) {
            await this.endInviteEvent(client, event);
        } else {
            const timeoutId = setTimeout(async () => {
                const current = getInviteEventById(event.id);
                if (!current || current.status !== 'active') return;
                await this.endInviteEvent(client, current);
            }, timeLeft);
            activeTimeouts.set(event.id, timeoutId);
        }
    },

    // ════════════════════════════════════════
    // ── RESUME ALL EVENTS ──
    // ════════════════════════════════════════
    async resumeInviteEvents(client) {
        const activeEvents = getActiveInviteEvents();
        if (activeEvents.length === 0) return;

        for (const event of activeEvents) {
            await this.resumeInviteEvent(client, event);
        }
    }
};