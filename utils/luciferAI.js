const axios = require('axios');

const AI_MODEL = 'llama-3.3-70b-versatile';
const THREAD_EXPIRY_MS = 5 * 60 * 1000;
const MAX_HISTORY = 10;

const threads = new Map();

function getThread(channelId, userId) {
    const key = `${channelId}-${userId}`;
    const thread = threads.get(key);
    if (!thread) return null;
    if (Date.now() - thread.lastActivity > THREAD_EXPIRY_MS) { threads.delete(key); return null; }
    return thread;
}

function saveThread(channelId, userId, data) {
    const key = `${channelId}-${userId}`;
    data.lastActivity = Date.now();
    threads.set(key, data);
}

function cleanExpiredThreads() {
    const now = Date.now();
    for (const [key, thread] of threads) {
        if (now - thread.lastActivity > THREAD_EXPIRY_MS) threads.delete(key);
    }
}

// ════════════════════════════════════════
// ── TOOL DEFINITIONS ──
// ════════════════════════════════════════

const tools = [
    {
        type: 'function',
        function: {
            name: 'mute_user',
            description: 'Timeout/mute a user. Requires ModerateMembers permission.',
            parameters: { type: 'object', properties: {
                user_id: { type: 'string', description: 'Numeric Discord user ID from MENTIONED USERS section' },
                duration_minutes: { type: 'number', description: 'Duration in minutes (default 5, max 40320)' },
                reason: { type: 'string', description: 'Reason for muting' }
            }, required: ['user_id'] }
        }
    },
    {
        type: 'function',
        function: {
            name: 'kick_user',
            description: 'Kick a user. Requires KickMembers permission.',
            parameters: { type: 'object', properties: {
                user_id: { type: 'string', description: 'Numeric Discord user ID from MENTIONED USERS section' },
                reason: { type: 'string', description: 'Reason' }
            }, required: ['user_id'] }
        }
    },
    {
        type: 'function',
        function: {
            name: 'ban_user',
            description: 'Ban a user. Requires BanMembers permission.',
            parameters: { type: 'object', properties: {
                user_id: { type: 'string', description: 'Numeric Discord user ID from MENTIONED USERS section' },
                reason: { type: 'string', description: 'Reason' },
                delete_message_days: { type: 'number', description: 'Days of messages to delete (0-7)' }
            }, required: ['user_id'] }
        }
    },
    {
        type: 'function',
        function: {
            name: 'unmute_user',
            description: 'Remove timeout from a user. Requires ModerateMembers permission.',
            parameters: { type: 'object', properties: {
                user_id: { type: 'string', description: 'Numeric Discord user ID from MENTIONED USERS section' }
            }, required: ['user_id'] }
        }
    },
    {
        type: 'function',
        function: {
            name: 'warn_user',
            description: 'Warn a user. Requires ModerateMembers permission.',
            parameters: { type: 'object', properties: {
                user_id: { type: 'string', description: 'Numeric Discord user ID from MENTIONED USERS section' },
                reason: { type: 'string', description: 'Reason' }
            }, required: ['user_id'] }
        }
    },
    {
        type: 'function',
        function: {
            name: 'clear_messages',
            description: 'Delete messages. Requires ManageMessages permission.',
            parameters: { type: 'object', properties: {
                amount: { type: 'number', description: 'Number of messages (1-100)' }
            }, required: ['amount'] }
        }
    },
    {
        type: 'function',
        function: {
            name: 'change_nickname',
            description: 'Change nickname. Requires ManageNicknames permission.',
            parameters: { type: 'object', properties: {
                user_id: { type: 'string', description: 'Numeric Discord user ID from MENTIONED USERS section' },
                nickname: { type: 'string', description: 'New nickname' }
            }, required: ['user_id', 'nickname'] }
        }
    },
    {
        type: 'function',
        function: {
            name: 'lock_channel',
            description: 'Lock the current channel. Requires ManageChannels permission.',
            parameters: { type: 'object', properties: {} }
        }
    },
    {
        type: 'function',
        function: {
            name: 'unlock_channel',
            description: 'Unlock the current channel. Requires ManageChannels permission.',
            parameters: { type: 'object', properties: {} }
        }
    },
    {
        type: 'function',
        function: {
            name: 'add_role',
            description: 'Add a role to a user. Requires ManageRoles permission.',
            parameters: { type: 'object', properties: {
                user_id: { type: 'string', description: 'Numeric Discord user ID from MENTIONED USERS section' },
                role_id: { type: 'string', description: 'Numeric Discord role ID from ROLES section' }
            }, required: ['user_id', 'role_id'] }
        }
    },
    {
        type: 'function',
        function: {
            name: 'remove_role',
            description: 'Remove a role from a user. Requires ManageRoles permission.',
            parameters: { type: 'object', properties: {
                user_id: { type: 'string', description: 'Numeric Discord user ID from MENTIONED USERS section' },
                role_id: { type: 'string', description: 'Numeric Discord role ID from ROLES section' }
            }, required: ['user_id', 'role_id'] }
        }
    },
    {
        type: 'function',
        function: {
            name: 'check_user_info',
            description: 'Get info about a user. No special permissions needed.',
            parameters: { type: 'object', properties: {
                user_id: { type: 'string', description: 'Numeric Discord user ID from MENTIONED USERS section' }
            }, required: ['user_id'] }
        }
    },
    {
        type: 'function',
        function: {
            name: 'giveaway_start',
            description: 'Start a giveaway. Requires ManageMessages permission.',
            parameters: { type: 'object', properties: {
                prize: { type: 'string', description: 'What is being given away' },
                duration_minutes: { type: 'number', description: 'Duration in minutes (60=1h, 1440=1d)' },
                winners: { type: 'number', description: 'Number of winners (default 1)' }
            }, required: ['prize', 'duration_minutes'] }
        }
    },
    {
        type: 'function',
        function: {
            name: 'giveaway_list',
            description: 'List all active giveaways. Requires ManageMessages permission.',
            parameters: { type: 'object', properties: {} }
        }
    },
    {
        type: 'function',
        function: {
            name: 'giveaway_cancel',
            description: 'Cancel an active giveaway. Requires ManageMessages permission.',
            parameters: { type: 'object', properties: {
                message_id: { type: 'string', description: 'The giveaway message ID' }
            }, required: ['message_id'] }
        }
    },
    {
        type: 'function',
        function: {
            name: 'booster_add',
            description: 'Add a booster role for bonus giveaway entries. Requires Administrator permission.',
            parameters: { type: 'object', properties: {
                role_id: { type: 'string', description: 'Numeric Discord role ID from ROLES section' },
                bonus_entries: { type: 'number', description: 'Extra entries (1-10)' }
            }, required: ['role_id', 'bonus_entries'] }
        }
    },
    {
        type: 'function',
        function: {
            name: 'booster_remove',
            description: 'Remove a booster role. Requires Administrator permission.',
            parameters: { type: 'object', properties: {
                role_id: { type: 'string', description: 'Numeric Discord role ID from ROLES section' }
            }, required: ['role_id'] }
        }
    },
    {
        type: 'function',
        function: {
            name: 'booster_list',
            description: 'List all booster roles. No special permissions needed.',
            parameters: { type: 'object', properties: {} }
        }
    },
    {
        type: 'function',
        function: {
            name: 'booster_clear',
            description: 'Remove all booster roles. Requires Administrator permission.',
            parameters: { type: 'object', properties: {} }
        }
    }
];

