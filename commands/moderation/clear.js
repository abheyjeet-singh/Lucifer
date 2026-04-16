const { SlashCommandBuilder, PermissionFlagsBits, AttachmentBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { createEmbed, THEME, modLog } = require('../../utils/embeds');

module.exports = {
    name: 'clear',
    description: 'Purge messages from this realm',
    category: 'moderation',
    usage: 'clear <amount>',
    permissions: ['ManageMessages'],
    data: new SlashCommandBuilder()
        .setName('clear')
        .setDescription('Purge messages from this realm')
        .addIntegerOption(o => o.setName('amount').setDescription('Number of messages (1-100)').setRequired(true).setMinValue(1).setMaxValue(100))
        .addUserOption(o => o.setName('user').setDescription('Only purge from this user'))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    async execute(message, args, client) {
        const amount = parseInt(args[0]);
        if (isNaN(amount) || amount < 1 || amount > 100) return message.reply({ embeds: [createEmbed({ description: '⚠️ Provide a number between 1-100.', color: THEME.error })] });
        return this.run(client, message.guild, message.channel, message.member, amount, null, message);
    },

    async interact(interaction, client) {
        const amount = interaction.options.getInteger('amount');
        const user = interaction.options.getUser('user');
        return this.run(client, interaction.guild, interaction.channel, interaction.member, amount, user, interaction);
    },

    async run(client, guild, channel, moderator, amount, user, context) {
        const messages = await channel.messages.fetch({ limit: 100 });
        let toDelete;

        if (user) {
            toDelete = messages.filter(m => m.author.id === user.id).first(amount);
        } else {
            toDelete = messages.first(amount);
        }

        if (!toDelete || toDelete.length === 0) return context.reply({ embeds: [createEmbed({ description: '⚠️ No messages found to purge.', color: THEME.error })], ephemeral: true });

        const deleted = await channel.bulkDelete(toDelete, true).catch(() => null);
        const count = deleted ? deleted.size : 0;

        if (count > 0) {
            // ── Generate TXT Transcript ──
            let transcript = `📜 LUCIFER PURGE TRANSCRIPT\n========================================\nChannel: #${channel.name} | Moderator: ${moderator.user.tag} | Date: ${new Date().toLocaleString()}\n========================================\n\n`;
            
            // Sort messages oldest to newest
            const sorted = [...deleted.values()].sort((a, b) => a.createdTimestamp - b.createdTimestamp);
            
            sorted.forEach(msg => {
                const time = msg.createdAt.toLocaleString();
                const author = msg.author ? msg.author.tag : 'Unknown User';
                const content = msg.content || '*No text content*';
                const attachments = msg.attachments.size > 0 ? msg.attachments.map(a => a.url).join(', ') : 'None';
                
                transcript += `[${time}] ${author}: ${content}\n`;
                if (msg.attachments.size > 0) transcript += `  📎 Attachments: ${attachments}\n`;
                transcript += `---\n`;
            });

            transcript += `\n========================================\nTotal Messages Purged: ${count}`;

            // Write to temp file
            const filePath = path.join(__dirname, '..', '..', 'database', `purge-${Date.now()}.txt`);
            fs.writeFileSync(filePath, transcript, 'utf8');

            const attachment = new AttachmentBuilder(filePath, { name: `purge-${channel.name}.txt` });

            await modLog(client, guild, {
                embed: createEmbed({
                    title: '🧹 Messages Purged',
                    description: `**Channel:** ${channel}\n**Amount:** ${count}${user ? `\n**Target:** ${user.tag}` : ''}\n**Moderator:** ${moderator.user.tag}\n\n📄 **Transcript attached below.**`,
                    color: THEME.accent,
                }),
                files: [attachment]
            });

            // Delete temp file after sending
            setTimeout(() => {
                try { fs.unlinkSync(filePath); } catch {}
            }, 5000);
        }

        const reply = await context.reply({ embeds: [createEmbed({ description: `🧹 **${count}** message(s) have been purged from existence.`, color: THEME.success })], fetchReply: true });
        setTimeout(() => reply.deletable ? reply.delete().catch(() => {}) : null, 5000);
    },
};
