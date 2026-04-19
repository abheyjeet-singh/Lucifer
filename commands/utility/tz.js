const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { createEmbed, THEME } = require('../../utils/embeds');
const { getTimezone, setTimezone, getPrefix } = require('../../database/db');

// ── Timezone Mapping & Validation ──
const tzMap = {
    'est': 'America/New_York', 'et': 'America/New_York',
    'cst': 'America/Chicago', 'ct': 'America/Chicago',
    'mst': 'America/Denver', 'mt': 'America/Denver',
    'pst': 'America/Los_Angeles', 'pt': 'America/Los_Angeles',
    'gmt': 'Europe/London', 'utc': 'Etc/UTC',
    'cet': 'Europe/Paris', 
    'eet': 'Europe/Bucharest',
    'ist': 'Asia/Kolkata',
    'jst': 'Asia/Tokyo',
    'aest': 'Australia/Sydney', 'ast': 'Australia/Sydney',
    'nzst': 'Pacific/Auckland'
};

function isValidTimezone(tz) {
    try {
        new Intl.DateTimeFormat(undefined, { timeZone: tz });
        return true;
    } catch { return false; }
}

function getCurrentTime(tz) {
    try {
        return new Date().toLocaleTimeString('en-US', { 
            timeZone: tz, 
            hour: '2-digit', 
            minute: '2-digit', 
            hour12: true 
        });
    } catch { return 'Unknown'; }
}

