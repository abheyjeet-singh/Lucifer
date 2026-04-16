const axios = require('axios');

const AI_MODEL = 'llama-3.3-70b-versatile';
const THREAD_EXPIRY_MS = 5 * 60 * 1000;
const MAX_HISTORY = 10;

const threads = new Map();

function getThread(channelId, userId) {
    const key = `${channelId}-${userId}`;
    const thread = threads.get(key);
    if (!thread) return null;
    if (Date.now() - thread.lastActivity > THREAD_EXPIRY_MS) {
        threads.delete(key);
        return null;
    }
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

const tools = [
    {
        type: 'function',
        function: {
            name: 'mute_user',
            description: 'Timeout/mute a user in the server for a specified duration',
            parameters: {
                type: 'object',
                properties: {
                    user_id: { type: 'string', description: 'The Discord user ID to mute' },
                    duration_minutes: { type: 'number', description: 'Duration in minutes (default 5, max 40320)' },
                    reason: { type: 'string', description: 'Reason for muting' }
                },
                required: ['user_id']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'kick_user',
            description: 'Kick a user from the server',
            parameters: {
                type: 'object',
                properties: {
                    user_id: { type: 'string', description: 'The Discord user ID to kick' },
                    reason: { type: 'string', description: 'Reason for kicking' }
                },
                required: ['user_id']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'ban_user',
            description: 'Ban a user from the server',
            parameters: {
                type: 'object',
                properties: {
                    user_id: { type: 'string', description: 'The Discord user ID to ban' },
                    reason: { type: 'string', description: 'Reason for banning' },
                    delete_message_days: { type: 'number', description: 'Days of messages to delete (0-7, default 0)' }
                },
                required: ['user_id']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'unmute_user',
            description: 'Remove timeout/mute from a user',
            parameters: {
                type: 'object',
                properties: {
                    user_id: { type: 'string', description: 'The Discord user ID to unmute' }
                },
                required: ['user_id']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'clear_messages',
            description: 'Delete a number of recent messages in the channel',
            parameters: {
                type: 'object',
                properties: {
                    amount: { type: 'number', description: 'Number of messages to delete (1-100)' }
                },
                required: ['amount']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'change_nickname',
            description: 'Change the nickname of a user',
            parameters: {
                type: 'object',
                properties: {
                    user_id: { type: 'string', description: 'The Discord user ID' },
                    nickname: { type: 'string', description: 'The new nickname' }
                },
                required: ['user_id', 'nickname']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'lock_channel',
            description: 'Lock the current channel so members cannot send messages',
            parameters: { type: 'object', properties: {} }
        }
    },
    {
        type: 'function',
        function: {
            name: 'unlock_channel',
            description: 'Unlock the current channel so members can send messages again',
            parameters: { type: 'object', properties: {} }
        }
    },
    {
        type: 'function',
        function: {
            name: 'add_role',
            description: 'Add a role to a user',
            parameters: {
                type: 'object',
                properties: {
                    user_id: { type: 'string', description: 'The Discord user ID' },
                    role_id: { type: 'string', description: 'The Discord role ID to add' }
                },
                required: ['user_id', 'role_id']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'remove_role',
            description: 'Remove a role from a user',
            parameters: {
                type: 'object',
                properties: {
                    user_id: { type: 'string', description: 'The Discord user ID' },
                    role_id: { type: 'string', description: 'The Discord role ID to remove' }
                },
                required: ['user_id', 'role_id']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'warn_user',
            description: 'Warn a user (adds a warning to their record)',
            parameters: {
                type: 'object',
                properties: {
                    user_id: { type: 'string', description: 'The Discord user ID to warn' },
                    reason: { type: 'string', description: 'Reason for the warning' }
                },
                required: ['user_id']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'check_user_info',
            description: 'Get information about a user in the server',
            parameters: {
                type: 'object',
                properties: {
                    user_id: { type: 'string', description: 'The Discord user ID to check' }
                },
                required: ['user_id']
            }
        }
    }
];

async function executeTool(toolName, args, message, client) {
    const guild = message.guild;
    const member = message.member;

    try {
        switch (toolName) {
            case 'mute_user': {
                if (!member.permissions.has('ModerateMembers')) return 'FAILED: Requester lacks permission.';
                const target = await guild.members.fetch(args.user_id).catch(() => null);
                if (!target) return 'FAILED: User not found.';
                if (!target.moderatable) return 'FAILED: Cannot mute - user too high.';
                const duration = Math.min(Math.max(args.duration_minutes || 5, 1), 40320);
                await target.timeout(duration * 60 * 1000, args.reason || 'Muted by Lucifer AI');
                return `SUCCESS: Muted ${target.displayName} for ${duration} minute(s). Reason: ${args.reason || 'Not specified'}`;
            }
            case 'kick_user': {
                if (!member.permissions.has('KickMembers')) return 'FAILED: Requester lacks permission.';
                const target = await guild.members.fetch(args.user_id).catch(() => null);
                if (!target) return 'FAILED: User not found.';
                if (!target.kickable) return 'FAILED: Cannot kick - user too high.';
                await target.kick(args.reason || 'Kicked by Lucifer AI');
                return `SUCCESS: Kicked ${target.displayName}. Reason: ${args.reason || 'Not specified'}`;
            }
            case 'ban_user': {
                if (!member.permissions.has('BanMembers')) return 'FAILED: Requester lacks permission.';
                const target = await guild.members.fetch(args.user_id).catch(() => null);
                if (!target) return 'FAILED: User not found.';
                if (!target.bannable) return 'FAILED: Cannot ban - user too high.';
                const deleteDays = Math.min(args.delete_message_days || 0, 7);
                await target.ban({ deleteMessageDays: deleteDays, reason: args.reason || 'Banned by Lucifer AI' });
                return `SUCCESS: Banned ${target.displayName}. Reason: ${args.reason || 'Not specified'}`;
            }
            case 'unmute_user': {
                if (!member.permissions.has('ModerateMembers')) return 'FAILED: Requester lacks permission.';
                const target = await guild.members.fetch(args.user_id).catch(() => null);
                if (!target) return 'FAILED: User not found.';
                await target.timeout(null, 'Unmuted by Lucifer AI');
                return `SUCCESS: Unmuted ${target.displayName}.`;
            }
            case 'clear_messages': {
                if (!member.permissions.has('ManageMessages')) return 'FAILED: Requester lacks permission.';
                const amount = Math.min(Math.max(args.amount || 1, 1), 100);
                const deleted = await message.channel.bulkDelete(amount, true);
                return `SUCCESS: Deleted ${deleted.size} messages.`;
            }
            case 'change_nickname': {
                if (!member.permissions.has('ManageNicknames')) return 'FAILED: Requester lacks permission.';
                const target = await guild.members.fetch(args.user_id).catch(() => null);
                if (!target) return 'FAILED: User not found.';
                await target.setNickname(args.nickname, 'Changed by Lucifer AI');
                return `SUCCESS: Changed ${target.displayName}'s nickname to "${args.nickname}".`;
            }
            case 'lock_channel': {
                if (!member.permissions.has('ManageChannels')) return 'FAILED: Requester lacks permission.';
                await message.channel.permissionOverwrites.edit(guild.id, { SendMessages: false });
                return `SUCCESS: Locked #${message.channel.name}.`;
            }
            case 'unlock_channel': {
                if (!member.permissions.has('ManageChannels')) return 'FAILED: Requester lacks permission.';
                await message.channel.permissionOverwrites.edit(guild.id, { SendMessages: null });
                return `SUCCESS: Unlocked #${message.channel.name}.`;
            }
            case 'add_role': {
                if (!member.permissions.has('ManageRoles')) return 'FAILED: Requester lacks permission.';
                const target = await guild.members.fetch(args.user_id).catch(() => null);
                if (!target) return 'FAILED: User not found.';
                const role = guild.roles.cache.get(args.role_id);
                if (!role) return 'FAILED: Role not found.';
                await target.roles.add(role, 'Added by Lucifer AI');
                return `SUCCESS: Added role ${role.name} to ${target.displayName}.`;
            }
            case 'remove_role': {
                if (!member.permissions.has('ManageRoles')) return 'FAILED: Requester lacks permission.';
                const target = await guild.members.fetch(args.user_id).catch(() => null);
                if (!target) return 'FAILED: User not found.';
                const role = guild.roles.cache.get(args.role_id);
                if (!role) return 'FAILED: Role not found.';
                await target.roles.remove(role, 'Removed by Lucifer AI');
                return `SUCCESS: Removed role ${role.name} from ${target.displayName}.`;
            }
            case 'warn_user': {
                if (!member.permissions.has('ModerateMembers')) return 'FAILED: Requester lacks permission.';
                const target = await guild.members.fetch(args.user_id).catch(() => null);
                if (!target) return 'FAILED: User not found.';
                const db = require('../database/db');
                db.addWarning(guild.id, args.user_id, client.user.id, args.reason || 'Warned by Lucifer AI');
                const totalWarnings = db.getWarningCount(guild.id, args.user_id);
                return `SUCCESS: Warned ${target.displayName}. Reason: ${args.reason || 'Not specified'}. Total warnings: ${totalWarnings}`;
            }
            case 'check_user_info': {
                const target = await guild.members.fetch(args.user_id).catch(() => null);
                if (!target) return 'FAILED: User not found.';
                const db = require('../database/db');
                const warnings = db.getWarningCount(guild.id, args.user_id);
                const roleNames = target.roles.cache.filter(r => r.id !== guild.id).sort((a, b) => b.position - a.position).map(r => r.name).join(', ') || 'None';
                return `USER_INFO: Name=${target.displayName} | Joined=<t:${Math.floor(target.joinedTimestamp / 1000)}:R> | Warnings=${warnings} | Roles=${roleNames}`;
            }
            default:
                return 'FAILED: Unknown tool.';
        }
    } catch (error) {
        console.error(`Tool Error (${toolName}):`, error.message);
        return `FAILED: Error - ${error.message}`;
    }
}

function buildSystemPrompt(guild, member, channel, mentionedUsers, roleContext, isFollowUp) {
    if (isFollowUp) {
        return `You are Lucifer Morningstar. Continue the conversation naturally. Same rules: no code blocks, no raw IDs, short responses, stay in character, 1-3 emojis max.`;
    }

    const userCtx = mentionedUsers.size > 0
        ? mentionedUsers.map(u => {
            const m = guild.members.cache.get(u.id);
            const roles = m ? m.roles.cache.filter(r => r.id !== guild.id).sort((a, b) => b.position - a.position).map(r => r.name).join(', ') : 'None';
            return `Name: ${m?.displayName || u.username}, ID: ${u.id}, Roles: ${roles || 'None'}`;
        }).join('\n')
        : 'No users mentioned.';

    return `You are Lucifer Morningstar from the TV show, a Discord bot that can chat AND execute moderation actions.

PERSONALITY: Witty, charming, arrogant, sophisticated. Reference Hell, Silver City, divine matters.

OUTPUT FORMAT (CRITICAL):
1. NEVER use code blocks.
2. NEVER show raw IDs or JSON.
3. Use **bold** for emphasis, *italics* for drama.
4. Use 1-3 emojis max per response.
5. Keep responses SHORT — 1-3 sentences for actions, 2-4 for chat.
6. For actions, confirm cleanly. Example: "⚔️ **Done.** Silenced for 10 minutes."
7. For user info, use bold labels: **Name:** John | **Roles:** Admin | **Warnings:** 2
8. If action FAILED, refuse in character: "Even the Devil respects the hierarchy, mortal."
9. For casual chat, respond naturally. No heavy formatting.
10. NEVER reveal tool names or internal mechanics.

AVAILABLE ACTIONS: Mute, kick, ban, unmute, warn, clear messages, change nickname, lock/unlock channel, add/remove roles, check user info.
DURATION: "10min"=10, "1 hour"=60, "for a day"=1440. Default: 5 minutes.
REASON: Everything after the action/user.

SERVER: ${guild.name} (${guild.memberCount} members)
CHANNEL: #${channel.name}
REQUESTER: ${member.displayName} (ID: ${member.id})
REQUESTER PERMS: ${member.permissions.toArray().join(', ')}

MENTIONED USERS:
 ${userCtx}

ROLES: ${roleContext}`;
}

async function handleLuciferAI(message, client, isFollowUp) {
    const guild = message.guild;
    const member = message.member;
    const channel = message.channel;

    cleanExpiredThreads();

    const mentionedUsers = message.mentions.users.filter(u => u.id !== client.user.id);
    const roles = guild.roles.cache.filter(r => r.id !== guild.id && !r.managed).sort((a, b) => b.position - a.position).first(15);
    const roleContext = roles.map(r => `${r.name} (ID:${r.id})`).join(', ');

    const botMentionRegex = new RegExp(`<@!?${client.user.id}>`, 'g');
    let userMessage = message.content.replace(botMentionRegex, '').trim() || 'Hey Lucifer!';
    userMessage = userMessage.replace(/<@!?(\d+)>/g, (match, userId) => {
        const m = guild.members.cache.get(userId);
        return m ? `@${m.displayName}` : '@Unknown';
    });

    const thread = getThread(channel.id, message.author.id);
    let messages;

    if (thread && isFollowUp) {
        messages = thread.messages;
        messages.push({ role: 'user', content: userMessage });
        if (messages.length > MAX_HISTORY + 1) {
            const systemMsg = messages[0];
            const recent = messages.slice(-MAX_HISTORY);
            messages = [systemMsg, ...recent];
        }
        messages[0] = { role: 'system', content: buildSystemPrompt(guild, member, channel, mentionedUsers, roleContext, true) };
    } else {
        messages = [
            { role: 'system', content: buildSystemPrompt(guild, member, channel, mentionedUsers, roleContext, false) },
            { role: 'user', content: userMessage }
        ];
    }

    try {
        let response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
            model: AI_MODEL,
            messages,
            tools,
            tool_choice: 'auto',
            max_tokens: 300
        }, {
            headers: {
                'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        const assistantMessage = response.data.choices?.[0]?.message;
        if (!assistantMessage) return '💀 My mind went blank... a rare occurrence.';

        messages.push(assistantMessage);

        if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
            for (const toolCall of assistantMessage.tool_calls) {
                const toolName = toolCall.function.name;
                let toolArgs;
                try { toolArgs = JSON.parse(toolCall.function.arguments); } catch { toolArgs = {}; }

                console.log(`🔥 AI Tool: ${toolName} | Args: ${JSON.stringify(toolArgs)}`);
                const result = await executeTool(toolName, toolArgs, message, client);

                messages.push({
                    role: 'tool',
                    tool_call_id: toolCall.id,
                    content: result
                });
            }

            const finalResponse = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
                model: AI_MODEL,
                messages,
                tools,
                tool_choice: 'none',
                max_tokens: 200
            }, {
                headers: {
                    'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            });

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