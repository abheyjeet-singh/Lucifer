const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { createEmbed, THEME } = require('../../utils/embeds');
const { getWarningCount } = require('../../database/db');
const { buildUserDossierCard } = require('../../utils/canvasBuilder');

module.exports = {
    name: 'userinfo',
    description: 'Inspect a soul\'s presence in detail',
    category: 'utility',
    usage: 'userinfo [@user]',
    permissions: [],
    data: new SlashCommandBuilder()
        .setName('userinfo')
        .setDescription("Inspect a soul's presence in detail")
        .addUserOption(o => o.setName('user').setDescription('The soul to inspect')),

    async execute(message, args, client) {
        const target = message.mentions.members.first() || message.member;
        return this.run(client, target, message);
    },

    async interact(interaction, client) {
        const target = interaction.options.getMember('user') || interaction.member;
        return this.run(client, target, interaction);
    },

    async run(client, target, context) {
        const user = await target.user.fetch(true);
        const warnings = getWarningCount(context.guild.id, target.id);

        const badgeMap = {
            Staff: '🛡️', Partner: '🤝', HypeSquad: '🏠', BugHunterLevel1: '🐛',
            HypeSquadOnlineHouse1: '🏰', HypeSquadOnlineHouse2: '🧠', HypeSquadOnlineHouse3: '⚖️',
            PremiumEarlySupportor: '💎', BugHunterLevel2: '🐛', VerifiedDeveloper: '🛠️', 
            CertifiedModerator: '🛡️', ActiveDeveloper: '💻'
        };
        const badges = user.flags?.toArray().map(f => badgeMap[f] || '').join(' ') || 'None';

        // Key Permissions
        const keyPerms = ['Administrator', 'ManageGuild', 'ManageChannels', 'ManageRoles', 'ManageMessages', 'BanMembers', 'KickMembers', 'MentionEveryone'];
        const perms = target.permissions.toArray()
            .filter(p => keyPerms.includes(p))
            .map(p => `\`${p}\``)
            .join(', ') || 'None';

        // Roles
        const roles = target.roles.cache
            .filter(r => r.id !== context.guild.id)
            .sort((a, b) => b.position - a.position)
            .map(r => ({ name: r.name, hexColor: r.hexColor || '#99AAB5' }));

        const data = {
            created: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`,
            joined: `<t:${Math.floor(target.joinedTimestamp / 1000)}:R>`,
            boosting: target.premiumSince ? `Since <t:${Math.floor(target.premiumSinceTimestamp / 1000)}:R>` : 'Not boosting',
            badges: badges,
            warnings: warnings,
            permissions: perms,
            roles: roles.slice(0, 15), // Limit to 15 roles to prevent canvas overflow
            roleCount: roles.length
        };

        try {
            const imageBuffer = await buildUserDossierCard(target, data);
            const attachment = new AttachmentBuilder(imageBuffer, { name: 'userinfo.png' });
            return context.reply({ files: [attachment] });
        } catch (e) {
            console.error('Userinfo Canvas Error:', e);
            return context.reply({ embeds: [createEmbed({ context: guild, title: `👤 ${user.tag}`, thumbnail: user.displayAvatarURL({ size: 512 }), color: THEME.primary })] });
        }
    },
};