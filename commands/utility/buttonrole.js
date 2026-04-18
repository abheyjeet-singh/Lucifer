const { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createEmbed, THEME } = require('../../utils/embeds');
const { addButtonRole, getButtonRoles } = require('../../database/db');

module.exports = {
    name: 'buttonrole',
    description: 'Create a message with clickable role buttons',
    aliases: ['br'],
    permissions: ['ManageRoles'],
    data: new SlashCommandBuilder()
        .setName('buttonrole')
        .setDescription('Create a message with clickable role buttons')
        .addChannelOption(o =>
            o.setName('channel')
             .setDescription('Channel to send the button role message in')
             .setRequired(true))
        .addStringOption(o =>
            o.setName('title')
             .setDescription('Title for the embed')
             .setRequired(true))
        .addRoleOption(o =>
            o.setName('role1')
             .setDescription('First role')
             .setRequired(true))
        .addStringOption(o =>
            o.setName('label1')
             .setDescription('Button label for Role 1')
             .setRequired(true))
        .addRoleOption(o =>
            o.setName('role2')
             .setDescription('Second role')
             .setRequired(false))
        .addStringOption(o =>
            o.setName('label2')
             .setDescription('Button label for Role 2')
             .setRequired(false))
        .addRoleOption(o =>
            o.setName('role3')
             .setDescription('Third role')
             .setRequired(false))
        .addStringOption(o =>
            o.setName('label3')
             .setDescription('Button label for Role 3')
             .setRequired(false))
        .addRoleOption(o =>
            o.setName('role4')
             .setDescription('Fourth role')
             .setRequired(false))
        .addStringOption(o =>
            o.setName('label4')
             .setDescription('Button label for Role 4')
             .setRequired(false))
        .addRoleOption(o =>
            o.setName('role5')
             .setDescription('Fifth role')
             .setRequired(false))
        .addStringOption(o =>
            o.setName('label5')
             .setDescription('Button label for Role 5')
             .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

    async execute(message, args, client) {
        return message.reply('⚠️ Please use the `/buttonrole` slash command for this.');
    },

    async interact(interaction, client) {
        const channel = interaction.options.getChannel('channel');
        const title = interaction.options.getString('title');
        
        if (!channel.isTextBased()) {
            return interaction.reply({ embeds: [createEmbed({ description: '⚠️ Please select a text channel.', color: THEME.error })], flags: 64 });
        }

        const rows = [];
        const buttons = [];
        const botMember = interaction.guild.members.me;

        for (let i = 1; i <= 5; i++) {
            const role = interaction.options.getRole(`role${i}`);
            const label = interaction.options.getString(`label${i}`);
            
            if (role && label) {
                if (role.id === interaction.guild.id) {
                    return interaction.reply({ embeds: [createEmbed({ description: '⚠️ Cannot use @everyone.', color: THEME.error })], flags: 64 });
                }
                if (role.position >= botMember.roles.highest.position) {
                    return interaction.reply({ embeds: [createEmbed({ description: `⚠️ I cannot manage **${role.name}** because it is above my highest role.`, color: THEME.error })], flags: 64 });
                }

                const customId = `br_${role.id}`;
                buttons.push(
                    new ButtonBuilder()
                        .setCustomId(customId)
                        .setLabel(label)
                        .setStyle(ButtonStyle.Primary)
                );
            }
        }

        // Discord allows max 5 buttons per row, max 1 row usually needed for simple roles
        // If you have more than 5, we'd split into rows, but this command limits to 5.
        rows.push(new ActionRowBuilder().addComponents(...buttons));

        const embed = createEmbed({
            title: title,
            description: 'Click a button below to get or remove a role!',
            color: THEME.celestial
        });

        try {
            const sentMessage = await channel.send({ embeds: [embed], components: rows });
            
            // Save to database
            for (let i = 1; i <= 5; i++) {
                const role = interaction.options.getRole(`role${i}`);
                if (role) {
                    addButtonRole(sentMessage.id, `br_${role.id}`, role.id);
                }
            }

            return interaction.reply({ embeds: [createEmbed({ description: `✅ Button role message created in ${channel}!`, color: THEME.success })], flags: 64 });
        } catch (error) {
            console.error(error);
            return interaction.reply({ embeds: [createEmbed({ description: '⚠️ Failed to send message. Check my permissions in that channel.', color: THEME.error })], flags: 64 });
        }
    }
};