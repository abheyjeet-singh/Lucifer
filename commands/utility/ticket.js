const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits: PFB } = require('discord.js');
const { createEmbed, THEME, modLog } = require('../../utils/embeds');
const { getTickets, setTickets, addActiveTicket, removeActiveTicket, getActiveTicket } = require('../../database/db');

module.exports = {
    name: 'ticket',
    description: 'Set up the Prayer Box (Tickets)',
    category: 'utility',
    usage: 'ticket setup <category> <log_channel>',
    permissions: ['Administrator'],
    data: new SlashCommandBuilder()
        .setName('ticket')
        .setDescription('Set up the Prayer Box (Tickets)')
        .addSubcommandGroup(grp => grp.setName('setup').setDescription('Configure tickets')
            .addSubcommand(sc => sc.setName('panel').setDescription('Create the ticket panel').addChannelOption(o => o.setName('channel').setDescription('Channel for the panel').addChannelTypes(ChannelType.GuildText).setRequired(true)))
            .addSubcommand(sc => sc.setName('config').setDescription('Set category and log channel').addChannelOption(o => o.setName('category').setDescription('Category for tickets').addChannelTypes(ChannelType.GuildCategory).setRequired(true)).addChannelOption(o => o.setName('log_channel').setDescription('Channel for transcripts').addChannelTypes(ChannelType.GuildText).setRequired(true)))
            .addSubcommand(sc => sc.setName('off').setDescription('Disable tickets')))
        .addSubcommand(sc => sc.setName('close').setDescription('Close the current ticket'))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(message, args, client) { return message.reply({ embeds: [createEmbed({ description: '⚠️ Use `/ticket` slash commands.', color: THEME.error })] }); },

    async interact(interaction, client) {
        const group = interaction.options.getSubcommandGroup(false);
        const sub = interaction.options.getSubcommand();

        if (sub === 'close') return this.close(interaction, client);
        if (sub === 'off') {
            setTickets(interaction.guild.id, { category_id: null, log_channel_id: null, count: 0, active: {} });
            return interaction.reply({ embeds: [createEmbed({ description: '🎫 Ticket system disabled.', color: THEME.accent })] });
        }
        if (sub === 'config') {
            const category = interaction.options.getChannel('category');
            const logCh = interaction.options.getChannel('log_channel');
            const tickets = getTickets(interaction.guild.id);
            tickets.category_id = category.id;
            tickets.log_channel_id = logCh.id;
            setTickets(interaction.guild.id, tickets);
            return interaction.reply({ embeds: [createEmbed({ description: `🎫 Config set!\n**Category:** ${category}\n**Logs:** ${logCh}`, color: THEME.success })] });
        }
        if (sub === 'panel') {
            const channel = interaction.options.getChannel('channel');
            const embed = createEmbed({
                title: '🎫 The Prayer Box',
                description: 'Need to speak to the High Council? Click the button below to open a private prayer (ticket).',
                color: THEME.celestial,
            });
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('create_ticket').setLabel('🎫 Open Prayer').setStyle(ButtonStyle.Primary)
            );
            await channel.send({ embeds: [embed], components: [row] });
            return interaction.reply({ embeds: [createEmbed({ description: `🎫 Ticket panel created in ${channel}.`, color: THEME.success })] });
        }
    },

    async handleButton(interaction, client) {
        const tickets = getTickets(interaction.guild.id);
        if (!tickets.category_id) return interaction.reply({ embeds: [createEmbed({ description: '⚠️ Tickets are not configured. An admin must use `/ticket setup config`.', color: THEME.error })], flags: 64 });

        const existing = getActiveTicket(interaction.guild.id, interaction.user.id);
        if (existing) return interaction.reply({ embeds: [createEmbed({ description: '⚠️ You already have an open prayer.', color: THEME.error })], flags: 64 });

        tickets.count++;
        setTickets(interaction.guild.id, tickets);

        try {
            const channel = await interaction.guild.channels.create({
                name: `prayer-${tickets.count}`,
                type: ChannelType.GuildText,
                parent: tickets.category_id,
                permissionOverwrites: [
                    { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                    { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                    { id: client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels] }
                ]
            });

            addActiveTicket(interaction.guild.id, interaction.user.id, channel.id);
            await interaction.reply({ embeds: [createEmbed({ description: `🎫 Prayer created: ${channel}`, color: THEME.success })], flags: 64 });

            await channel.send({ content: `${interaction.user}`, embeds: [createEmbed({ description: `Welcome ${interaction.user}. The High Council is listening.\nDescribe your prayer, and a member of the council will respond shortly.\n\nUse \`/ticket close\` when resolved.` })] });
        } catch (error) {
            console.error(error);
            return interaction.reply({ embeds: [createEmbed({ description: '💀 Failed to create prayer.', color: THEME.error })], flags: 64 });
        }
    },

    async close(interaction, client) {
        const tickets = getTickets(interaction.guild.id);
        const userId = Object.keys(tickets.active).find(k => tickets.active[k] === interaction.channel.id);
        if (!userId) return interaction.reply({ embeds: [createEmbed({ description: '⚠️ This is not an active prayer channel.', color: THEME.error })] });

        removeActiveTicket(interaction.guild.id, userId);

        // Send transcript to log channel
        if (tickets.log_channel_id) {
            const logCh = interaction.guild.channels.cache.get(tickets.log_channel_id);
            if (logCh) {
                const messages = await interaction.channel.messages.fetch({ limit: 100 });
                const transcript = messages.reverse().map(m => `[${m.createdAt.toLocaleString()}] ${m.author.tag}: ${m.content || '(Embed/File)'}`).join('\n');
                
                await logCh.send({ embeds: [createEmbed({
                    title: `🎫 Prayer Closed: #${interaction.channel.name}`,
                    description: `**User:** <@${userId}>\n**Closed By:** ${interaction.user.tag}\n\n**Transcript:**\n\`\`\`${transcript.substring(0, 3900) || 'No messages'}\`\`\``,
                    color: THEME.accent
                })] }).catch(() => {});
            }
        }

        await interaction.reply({ embeds: [createEmbed({ description: '🎫 This prayer has been closed. Deleting in 5 seconds...', color: THEME.accent })] });
        setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
    },
};
