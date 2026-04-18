const { getReactionRoles } = require('../database/db');

module.exports = {
    once: false,
    async execute(reaction, user, client) {
        if (user.bot) return;
        if (!reaction.message.guild) return;

        try { 
            if (reaction.partial) await reaction.fetch(); 
            if (reaction.message.partial) await reaction.message.fetch(); 
        } catch { return; }

        // ── Reaction Roles ──
        const rrList = getReactionRoles(reaction.message.id);
        if (rrList.length > 0) {
            const rr = rrList.find(r => r.emoji === reaction.emoji.name || r.emoji === reaction.emoji.toString());
            if (rr) {
                const member = await reaction.message.guild.members.fetch(user.id).catch(() => null);
                const role = reaction.message.guild.roles.cache.get(rr.role_id);
                if (member && role) {
                    try { 
                        await member.roles.add(role); 
                    } catch (e) {
                        console.error(`Failed to add reaction role: ${e.message}`);
                    }
                }
            }
        }
    },
};