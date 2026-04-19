const { SlashCommandBuilder, ChannelType, AttachmentBuilder } = require('discord.js');
const { createEmbed, THEME } = require('../../utils/embeds');
const { buildServerDossierCard } = require('../../utils/canvasBuilder');

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
        const owner = await guild.fetchOwner().catch(() => ({ user: { tag: 'Unknown', id: 'Unknown' } }));
        
        const totalMembers = guild.memberCount;
        const cachedMembers = guild.members.cache;
        const humans = cachedMembers.filter(m => !m.user.bot).size.toString();
        const bots = cachedMembers.filter(m => m.user.bot).size.toString();

        const channels = guild.channels.cache;
        const textCh = channels.filter(c => c.type === ChannelType.GuildText).size.toString();
        const voiceCh = channels.filter(c => c.type === ChannelType.GuildVoice).size.toString();
        const stageCh = channels.filter(c => c.type === ChannelType.GuildStageVoice).size.toString();
        const categories = channels.filter(c => c.type === ChannelType.GuildCategory).size.toString();
        const forumCh = channels.filter(c => c.type === ChannelType.GuildForum).size.toString();
        const newsCh = channels.filter(c => c.type === ChannelType.GuildAnnouncement).size.toString();

        const boostLevel = guild.premiumTier > 0 ? `Level ${guild.premiumTier}` : 'None';
        const boosts = (guild.premiumSubscriptionCount || 0).toString();

        const verifLevels = ['None', 'Low', 'Medium', 'High', 'Highest'];

        const data = {
            created: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`,
            owner: owner.user ? owner.user.tag : 'Unknown',
            ownerId: owner.user ? owner.user.id : 'Unknown',
            verification: verifLevels[guild.verificationLevel] || 'Unknown',
            boostLevel: boostLevel,
            boosts: boosts,
            totalMembers: totalMembers,
            humans: humans,
            bots: bots,
            totalChannels: channels.size.toString(),
            textCh: textCh,
            voiceCh: voiceCh,
            stageCh: stageCh,
            categories: categories,
            forumCh: forumCh,
            newsCh: newsCh,
            roles: guild.roles.cache.size.toString(),
            emojis: guild.emojis.cache.size.toString(),
            stickers: guild.stickers.cache.size.toString()
        };

        try {
            const imageBuffer = await buildServerDossierCard(guild, data);
            const attachment = new AttachmentBuilder(imageBuffer, { name: 'serverinfo.png' });
            return context.reply({ files: [attachment] });
        } catch (e) {
            console.error('Serverinfo Canvas Error:', e);
            return context.reply({ embeds: [createEmbed({ context: guild, title: `🏰 ${guild.name}`, color: THEME.celestial })] });
        }
    },
};