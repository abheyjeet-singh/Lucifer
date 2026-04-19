const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, AttachmentBuilder } = require('discord.js');
const { createEmbed, THEME } = require('../../utils/embeds');
const { getUserEconomy, updateUserEconomy, getMarriage, marryUsers, divorceUsers } = require('../../database/db');
const { buildMarriageCard, buildDivorceCard } = require('../../utils/canvasBuilder');

const PROPOSAL_COST = 1000;
const DIVORCE_COST = 2500;

module.exports = {
    name: 'marriage',
    description: 'Get married, divorced, or check your relationship',
    aliases: ['marry'],
    data: new SlashCommandBuilder()
        .setName('marriage')
        .setDescription('Marriage system')
        .addSubcommand(sc =>
            sc.setName('propose')
              .setDescription(`Propose to a user (Costs ${PROPOSAL_COST.toLocaleString()} LC)`)
              .addUserOption(o => o.setName('user').setDescription('The one you wish to marry').setRequired(true)))
        .addSubcommand(sc =>
            sc.setName('divorce')
              .setDescription(`Divorce your partner (Costs ${DIVORCE_COST.toLocaleString()} LC)`))
        .addSubcommand(sc =>
            sc.setName('info')
              .setDescription('View the visual marriage card')
              .addUserOption(o => o.setName('user').setDescription('Whose marriage to check'))),

    async execute(message, args, client) {
        const sub = args[0]?.toLowerCase();
        if (sub === 'propose') return this.propose(client, message.guild, message.member, message.mentions.members.first(), message.author, message);
        if (sub === 'divorce') return this.divorceUser(client, message.guild, message.member, message.author, message);
        return this.info(client, message.guild, message.author, message);
    },

    async interact(interaction, client) {
        const sub = interaction.options.getSubcommand();
        if (sub === 'propose') return this.propose(client, interaction.guild, interaction.member, interaction.options.getMember('user'), interaction.user, interaction);
        if (sub === 'divorce') return this.divorceUser(client, interaction.guild, interaction.member, interaction.user, interaction);
        return this.info(client, interaction.guild, interaction.options.getUser('user') || interaction.user, interaction);
    },

    async propose(client, guild, member1, member2, authorUser, context) {
        if (!member2) return context.reply({ embeds: [createEmbed({ context: guild, description: '⚠️ You must mention someone to propose to!', color: THEME.error })], flags: 64 });
        if (member2.id === member1.id) return context.reply({ embeds: [createEmbed({ context: guild, description: '⚠️ You cannot marry yourself, mortal.', color: THEME.error })], flags: 64 });
        if (member2.user.bot) return context.reply({ embeds: [createEmbed({ context: guild, description: '⚠️ Even the Devil cannot bind a bot in holy matrimony.', color: THEME.error })], flags: 64 });

        const authorMarriage = getMarriage(authorUser.id);
        if (authorMarriage) return context.reply({ embeds: [createEmbed({ context: guild, description: `💍 You are already married to <@${authorMarriage.partner_id}>!`, color: THEME.error })], flags: 64 });

        const targetMarriage = getMarriage(member2.id);
        if (targetMarriage) return context.reply({ embeds: [createEmbed({ context: guild, description: `💍 <@${member2.id}> is already married!`, color: THEME.error })], flags: 64 });

        const eco = getUserEconomy(guild.id, authorUser.id);
        if (eco.wallet < PROPOSAL_COST) return context.reply({ embeds: [createEmbed({ context: guild, description: `💸 You need **${PROPOSAL_COST.toLocaleString()} LC** to buy the Infernal Ring!`, color: THEME.error })], flags: 64 });

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder().setCustomId('marry_accept').setLabel('💍 Accept').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('marry_reject').setLabel('💀 Reject').setStyle(ButtonStyle.Danger)
            );

        const proposeMsg = await context.reply({ 
            content: `💍 **${authorUser}** is proposing to **${member2.user}**! (Cost: ${PROPOSAL_COST.toLocaleString()} LC)\n<@${member2.id}>, do you accept?`, 
            components: [row],
            fetchReply: true 
        });

        const filter = i => i.user.id === member2.id && (i.customId === 'marry_accept' || i.customId === 'marry_reject');
        const collector = proposeMsg.createMessageComponentCollector({ filter, componentType: ComponentType.Button, time: 60000 });

        collector.on('collect', async i => {
            if (i.customId === 'marry_accept') {
                const tMarriage = getMarriage(member2.id);
                if (tMarriage) return i.update({ content: `💔 <@${member2.id}> got married to someone else while deciding!`, components: [], embeds: [] });

                const currentEco = getUserEconomy(guild.id, authorUser.id);
                if (currentEco.wallet < PROPOSAL_COST) return i.update({ content: `💔 <@${authorUser.id}> doesn't have enough Lux Coins anymore!`, components: [], embeds: [] });

                currentEco.wallet -= PROPOSAL_COST;
                updateUserEconomy(guild.id, authorUser.id, currentEco);
                marryUsers(authorUser.id, member2.id);

                // Generate Marriage Canvas
                try {
                    const imageBuffer = await buildMarriageCard(member1, member2, Date.now());
                    const attachment = new AttachmentBuilder(imageBuffer, { name: 'marriage.png' });
                    await i.update({ content: `🎉 **${authorUser}** and **${member2.user}** are now married!`, components: [], embeds: [], files: [attachment] });
                } catch (e) {
                    console.error(e);
                    await i.update({ content: `🎉 **${authorUser}** and **${member2.user}** are now married!`, components: [], embeds: [] });
                }
            } else {
                await i.update({ content: `💔 **${member2.user}** rejected **${authorUser}'s** proposal.`, components: [], embeds: [] });
            }
        });

        collector.on('end', collected => {
            if (collected.size === 0) {
                proposeMsg.edit({ content: `⏳ Proposal timed out.`, components: [], embeds: [] }).catch(() => {});
            }
        });
    },

    async divorceUser(client, guild, member1, authorUser, context) {
        const marriage = getMarriage(authorUser.id);
        if (!marriage) return context.reply({ embeds: [createEmbed({ context: guild, description: '💔 You are not married.', color: THEME.error })] });

        const eco = getUserEconomy(guild.id, authorUser.id);
        if (eco.wallet < DIVORCE_COST) return context.reply({ embeds: [createEmbed({ context: guild, description: `💸 You need **${DIVORCE_COST.toLocaleString()} LC** to pay the Demonic Lawyer!`, color: THEME.error })] });

        eco.wallet -= DIVORCE_COST;
        updateUserEconomy(guild.id, authorUser.id, eco);
        
        const partnerId = marriage.partner_id;
        divorceUsers(authorUser.id, partnerId);

        // Fetch partner member for canvas
        const member2 = await guild.members.fetch(partnerId).catch(() => null);

        if (member2) {
            try {
                const imageBuffer = await buildDivorceCard(member1, member2, Date.now());
                const attachment = new AttachmentBuilder(imageBuffer, { name: 'divorce.png' });
                return context.reply({ content: `💔 **${authorUser}** and **<@${partnerId}>** are no longer bound.`, files: [attachment] });
            } catch (e) {
                console.error(e);
            }
        }

        // Fallback
        return context.reply({ embeds: [createEmbed({ context: guild, title: '💔 Union Dissolved', description: `**${authorUser}** and **<@${partnerId}>** are no longer bound.\n💸 **${DIVORCE_COST.toLocaleString()} LC** deducted.`, color: THEME.accent })] });
    },

    async info(client, guild, targetUser, context) {
        const marriage = getMarriage(targetUser.id);
        if (!marriage) return context.reply({ embeds: [createEmbed({ context: guild, description: `💍 **${targetUser.username}** is single and ready to mingle in Hell.`, color: THEME.celestial })] });

        const member1 = await guild.members.fetch(targetUser.id).catch(() => null);
        const member2 = await guild.members.fetch(marriage.partner_id).catch(() => null);

        if (!member1 || !member2) return context.reply({ embeds: [createEmbed({ context: guild, description: '❌ Could not fetch members for the card.', color: THEME.error })] });

        try {
            const imageBuffer = await buildMarriageCard(member1, member2, marriage.timestamp);
            const attachment = new AttachmentBuilder(imageBuffer, { name: 'marriage.png' });
            return context.reply({ files: [attachment] });
        } catch (e) {
            console.error(e);
            const marryDate = Math.floor(marriage.timestamp / 1000);
            return context.reply({ embeds: [createEmbed({ context: guild, description: `💍 **${targetUser.username}** is married to **<@${marriage.partner_id}>**\nSince: <t:${marryDate}:R>`, color: THEME.primary })] });
        }
    }
};