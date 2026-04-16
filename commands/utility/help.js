const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { createEmbed, THEME } = require('../../utils/embeds');
const { getPrefix } = require('../../database/db');

module.exports = {
    name: 'help',
    description: 'Open Lucifer\'s Grimoire',
    category: 'utility',
    usage: 'help [command]',
    permissions: [],
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Open Lucifer\'s Grimoire')
        .addStringOption(o => o.setName('command').setDescription('Specific command to learn about')),

    async execute(message, args, client) {
        const cmdName = args[0]?.toLowerCase();
        return this.run(client, message.guild, message.author, cmdName, message);
    },

    async interact(interaction, client) {
        const cmdName = interaction.options.getString('command')?.toLowerCase();
        return this.run(client, interaction.guild, interaction.user, cmdName, interaction);
    },

    async run(client, guild, user, cmdName, context) {
        const prefix = getPrefix(guild.id);

        // ── SPECIFIC COMMAND QUERY ──
        if (cmdName) {
            const cmd = client.commands.get(cmdName);
            if (!cmd) return context.reply({ embeds: [createEmbed({ description: '⚠️ That command does not exist in my grimoire.', color: THEME.error })] });

            return context.reply({ embeds: [createEmbed({
                title: `📖 ${cmd.name}`,
                description: `**Description:** ${cmd.description}\n**Usage:** \`${prefix}${cmd.usage}\`\n**Category:** ${cmd.category}\n**Permissions:** ${cmd.permissions.length ? cmd.permissions.join(', ') : 'None'}`,
                color: THEME.celestial,
            })] });
        }

        // ── PAGINATED GRIMOIRE ──

        // 1. Organize Commands by Category
        const categories = {};
        client.commands.forEach(cmd => {
            if (!categories[cmd.category]) categories[cmd.category] = [];
            categories[cmd.category].push(cmd);
        });

        const categoryNames = {
            moderation: { title: '⚔️ Moderation', desc: 'Commands to judge and rule the sinners.' },
            utility: { title: '🛠️ Utility', desc: 'Tools to manage and inspect the realm.' },
            fun: { title: '🎉 Fun & AI', desc: 'Wisdom, games, and demonic amusement.' }
        };

        // 2. Build Pages
        const pages = [];

        // Page 0: Home
        pages.push(createEmbed({
            title: '🔥 Lucifer\'s Grimoire',
            description: `Welcome, mortal. I am Lucifer Morningstar, the ruler of this realm.\n\nMy prefix here is: \`${prefix}\`\nYou may also use Slash Commands \`/\`.\n\nUse the buttons below to navigate my powers.`,
            fields: Object.entries(categoryNames).map(([key, val]) => ({
                name: val.title,
                value: `${val.desc}\n\`${categories[key]?.length || 0} commands\``,
                inline: true
            })),
            color: THEME.primary,
            thumbnail: client.user.displayAvatarURL({ size: 256 }),
        }));

        // Category Pages
        for (const [key, val] of Object.entries(categoryNames)) {
            const cmds = categories[key] || [];
            pages.push(createEmbed({
                title: val.title,
                description: val.desc,
                fields: cmds.map(c => ({
                    name: `\`${prefix}${c.name}\``,
                    value: `> ${c.description}`,
                    inline: true
                })),
                color: THEME.celestial,
                footer: { text: `🔥 Page ${pages.length} of ${Object.keys(categoryNames).length + 1}` }
            }));
        }

        // 3. Build Navigation Buttons
        const getButtons = (currentPage) => {
            return new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('page_0')
                    .setLabel('🏠 Home')
                    .setStyle(currentPage === 0 ? ButtonStyle.Primary : ButtonStyle.Secondary)
                    .setDisabled(currentPage === 0),
                new ButtonBuilder()
                    .setCustomId('page_1')
                    .setLabel('⚔️ Mod')
                    .setStyle(currentPage === 1 ? ButtonStyle.Primary : ButtonStyle.Secondary)
                    .setDisabled(currentPage === 1),
                new ButtonBuilder()
                    .setCustomId('page_2')
                    .setLabel('🛠️ Utility')
                    .setStyle(currentPage === 2 ? ButtonStyle.Primary : ButtonStyle.Secondary)
                    .setDisabled(currentPage === 2),
                new ButtonBuilder()
                    .setCustomId('page_3')
                    .setLabel('🎉 Fun')
                    .setStyle(currentPage === 3 ? ButtonStyle.Primary : ButtonStyle.Secondary)
                    .setDisabled(currentPage === 3),
            );
        };

        // 4. Send Initial Message
        let currentPage = 0;
        const replyMethod = context.reply ? 'reply' : 'editReply';
        const msg = await context[replyMethod]({ 
            embeds: [pages[currentPage]], 
            components: [getButtons(currentPage)],
            fetchReply: true 
        });

        // 5. Create Button Collector
        const filter = i => i.user.id === user.id;
        const collector = msg.createMessageComponentCollector({ 
            componentType: ComponentType.Button, 
            filter, 
            time: 60000 // 1 minute idle timeout
        });

        collector.on('collect', async i => {
            const page = parseInt(i.customId.split('_')[1]);
            currentPage = page;
            await i.update({ 
                embeds: [pages[currentPage]], 
                components: [getButtons(currentPage)] 
            });
        });

        collector.on('end', async () => {
            try {
                await msg.edit({ components: [getButtons(currentPage).setComponents(getButtons(currentPage).components.map(c => c.setDisabled(true)))] });
            } catch {}
        });
    },
};
