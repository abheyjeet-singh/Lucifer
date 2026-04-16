const { REST, Routes } = require('discord.js');
const logger = require('../utils/logger');

async function registerSlashCommands(slashData, clientId, token) {
    const rest = new REST({ version: '10' }).setToken(token);

    try {
        logger.info('Registering slash commands globally...');
        await rest.put(Routes.applicationCommands(clientId), { body: slashData });
        logger.success(`Registered ${slashData.length} slash commands.`);
    } catch (error) {
        logger.error(`Slash registration failed: ${error.message}`);
    }
}

module.exports = { registerSlashCommands };
