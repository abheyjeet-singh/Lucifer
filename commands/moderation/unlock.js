const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createEmbed, THEME, modLog } = require('../../utils/embeds');

module.exports = {
    name: 'unlock',
    description: 'Break the seal on a channel',
    category: 'moderation',
    usage: 'unlock [channel]',
    permissions: ['ManageChannels'],
    data: new SlashCommandBuilder()
        .setName('unlock')
        .setDescription('Break the seal on a channel')
        .addChannelOption(o => o.setName('channel').setDescription('Channel to unseal'))
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
        await channel.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: null });

        modLog(client, guild, createEmbed({
            title: '🔓 Channel Unlocked',
            description: `**Channel:** ${channel}\n**Moderator:** ${moderator.user.tag}`,
            color: THEME.success,
        }));

        return context.reply({ embeds: [createEmbed({ description: `🔓 ${channel} has been unsealed. Freedom restored.`, color: THEME.success })] });
    },
};