module.exports = {
    name: 'tz',
    description: 'Set your timezone or check someone elses',
    aliases: ['timezone', 'tzset', 'tzhelp'], // Added aliases for prefix usage
    data: new SlashCommandBuilder()
        .setName('tz')
        .setDescription('Timezone system')
        .addSubcommand(sc =>
            sc.setName('set')
              .setDescription('Set your timezone (e.g., EST, PST, Europe/Paris)')
              .addStringOption(o => o.setName('timezone').setDescription('Your timezone').setRequired(true)))
        .addSubcommand(sc =>
            sc.setName('check')
              .setDescription('Check the current time for yourself or another user')
              .addUserOption(o => o.setName('user').setDescription('User to check')))
        .addSubcommand(sc =>
            sc.setName('help')
              .setDescription('Learn how to use the timezone system')),

    async execute(message, args, client) {
        const usedAlias = message.content.toLowerCase().split(' ')[0].slice(getPrefix(message.guild.id).length);

        // Handle l!tzhelp
        if (usedAlias === 'tzhelp') return this.sendHelp(message);

        // Handle l!tzset <timezone>
        if (usedAlias === 'tzset') {
            const tzInput = args.join(' ');
            if (!tzInput) return message.reply({ embeds: [createEmbed({ context: message, description: '⚠️ Usage: `l!tzset <timezone>`', color: THEME.error })] });
            return this.setTime(client, message.guild, message.author, tzInput, message);
        }

        // Handle l!tz @user
        const mention = message.mentions.users.first();
        if (mention) return this.checkTime(client, message.guild, message.author, mention, message);

        // Handle l!tz help
        const sub = args[0]?.toLowerCase();
        if (sub === 'help' || !sub) return this.sendHelp(message);

        // Handle l!tz set <timezone>
        if (sub === 'set') {
            const tzInput = args.slice(1).join(' ');
            if (!tzInput) return message.reply({ embeds: [createEmbed({ context: message, description: '⚠️ Usage: `l!tz set <timezone>`', color: THEME.error })] });
            return this.setTime(client, message.guild, message.author, tzInput, message);
        }

        // Fallback if they just type something weird
        return this.sendHelp(message);
    },

    async interact(interaction, client) {
        const sub = interaction.options.getSubcommand();
        if (sub === 'set') return this.setTime(client, interaction.guild, interaction.user, interaction.options.getString('timezone'), interaction);
        if (sub === 'check') return this.checkTime(client, interaction.guild, interaction.user, interaction.options.getUser('user'), interaction);
        return this.sendHelp(interaction);
    },

    async sendHelp(context) {
        return context.reply({ embeds: [createEmbed({ 
            title: '🕰️ Timezone System Help',
            description: 
                'Set your timezone so the bot knows what time it is for you!\n\n' +
                '**Slash Commands:**\n' +
                '• `/tz set EST` - Set your timezone\n' +
                '• `/tz check @user` - Check someone\'s time\n' +
                '/tz help - Shows this message\n\n' +
                '**Prefix Commands:**\n' +
                '• `l!tzset EST` - Set your timezone instantly\n' +
                '• `l!tz @user` - Check someone\'s time\n' +
                'l!tzhelp - Shows this message\n\n' +
                '**Accepted Formats:**\n' +
                '• Standard Codes: `EST`, `PST`, `CET`\n' +
                '• IANA Zones: `America/New_York`, `Europe/Paris`\n' +
                'Do NOT use broad areas like `EU` or `North America`.', 
            color: THEME.celestial 
        })] });
    },

    async setTime(client, guild, author, input, context) {
        const cleanInput = input.trim();
        
        // 1. Broad Region Check
        if (['eu', 'europe', 'na', 'north america', 'us', 'usa'].includes(cleanInput.toLowerCase())) {
            return context.reply({ embeds: [createEmbed({ 
                description: `⚠️ **${cleanInput}** is too broad! There are multiple timezones in this region.\nPlease specify a major city or standard code (e.g., \`Europe/Paris\`, \`CET\`, \`EST\`).`, 
                color: THEME.accent 
            })] });
        }

        // 2. Exact IANA Match
        if (isValidTimezone(cleanInput)) {
            setTimezone(author.id, cleanInput);
            const currentTime = getCurrentTime(cleanInput);
            return context.reply({ embeds: [createEmbed({ 
                title: '🕰️ Timezone Set!',
                description: `✅ Your timezone has been set to **${cleanInput}**.\n🕐 Current Time: **${currentTime}**`, 
                color: THEME.success 
            })] });
        }

        // 3. Abbreviation Detection (Are you sure?)
        const mappedTz = tzMap[cleanInput.toLowerCase()];
        if (mappedTz) {
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder().setCustomId('tz_accept').setLabel('✅ Yes, Save It').setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId('tz_reject').setLabel('❌ No, Wrong One').setStyle(ButtonStyle.Danger)
                );

            const replyMsg = await context.reply({ 
                embeds: [createEmbed({ 
                    title: '🕰️ Timezone Detected',
                    description: `I interpreted **${cleanInput}** as **${mappedTz}**.\n\n🕐 Current Time there: **${getCurrentTime(mappedTz)}**\n\nIs this correct?`, 
                    color: THEME.celestial 
                })],
                components: [row],
                fetchReply: true
            });

            const filter = i => i.user.id === author.id;
            const collector = replyMsg.createMessageComponentCollector({ filter, componentType: ComponentType.Button, time: 15000 });

            collector.on('collect', async i => {
                if (i.customId === 'tz_accept') {
                    setTimezone(author.id, mappedTz);
                    await i.update({ embeds: [createEmbed({ context: guild, title: '✅ Saved!', description: `Your timezone is now **${mappedTz}**.`, color: THEME.success })], components: [] });
                } else {
                    await i.update({ embeds: [createEmbed({ context: guild, description: `🗑️ Timezone not saved. Please try again with a specific city (e.g., \`America/New_York\`).`, color: THEME.accent })], components: [] });
                }
            });

            collector.on('end', collected => {
                if (collected.size === 0) {
                    replyMsg.edit({ components: [] }).catch(() => {});
                }
            });
            return;
        }

        // 4. Complete Failure
        return context.reply({ embeds: [createEmbed({ 
            description: `❌ **${cleanInput}** is not a valid timezone.\nTry formats like \`EST\`, \`PST\`, \`Europe/London\`, or \`UTC+2\`.`, 
            color: THEME.error 
        })] });
    },

    async checkTime(client, guild, author, target, context) {
        const user = target || (context.user ? context.user : context.author);
        const tz = getTimezone(user.id);

        if (!tz) {
            const desc = user.id === author.id 
                ? '⚠️ You haven\'t set your timezone yet! Use `/tz set <timezone>` or `l!tzset <timezone>` to set it.' 
                : `⚠️ **${user.username}** hasn't set their timezone yet.`;
            return context.reply({ embeds: [createEmbed({ context: guild, description: desc, color: THEME.accent })] });
        }

        const currentTime = getCurrentTime(tz);
        const dateStr = new Date().toLocaleDateString('en-US', { timeZone: tz, dateStyle: 'full' });

        return context.reply({ embeds: [createEmbed({ 
            author: { name: `${user.username}'s Time`, iconURL: user.displayAvatarURL() },
            description: `🕰️ **Timezone:** ${tz}\n🕐 **Current Time:** ${currentTime}\n📅 **Date:** ${dateStr}`, 
            color: THEME.primary 
        })] });
    }
};