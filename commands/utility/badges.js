const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { createEmbed, THEME } = require('../../utils/embeds');
const { getUserBadges, getBadgeLeaderboard, addBadge, removeBadge, hasBadge, getUserEconomy, updateUserEconomy } = require('../../database/db');
const { buildBadgeLeaderboardCard } = require('../../utils/canvasBuilder');
const { BADGES } = require('../../utils/badges');
const { hasPermission } = require('../../utils/permissions');

function findBadge(query) {
    const q = query.toLowerCase();
    if (q === 'none' || q === 'off' || q === 'reset') return 'reset';
    
    // Check by exact ID
    if (BADGES[q]) return { id: q, ...BADGES[q] };
    
    // Check by name (ignoring case)
    const found = Object.entries(BADGES).find(([id, data]) => 
        data.name.toLowerCase() === q || data.name.toLowerCase().includes(q)
    );
    
    return found ? { id: found[0], ...found[1] } : null;
}

module.exports = {
    name: 'badges',
    description: 'View badges, leaderboard, or manage them (Admin)',
    aliases: ['badge'],
    data: new SlashCommandBuilder()
        .setName('badges')
        .setDescription('Achievement Badges')
        .addSubcommand(sc => sc.setName('view').setDescription('View your or someone\'s badges').addUserOption(o => o.setName('user').setDescription('Whose badges')))
        .addSubcommand(sc => sc.setName('list').setDescription('See all available badge IDs'))
        .addSubcommand(sc => sc.setName('leaderboard').setDescription('View the badge leaderboard'))
        .addSubcommand(sc => sc.setName('equip').setDescription('Equip a badge to show it next to your name!').addStringOption(o => o.setName('badge').setDescription('The badge name/ID to equip (or "none" to remove)').setRequired(true)))
        .addSubcommand(sc =>
            sc.setName('give')
              .setDescription('Give a badge to a user (Admin only)')
              .addUserOption(o => o.setName('user').setDescription('The user').setRequired(true))
              .addStringOption(o => o.setName('badge_id').setDescription('The badge ID (e.g., VIP, LEGEND)').setRequired(true)))
        .addSubcommand(sc =>
            sc.setName('take')
              .setDescription('Remove a badge from a user (Admin only)')
              .addUserOption(o => o.setName('user').setDescription('The user').setRequired(true))
              .addStringOption(o => o.setName('badge_id').setDescription('The badge ID to remove').setRequired(true))),

    async execute(message, args, client) {
        const sub = args[0]?.toLowerCase();
        
        if (sub === 'list') return this.list(message);
        if (sub === 'leaderboard') return this.leaderboard(client, message.guild, message);
        
        if (sub === 'equip') {
            const badgeQuery = args.slice(1).join(' ');
            if (!badgeQuery) return message.reply({ embeds: [createEmbed({ context: message, description: '⚠️ Specify a badge to equip, or type `none` to remove.', color: THEME.error })] });
            return this.equip(client, message.guild, message.member, badgeQuery, message);
        }

        if (sub === 'give') {
            const user = message.mentions.users.first();
            const badgeId = args[2]?.toUpperCase();
            if (!user || !badgeId) return message.reply({ embeds: [createEmbed({ context: message, description: '⚠️ Usage: `l!badges give @user <badge_id>`', color: THEME.error })] });
            return this.give(client, message.guild, message.member, user, badgeId, message);
        }
        
        if (sub === 'take') {
            const user = message.mentions.users.first();
            const badgeId = args[2]?.toUpperCase();
            if (!user || !badgeId) return message.reply({ embeds: [createEmbed({ context: message, description: '⚠️ Usage: `l!badges take @user <badge_id>`', color: THEME.error })] });
            return this.take(client, message.guild, message.member, user, badgeId, message);
        }

        // Default to view
        const target = message.mentions.users.first() || message.author;
        return this.view(client, message.guild, target, message);
    },

    async interact(interaction, client) {
        const sub = interaction.options.getSubcommand();
        if (sub === 'list') return this.list(interaction);
        if (sub === 'leaderboard') return this.leaderboard(client, interaction.guild, interaction);
        if (sub === 'equip') return this.equip(client, interaction.guild, interaction.member, interaction.options.getString('badge'), interaction);
        if (sub === 'give') return this.give(client, interaction.guild, interaction.member, interaction.options.getUser('user'), interaction.options.getString('badge_id').toUpperCase(), interaction);
        if (sub === 'take') return this.take(client, interaction.guild, interaction.member, interaction.options.getUser('user'), interaction.options.getString('badge_id').toUpperCase(), interaction);
        
        const target = interaction.options.getUser('user') || interaction.user;
        return this.view(client, interaction.guild, target, interaction);
    },

    // ── VIEW BADGES ──
    async view(client, guild, target, context) {
        const userBadges = getUserBadges(guild.id, target.id);
        const eco = getUserEconomy(guild.id, target.id);
        
        if (userBadges.length === 0) {
            return context.reply({ embeds: [createEmbed({ context: context, description: `${target} has no badges yet. Start earning!`, color: THEME.dark })] });
        }

        const badgeString = userBadges.map(b => {
            const info = BADGES[b.badge_id];
            const isEquipped = eco.profile_badge === b.badge_id;
            const nameStr = info ? `${info.emoji} **${info.name}**` : `❓ **${b.badge_id}**`;
            const descStr = info ? `— *${info.desc}*` : '';
            return `${isEquipped ? '✅ ' : '• '}${nameStr} ${descStr} ${isEquipped ? '**(Equipped)**' : ''}`;
        }).join('\n');

        const isSelf = target.id === (context.user?.id || context.author?.id);

        return context.reply({ embeds: [createEmbed({
            context: context,
            title: `🏅 ${target.username}'s Badges (${userBadges.length})`,
            description: `${isSelf ? 'Use `/badges equip <name>` to wear one!\n\n' : ''}${badgeString}`,
            color: THEME.celestial
        })] });
    },

    // ── LIST BADGES ──
    async list(context) {
        const badgeList = Object.values(BADGES).map(b => `${b.emoji} \`${b.id}\` — **${b.name}**: *${b.desc}*`).join('\n');
        return context.reply({ embeds: [createEmbed({
            context: context,
            title: '🏅 Available Badges',
            description: badgeList + '\n\n*Admins can give any ID using `l!badges give @user <ID>`*',
            color: THEME.primary
        })] });
    },

    // ── LEADERBOARD ──
    async leaderboard(client, guild, context) {
        const lbData = await getBadgeLeaderboard(guild.id, 10);
        if (!lbData.length) return context.reply({ embeds: [createEmbed({ context: context, description: 'No one has badges yet!', color: THEME.dark })] });

        try {
            const imageBuffer = await buildBadgeLeaderboardCard(client, guild, lbData);
            const attachment = new AttachmentBuilder(imageBuffer, { name: 'badge-lb.png' });
            return context.reply({ files: [attachment] });
        } catch (e) {
            console.error(e);
            return context.reply({ embeds: [createEmbed({ context: context, description: 'Failed to generate leaderboard.', color: THEME.error })] });
        }
    },

    // ── EQUIP BADGE ──
    async equip(client, guild, member, query, context) {
        const eco = getUserEconomy(guild.id, member.id);
        const badge = findBadge(query);

        // ── Reset / Unequip ──
        if (badge === 'reset') {
            const oldBadgeId = eco.profile_badge;
            eco.profile_badge = null;
            updateUserEconomy(guild.id, member.id, eco);
            
            const success = await this.updateNickname(member, oldBadgeId, null);
            let desc = '🔄 Badge unequipped!';
            if (!success) desc += '\n⚠️ *Could not remove emoji from name (Missing `Manage Nicknames` permission or you are the Server Owner).*';
            
            return context.reply({ embeds: [createEmbed({ context: context, description: desc, color: THEME.success })] });
        }

        if (!badge) {
            return context.reply({ embeds: [createEmbed({ context: context, description: '❌ Badge not found. Use `/badges list` to see available IDs.', color: THEME.error })] });
        }

        if (!hasBadge(guild.id, member.id, badge.id)) {
            return context.reply({ embeds: [createEmbed({ context: context, description: `❌ You don't own the **${badge.name}** badge yet!`, color: THEME.error })] });
        }

        const oldBadgeId = eco.profile_badge;
        eco.profile_badge = badge.id;
        updateUserEconomy(guild.id, member.id, eco);

        const success = await this.updateNickname(member, oldBadgeId, badge);
        
        let desc = `✅ Equipped **${badge.emoji} ${badge.name}**! It will now show next to your name.`;
        if (!success) desc += '\n⚠️ *Could not update your nickname (Missing `Manage Nicknames` permission or you are the Server Owner).*';

        return context.reply({ embeds: [createEmbed({ 
            context: context, 
            description: desc, 
            color: THEME.success 
        })] });
    },

    // ── NICKNAME MANAGER ──
    async updateNickname(member, oldBadgeId, newBadge) {
        let currentName = member.displayName;

        // 1. Strip old badge emoji if they had one equipped
        if (oldBadgeId && BADGES[oldBadgeId]) {
            const oldEmoji = BADGES[oldBadgeId].emoji;
            if (currentName.startsWith(oldEmoji)) {
                currentName = currentName.slice(oldEmoji.length).trim();
            }
        }

        // 2. Construct new name (Max 32 chars for Discord)
        let newName = currentName;
        if (newBadge) {
            newName = `${newBadge.emoji} ${currentName}`;
        }
        
        // 3. Update nickname
        if (newName.length > 32) newName = newName.substring(0, 32);
        if (newName !== member.displayName) {
            try {
                await member.setNickname(newName, 'Equipped Infernal Badge');
                return true; // Success
            } catch (e) {
                return false; // Failed
            }
        }
        return true; // No change needed
    },

    // ── GIVE BADGE (ADMIN) ──
    async give(client, guild, member, user, badgeId, context) {
        if (!hasPermission(member, 'Administrator')) {
            return context.reply({ embeds: [createEmbed({ context: context, description: '🚫 Only administrators can give badges.', color: THEME.error })], flags: 64 });
        }

        if (hasBadge(guild.id, user.id, badgeId)) {
            return context.reply({ embeds: [createEmbed({ context: context, description: `⚠️ ${user} already has the \`${badgeId}\` badge.`, color: THEME.accent })] });
        }

        addBadge(guild.id, user.id, badgeId);
        const info = BADGES[badgeId];
        const badgeName = info ? `${info.emoji} ${info.name}` : `❓ ${badgeId}`;

        return context.reply({ embeds: [createEmbed({ 
            context: context,
            description: `🏅 Successfully gave ${user} the **${badgeName}** badge!`, 
            color: THEME.success 
        })] });
    },

    // ── TAKE BADGE (ADMIN) ──
    async take(client, guild, member, user, badgeId, context) {
        if (!hasPermission(member, 'Administrator')) {
            return context.reply({ embeds: [createEmbed({ context: context, description: '🚫 Only administrators can take badges.', color: THEME.error })], flags: 64 });
        }

        if (!hasBadge(guild.id, user.id, badgeId)) {
            return context.reply({ embeds: [createEmbed({ context: context, description: `⚠️ ${user} doesn't have the \`${badgeId}\` badge.`, color: THEME.accent })] });
        }

        removeBadge(guild.id, user.id, badgeId);
        const info = BADGES[badgeId];
        const badgeName = info ? `${info.emoji} ${info.name}` : `❓ ${badgeId}`;

        return context.reply({ embeds: [createEmbed({ 
            context: context,
            description: `🗑️ Successfully removed the **${badgeName}** badge from ${user}.`, 
            color: THEME.error 
        })] });
    }
};