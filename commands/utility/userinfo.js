const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, THEME } = require('../../utils/embeds');

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

        // Roles
        const roles = target.roles.cache
            .filter(r => r.id !== context.guild.id)
            .sort((a, b) => b.position - a.position)
            .map(r => r.toString());
        const rolesDisplay = roles.length > 15 ? `${roles.slice(0, 15).join(', ')}... +${roles.length - 15} more` : roles.join(', ') || 'None';

        // Key Permissions
        const keyPerms = [
            'Administrator', 'ManageGuild', 'ManageChannels', 'ManageRoles',
            'ManageMessages', 'BanMembers', 'KickMembers', 'MentionEveryone'
        ];
        const perms = target.permissions.toArray()
            .filter(p => keyPerms.includes(p))
            .map(p => `\`${p}\``)
            .join(', ') || 'None';

        // Flags / Badges
        const badges = user.flags?.toArray().map(flag => {
            const badgeMap = {
                Staff: '🛡️ Discord Staff',
                Partner: '🤝 Partner',
                HypeSquad: '🏠 HypeSquad',
                BugHunterLevel1: '🐛 Bug Hunter',
                HypeSquadOnlineHouse1: '🏰 Bravery',
                HypeSquadOnlineHouse2: ' Brilliance',
                HypeSquadOnlineHouse3: '⚖️ Balance',
                PremiumEarlySupportor: '💎 Early Supporter',
                BugHunterLevel2: '🐛 Bug Hunter Lvl 2',
                VerifiedDeveloper: '🛠️ Verified Bot Dev',
                CertifiedModerator: '🛡️ Certified Moderator',
                ActiveDeveloper: '💻 Active Developer',
            };
            return badgeMap[flag] || flag;
        }).join(', ') || 'None';

        return context.reply({ embeds: [createEmbed({
            title: `👤 ${user.tag}`,
            thumbnail: user.displayAvatarURL({ size: 512, dynamic: true }),
            image: user.bannerURL({ size: 1024, dynamic: true }),
            fields: [
                { name: '🆔 Identity', value: `\`${user.id}\``, inline: true },
                { name: '📅 Account Born', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true },
                { name: '🏅 Badges', value: badges, inline: true },

                { name: '🚪 Realm Joined', value: `<t:${Math.floor(target.joinedTimestamp / 1000)}:R>`, inline: true },
                { name: '💎 Boosting Since', value: target.premiumSince ? `<t:${Math.floor(target.premiumSinceTimestamp / 1000)}:R>` : 'Not boosting', inline: true },
                { name: '🏆 Highest Role', value: target.roles.highest.toString(), inline: true },

                { name: `🎭 Roles [${roles.length}]`, value: rolesDisplay, inline: false },
                { name: '🔑 Key Permissions', value: perms, inline: false },
            ],
            color: target.displayHexColor === '#000000' ? THEME.primary : target.displayHexColor,
        })] });
    },
};
