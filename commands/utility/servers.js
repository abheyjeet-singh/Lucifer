const { createEmbed, THEME } = require('../../utils/embeds');

module.exports = {
    name: 'servers',
    description: 'View all servers the bot is in (Bot Owner Only)',

    async execute(message, args, client) {
        if (message.author.id !== process.env.BOT_OWNER_ID) return;

        const guilds = client.guilds.cache.sort((a, b) => b.memberCount - a.memberCount);
        
        const items = guilds.map(g => {
            return `**${g.name}** — 👥 ${g.memberCount.toLocaleString()} members | ID: \`${g.id}\``;
        }).join('\n');

        const desc = items.length > 4096 ? items.substring(0, 4090) + '...' : items;

        return message.reply({ embeds: [createEmbed({
            context: message,
            title: `🏰 Connected Realms (${guilds.size})`,
            description: desc,
            color: THEME.celestial
        })], flags: 64 });
    }
};