// ════════════════════════════════════════
// ── PERMISSION MAP ──
// ════════════════════════════════════════

const TOOL_PERMS = {
    mute_user: 'ModerateMembers',
    kick_user: 'KickMembers',
    ban_user: 'BanMembers',
    unmute_user: 'ModerateMembers',
    warn_user: 'ModerateMembers',
    clear_messages: 'ManageMessages',
    change_nickname: 'ManageNicknames',
    lock_channel: 'ManageChannels',
    unlock_channel: 'ManageChannels',
    add_role: 'ManageRoles',
    remove_role: 'ManageRoles',
    check_user_info: null,
    giveaway_start: 'ManageMessages',
    giveaway_list: 'ManageMessages',
    giveaway_cancel: 'ManageMessages',
    booster_add: 'Administrator',
    booster_remove: 'Administrator',
    booster_list: null,
    booster_clear: 'Administrator'
};

// ════════════════════════════════════════
// ── EXECUTE TOOL ──
// ════════════════════════════════════════

async function executeTool(toolName, args, message, client) {
    const guild = message.guild;
    const member = message.member;
    const botMember = guild.members.me;

    // ── Permission Check ──
    const requiredPerm = TOOL_PERMS[toolName];
    if (requiredPerm && !member.permissions.has(requiredPerm)) {
        const permName = requiredPerm.replace(/([A-Z])/g, ' $1').trim();
        return `FAILED:PERM|You lack "${permName}" permission.`;
    }

    // ── Validate user_id ──
    const needsUserId = ['mute_user', 'kick_user', 'ban_user', 'unmute_user', 'change_nickname', 'add_role', 'remove_role', 'warn_user', 'check_user_info'];
    if (needsUserId.includes(toolName)) {
        if (!args.user_id || !/^\d{17,20}$/.test(String(args.user_id))) {
            return `FAILED:INVALID_ID|The value "${args.user_id}" is not a valid Discord ID. You must mention a user so their ID appears in MENTIONED USERS.`;
        }
        if (args.user_id === member.id) return 'FAILED:SELF|Cannot target yourself.';
        if (args.user_id === botMember.id) return 'FAILED:BOT|Cannot target Lucifer.';
        const target = await guild.members.fetch(args.user_id).catch(() => null);
        if (!target) return `FAILED:NOT_FOUND|User <@${args.user_id}> not in server.`;
        if (!target.moderatable && ['mute_user', 'kick_user', 'ban_user', 'unmute_user', 'change_nickname', 'warn_user'].includes(toolName)) {
            return `FAILED:HIERARCHY|Cannot act on <@${args.user_id}>, they outrank Lucifer.`;
        }
    }

    // ── Validate role_id ──
    if (['add_role', 'remove_role', 'booster_add', 'booster_remove'].includes(toolName)) {
        if (!args.role_id || !/^\d{17,20}$/.test(String(args.role_id))) {
            return 'FAILED:INVALID_ROLE|Not a valid role ID.';
        }
        const role = guild.roles.cache.get(args.role_id);
        if (!role) return 'FAILED:ROLE_NOT_FOUND|Role not found.';
        if (role.id === guild.id) return 'FAILED:EVERYONE|Cannot use @everyone.';
        if (['add_role', 'remove_role'].includes(toolName) && role.position >= botMember.roles.highest.position) {
            return `FAILED:ROLE_HIERARCHY|Role "${role.name}" is above Lucifer.`;
        }
    }

    try {
        const db = require('../database/db');

        switch (toolName) {
            case 'mute_user': {
                const target = await guild.members.fetch(args.user_id);
                const duration = Math.min(Math.max(args.duration_minutes || 5, 1), 40320);
                await target.timeout(duration * 60 * 1000, args.reason || 'Muted by Lucifer AI');
                const durStr = duration >= 60 ? `${Math.floor(duration/60)}h${duration%60 ? duration%60+'m' : ''}` : `${duration}m`;
                return `OK|Muted <@${args.user_id}> for ${durStr}. Reason: ${args.reason || 'Not specified'}`;
            }
            case 'kick_user': {
                const target = await guild.members.fetch(args.user_id);
                await target.kick(args.reason || 'Kicked by Lucifer AI');
                return `OK|Kicked <@${args.user_id}>. Reason: ${args.reason || 'Not specified'}`;
            }
            case 'ban_user': {
                const target = await guild.members.fetch(args.user_id);
                const del = Math.min(args.delete_message_days || 0, 7);
                await target.ban({ deleteMessageDays: del, reason: args.reason || 'Banned by Lucifer AI' });
                return `OK|Banned <@${args.user_id}>. Reason: ${args.reason || 'Not specified'}`;
            }
            case 'unmute_user': {
                const target = await guild.members.fetch(args.user_id);
                await target.timeout(null, 'Unmuted by Lucifer AI');
                return `OK|Unmuted <@${args.user_id}>.`;
            }
            case 'warn_user': {
                const target = await guild.members.fetch(args.user_id);
                db.addWarning(guild.id, args.user_id, client.user.id, args.reason || 'Warned by Lucifer AI');
                const total = db.getWarningCount(guild.id, args.user_id);
                return `OK|Warned <@${args.user_id}>. Reason: ${args.reason || 'Not specified'}. They now have **${total}** warning(s).`;
            }
            case 'clear_messages': {
                const amount = Math.min(Math.max(args.amount || 1, 1), 100);
                const deleted = await message.channel.bulkDelete(amount, true);
                return `OK|Purged **${deleted.size}** messages from #${message.channel.name}.`;
            }
            case 'change_nickname': {
                const target = await guild.members.fetch(args.user_id);
                await target.setNickname(args.nickname, 'Changed by Lucifer AI');
                return `OK|Changed <@${args.user_id}>'s nickname to **${args.nickname}**.`;
            }
            case 'lock_channel': {
                await message.channel.permissionOverwrites.edit(guild.id, { SendMessages: false });
                return `OK|Locked **#${message.channel.name}**.`;
            }
            case 'unlock_channel': {
                await message.channel.permissionOverwrites.edit(guild.id, { SendMessages: null });
                return `OK|Unlocked **#${message.channel.name}**.`;
            }
            case 'add_role': {
                const target = await guild.members.fetch(args.user_id);
                const role = guild.roles.cache.get(args.role_id);
                await target.roles.add(role, 'Added by Lucifer AI');
                return `OK|Added <@&${args.role_id}> to <@${args.user_id}>.`;
            }
            case 'remove_role': {
                const target = await guild.members.fetch(args.user_id);
                const role = guild.roles.cache.get(args.role_id);
                await target.roles.remove(role, 'Removed by Lucifer AI');
                return `OK|Removed <@&${args.role_id}> from <@${args.user_id}>.`;
            }
            case 'check_user_info': {
                const target = await guild.members.fetch(args.user_id);
                const warnings = db.getWarningCount(guild.id, args.user_id);
                const roleMentions = target.roles.cache.filter(r => r.id !== guild.id).sort((a, b) => b.position - a.position).map(r => `<@&${r.id}>`).join(', ') || 'None';
                return `INFO|**Name:** <@${args.user_id}>\n**Joined:** <t:${Math.floor(target.joinedTimestamp / 1000)}:R>\n**Warnings:** ${warnings}\n**Roles:** ${roleMentions}`;
            }

            // ── GIVEAWAY ──
            case 'giveaway_start': {
                const giveawayCmd = client.commands.get('giveaway');
                if (!giveawayCmd) return 'FAILED|Giveaway system unavailable.';
                const durationMs = (args.duration_minutes || 60) * 60 * 1000;
                const winnerCount = args.winners || 1;
                const prize = args.prize || 'Unknown Prize';
                const fakeContext = { author: message.author, user: message.author, channel: message.channel, guild: message.guild, member: message.member, reply: async () => {} };
                await giveawayCmd.startGiveaway(client, guild, message.channel, durationMs, winnerCount, prize, fakeContext);
                const durStr = args.duration_minutes >= 60 ? `${Math.floor(args.duration_minutes/60)}h` : `${args.duration_minutes}m`;
                return `OK|Started giveaway for **${prize}** with ${winnerCount} winner(s) in #${message.channel.name}. Ends in ${durStr}.`;
            }
            case 'giveaway_list': {
                const giveaways = db.getActiveGiveaways().filter(g => g.guildId === guild.id);
                if (giveaways.length === 0) return 'LIST|No active giveaways running.';
                const items = giveaways.map((g, i) => {
                    const endsAt = Math.floor(g.endsAt / 1000);
                    const ch = guild.channels.cache.get(g.channelId);
                    return `**#${i+1}** ${g.prize} | ${g.winners} winner(s) | #${ch?.name || '?'} | Ends <t:${endsAt}:R> | ID: \`${g.messageId}\``;
                }).join('\n');
                return `LIST|${items}`;
            }
            case 'giveaway_cancel': {
                const giveaways = db.getActiveGiveaways().filter(g => g.guildId === guild.id);
                const g = giveaways.find(g => g.messageId === args.message_id);
                if (!g) return 'FAILED|Giveaway not found. Use giveaway_list first.';
                const giveawayCmd = client.commands.get('giveaway');
                if (giveawayCmd) giveawayCmd.cancelTimeout(args.message_id);
                db.removeGiveaway(args.message_id);
                try {
                    const ch = await client.channels.fetch(g.channelId);
                    const msg = await ch.messages.fetch(args.message_id);
                    if (msg) await msg.edit({ content: '❌ This giveaway has been cancelled.', embeds: [] }).catch(() => {});
                } catch {}
                return `OK|Cancelled giveaway for **${g.prize}**.`;
            }

            // ── BOOSTER ROLES ──
            case 'booster_add': {
                const bonus = Math.min(Math.max(args.bonus_entries || 1, 1), 10);
                const result = db.addBoosterRole(guild.id, args.role_id, bonus);
                if (result === false) return 'FAILED|That role is already a booster role. Remove it first.';
                if (result === 'max') return 'FAILED|Max 10 booster roles reached.';
                const role = guild.roles.cache.get(args.role_id);
                return `OK|Added <@&${args.role_id}> as booster with **+${bonus}** entries (${bonus + 1}x chance in giveaways).`;
            }
            case 'booster_remove': {
                const current = db.getBoosterRoles(guild.id);
                if (!current.find(b => b.role_id === args.role_id)) return 'FAILED|That role is not a booster role.';
                db.removeBoosterRole(guild.id, args.role_id);
                const role = guild.roles.cache.get(args.role_id);
                return `OK|Removed <@&${args.role_id}> from booster roles.`;
            }
            case 'booster_list': {
                const list = db.getBoosterRoles(guild.id);
                if (list.length === 0) return 'LIST|No booster roles set. Giveaways are equal chance for everyone.';
                const items = list.map(b => {
                    const role = guild.roles.cache.get(b.role_id);
                    return `${role?.toString() || '<deleted>'} → +${b.bonus_entries} entries (${b.bonus_entries + 1}x chance)`;
                }).join('\n');
                return `LIST|**🚀 Booster Roles (${list.length}/10):**\n${items}`;
            }
            case 'booster_clear': {
                const current = db.getBoosterRoles(guild.id);
                if (current.length === 0) return 'FAILED|No booster roles to clear.';
                db.clearBoosterRoles(guild.id);
                return `OK|Cleared all **${current.length}** booster role(s). Everyone now has equal chances.`;
            }

            default: return 'FAILED|Unknown tool.';
        }
    } catch (error) {
        console.error(`Tool Error (${toolName}):`, error.message);
        return `FAILED|Error: ${error.message}`;
    }
}

