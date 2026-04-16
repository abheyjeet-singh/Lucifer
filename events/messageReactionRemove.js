const { getReactionRoles } = require('../database/db');

module.exports = {
    once: false,
    async execute(reaction, user, client) {
        if (user.bot) return;
        if (!reaction.message.guild) return;

        const rrList = getReactionRoles(reaction.message.id);
        if (rrList.length === 0) return;

        const rr = rrList.find(r => r.emoji === reaction.emoji.name || r.emoji === reaction.emoji.toString());
        if (!rr) return;

        const member = await reaction.message.guild.members.fetch(user.id).catch(() => null);
        const role = reaction.message.guild.roles.cache.get(rr.role_id);
        if (member && role) try { await member.roles.remove(role); } catch {}
    },
};
