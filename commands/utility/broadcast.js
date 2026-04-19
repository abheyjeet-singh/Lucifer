const { createEmbed, THEME } = require('../../utils/embeds');

module.exports = {
    name: 'broadcast',
    description: 'Send a message to all server owners (Bot Owner Only)',
    // data: REMOVED — This frees up a slash command slot! Use l!broadcast instead.

    async execute(message, args, client) {
        if (message.author.id !== process.env.BOT_OWNER_ID) return;
        const msg = args.join(' ');
        if (!msg) return message.reply({ embeds: [createEmbed({ context: message, description: '⚠️ Provide a message.', color: THEME.error })] });
        return this.runBroadcast(client, msg, message);
    },

    async runBroadcast(client, msg, context) {
        let success = 0;
        let failed = 0;

        await context.reply({ embeds: [createEmbed({ context: guild, description: '📢 Broadcasting message to all realm owners...', color: THEME.celestial })] });

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