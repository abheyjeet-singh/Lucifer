const { MessageFlags } = require('discord.js');
const { hasPermission } = require('../utils/permissions');
const { createEmbed, THEME } = require('../utils/embeds');
const { getVerify } = require('../database/db');

module.exports = {
    once: false,
    async execute(interaction, client) {
        
        // ── 1. Slash Commands ──
        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);
            if (!command) return;
            if (command.permissions && command.permissions.length > 0) {
                const missing = command.permissions.filter(p => !hasPermission(interaction.member, p));
                if (missing.length > 0) {
                    return interaction.reply({ embeds: [createEmbed({ description: `🚫 Missing: \`${missing.join(', ')}\``, color: THEME.error })], flags: MessageFlags.Ephemeral });
                }
            }
            try { await command.interact(interaction, client); }
            catch (error) { console.error(error); const embed = createEmbed({ description: '💀 Error occurred.', color: THEME.error }); if (interaction.replied || interaction.deferred) interaction.followUp({ embeds: [embed], flags: MessageFlags.Ephemeral }).catch(() => {}); else interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral }).catch(() => {}); }
        }

        // ── 2. Buttons ──
        if (interaction.isButton()) {
            // Verify Button
            if (interaction.customId === 'verify_button') {
                const verify = getVerify(interaction.guild.id);
                if (!verify.role_id) return interaction.reply({ embeds: [createEmbed({ description: '⚠️ Verification not set up.', color: THEME.error })], flags: MessageFlags.Ephemeral });
                if (interaction.member.roles.cache.has(verify.role_id)) return interaction.reply({ embeds: [createEmbed({ description: '✨ You are already verified.', color: THEME.success })], flags: MessageFlags.Ephemeral });
                await interaction.member.roles.add(verify.role_id);
                return interaction.reply({ embeds: [createEmbed({ description: '✨ Your soul has been pledged. Welcome to the realm.', color: THEME.success })], flags: MessageFlags.Ephemeral });
            }

            // Quota Button
            if (interaction.customId === 'open_quota_modal') {
                const quotaCommand = client.commands.get('quota');
                if (quotaCommand && quotaCommand.quotaModal) await interaction.showModal(quotaCommand.quotaModal);
            }

            // Ticket Button
            if (interaction.customId === 'create_ticket') {
                const ticketCmd = client.commands.get('ticket');
                if (ticketCmd && ticketCmd.handleButton) await ticketCmd.handleButton(interaction, client);
            }

            // Giveaway Reroll Button
            if (interaction.customId.startsWith('reroll_giveaway_')) {
                const giveawayCmd = client.commands.get('giveaway');
                if (giveawayCmd && giveawayCmd.handleButton) await giveawayCmd.handleButton(interaction, client);
            }
        }

        // ── 3. Modals ──
        if (interaction.isModalSubmit()) {
            if (interaction.customId === 'quota_modal') {
                const quotaCommand = client.commands.get('quota');
                if (quotaCommand && quotaCommand.handleModalSubmit) await quotaCommand.handleModalSubmit(interaction, client);
            }
        }
        
        // ── BUTTON ROLE HANDLER ──
        if (interaction.isButton()) {
            const customId = interaction.customId;
            if (customId.startsWith('br_')) {
                const roleId = customId.split('_')[1];
                const member = interaction.member;
                const role = interaction.guild.roles.cache.get(roleId);

                if (!role) {
                    return interaction.reply({ content: '⚠️ This role no longer exists.', ephemeral: true });
                }

                try {
                    if (member.roles.cache.has(roleId)) {
                        await member.roles.remove(role);
                        return interaction.reply({ content: `🗑️ Removed **${role.name}**`, ephemeral: true });
                    } else {
                        await member.roles.add(role);
                        return interaction.reply({ content: `✅ Added **${role.name}**`, ephemeral: true });
                    }
                } catch (error) {
                    console.error('Button Role Error:', error);
                    return interaction.reply({ content: '⚠️ I cannot give you this role. My role might be too low.', ephemeral: true });
                }
            }
        }
    },
};