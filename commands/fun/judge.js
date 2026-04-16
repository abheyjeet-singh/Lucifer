const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, THEME } = require('../../utils/embeds');

const SINS = ['Pride', 'Greed', 'Lust', 'Envy', 'Gluttony', 'Wrath', 'Sloth'];
const VERDICTS = [
    'Guilty. Eternal fire awaits.',
    'Not guilty. Off you go... for now.',
    'Guilty. A thousand years of torment.',
    'Not guilty. The Devil is merciful today.',
    'Guilty. Your soul belongs to me.',
    'Not guilty. But I\'ll be watching.',
    'Guilty. The flames hunger for you.',
    'Not guilty. Consider this a miracle.',
    'Guilty. Your punishment is... irony.',
    'Not guilty. Someone else takes your place.',
];

module.exports = {
    name: 'judge',
    description: 'Let Lucifer judge a soul',
    category: 'fun',
    usage: 'judge [@user]',
    permissions: [],
    data: new SlashCommandBuilder()
        .setName('judge')
        .setDescription('Let Lucifer judge a soul')
        .addUserOption(o => o.setName('user').setDescription('The soul to judge').setRequired(true)),

    async execute(message, args, client) {
        const target = message.mentions.users.first() || message.author;
        return this.run(client, target, message);
    },

    async interact(interaction, client) {
        const target = interaction.options.getUser('user');
        return this.run(client, target, interaction);
    },

    async run(client, target, context) {
        const sin = SINS[Math.floor(Math.random() * SINS.length)];
        const verdict = VERDICTS[Math.floor(Math.random() * VERDICTS.length)];

        return context.reply({ embeds: [createEmbed({
            title: '⚖️ Divine Judgment',
            description: `**Defendant:** ${target}\n**Sin:** ${sin}\n**Verdict:** ${verdict}`,
            color: THEME.secondary,
            thumbnail: target.displayAvatarURL({ size: 256 }),
        })] });
    },
};
