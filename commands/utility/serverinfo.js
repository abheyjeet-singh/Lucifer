const { SlashCommandBuilder, ChannelType } = require('discord.js');
const { createEmbed, THEME } = require('../../utils/embeds');

module.exports = {
    name: 'serverinfo',
    description: 'Inspect the grand details of this realm',
    category: 'utility',
    usage: 'serverinfo',
    permissions: [],
    data: new SlashCommandBuilder()
        .setName('serverinfo')
        .setDescription('Inspect the grand details of this realm'),

    async execute(message, args, client) {
        return this.run(client, message.guild, message);
    },

    async interact(interaction, client) {
        return this.run(client, interaction.guild, interaction);
    },

    async run(client, guild, context) {
        const owner = await guild.fetchOwner();
        
        const totalMembers = guild.memberCount;
        const cachedMembers = guild.members.cache;
        const humans = cachedMembers.filter(m => !m.user.bot).size;
        const bots = cachedMembers.filter(m => m.user.bot).size;

        const channels = guild.channels.cache;
        const textChannels = channels.filter(c => c.type === ChannelType.GuildText).size;
        const voiceChannels = channels.filter(c => c.type === ChannelType.GuildVoice).size;
        const stageChannels = channels.filter(c => c.type === ChannelType.GuildStageVoice).size;
        const categories = channels.filter(c => c.type === ChannelType.GuildCategory).size;
        const forumChannels = channels.filter(c => c.type === ChannelType.GuildForum).size;
        const announcementChannels = channels.filter(c => c.type === ChannelType.GuildAnnouncement).size;
        const threads = channels.filter(c => c.isThread()).size;

        const roles = guild.roles.cache.size;
        const emojis = guild.emojis.cache.size;
        const stickers = guild.stickers.cache.size;

        // FIX: premiumTier is now an integer (0, 1, 2, 3), not a string
        const boostLevel = guild.premiumTier > 0 ? `Level ${guild.premiumTier}` : 'None';
        const boosts = guild.premiumSubscriptionCount || 0;

        const verifLevels = [
            'None',
            'Low - Must have a verified email',
            'Medium - Registered for >5m',
            'High - Member for >10m',
            'Highest - Verified phone number'
        ];

        return context.reply({ embeds: [createEmbed({
            title: `🏰 ${guild.name}`,
            thumbnail: guild.iconURL({ size: 512, dynamic: true }),
            image: guild.bannerURL({ size: 1024 }),
            fields: [
                { name: '👑 Ownership', value: `${owner.user.tag}\n\`${owner.id}\``, inline: true },
                { name: '🆔 Realm ID', value: `\`${guild.id}\``, inline: true },
                { name: '📅 Created', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`, inline: true },
                
                { name: `👥 Population [${totalMembers}]`, value: `🧑 Humans: **${humans}**\n🤖 Bots: **${bots}**`, inline: true },
                { 
                    name: `💬 Channels [${channels.size}]`, 
                    value: `📝 Text: **${textChannels}**\n🔊 Voice: **${voiceChannels}**\n📢 Announcement: **${announcementChannels}**\n📋 Forums: **${forumChannels}**\n🎤 Stage: **${stageChannels}**\n🧵 Threads: **${threads}**\n📂 Categories: **${categories}**`, 
                    inline: true 
                },
                { name: '✨ Atmosphere', value: `🎭 Roles: **${roles}**\n😄 Emojis: **${emojis}**\n🖼️ Stickers: **${stickers}**`, inline: true },

                { name: '🛡️ Verification', value: verifLevels[guild.verificationLevel] || 'Unknown', inline: true },
                { name: '💎 Nitro Boosts', value: `Level: **${boostLevel}**\nBoosters: **${boosts}**`, inline: true },
            ],
            color: THEME.celestial,
        })] });
    },
};
