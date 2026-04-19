const { createEmbed, THEME, modLog } = require('../utils/embeds');

module.exports = {
    once: false,
    async execute(invite, client) {
        // Ignore vanity URLs or widget links
        if (!invite.inviter) return; 

        const maxUses = invite.maxUses === 0 ? 'Unlimited' : invite.maxUses;
        const expiresAt = invite.maxAge === 0 ? 'Never' : `<t:${Math.floor((Date.now() + invite.maxAge * 1000) / 1000)}:R>`;

        await modLog(client, invite.guild, createEmbed({
            title: '🪝 Invite Created',
            description: `**Code:** https://discord.gg/${invite.code}\n**Channel:** ${invite.channel}\n**Created By:** ${invite.inviter} (${invite.inviter.id})\n**Max Uses:** ${maxUses}\n**Expires:** ${expiresAt}`,
            color: THEME.celestial,
        }));

        // ── Invite Event: Track new invites into snapshot ──
        try {
            const inviteEventCmd = require('../commands/utility/inviteevent');
            inviteEventCmd.handleInviteCreate(invite);
        } catch (e) {
            console.error('Invite Event inviteCreate Error:', e);
        }
    },
};