const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder, StringSelectMenuBuilder, MessageFlags } = require('discord.js');
const { createEmbed, THEME } = require('../../utils/embeds');
const { getTickets, setTickets, addActiveTicket, removeActiveTicket, getActiveTicket } = require('../../database/db');
const { buildTicketPanelCard, buildTicketWelcomeCard, buildTicketClosedCard } = require('../../utils/canvasBuilder');

module.exports = {
    name: 'ticket',
    description: 'Premium User Support System',
    category: 'utility',
    permissions: ['Administrator'],
    data: new SlashCommandBuilder()
        .setName('ticket')
        .setDescription('Premium User Support System')
        .addSubcommandGroup(grp => grp.setName('setup').setDescription('Configure tickets')
            .addSubcommand(sc => sc.setName('panel').setDescription('Create the ticket panel').addChannelOption(o => o.setName('channel').setDescription('Channel for the panel').addChannelTypes(ChannelType.GuildText).setRequired(true)))
            .addSubcommand(sc => sc.setName('config').setDescription('Set category and log channel')
                .addChannelOption(o => o.setName('category').setDescription('Category for tickets').addChannelTypes(ChannelType.GuildCategory).setRequired(true))
                .addChannelOption(o => o.setName('log_channel').setDescription('Channel for transcripts').addChannelTypes(ChannelType.GuildText).setRequired(true)))
            .addSubcommand(sc => sc.setName('off').setDescription('Disable tickets')))
        .addSubcommandGroup(grp => grp.setName('role').setDescription('Manage support roles')
            .addSubcommand(sc => sc.setName('add').setDescription('Add a support role').addRoleOption(o => o.setName('role').setDescription('Role to add').setRequired(true)))
            .addSubcommand(sc => sc.setName('remove').setDescription('Remove a support role').addRoleOption(o => o.setName('role').setDescription('Role to remove').setRequired(true)))
            .addSubcommand(sc => sc.setName('list').setDescription('View support roles')))
        .addSubcommandGroup(grp => grp.setName('topic').setDescription('Manage ticket topics')
            .addSubcommand(sc => sc.setName('add').setDescription('Add a ticket topic')
                .addStringOption(o => o.setName('name').setDescription('Name of the topic (e.g., Billing)').setRequired(true))
                .addStringOption(o => o.setName('emoji').setDescription('Emoji for the topic').setRequired(true)))
            .addSubcommand(sc => sc.setName('remove').setDescription('Remove a ticket topic')
                .addStringOption(o => o.setName('name').setDescription('Name of the topic to remove').setRequired(true)))
            .addSubcommand(sc => sc.setName('list').setDescription('View ticket topics')))
        .addSubcommand(sc => sc.setName('adduser').setDescription('Add a user to this ticket').addUserOption(o => o.setName('user').setDescription('User to add').setRequired(true)))
        .addSubcommand(sc => sc.setName('removeuser').setDescription('Remove a user from this ticket').addUserOption(o => o.setName('user').setDescription('User to remove').setRequired(true)))
        .addSubcommand(sc => sc.setName('close').setDescription('Close the current ticket')),

    async execute(message, args, client) { return message.reply({ embeds: [createEmbed({ context: message, description: '⚠️ Use `/ticket` slash commands.', color: THEME.error })] }); },

    async interact(interaction, client) {
        const sub = interaction.options.getSubcommand();
        const group = interaction.options.getSubcommandGroup(false);

        if (sub === 'close') return this.closeWithReason(interaction, client);
        if (sub === 'adduser') return this.addUser(interaction);
        if (sub === 'removeuser') return this.removeUser(interaction);

        // Setup Group
        if (group === 'setup') {
            if (sub === 'off') {
                setTickets(interaction.guild.id, { category_id: null, log_channel_id: null, count: 0, active: {}, support_roles: [], topics: [] });
                return interaction.reply({ embeds: [createEmbed({ context: interaction, description: '🎫 Ticket system disabled.', color: THEME.accent })] });
            }
            if (sub === 'config') {
                const category = interaction.options.getChannel('category');
                const logCh = interaction.options.getChannel('log_channel');
                const tickets = getTickets(interaction.guild.id);
                tickets.category_id = category.id;
                tickets.log_channel_id = logCh.id;
                if (!tickets.support_roles) tickets.support_roles = [];
                if (!tickets.topics) tickets.topics = [];
                setTickets(interaction.guild.id, tickets);
                return interaction.reply({ embeds: [createEmbed({ context: interaction, description: `🎫 Config set!\n**Category:** ${category}\n**Logs:** ${logCh}`, color: THEME.success })] });
            }
            if (sub === 'panel') {
                const tickets = getTickets(interaction.guild.id);
                if (!tickets.topics || tickets.topics.length === 0) {
                    return interaction.reply({ embeds: [createEmbed({ context: interaction, description: '⚠️ You must add at least one topic using `/ticket topic add` before creating the panel.', color: THEME.error })], flags: MessageFlags.Ephemeral });
                }

                const channel = interaction.options.getChannel('channel');
                try {
                    const imageBuffer = await buildTicketPanelCard(interaction.guild);
                    const attachment = new AttachmentBuilder(imageBuffer, { name: 'panel.png' });
                    
                    const options = tickets.topics.map(t => ({
                        label: t.name,
                        value: t.value,
                        emoji: t.emoji || undefined
                    }));

                    const row = new ActionRowBuilder().addComponents(
                        new StringSelectMenuBuilder()
                            .setCustomId('ticket_topic')
                            .setPlaceholder('🔑 Select a ticket topic...')
                            .addOptions(options)
                    );
                    await channel.send({ files: [attachment], components: [row] });
                    return interaction.reply({ embeds: [createEmbed({ context: interaction, description: `🎫 Ticket panel created in ${channel}.`, color: THEME.success })] });
                } catch (e) {
                    console.error(e);
                    return interaction.reply({ embeds: [createEmbed({ context: interaction, description: '❌ Failed to generate panel image.', color: THEME.error })] });
                }
            }
        }

        // Role Group
        if (group === 'role') {
            const tickets = getTickets(interaction.guild.id);
            if (!tickets.support_roles) tickets.support_roles = [];
            if (sub === 'add') {
                const role = interaction.options.getRole('role');
                if (tickets.support_roles.includes(role.id)) return interaction.reply({ embeds: [createEmbed({ context: interaction, description: '⚠️ That role is already a support role.', color: THEME.accent })], flags: MessageFlags.Ephemeral });
                tickets.support_roles.push(role.id);
                setTickets(interaction.guild.id, tickets);
                return interaction.reply({ embeds: [createEmbed({ context: interaction, description: `✅ Added ${role} as a support role.`, color: THEME.success })] });
            }
            if (sub === 'remove') {
                const role = interaction.options.getRole('role');
                if (!tickets.support_roles.includes(role.id)) return interaction.reply({ embeds: [createEmbed({ context: interaction, description: '⚠️ That role is not a support role.', color: THEME.accent })], flags: MessageFlags.Ephemeral });
                tickets.support_roles = tickets.support_roles.filter(r => r !== role.id);
                setTickets(interaction.guild.id, tickets);
                return interaction.reply({ embeds: [createEmbed({ context: interaction, description: `✅ Removed ${role} from support roles.`, color: THEME.success })] });
            }
            if (sub === 'list') {
                const rolesList = tickets.support_roles.map(r => `<@&${r}>`).join(', ') || 'None set';
                return interaction.reply({ embeds: [createEmbed({ context: interaction, title: '🎫 Support Roles', description: rolesList, color: THEME.primary })] });
            }
        }

        // Topic Group
        if (group === 'topic') {
            const tickets = getTickets(interaction.guild.id);
            if (!tickets.topics) tickets.topics = [];

            if (sub === 'add') {
                const name = interaction.options.getString('name');
                const emoji = interaction.options.getString('emoji');
                const value = name.replace(/\s+/g, '_').toLowerCase();

                if (tickets.topics.some(t => t.value === value)) return interaction.reply({ embeds: [createEmbed({ context: interaction, description: '⚠️ That topic already exists.', color: THEME.accent })], flags: MessageFlags.Ephemeral });
                if (tickets.topics.length >= 25) return interaction.reply({ embeds: [createEmbed({ context: interaction, description: '⚠️ Maximum of 25 topics reached.', color: THEME.error })], flags: MessageFlags.Ephemeral });

                tickets.topics.push({ name, value, emoji });
                setTickets(interaction.guild.id, tickets);
                return interaction.reply({ embeds: [createEmbed({ context: interaction, description: `✅ Added topic ${emoji} **${name}**.`, color: THEME.success })] });
            }
            if (sub === 'remove') {
                const name = interaction.options.getString('name');
                const value = name.replace(/\s+/g, '_').toLowerCase();
                const initialLength = tickets.topics.length;
                tickets.topics = tickets.topics.filter(t => t.value !== value);
                
                if (tickets.topics.length === initialLength) return interaction.reply({ embeds: [createEmbed({ context: interaction, description: '⚠️ Topic not found.', color: THEME.error })], flags: MessageFlags.Ephemeral });
                
                setTickets(interaction.guild.id, tickets);
                return interaction.reply({ embeds: [createEmbed({ context: interaction, description: `✅ Removed topic **${name}**.`, color: THEME.success })] });
            }
            if (sub === 'list') {
                const topicsList = tickets.topics.map(t => `${t.emoji} **${t.name}** (\`${t.value}\`)`).join('\n') || 'No topics set. Add one with `/ticket topic add`';
                return interaction.reply({ embeds: [createEmbed({ context: interaction, title: '📝 Ticket Topics', description: topicsList, color: THEME.primary })] });
            }
        }
    },

    async handleSelectMenu(interaction, client) {
        if (interaction.customId === 'ticket_topic') {
            const topicValue = interaction.values[0];
            const tickets = getTickets(interaction.guild.id);
            const topicData = (tickets.topics || []).find(t => t.value === topicValue);
            const topicName = topicData ? topicData.name : 'General';

            if (!tickets.category_id) return interaction.reply({ embeds: [createEmbed({ context: interaction, description: '⚠️ Tickets not configured.', color: THEME.error })], flags: MessageFlags.Ephemeral });

            const existing = getActiveTicket(interaction.guild.id, interaction.user.id);
            if (existing) return interaction.reply({ embeds: [createEmbed({ context: interaction, description: '⚠️ You already have an open ticket.', color: THEME.error })], flags: MessageFlags.Ephemeral });

            tickets.count++;
            setTickets(interaction.guild.id, tickets);

            const channelName = `ticket-${topicValue}-${interaction.user.username.replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase() || tickets.count}`;

            try {
                const channel = await interaction.guild.channels.create({
                    name: channelName,
                    type: ChannelType.GuildText,
                    parent: tickets.category_id,
                    permissionOverwrites: [
                        { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                        { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                        { id: client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels] },
                        ...(tickets.support_roles || []).map(rId => ({ id: rId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }))
                    ]
                });

                addActiveTicket(interaction.guild.id, interaction.user.id, channel.id);
                await interaction.reply({ content: `🎫 Your audience has been granted: ${channel}`, flags: MessageFlags.Ephemeral });

                const imageBuffer = await buildTicketWelcomeCard(interaction.member, tickets.count, topicName, client);
                const attachment = new AttachmentBuilder(imageBuffer, { name: 'welcome.png' });

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('claim_ticket').setLabel('✅ Claim').setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId('close_ticket_btn').setLabel('🔒 Close').setStyle(ButtonStyle.Danger)
                );

                const rolePings = (tickets.support_roles || []).map(r => `<@&${r}>`).join(' ').trim();
                await channel.send({ content: `${interaction.user} ${rolePings}`, files: [attachment], components: [row] });

            } catch (error) {
                console.error(error);
                return interaction.reply({ embeds: [createEmbed({ context: interaction, description: '💀 Failed to create ticket.', color: THEME.error })], flags: MessageFlags.Ephemeral });
            }
        }

        if (interaction.customId === 'close_reason') {
            const reason = interaction.values[0];
            const reasonFormatted = reason.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
            await this.closeFinal(interaction, client, reasonFormatted);
        }
    },

    async handleButton(interaction, client) {
        const tickets = getTickets(interaction.guild.id);
        const isSupport = (tickets.support_roles || []).some(r => interaction.member.roles.cache.has(r));
        const isAdmin = interaction.member.permissions.has(PermissionFlagsBits.Administrator);

        if (interaction.customId === 'claim_ticket') {
            if (!isSupport && !isAdmin) return interaction.reply({ embeds: [createEmbed({ context: interaction, description: '⚠️ Only support staff can claim tickets.', color: THEME.error })], flags: MessageFlags.Ephemeral });

            try {
                const overwriteUpdates = (tickets.support_roles || []).map(rId => ({
                    id: rId, deny: [PermissionFlagsBits.SendMessages]
                }));
                for (const ow of overwriteUpdates) {
                    await interaction.channel.permissionOverwrites.edit(ow.id, { SendMessages: false });
                }
                await interaction.channel.permissionOverwrites.edit(interaction.user.id, { SendMessages: true });

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('claimed_ticket').setLabel(`☑️ Claimed by ${interaction.user.username}`).setStyle(ButtonStyle.Secondary).setDisabled(true),
                    new ButtonBuilder().setCustomId('close_ticket_btn').setLabel('🔒 Close').setStyle(ButtonStyle.Danger)
                );
                await interaction.update({ components: [row] });
                await interaction.channel.send({ embeds: [createEmbed({ context: guild, description: `🔒 Ticket claimed and locked by ${interaction.user}.`, color: THEME.success })] });
            } catch (e) {
                console.error(e);
                return interaction.reply({ embeds: [createEmbed({ context: interaction, description: '❌ Failed to claim/lock ticket.', color: THEME.error })], flags: MessageFlags.Ephemeral });
            }
        }

        if (interaction.customId === 'close_ticket_btn') {
            if (!isSupport && !isAdmin) return interaction.reply({ embeds: [createEmbed({ context: interaction, description: '⚠️ Only support staff can close tickets.', color: THEME.error })], flags: MessageFlags.Ephemeral });

            const row = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('close_reason')
                    .setPlaceholder('Select a closing reason...')
                    .addOptions([
                        { label: 'Resolved', value: 'resolved', emoji: '✅' },
                        { label: 'Invalid', value: 'invalid', emoji: '❌' },
                        { label: 'Duplicate', value: 'duplicate', emoji: '♻️' },
                        { label: 'No Response', value: 'no_response', emoji: '⏳' }
                    ])
            );
            await interaction.reply({ content: '🔒 **Please select a reason for closing this ticket:**', components: [row] });
        }

                // Re-open Ticket Button (1 Hour Expiration Check)
        if (interaction.customId.startsWith('reopen_')) {
            // Format: reopen_guildId_userId_timestamp
            const parts = interaction.customId.split('_');
            const guildId = parts[1];
            const ticketUserId = parts[2]; 
            const closeTime = parseInt(parts[3]);
            
            // Fetch the guild since DM interactions don't provide interaction.guild
            const guild = client.guilds.cache.get(guildId);
            if (!guild) return interaction.reply({ content: '⚠️ I am no longer in that server.', flags: MessageFlags.Ephemeral });

            const tickets = getTickets(guildId);
            const oneHour = 3600000; // 1 hour in milliseconds
            
            if (Date.now() - closeTime > oneHour) {
                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('reopen_expired').setLabel('⏳ Re-open Expired').setStyle(ButtonStyle.Secondary).setDisabled(true)
                );
                await interaction.update({ components: [row] });
                return interaction.followUp({ content: '⚠️ This ticket is over 1 hour old and can no longer be re-opened via button. Please create a new one.', flags: MessageFlags.Ephemeral });
            }

            if (!tickets.category_id) return interaction.reply({ embeds: [createEmbed({ context: interaction, description: '⚠️ System not configured.', color: THEME.error })], flags: MessageFlags.Ephemeral });
            
            const existing = getActiveTicket(guildId, interaction.user.id);
            if (existing) return interaction.reply({ embeds: [createEmbed({ context: interaction, description: '⚠️ You already have an open ticket.', color: THEME.error })], flags: MessageFlags.Ephemeral });

            tickets.count++;
            setTickets(guildId, tickets);
            
            try {
                const channel = await guild.channels.create({
                    name: `ticket-reopened-${interaction.user.username.replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase() || tickets.count}`,
                    type: ChannelType.GuildText,
                    parent: tickets.category_id,
                    permissionOverwrites: [
                        { id: guildId, deny: [PermissionFlagsBits.ViewChannel] },
                        { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                        { id: client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels] },
                        ...(tickets.support_roles || []).map(rId => ({ id: rId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }))
                    ]
                });
                
                addActiveTicket(guildId, interaction.user.id, channel.id);
                await interaction.update({ content: `🎫 Your ticket has been re-opened: ${channel}`, components: [] });
                await channel.send(`${interaction.user} This ticket was re-opened. A staff member will be with you shortly.`);
            } catch (error) {
                console.error(error);
                return interaction.reply({ content: '❌ Failed to re-open ticket. Missing permissions or category.', flags: MessageFlags.Ephemeral });
            }
        }
    },

    async closeWithReason(interaction, client) {
        return this.handleButton(interaction, client); 
    },

    async closeFinal(interaction, client, reason) {
        const tickets = getTickets(interaction.guild.id);
        const userId = Object.keys(tickets.active).find(k => tickets.active[k] === interaction.channel.id);
        if (!userId) return interaction.reply({ embeds: [createEmbed({ context: interaction, description: '⚠️ This is not an active ticket channel.', color: THEME.error })] });

        removeActiveTicket(interaction.guild.id, userId);
        await interaction.update({ components: [] }); 

        if (tickets.log_channel_id) {
            const logCh = interaction.guild.channels.cache.get(tickets.log_channel_id);
            if (logCh) {
                const messages = await interaction.channel.messages.fetch({ limit: 100 });
                const transcript = messages.reverse().map(m => `[${m.createdAt.toLocaleString()}] ${m.author.tag}: ${m.content || '(Embed/File)'}`).join('\n');
                const transcriptBuffer = Buffer.from(transcript || 'No messages', 'utf-8');
                const txtAttachment = new AttachmentBuilder(transcriptBuffer, { name: `transcript-${interaction.channel.name}.txt` });

                try {
                    const imageBuffer = await buildTicketClosedCard(interaction.user, tickets.count, reason);
                    const imgAttachment = new AttachmentBuilder(imageBuffer, { name: 'closed.png' });
                    
                    // REMOVED the content property so it doesn't double-post text
                    await logCh.send({ 
                        files: [imgAttachment, txtAttachment] 
                    });
                } catch(e) {
                    console.error(e);
                    // Fallback only if canvas fails
                    await logCh.send({ content: `**Ticket Closed:** <@${userId}> by ${interaction.user.tag}\nReason: ${reason}`, files: [txtAttachment] });
                }
            }
        }

         const user = await client.users.fetch(userId).catch(() => null);
        if (user) {
            // Inject guildId and userId into the custom ID so DM interactions work
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`reopen_${interaction.guild.id}_${userId}_${Date.now()}`).setLabel('🔓 Re-open Ticket').setStyle(ButtonStyle.Primary)
            );
            await user.send({ 
                embeds: [createEmbed({ 
                    title: '🎫 Ticket Closed', 
                    description: `Your ticket in **${interaction.guild.name}** was closed.\n**Reason:** ${reason}\nYou have **1 hour** to re-open it.`, 
                    color: THEME.accent 
                })], 
                components: [row] 
            }).catch(() => {}); 
        }

        await interaction.channel.send({ embeds: [createEmbed({ context: guild, description: `🔒 This ticket has been closed for: **${reason}**. Deleting in 5 seconds...`, color: THEME.accent })] });
        setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
    },

    async addUser(interaction) {
        const user = interaction.options.getUser('user');
        const tickets = getTickets(interaction.guild.id);
        const isSupport = (tickets.support_roles || []).some(r => interaction.member.roles.cache.has(r));
        const isAdmin = interaction.member.permissions.has(PermissionFlagsBits.Administrator);

        if (!isSupport && !isAdmin) return interaction.reply({ embeds: [createEmbed({ context: interaction, description: '⚠️ Only staff can add users.', color: THEME.error })], flags: MessageFlags.Ephemeral });

        try {
            await interaction.channel.permissionOverwrites.edit(user.id, { ViewChannel: true, SendMessages: true });
            return interaction.reply({ embeds: [createEmbed({ context: interaction, description: `✅ Added ${user} to the ticket.`, color: THEME.success })] });
        } catch {
            return interaction.reply({ embeds: [createEmbed({ context: interaction, description: '❌ Failed to add user.', color: THEME.error })], flags: MessageFlags.Ephemeral });
        }
    },

    async removeUser(interaction) {
        const user = interaction.options.getUser('user');
        const tickets = getTickets(interaction.guild.id);
        const isSupport = (tickets.support_roles || []).some(r => interaction.member.roles.cache.has(r));
        const isAdmin = interaction.member.permissions.has(PermissionFlagsBits.Administrator);

        if (!isSupport && !isAdmin) return interaction.reply({ embeds: [createEmbed({ context: interaction, description: '⚠️ Only staff can remove users.', color: THEME.error })], flags: MessageFlags.Ephemeral });

        try {
            await interaction.channel.permissionOverwrites.edit(user.id, { ViewChannel: false, SendMessages: false });
            return interaction.reply({ embeds: [createEmbed({ context: interaction, description: `✅ Removed ${user} from the ticket.`, color: THEME.success })] });
        } catch {
            return interaction.reply({ embeds: [createEmbed({ context: interaction, description: '❌ Failed to remove user.', color: THEME.error })], flags: MessageFlags.Ephemeral });
        }
    },
};