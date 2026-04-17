const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, THEME } = require('../../utils/embeds');

module.exports = {
    name: 'broadcast',
    description: 'Send a message to all server owners (Bot Owner Only)',
    data: new SlashCommandBuilder()
        .setName('broadcast')
        .setDescription('Send a message to all server owners (Bot Owner Only)')
        .addStringOption(o =>
            o.setName('message')
             .setDescription('The announcement to broadcast')
             .setRequired(true)),

    async execute(message, args, client) {
        if (message.author.id !== process.env.BOT_OWNER_ID) return;
        const msg = args.join(' ');
        if (!msg) return message.reply('⚠️ Provide a message.');
        return this.runBroadcast(client, msg, message);
    },

    async interact(interaction, client) {
        if (interaction.user.id !== process.env.BOT_OWNER_ID) {
            return interaction.reply({ embeds: [createEmbed({ description: '🚫 Only the Bot Owner can use this.', color: THEME.error })], flags: 64 });
        }
        const msg = interaction.options.getString('message');
        return this.runBroadcast(client, msg, interaction);
    },

    async runBroadcast(client, msg, context) {
        let success = 0;
        let failed = 0;

        await context.reply({ embeds: [createEmbed({ description: '📢 Broadcasting message to all realm owners...', color: THEME.celestial })] });

        for (const guild of client.guilds.cache.values()) {
            try {
                const owner = await guild.fetchOwner();
                if (owner && !owner.user.bot) {
                    await owner.send({ embeds: [createEmbed({
                        title: `🔥 Message from Lucifer's Creator`,
                        description: msg,
                        color: THEME.primary,
                        footer: { text: `Sent to owners of all connected realms` }
                    })] });
                    success++;
                }
            } catch (e) {
                failed++; // DMs closed
            }
        }

        return context.followUp({ embeds: [createEmbed({
            description: `✅ **Broadcast Complete!**\n\n📬 **Delivered:** ${success}\n🚫 **Failed (DMs closed):** ${failed}`,
            color: THEME.success
        })] });
    }
};