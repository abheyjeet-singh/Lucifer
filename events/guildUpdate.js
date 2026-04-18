const { createEmbed, THEME, modLog } = require('../utils/embeds');

module.exports = {
    once: false,
    async execute(oldGuild, newGuild, client) {
        let logTitle = '';
        let logDesc = '';
        let logColor = THEME.celestial;

        // Check Name Change
        if (oldGuild.name !== newGuild.name) {
            logTitle = '🏰 Server Name Changed';
            logDesc = `**Before:** ${oldGuild.name}\n**After:** ${newGuild.name}`;
        }
        // Check Icon Change
        else if (oldGuild.iconURL({ size: 256 }) !== newGuild.iconURL({ size: 256 })) {
            logTitle = '🖼️ Server Icon Changed';
            logDesc = `Check the audit log for the new icon.`;
        }
        // Check Vanity URL Change
        else if (oldGuild.vanityURLCode !== newGuild.vanityURLCode) {
            logTitle = '🔗 Vanity URL Changed';
            logDesc = `**Before:** https://discord.gg/${oldGuild.vanityURLCode || 'None'}\n**After:** https://discord.gg/${newGuild.vanityURLCode || 'None'}`;
            logColor = THEME.error; // High alert, hackers love stealing vanity URLs
        }
        // If it was a change we don't specifically track above
        else {
            return; 
        }

        // Fetch WHO did it
        let updater = 'Unknown';
        try {
            const auditLogs = await newGuild.fetchAuditLogs({ type: 1, limit: 1 }); // Type 1 = GUILD_UPDATE
            const log = auditLogs.entries.first();
            if (log && Date.now() - log.createdTimestamp < 10000) {
                updater = `${log.executor} (${log.executor.id})`;
            }
        } catch {}

        logDesc += `\n**Updated By:** ${updater}`;

        await modLog(client, newGuild, createEmbed({
            title: logTitle,
            description: logDesc,
            color: logColor,
        }));
    },
};