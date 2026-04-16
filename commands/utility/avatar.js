const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, THEME } = require('../../utils/embeds');

module.exports = {
    name: 'avatar',
    description: "Admire a soul's visage",
    category: 'utility',
    usage: 'avatar [@user]',
    permissions: [],
    data: new SlashCommandBuilder()
        .setName('avatar')
        .setDescription("Admire a soul's visage")
        .addUserOption(o => o.setName('user').setDescription('The soul to admire')),

    async execute(message, args, client) {
        const target = message.mentions.users.first() || message.author;
        return this.run(client, target, message);
    },

    async interact(interaction, client) {
        const target = interaction.options.getUser('user') || interaction.user;
        return this.run(client, target, interaction);
    },

    async run(client, target, context) {
        return context.reply({ embeds: [createEmbed({
            title: `🖼️ ${target.tag}'s Visage`,
            image: target.displayAvatarURL({ size: 1024, dynamic: true }),
            color: THEME.celestial,
        })] });
    },
};
