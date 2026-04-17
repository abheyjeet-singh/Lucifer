const { SlashCommandBuilder } = require('discord.js');
const { getBoostPerksChannel, setBoostPerksChannel, removeBoostPerksChannel, getBoostDmStatus, setBoostDmStatus } = require('../../database/db');
const { createEmbed, THEME } = require('../../utils/embeds');

module.exports = {
    name: 'setpreckchannel',
    description: 'Set the channel where booster perks are listed. Will DM existing boosters.',
    usage: '<#channel | off>',
    permissions: ['Administrator'],
    
    // ── SLASH COMMAND DATA ──
    data: new SlashCommandBuilder()
        .setName('setpreckchannel')
        .setDescription('Set the channel where booster perks are listed. Will DM existing boosters.')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('The perks channel (leave empty to disable)'))
        .setDefaultMemberPermissions(0), // Requires Administrator

    // ── HYBRID EXECUTION (Handles both Prefix & Slash) ──
    async execute(source, args, client) {
        // Detect if it's a slash command or prefix command
        const isInteraction = source.isChatInputCommand !== undefined;
        const guild = source.guild;

        // If it's a slash command, the client might be passed as the second argument depending on your interactionCreate handler
        if (isInteraction && !client && args) client = args; 

        let channel;
        if (isInteraction) {
            channel = source.options.getChannel('channel'); // Null if not provided
        } else {
            const input = args[0];
            if (!input || input.toLowerCase() === 'off' || input.toLowerCase() === 'disable') {
                channel = null;
            } else {
                channel = source.mentions.channels.first() || guild.channels.cache.get(input);
            }
        }

        // ── DISABLE LOGIC ──
        if (!channel) {
            const current = getBoostPerksChannel(guild.id);
            if (!current) {
                const payload = { embeds: [createEmbed({ description: '🔥 Booster perks channel is already disabled.', color: THEME.error })] };
                return isInteraction ? source.reply(payload) : source.reply(payload);
            }
            
            removeBoostPerksChannel(guild.id);
            const payload = { embeds: [createEmbed({ description: '🔥 Booster perks channel has been disabled.', color: THEME.success })] };
            return isInteraction ? source.reply(payload) : source.reply(payload);
        }

        // ── VALIDATE CHANNEL ──
        if (!channel.isTextBased()) {
            const payload = { embeds: [createEmbed({ description: '🚫 Please mention a valid text channel.', color: THEME.error })], ephemeral: true };
            return isInteraction ? source.reply(payload) : source.reply(payload);
        }

        setBoostPerksChannel(guild.id, channel.id);
        
        const statusPayload = { embeds: [createEmbed({ description: `🔥 Booster perks channel set to ${channel}. Scanning existing boosters...`, color: THEME.primary })] };
        const statusMsg = isInteraction 
            ? await source.reply({ ...statusPayload, fetchReply: true }) 
            : await source.reply(statusPayload);

        // ── RETROACTIVE DM LOGIC ──
        let dmCount = 0;
        let pingCount = 0;
        try {
            const members = await guild.members.fetch({ withPresences: false });
            const boosters = members.filter(m => m.premiumSince !== null);

            for (const [id, member] of boosters) {
                if (member.user.bot) continue;
                
                const dmStatus = getBoostDmStatus(guild.id, id);
                if (dmStatus !== 'welcomed') {
                    try {
                        await member.send(`🔥 **Thank you for boosting ${guild.name}!**\nBe sure to check out ${channel} for your exclusive booster perks! 👑`);
                        setBoostDmStatus(guild.id, id, 'welcomed');
                        dmCount++;
                    } catch (e) {
                        // DMs closed, fallback to ping in the perks channel
                        await channel.send(`👑 <@${id}> your DMs are closed, but thank you for boosting! Check out this channel for your exclusive perks!`).then(m => setTimeout(() => m.delete().catch(() => {}), 30000));
                        setBoostDmStatus(guild.id, id, 'welcomed');
                        pingCount++;
                    }
                    // Rate limit protection: Wait 1.5 seconds between messages
                    await new Promise(resolve => setTimeout(resolve, 1500)); 
                }
            }
        } catch (error) {
            console.error('Booster fetch error:', error);
        }

        // ── EDIT FINAL STATUS ──
        const finalPayload = { embeds: [createEmbed({ description: `🔥 Booster perks channel set to ${channel}.\n👑 Scanned server and sent **${dmCount}** new DM(s) and **${pingCount}** fallback ping(s) to existing boosters.`, color: THEME.success })] };
        
        if (isInteraction) {
            await source.editReply(finalPayload);
        } else {
            await statusMsg.edit(finalPayload);
        }
    }
};