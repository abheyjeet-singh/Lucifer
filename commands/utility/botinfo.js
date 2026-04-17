const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, THEME } = require('../../utils/embeds');
const package = require('../../package.json');

function formatUptime(ms) {
    const d = Math.floor(ms / 86400000);
    const h = Math.floor(ms % 86400000 / 3600000);
    const m = Math.floor(ms % 3600000 / 60000);
    const s = Math.floor(ms % 60000 / 1000);
    return `${d}d ${h}h ${m}m ${s}s`;
}

module.exports = {
    name: 'botinfo',
    description: 'View Lucifer\'s current status and stats',
    aliases: ['stats', 'uptime'],
    data: new SlashCommandBuilder()
        .setName('botinfo')
        .setDescription('View Lucifer\'s current status and stats'),

    async execute(message, args, client) {
        return this.sendInfo(client, message);
    },

    async interact(interaction, client) {
        return this.sendInfo(client, interaction);
    },

    async sendInfo(client, context) {
        const totalUsers = client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);
        
        await client.user.fetch(true).catch(() => {});
        const bannerURL = client.user.bannerURL({ size: 1024 }) || null;

        return context.reply({ embeds: [createEmbed({
            title: `🔥 ${client.user.username} | The Devil's Stats`,
            description: `👑 **The Lord of Hell has been ruling since:**\n<t:${Math.floor(client.user.createdTimestamp / 1000)}:R>`,
            fields: [
                { name: '⏱️ Uptime', value: `\`${formatUptime(client.uptime)}\``, inline: true },
                { name: '📶 API Ping', value: `\`${client.ws.ping}ms\``, inline: true },
                { name: '🐍 Node.js', value: `\`${process.version}\``, inline: true },
                { name: '🏰 Realms', value: `\`${client.guilds.cache.size}\``, inline: true },
                { name: '👥 Souls', value: `\`${totalUsers.toLocaleString()}\``, inline: true },
                { name: '📚 Commands', value: `\`${client.commands.size}\``, inline: true }
            ],
            color: THEME.primary,
            image: bannerURL,
            footer: { text: `v${package.version} | Lucifer Bot` }
        })] });
    }
};