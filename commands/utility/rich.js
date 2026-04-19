const { SlashCommandBuilder, AttachmentBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createEmbed, THEME } = require('../../utils/embeds');
const { getEconomyLeaderboard } = require('../../database/db');
const { buildLeaderboardCard } = require('../../utils/canvasBuilder');

module.exports = {
    name: 'rich',
    description: 'View the economy leaderboard',
    aliases: ['leaderboard', 'lb'],
    data: new SlashCommandBuilder()
        .setName('rich')
        .setDescription('View the richest users in the server')
        .addStringOption(o => o.setName('advance')
            .setDescription('Enable pagination to see more ranks?')
            .addChoices(
                { name: 'Yes', value: 'yes' },
                { name: 'No', value: 'no' }
            )),

    async execute(message, args, client) {
        const advanceArg = args[0]?.toLowerCase();
        const isAdvanced = advanceArg === 'yes' || advanceArg === 'y';
        
        let currentPage = 1;
        const loadData = async (page) => {
            const offset = (page - 1) * 10;
            return getEconomyLeaderboard(message.guild.id, 10, offset);
        };

        const leaderboard = await loadData(currentPage);
        if (!leaderboard.length) {
            return message.reply({ embeds: [createEmbed({ context: message, description: '❌ The vaults are empty! No one has earned any coins yet.', color: THEME.error })] });
        }

        const generatePayload = async (page) => {
            const lbData = await loadData(page);
            if (!lbData.length) return null; // Out of bounds

            const imageBuffer = await buildLeaderboardCard(client, message.guild, lbData, page);
            const attachment = new AttachmentBuilder(imageBuffer, { name: `leaderboard-${page}.png` });
            
            const components = [];
            if (isAdvanced) {
                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('rich_prev').setLabel('⬅️ Previous').setStyle(ButtonStyle.Secondary).setDisabled(page === 1),
                    new ButtonBuilder().setCustomId('rich_next').setLabel('➡️ Next').setStyle(ButtonStyle.Secondary).setDisabled(lbData.length < 10)
                );
                components.push(row);
            }

            return { files: [attachment], components };
        };

        try {
            const initialPayload = await generatePayload(currentPage);
            const replyMessage = await message.reply(initialPayload);

            if (!isAdvanced) return;

            const filter = i => i.customId.startsWith('rich_') && i.user.id === message.author.id;
            const collector = replyMessage.createMessageComponentCollector({ filter, time: 60000 });

            collector.on('collect', async i => {
                if (i.customId === 'rich_next') currentPage++;
                else if (i.customId === 'rich_prev') currentPage--;

                const newPayload = await generatePayload(currentPage);
                if (!newPayload) { 
                    currentPage = i.customId === 'rich_next' ? currentPage - 1 : currentPage + 1;
                    return i.reply({ content: 'No more data!', ephemeral: true }); 
                }
                
                await i.update(newPayload);
            });

            collector.on('end', async () => {
                const disabledRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('rich_prev').setLabel('⬅️ Previous').setStyle(ButtonStyle.Secondary).setDisabled(true),
                    new ButtonBuilder().setCustomId('rich_next').setLabel('➡️ Next').setStyle(ButtonStyle.Secondary).setDisabled(true)
                );
                await replyMessage.edit({ components: [disabledRow] }).catch(() => {});
            });

        } catch (e) {
            console.error('Leaderboard Canvas Error:', e);
            return message.reply({ embeds: [createEmbed({ context: message, description: '❌ Failed to generate the leaderboard canvas.', color: THEME.error })] });
        }
    },

    async interact(interaction, client) {
        const isAdvanced = interaction.options.getString('advance') === 'yes';
        
        let currentPage = 1;
        const loadData = async (page) => {
            const offset = (page - 1) * 10;
            return getEconomyLeaderboard(interaction.guild.id, 10, offset);
        };

        const leaderboard = await loadData(currentPage);
        if (!leaderboard.length) {
            return interaction.reply({ embeds: [createEmbed({ context: interaction, description: '❌ The vaults are empty! No one has earned any coins yet.', color: THEME.error })], flags: 64 });
        }

        await interaction.deferReply();

        const generatePayload = async (page) => {
            const lbData = await loadData(page);
            if (!lbData.length) return null;

            const imageBuffer = await buildLeaderboardCard(client, interaction.guild, lbData, page);
            const attachment = new AttachmentBuilder(imageBuffer, { name: `leaderboard-${page}.png` });
            
            const components = [];
            if (isAdvanced) {
                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('rich_prev').setLabel('⬅️ Previous').setStyle(ButtonStyle.Secondary).setDisabled(page === 1),
                    new ButtonBuilder().setCustomId('rich_next').setLabel('➡️ Next').setStyle(ButtonStyle.Secondary).setDisabled(lbData.length < 10)
                );
                components.push(row);
            }

            return { files: [attachment], components };
        };

        try {
            const initialPayload = await generatePayload(currentPage);
            const replyMessage = await interaction.editReply(initialPayload);

            if (!isAdvanced) return;

            const filter = i => i.customId.startsWith('rich_') && i.user.id === interaction.user.id;
            const collector = replyMessage.createMessageComponentCollector({ filter, time: 60000 });

            collector.on('collect', async i => {
                if (i.customId === 'rich_next') currentPage++;
                else if (i.customId === 'rich_prev') currentPage--;

                const newPayload = await generatePayload(currentPage);
                if (!newPayload) { 
                    currentPage = i.customId === 'rich_next' ? currentPage - 1 : currentPage + 1;
                    return i.reply({ content: 'No more data!', ephemeral: true }); 
                }
                
                await i.update(newPayload);
            });

            collector.on('end', async () => {
                const disabledRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('rich_prev').setLabel('⬅️ Previous').setStyle(ButtonStyle.Secondary).setDisabled(true),
                    new ButtonBuilder().setCustomId('rich_next').setLabel('➡️ Next').setStyle(ButtonStyle.Secondary).setDisabled(true)
                );
                await interaction.editReply({ components: [disabledRow] }).catch(() => {});
            });

        } catch (e) {
            console.error('Leaderboard Canvas Error:', e);
            return interaction.editReply({ embeds: [createEmbed({ context: guild, description: '❌ Failed to generate the leaderboard canvas.', color: THEME.error })] });
        }
    }
};