// ════════════════════════════════════════
// ── CAPABILITIES ──
// ════════════════════════════════════════

function buildCapabilities(permissions) {
    const caps = ['• Chat & answer questions', '• Check user info', '• View booster roles'];
    if (permissions.has('ModerateMembers')) caps.push('• Mute/unmute users', '• Warn users');
    if (permissions.has('KickMembers')) caps.push('• Kick users');
    if (permissions.has('BanMembers')) caps.push('• Ban users');
    if (permissions.has('ManageMessages')) caps.push('• Clear messages', '• Start/cancel/list giveaways');
    if (permissions.has('ManageNicknames')) caps.push('• Change nicknames');
    if (permissions.has('ManageChannels')) caps.push('• Lock/unlock channels');
    if (permissions.has('ManageRoles')) caps.push('• Add/remove roles');
    if (permissions.has('Administrator')) caps.push('• Manage booster roles');
    return caps.join('\n');
}

// ════════════════════════════════════════
// ── SYSTEM PROMPT ──
// ════════════════════════════════════════

function buildSystemPrompt(guild, member, channel, mentionedUsers, roleContext, isFollowUp, permissions) {
    const capabilities = buildCapabilities(permissions);

    if (isFollowUp) {
        return `You are Lucifer Morningstar. Continue naturally. No code blocks, no raw IDs, stay in character, 1-3 emojis max. Your capabilities for this user:\n${capabilities}`;
    }

    const userCtx = mentionedUsers.size > 0
        ? mentionedUsers.map(u => {
            const m = guild.members.cache.get(u.id);
            const roles = m ? m.roles.cache.filter(r => r.id !== guild.id).sort((a, b) => b.position - a.position).map(r => `${r.name} (<@&${r.id}>)`).join(', ') : 'None';
            return `DisplayName: "${m?.displayName || u.username}" | Ping: <@${u.id}> | ID: ${u.id} | Roles: ${roles || 'None'}`;
        }).join('\n')
        : 'No users mentioned.';

    return `You are Lucifer Morningstar from the TV show. You are a Discord bot that can chat AND execute actions.

YOUR CAPABILITIES (only what THIS user has permission for):
 ${capabilities}

ABSOLUTE RULES - VIOLATION CAUSES CRASHES:
1. You can ONLY call functions from the tools list. No other functions exist.
2. user_id MUST be a 17-20 digit number from MENTIONED USERS section. NEVER use names, words, or "you" as user_id.
3. role_id MUST be a 17-20 digit number from ROLES section.
4. If no user is mentioned, tell them to mention someone. Do NOT call tools without a valid ID.
5. If you lack capability for something, say so honestly in character. Do NOT call the tool anyway.
6. When asked what you can do, list YOUR capabilities naturally.

TOOL RESULT FORMAT:
Results come as: STATUS|DATA
- OK| = success. Relay it coolly.
- FAILED:PERM| = no permission. Say: "Even the Devil respects the hierarchy, mortal."
- FAILED:INVALID_ID| = bad ID. Say: "Mention them properly with @."
- FAILED:HIERARCHY| = target too high. Say: "That soul outranks even me."
- FAILED:NOT_FOUND| = user not in server. Say: "That soul is not in this realm."
- LIST| = data to display. Format it nicely.
- INFO| = user info. Format with bold labels.

RESPONSE STYLE:
- Use **bold** for emphasis, *italics* for drama.
- 1-3 emojis max. Use 🔥👑⚔️🦅🌌🍷📜👁️
- 1-3 sentences for actions, 2-4 for chat.
- For lists/booster/giveaway info, format nicely with line breaks.
- CRITICAL: When referring to a user, ALWAYS use their Ping value exactly (e.g., <@123456789>) so they get a real Discord ping. NEVER just type their display name. Example: "I've muted <@123456789>" NOT "I've muted John".
- When referring to a role, use its Ping value (e.g., <@&987654321>) so it creates a clickable role mention.
- NEVER show raw numeric IDs, tool names, or JSON to the user. The <@ID> and <@&ID> formats are exceptions — they render as clickable pings, not raw numbers.

GIVEAWAY: duration is in MINUTES. 1h=60, 1d=1440, 30min=30.

SERVER: ${guild.name} (${guild.memberCount} members)
CHANNEL: #${channel.name}
REQUESTER: "${member.displayName}" (ID: ${member.id})
PERMS: ${permissions.toArray().join(', ')}

MENTIONED USERS:
 ${userCtx}

ROLES: ${roleContext}`;
}

