const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createEmbed, THEME, modLog } = require('../../utils/embeds');

module.exports = {
    name: 'lock',
    description: 'Seal a channel shut',
    category: 'moderation',
    usage: 'lock [channel]',
    permissions: ['ManageChannels'],
    data: new SlashCommandBuilder()
        .setName('lock')
        .setDescription('Seal a channel shut')
        .addChannelOption(o => o.setName('channel').setDescription('Channel to seal'))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    async execute(message, args, client) {
        const channel = message.mentions.channels.first() || message.channel;
        return this.run(client, message.guild, channel, message.member, message);
    },

    async interact(interaction, client) {
        const channel = interaction.options.getChannel('channel') || interaction.channel;
        return this.run(client, interaction.guild, channel, interaction.member, interaction);
    },

    async run(client, guild, channel, moderator, context) {
        await channel.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: false });

        modLog(client, guild, createEmbed({
            title: '🔒 Channel Locked',
            description: `**Channel:** ${channel}\n**Moderator:** ${moderator.user.tag}`,
            color: THEME.accent,
        }));

        return context.reply({ embeds: [createEmbed({ description: `🔒 ${channel} has been sealed shut by divine authority.`, color: THEME.primary })] });
    },
};
