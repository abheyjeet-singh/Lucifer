const { isHardbanned } = require('../database/db');
const logger = require('../utils/logger');

module.exports = {
    once: false,
    async execute(ban, client) {
        const { guild, user } = ban;

        // Check if the user is hardbanned
        if (isHardbanned(guild.id, user.id)) {
            try {
                // Re-ban immediately
                await guild.members.ban(user.id, { reason: '🔥 Lucifer: Eternal damnation enforced. Use /hardunban to lift.' });
                logger.info(`Enforced hardban on ${user.tag} in ${guild.name}`);
                
                // Optionally send a log to the mod log channel
                const { modLog } = require('../utils/embeds');
                const { createEmbed, THEME } = require('../utils/embeds');
                modLog(client, guild, createEmbed({
                    title: '🔥 Eternal Damnation Enforced',
                    description: `**${user.tag}** (${user.id}) was manually unbanned, but they are eternally damned. They have been re-banished to the underworld.`,
                    color: THEME.secondary,
                }));
            } catch (error) {
                logger.error(`Failed to enforce hardban on ${user.tag}: ${error.message}`);
            }
        }
    },
};
