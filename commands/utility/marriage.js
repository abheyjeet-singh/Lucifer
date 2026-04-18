const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { createEmbed, THEME } = require('../../utils/embeds');
const { getUserEconomy, updateUserEconomy, getMarriage, marryUsers, divorceUsers } = require('../../database/db');

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
              .setDescription('Check your or someone else\'s marriage info')
              .addUserOption(o => o.setName('user').setDescription('Whose marriage to check'))),

    async execute(message, args, client) {
        const sub = args[0]?.toLowerCase();
        if (sub === 'propose') return this.propose(client, message.guild, message.author, message.mentions.users.first(), message);
        if (sub === 'divorce') return this.divorceUser(client, message.guild, message.author, message);
        return this.info(client, message.guild, message.author, message.mentions.users.first(), message);
    },

    async interact(interaction, client) {
        const sub = interaction.options.getSubcommand();
        if (sub === 'propose') return this.propose(client, interaction.guild, interaction.user, interaction.options.getUser('user'), interaction);
        if (sub === 'divorce') return this.divorceUser(client, interaction.guild, interaction.user, interaction);
        return this.info(client, interaction.guild, interaction.user, interaction.options.getUser('user'), interaction);
    },

    async propose(client, guild, author, target, context) {
        const isInteraction = !!context.isCommand;
        
        if (!target) return context.reply({ embeds: [createEmbed({ description: '⚠️ You must mention someone to propose to!', color: THEME.error })], ephemeral: true });
        if (target.id === author.id) return context.reply({ embeds: [createEmbed({ description: '⚠️ You cannot marry yourself, mortal.', color: THEME.error })], ephemeral: true });
        if (target.bot) return context.reply({ embeds: [createEmbed({ description: '⚠️ Even the Devil cannot bind a bot in holy matrimony.', color: THEME.error })], ephemeral: true });

        // Check if either is already married
        const authorMarriage = getMarriage(author.id);
        if (authorMarriage) return context.reply({ embeds: [createEmbed({ description: `💍 You are already married to <@${authorMarriage.partner_id}>! Divorce first if you wish to remarry.`, color: THEME.error })], ephemeral: true });

        const targetMarriage = getMarriage(target.id);
        if (targetMarriage) return context.reply({ embeds: [createEmbed({ description: `💍 <@${target.id}> is already married to <@${targetMarriage.partner_id}>!`, color: THEME.error })], ephemeral: true });

        // Check if author has enough money
        const eco = getUserEconomy(guild.id, author.id);
        if (eco.wallet < PROPOSAL_COST) return context.reply({ embeds: [createEmbed({ description: `💸 You need **${PROPOSAL_COST.toLocaleString()} LC** in your wallet to buy the Infernal Ring!`, color: THEME.error })], ephemeral: true });

        // Send Proposal Message with Buttons
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder().setCustomId('marry_accept').setLabel('💍 Accept').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('marry_reject').setLabel('💀 Reject').setStyle(ButtonStyle.Danger)
            );

        const proposeMsg = await context.reply({ 
            content: `💍 **${author}** is proposing to **${target}**! (Cost: ${PROPOSAL_COST.toLocaleString()} LC)\n<@${target.id}>, do you accept?`, 
            components: [row],
            fetchReply: true 
        });

        // Collector for button clicks
        const filter = i => i.user.id === target.id && (i.customId === 'marry_accept' || i.customId === 'marry_reject');
        const collector = proposeMsg.createMessageComponentCollector({ filter, componentType: ComponentType.Button, time: 60000 });

        collector.on('collect', async i => {
            if (i.customId === 'marry_accept') {
                // Double check target didn't get married in the 60s window
                const tMarriage = getMarriage(target.id);
                if (tMarriage) {
                    await i.update({ content: `💔 <@${target.id}> got married to someone else while deciding!`, components: [], embeds: [] });
                    return;
                }

                // Deduct money and marry
                const currentEco = getUserEconomy(guild.id, author.id);
                if (currentEco.wallet < PROPOSAL_COST) {
                    await i.update({ content: `💔 <@${author.id}> doesn't have enough Lux Coins anymore!`, components: [], embeds: [] });
                    return;
                }
                currentEco.wallet -= PROPOSAL_COST;
                updateUserEconomy(guild.id, author.id, currentEco);
                marryUsers(author.id, target.id);

                await i.update({ 
                    content: `🎉 **${author}** and **${target}** are now married! 💍🔥`, 
                    components: [],
                    embeds: [createEmbed({ description: `The Devil has bound your souls. May your reign be long and prosperous! (Married users get a +10% daily bonus!)`, color: THEME.success })]
                });
            } else {
                await i.update({ content: `💔 **${target}** rejected **${author}'s** proposal. Ouch.`, components: [], embeds: [] });
            }
        });

        collector.on('end', collected => {
            if (collected.size === 0) {
                proposeMsg.edit({ content: `⏳ Proposal timed out. <@${target.id}> didn't respond.`, components: [], embeds: [] }).catch(() => {});
            }
        });
    },

    async divorceUser(client, guild, author, context) {
        const marriage = getMarriage(author.id);
        if (!marriage) return context.reply({ embeds: [createEmbed({ description: '💔 You are not married.', color: THEME.error })] });

        const eco = getUserEconomy(guild.id, author.id);
        if (eco.wallet < DIVORCE_COST) return context.reply({ embeds: [createEmbed({ description: `💸 You need **${DIVORCE_COST.toLocaleString()} LC** to pay the Demonic Lawyer!`, color: THEME.error })] });

        eco.wallet -= DIVORCE_COST;
        updateUserEconomy(guild.id, author.id, eco);
        divorceUsers(author.id, marriage.partner_id);

        return context.reply({ embeds: [createEmbed({ 
            title: '💔 Divorce Finalized',
            description: `**${author}** and **<@${marriage.partner_id}>** are no longer bound.\n💸 **${DIVORCE_COST.toLocaleString()} LC** deducted for legal fees.`,
            color: THEME.accent
        })] });
    },

    async info(client, guild, author, target, context) {
        const user = target || author;
        const marriage = getMarriage(user.id);
        
        if (!marriage) {
            return context.reply({ embeds: [createEmbed({ 
                description: `💍 **${user.username}** is single and ready to mingle in Hell.`, 
                color: THEME.celestial 
            })] });
        }

        const marryDate = Math.floor(marriage.timestamp / 1000);
        return context.reply({ embeds: [createEmbed({ 
            title: `💍 ${user.username}'s Marriage`,
            description: `**Partner:** <@${marriage.partner_id}>\n**Married Since:** <t:${marryDate}:R>\n\n*(Married users get +10% daily coins!)*`,
            color: THEME.primary 
        })] });
    }
};