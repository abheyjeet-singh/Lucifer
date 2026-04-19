const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { createEmbed, THEME } = require('../../utils/embeds');
const { buildBotInfoCard } = require('../../utils/canvasBuilder');
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
        
        // Fetch application to get the owner
        await client.application.fetch();
        const ownerTag = client.application.owner?.tag || client.application.owner?.name || 'Unknown';

        const data = {
            owner: ownerTag,
            uptime: formatUptime(client.uptime),
            ping: `${client.ws.ping}ms`,
            node: process.version,
            guilds: client.guilds.cache.size.toString(),
            users: totalUsers.toLocaleString(),
            commands: client.commands.size.toString(),
            version: package.version
        };

        try {
            const imageBuffer = await buildBotInfoCard(client, data);
            const attachment = new AttachmentBuilder(imageBuffer, { name: 'botinfo.png' });
            return context.reply({ files: [attachment] });
        } catch (e) {
            console.error('Botinfo Canvas Error:', e);
            // Fallback to embed if canvas fails
            return context.reply({ embeds: [createEmbed({
                title: `🔥 ${client.user.username} | The Devil's Stats`,
                description: `👑 **Owner:** ${ownerTag}\n\n⏱️ **Uptime:** \`${data.uptime}\`\n📶 **Ping:** \`${data.ping}\`\n🏰 **Realms:** \`${data.guilds}\`\n👥 **Souls:** \`${data.users}\`\n📚 **Commands:** \`${data.commands}\``,
                color: THEME.primary,
                footer: { text: `v${package.version} | Lucifer Bot` }
            })] });
        }
    }
};