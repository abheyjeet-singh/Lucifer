const { createEmbed, THEME, modLog } = require('../utils/embeds');

module.exports = {
    once: false,
    async execute(invite, client) {
        // ── Invite Event: Credit any uncounted uses and clean snapshot ──
        try {
            const inviteEventCmd = require('../commands/utility/inviteevent');
            inviteEventCmd.handleInviteDelete(invite);
        } catch (e) {
            console.error('Invite Event inviteDelete Error:', e);
        }

        // ── Log Invite Deletion ──
        if (!invite.inviter) return;

        await modLog(client, invite.guild, createEmbed({
            title: '🪝 Invite Deleted',
            description: `**Code:** https://discord.gg/${invite.code}\n**Channel:** ${invite.channel || 'Unknown'}\n**Created By:** ${invite.inviter} (${invite.inviter.id})\n**Uses at Deletion:** ${invite.uses}`,
            color: THEME.accent,
        }));
    },
};