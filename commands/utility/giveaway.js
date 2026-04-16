const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createEmbed, THEME } = require('../../utils/embeds');
const { addGiveaway, removeGiveaway } = require('../../database/db');

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
        .addStringOption(o => o.setName('duration').setDescription('e.g., 1h, 1d').setRequired(true))
        .addIntegerOption(o => o.setName('winners').setDescription('Number of winners').setRequired(true).setMinValue(1))
        .addStringOption(o => o.setName('prize').setDescription('What are we giving away?').setRequired(true))
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
        const endsAtMs = Date.now() + ms;
        const endsAtDiscord = Math.floor(endsAtMs / 1000);
        const hostId = context.author?.id || context.user?.id;
        const hostMention = `<@${hostId}>`;
        
        const embed = createEmbed({ 
            title: '🎁 The Devil\'s Lottery', 
            description: `**Prize:** ${prize}\n**Winners:** ${winners}\n**Host:** ${hostMention}\n**Ends:** <t:${endsAtDiscord}:R>\n\nReact with 🎉 to enter!`, 
            color: THEME.primary 
        });
        
        const msg = await channel.send({ embeds: [embed] });
        await msg.react('🎉');
        
        // Save to database (now includes hostId)
        addGiveaway({ guildId: guild.id, channelId: channel.id, messageId: msg.id, endsAt: endsAtMs, winners, prize, hostId });
        
        await context.reply({ embeds: [createEmbed({ description: '🎁 Giveaway started!', color: THEME.success })] });

        const endGiveaway = async () => {
            removeGiveaway(msg.id);

            const fetched = await msg.fetch().catch(() => null);
            if (!fetched) return;
            
            const reaction = fetched.reactions.cache.get('🎉');
            
            // No reaction found at all
            if (!reaction) {
                return channel.send({
                    content: `🎁 Giveaway for **${prize}** ended, but no one reacted. ${hostMention}`,
                    allowedMentions: { parse: ['users'] }
                });
            }
            
            const users = await reaction.users.fetch();
            const valid = users.filter(u => !u.bot);
            
            // No valid participants
            if (valid.size === 0) {
                return channel.send({
                    content: `🎁 Giveaway for **${prize}** ended, but no valid participants entered. ${hostMention}`,
                    allowedMentions: { parse: ['users'] }
                });
            }
            
            // Smart winner selection: if fewer participants than requested winners, give it to whoever entered
            const actualWinners = Math.min(winners, valid.size);
            const winnerList = valid.random(actualWinners);
            const winnerArray = Array.isArray(winnerList) ? winnerList : [winnerList];
            const winnerMentions = winnerArray.map(w => `<@${w.id}>`).join(', ');
            
            // Different messages depending on whether we got all requested winners or fewer
            let resultMessage;
            if (actualWinners < winners) {
                resultMessage = `🎉 Congratulations ${winnerMentions}! You won **${prize}**!\n*(Only ${actualWinners} out of ${winners} requested winners entered)*\n📢 ${hostMention}, your giveaway has ended!`;
            } else {
                resultMessage = `🎉 Congratulations ${winnerMentions}! You won **${prize}**!\n📢 ${hostMention}, your giveaway has ended!`;
            }
            
            channel.send({
                content: resultMessage,
                allowedMentions: { parse: ['users'] }
            });
            
            fetched.edit({ embeds: [createEmbed({ 
                title: '🎁 Giveaway Ended', 
                description: `**Prize:** ${prize}\n**Winner(s):** ${winnerMentions}\n**Host:** ${hostMention}`, 
                color: THEME.secondary 
            })] });
        };

        setTimeout(endGiveaway, ms);
    },

    // Function called by clientReady.js on bot startup to resume giveaways
    async resumeGiveaway(client, data) {
        const channel = await client.channels.fetch(data.channelId).catch(() => null);
        if (!channel) return removeGiveaway(data.messageId);
        
        const msg = await channel.messages.fetch(data.messageId).catch(() => null);
        if (!msg) return removeGiveaway(data.messageId);

        const timeLeft = data.endsAt - Date.now();
        const hostId = data.hostId;
        const hostMention = `<@${hostId}>`;

        const endGiveaway = async () => {
            removeGiveaway(msg.id);
            const fetched = await msg.fetch().catch(() => null);
            if (!fetched) return;
            
            const reaction = fetched.reactions.cache.get('🎉');
            
            if (!reaction) {
                return channel.send({
                    content: `🎁 Giveaway for **${data.prize}** ended, but no one reacted. ${hostMention}`,
                    allowedMentions: { parse: ['users'] }
                });
            }
            
            const users = await reaction.users.fetch();
            const valid = users.filter(u => !u.bot);
            
            if (valid.size === 0) {
                return channel.send({
                    content: `🎁 Giveaway for **${data.prize}** ended, but no valid participants entered. ${hostMention}`,
                    allowedMentions: { parse: ['users'] }
                });
            }
            
            const actualWinners = Math.min(data.winners, valid.size);
            const winnerList = valid.random(actualWinners);
            const winnerArray = Array.isArray(winnerList) ? winnerList : [winnerList];
            const winnerMentions = winnerArray.map(w => `<@${w.id}>`).join(', ');
            
            let resultMessage;
            if (actualWinners < data.winners) {
                resultMessage = `🎉 Congratulations ${winnerMentions}! You won **${data.prize}**!\n*(Only ${actualWinners} out of ${data.winners} requested winners entered)*\n📢 ${hostMention}, your giveaway has ended!`;
            } else {
                resultMessage = `🎉 Congratulations ${winnerMentions}! You won **${data.prize}**!\n📢 ${hostMention}, your giveaway has ended!`;
            }
            
            channel.send({
                content: resultMessage,
                allowedMentions: { parse: ['users'] }
            });
            
            fetched.edit({ embeds: [createEmbed({ 
                title: '🎁 Giveaway Ended', 
                description: `**Prize:** ${data.prize}\n**Winner(s):** ${winnerMentions}\n**Host:** ${hostMention}`, 
                color: THEME.secondary 
            })] });
        };

        if (timeLeft <= 0) {
            await endGiveaway();
        } else {
            setTimeout(endGiveaway, timeLeft);
        }
    }
};