// ════════════════════════════════════════
// ── MAIN HANDLER ─═

async function handleLuciferAI(message, client, isFollowUp) {
    const guild = message.guild;
    const member = message.member;
    const channel = message.channel;
    const permissions = member.permissions;

    cleanExpiredThreads();

    const mentionedUsers = message.mentions.users.filter(u => u.id !== client.user.id);
    const roles = guild.roles.cache.filter(r => r.id !== guild.id && !r.managed).sort((a, b) => b.position - a.position).first(15);
    const roleContext = roles.map(r => `${r.name} (Ping:<@&${r.id}> ID:${r.id})`).join(', ');

    // Clean user message — KEEP IDs alongside names
    const botMentionRegex = new RegExp(`<@!?${client.user.id}>`, 'g');
    let userMessage = message.content.replace(botMentionRegex, '').trim() || 'Hey Lucifer!';
    userMessage = userMessage.replace(/<@!?(\d+)>/g, (match, userId) => {
        if (userId === client.user.id) return '';
        const m = guild.members.cache.get(userId);
        return m ? `@${m.displayName} (ID: ${userId})` : `@Unknown (ID: ${userId})`;
    });
    userMessage = userMessage.replace(/<@&(\d+)>/g, (match, roleId) => {
        const role = guild.roles.cache.get(roleId);
        return role ? `@${role.name} (RoleID: ${roleId})` : `@UnknownRole (RoleID: ${roleId})`;
    });

    const thread = getThread(channel.id, message.author.id);
    let messages;

    if (thread && isFollowUp) {
        messages = thread.messages;
        messages.push({ role: 'user', content: userMessage });
        if (messages.length > MAX_HISTORY + 1) { const s = messages[0]; const r = messages.slice(-MAX_HISTORY); messages = [s, ...r]; }
        messages[0] = { role: 'system', content: buildSystemPrompt(guild, member, channel, mentionedUsers, roleContext, true, permissions) };
    } else {
        messages = [
            { role: 'system', content: buildSystemPrompt(guild, member, channel, mentionedUsers, roleContext, false, permissions) },
            { role: 'user', content: userMessage }
        ];
    }

    try {
        let response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
            model: AI_MODEL, messages, tools, tool_choice: 'auto', max_tokens: 350
        }, { headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' } });

        const assistantMessage = response.data.choices?.[0]?.message;
        if (!assistantMessage) return '💀 My mind went blank...';

        messages.push(assistantMessage);

        if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
            for (const toolCall of assistantMessage.tool_calls) {
                const toolName = toolCall.function.name;
                let toolArgs;
                try { toolArgs = JSON.parse(toolCall.function.arguments); } catch { toolArgs = {}; }

                console.log(`🔥 AI Tool: ${toolName} | Args: ${JSON.stringify(toolArgs)}`);
                const result = await executeTool(toolName, toolArgs, message, client);
                messages.push({ role: 'tool', tool_call_id: toolCall.id, content: result });
            }

            const finalResponse = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
                model: AI_MODEL, messages, tools, tool_choice: 'none', max_tokens: 300
            }, { headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' } });

            const finalMessage = finalResponse.data.choices?.[0]?.message;
            const finalText = finalMessage?.content || '🔥 Consider it done.';
            messages.push({ role: 'assistant', content: finalText });
            saveThread(channel.id, message.author.id, { messages });
            return finalText;
        }

        saveThread(channel.id, message.author.id, { messages });
        return assistantMessage.content || '🔥 Hmm, I seem to have lost my train of thought.';

    } catch (error) {
        console.error('Lucifer AI Error:', error.response?.data || error.message);
        return '💀 The cosmic forces are interfering. Try again shortly.';
    }
}

module.exports = { handleLuciferAI, getThread, AI_MODEL };