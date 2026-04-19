const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createEmbed, THEME } = require('../../utils/embeds');
const { getAllShips, updateShipPercentage, removeShip, getShip } = require('../../database/db');

module.exports = {
    name: 'ships',
    description: 'Manage the server\'s celestial ships',
    category: 'utility',
    permissions: ['Administrator'],
    data: new SlashCommandBuilder()
        .setName('ships')
        .setDescription('Owner: Manage server ship data')
        .addSubcommand(sc => sc.setName('list').setDescription('View all shipped couples in the server'))
        .addSubcommand(sc => sc.setName('edit').setDescription('Edit a ship percentage')
            .addUserOption(o => o.setName('user1').setDescription('First user').setRequired(true))
            .addUserOption(o => o.setName('user2').setDescription('Second user').setRequired(true))
            .addIntegerOption(o => o.setName('percentage').setDescription('New percentage (0-100)').setMinValue(0).setMaxValue(100).setRequired(true)))
        .addSubcommand(sc => sc.setName('remove').setDescription('Remove a ship from the records')
            .addUserOption(o => o.setName('user1').setDescription('First user').setRequired(true))
            .addUserOption(o => o.setName('user2').setDescription('Second user').setRequired(true)))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(message, args, client) { return message.reply({ embeds: [createEmbed({ context: message, description: '⚠️ Use `/ships` slash commands.', color: THEME.error })] }); },

    async interact(interaction, client) {
        const sub = interaction.options.getSubcommand();

        if (sub === 'list') {
            await interaction.deferReply({ flags: 64 }); // Defer because fetching users takes a moment
            
            const ships = getAllShips(interaction.guild.id);
            if (ships.length === 0) return interaction.editReply({ embeds: [createEmbed({ context: guild, description: '💕 No ships found in this realm.', color: THEME.accent })] });

            const lines = [];
            for (const ship of ships.slice(0, 15)) {
                // Fetch actual usernames instead of showing raw <@ID>
                const user1 = await client.users.fetch(ship.user_id1).catch(() => null);
                const user2 = await client.users.fetch(ship.user_id2).catch(() => null);
                
                const name1 = user1 ? user1.username : 'Unknown Soul';
                const name2 = user2 ? user2.username : 'Unknown Soul';
                
                lines.push(`💕 **${name1}** x **${name2}** = **${ship.percentage}%**`);
            }

            return interaction.editReply({ embeds: [createEmbed({ 
                title: '💕 Celestial Ship Registry', 
                description: lines.join('\n'), 
                color: THEME.primary 
            })] });
        }

        if (sub === 'edit') {
            const user1 = interaction.options.getUser('user1');
            const user2 = interaction.options.getUser('user2');
            const newPercentage = interaction.options.getInteger('percentage');

            const existing = getShip(interaction.guild.id, user1.id, user2.id);
            if (!existing) return interaction.reply({ embeds: [createEmbed({ context: interaction, description: '❌ That ship does not exist in the registry.', color: THEME.error })], flags: 64 });

            updateShipPercentage(interaction.guild.id, user1.id, user2.id, newPercentage);
            return interaction.reply({ embeds: [createEmbed({ context: interaction, description: `✅ Ship updated: **${user1.username}** x **${user2.username}** is now **${newPercentage}%**`, color: THEME.success })], flags: 64 });
        }

        if (sub === 'remove') {
            const user1 = interaction.options.getUser('user1');
            const user2 = interaction.options.getUser('user2');

            const existing = getShip(interaction.guild.id, user1.id, user2.id);
            if (!existing) return interaction.reply({ embeds: [createEmbed({ context: interaction, description: '❌ That ship does not exist.', color: THEME.error })], flags: 64 });

            removeShip(interaction.guild.id, user1.id, user2.id);
            return interaction.reply({ embeds: [createEmbed({ context: interaction, description: `💔 Ship dissolved: **${user1.username}** x **${user2.username}**`, color: THEME.accent })], flags: 64 });
        }
    }
};