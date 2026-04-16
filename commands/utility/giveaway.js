const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createEmbed, THEME } = require('../../utils/embeds');

function parseDuration(str) { 
    const regex = /^(\d+)(s|m|h|d)$/; 
    const match = str?.toLowerCase().match(regex); 
    if (!match) return null; 
    const num = parseInt(match[1]); 
    const unit = { s: 1, m: 60, h: 3600, d: 86400 }[match[2]]; 
    return num * unit * 1000; 
}

module.exports = {
    name: 'giveaway', 
    description: 'The Devil\'s Lottery', 
    category: 'utility', 
    usage: 'giveaway <duration> <winners> <prize>', 
    permissions: ['ManageMessages'],
    
    data: new SlashCommandBuilder()
        .setName('giveaway')
        .setDescription('The Devil\'s Lottery')
        .addStringOption(o => o
            .setName('duration')
            .setDescription('e.g., 1h, 1d')
            .setRequired(true))
        .addIntegerOption(o => o
            .setName('winners')
            .setDescription('Number of winners')
            .setRequired(true)
            .setMinValue(1))
        .addStringOption(o => o // Changed to addStringOption since prize is text
            .setName('prize')
            .setDescription('What are we giving away?')
            .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    async execute(message, args, client) { 
        if (args.length < 3) return message.reply({ embeds: [createEmbed({ description: '⚠️ `l!giveaway 1h 1 Nitro`', color: THEME.error })] }); 
        const ms = parseDuration(args[0]); 
        const winners = parseInt(args[1]); 
        const prize = args.slice(2).join(' '); 
        if (!ms || isNaN(winners)) return message.reply({ embeds: [createEmbed({ description: '⚠️ Invalid format.', color: THEME.error })] }); 
        return this.run(client, message.guild, message.channel, ms, winners, prize, message); 
    },

    async interact(interaction, client) { 
        const ms = parseDuration(interaction.options.getString('duration')); 
        const winners = interaction.options.getInteger('winners'); 
        const prize = interaction.options.getString('prize'); 
        if (!ms) return interaction.reply({ embeds: [createEmbed({ description: '⚠️ Invalid duration.', color: THEME.error })], flags: 64 }); 
        return this.run(client, interaction.guild, interaction.channel, ms, winners, prize, interaction); 
    },

    async run(client, guild, channel, ms, winners, prize, context) {
        const endsAt = Math.floor((Date.now() + ms) / 1000);
        const embed = createEmbed({ 
            title: '🎁 The Devil\'s Lottery', 
            description: `**Prize:** ${prize}\n**Winners:** ${winners}\n**Ends:** <t:${endsAt}:R>\n\nReact with 🎉 to enter!`, 
            color: THEME.primary 
        });
        
        const msg = await channel.send({ embeds: [embed] });
        await msg.react('🎉');
        await context.reply({ embeds: [createEmbed({ description: '🎁 Giveaway started!', color: THEME.success })] });

        setTimeout(async () => {
            const fetched = await msg.fetch().catch(() => null);
            if (!fetched) return;
            const reaction = fetched.reactions.cache.get('🎉');
            if (!reaction) return channel.send('🎁 Giveaway ended, but no one reacted.');
            
            const users = await reaction.users.fetch();
            const valid = users.filter(u => !u.bot);
            if (valid.size < winners) return channel.send('🎁 Not enough participants.');
            
            const winnerList = valid.random(winners);
            channel.send(`🎉 Congratulations ${winnerList.map(w => w.toString()).join(', ')}! You won **${prize}**!`);
            
            fetched.edit({ embeds: [createEmbed({ 
                title: '🎁 Giveaway Ended', 
                description: `**Prize:** ${prize}\n**Winner(s):** ${winnerList.map(w => w.toString()).join(', ')}`, 
                color: THEME.secondary 
            })] });
        }, ms);
    },
};