const { ChannelType, PermissionFlagsBits } = require('discord.js');
const { getDynamicVcHub, addDynamicVc, removeDynamicVc, isDynamicVc } = require('../database/db');
const logger = require('../utils/logger');

module.exports = {
    once: false,
    async execute(oldState, newState, client) {
        const guild = newState.guild;

        // ── 1. USER JOINS A CHANNEL ──
        if (!oldState.channelId && newState.channelId) {
            const hubId = getDynamicVcHub(guild.id);
            
            // If they joined the Dynamic VC Hub
            if (hubId && newState.channelId === hubId) {
                const member = newState.member;
                const parent = newState.channel.parent;

                try {
                    // Create the private channel
                    const newChannel = await guild.channels.create({
                        name: `⭐ ${member.user.username}'s Room`,
                        type: ChannelType.GuildVoice,
                        parent: parent || null,
                        permissionOverwrites: [
                            { id: guild.id, deny: [PermissionFlagsBits.Connect] }, // Deny everyone
                            { id: member.id, allow: [PermissionFlagsBits.Connect, PermissionFlagsBits.ManageChannels] }, // Allow creator
                            { id: client.user.id, allow: [PermissionFlagsBits.Connect, PermissionFlagsBits.ManageChannels] } // Allow bot
                        ]
                    });

                    // Move user to their new room
                    await member.voice.setChannel(newChannel);
                    
                    // Save to DB so we can track it
                    addDynamicVc(newChannel.id);

                } catch (error) {
                    logger.error(`Failed to create dynamic VC: ${error.message}`);
                }
            }
        }

        // ── 2. USER LEAVES A CHANNEL ──
        if (oldState.channelId && !newState.channelId) {
            // If the channel they left is a tracked Dynamic VC
            if (isDynamicVc(oldState.channelId)) {
                const channel = oldState.channel;
                
                // If the channel is now empty, delete it
                if (channel && channel.members.size === 0) {
                    try {
                        await channel.delete();
                        removeDynamicVc(channel.id);
                    } catch (error) {
                        logger.error(`Failed to delete dynamic VC ${channel.id}: ${error.message}`);
                        removeDynamicVc(channel.id); // Remove from DB anyway to prevent leaks
                    }
                }
            }
        }
    },
};
