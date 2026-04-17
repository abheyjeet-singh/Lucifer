const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, THEME } = require('../../utils/embeds');

module.exports = {
    name: 'servers',
    description: 'View all servers the bot is in (Bot Owner Only)',
    data: new SlashCommandBuilder()
        .setName('servers')
        .setDescription('View all servers the bot is in (Bot Owner Only)'),

    async execute(message, args, client) {
        if (message.author.id !== process.env.BOT_OWNER_ID) return;
        return this.sendList(client, message);
    },

    async interact(interaction, client) {
        if (interaction.user.id !== process.env.BOT_OWNER_ID) {
            return interaction.reply({ embeds: [createEmbed({ description: '🚫 Only the Bot Owner can use this.', color: THEME.error })], flags: 64 });
        }
        return this.sendList(client, interaction);
    },

    async sendList(client, context) {
        const guilds = client.guilds.cache.sort((a, b) => b.memberCount - a.memberCount);
        
        const items = guilds.map(g => {
            return `**${g.name}** — 👥 ${g.memberCount.toLocaleString()} members | ID: \`${g.id}\``;
        }).join('\n');

        // Discord limits embed descriptions to 4096 characters. If it's too long, we trim it.
        const desc = items.length > 4096 ? items.substring(0, 4090) + '...' : items;

        return context.reply({ embeds: [createEmbed({
            title: `🏰 Connected Realms (${guilds.size})`,
            description: desc,
            color: THEME.celestial
        })], flags: 64 }); // Ephemeral so only you see it
    }
};