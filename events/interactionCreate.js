const logger = require('../utils/logger');

module.exports = {
    once: false,
    async execute(interaction, client) {
        // ── Slash Commands ──
        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);
            if (!command) return;

            try {
                await command.interact(interaction, client);
            } catch (error) {
                logger.error(`Slash Command Error [/${interaction.commandName}]: ${error.message}`);

                const errorMessage = '⚠️ An error occurred while executing that command.';

                if (interaction.replied || interaction.deferred) {
                    await interaction.editReply({ content: errorMessage, embeds: [] }).catch(() => {});
                } else {
                    await interaction.reply({ content: errorMessage, ephemeral: true }).catch(() => {});
                }
            }
            return;
        }

        // ── Button Interactions ──
        if (interaction.isButton()) {
            // ── Giveaway Reroll Button ──
            if (interaction.customId.startsWith('reroll_giveaway_')) {
                const giveawayCommand = require('../commands/utility/giveaway');
                try {
                    await giveawayCommand.handleButton(interaction, client);
                } catch (error) {
                    logger.error(`Giveaway Button Error: ${error.message}`);
                    const reply = { content: '⚠️ An error occurred processing the reroll.', ephemeral: true };
                    if (interaction.deferred || interaction.replied) {
                        await interaction.editReply(reply).catch(() => {});
                    } else {
                        await interaction.reply(reply).catch(() => {});
                    }
                }
                return;
            }

            // ── Invite Event Reroll Button ──
            if (interaction.customId.startsWith('reroll_inviteevent_')) {
                const inviteEventCmd = require('../commands/utility/inviteevent');
                try {
                    await inviteEventCmd.handleButton(interaction, client);
                } catch (error) {
                    logger.error(`Invite Event Button Error: ${error.message}`);
                    const reply = { content: '⚠️ An error occurred processing the reroll.', ephemeral: true };
                    if (interaction.deferred || interaction.replied) {
                        await interaction.editReply(reply).catch(() => {});
                    } else {
                        await interaction.reply(reply).catch(() => {});
                    }
                }
                return;
            }

            // ── Button Roles ──
            try {
                const { getButtonRoles } = require('../database/db');
                const roles = getButtonRoles(interaction.message.id);
                if (roles && roles.length > 0) {
                    const matched = roles.find(r => r.custom_id === interaction.customId);
                    if (matched) {
                        const member = interaction.member;
                        if (member.roles.cache.has(matched.role_id)) {
                            await member.roles.remove(matched.role_id, 'Button Role — Toggle Off');
                            await interaction.reply({ content: `❌ Removed <@&${matched.role_id}>.`, ephemeral: true });
                        } else {
                            await member.roles.add(matched.role_id, 'Button Role — Toggle On');
                            await interaction.reply({ content: `✅ Added <@&${matched.role_id}>!`, ephemeral: true });
                        }
                        return;
                    }
                }
            } catch (error) {
                logger.error(`Button Role Error: ${error.message}`);
            }

            // ── Verification Button ──
            try {
                const { getVerify } = require('../database/db');
                const verifyData = getVerify(interaction.guild.id);
                if (verifyData && verifyData.message_id === interaction.message.id && interaction.customId === 'verify_button') {
                    if (interaction.member.roles.cache.has(verifyData.role_id)) {
                        return interaction.reply({ content: '✅ You are already verified!', ephemeral: true });
                    }
                    await interaction.member.roles.add(verifyData.role_id, 'Verification Button');
                    return interaction.reply({ content: '✅ You have been verified! Welcome to the realm.', ephemeral: true });
                }
            } catch (error) {
                logger.error(`Verify Button Error: ${error.message}`);
            }

            // ── Ticket Button ──
            try {
                const { getTickets, addActiveTicket } = require('../database/db');
                const ticketData = getTickets(interaction.guild.id);
                if (ticketData && interaction.customId === 'create_ticket') {
                    const existing = ticketData.active[interaction.user.id];
                    if (existing) {
                        return interaction.reply({ content: `⚠️ You already have an open ticket: <#${existing}>`, ephemeral: true });
                    }

                    const channel = await interaction.guild.channels.create({
                        name: `ticket-${interaction.user.username}`,
                        type: 0,
                        parent: ticketData.category_id,
                        permissionOverwrites: [
                            { id: interaction.guild.id, deny: ['ViewChannel'] },
                            { id: interaction.user.id, allow: ['ViewChannel', 'SendMessages'] },
                            { id: client.user.id, allow: ['ViewChannel', 'SendMessages', 'ManageChannels'] },
                        ],
                    });

                    addActiveTicket(interaction.guild.id, interaction.user.id, channel.id);

                    const { createEmbed, THEME } = require('../utils/embeds');
                    await channel.send({
                        content: `${interaction.user} — Here is your ticket.`,
                        embeds: [createEmbed({
                            description: `Support will be with you shortly. Click the button below to close this ticket.`,
                            color: THEME.primary,
                        })],
                        components: [new (require('discord.js')).ActionRowBuilder().addComponents(
                            new (require('discord.js')).ButtonBuilder()
                                .setCustomId('close_ticket')
                                .setLabel('🔒 Close Ticket')
                                .setStyle(require('discord.js').ButtonStyle.Danger)
                        )]
                    });

                    return interaction.reply({ content: `✅ Ticket created: ${channel}`, ephemeral: true });
                }

                if (interaction.customId === 'close_ticket') {
                    const { removeActiveTicket } = require('../database/db');
                    const channel = interaction.channel;
                    await interaction.reply({ content: '🔒 Closing ticket in 5 seconds...', ephemeral: false });
                    setTimeout(() => {
                        removeActiveTicket(interaction.guild.id, interaction.user.id);
                        channel.delete().catch(() => {});
                    }, 5000);
                    return;
                }
            } catch (error) {
                logger.error(`Ticket Button Error: ${error.message}`);
            }

            return;
        }

        // ── Select Menu Interactions ──
        if (interaction.isStringSelectMenu()) {
            // ── Reaction Role Select Menu ──
            try {
                const { getButtonRoles } = require('../database/db');
                if (interaction.customId === 'reaction_role_select') {
                    const roles = getButtonRoles(interaction.message.id);
                    if (!roles || roles.length === 0) {
                        return interaction.reply({ content: '⚠️ No roles found for this menu.', ephemeral: true });
                    }

                    const selectedIds = interaction.values;
                    const member = interaction.member;

                    for (const roleData of roles) {
                        if (selectedIds.includes(roleData.custom_id)) {
                            if (!member.roles.cache.has(roleData.role_id)) {
                                await member.roles.add(roleData.role_id, 'Reaction Role Select');
                            }
                        } else {
                            if (member.roles.cache.has(roleData.role_id)) {
                                await member.roles.remove(roleData.role_id, 'Reaction Role Select');
                            }
                        }
                    }

                    return interaction.reply({ content: '✅ Roles updated!', ephemeral: true });
                }
            } catch (error) {
                logger.error(`Select Menu Error: ${error.message}`);
            }

            return;
        }

        // ── Modal Submissions ──
        if (interaction.isModalSubmit()) {
            return;
        }
    },
};