const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

function loadCommands(client) {
    const commands = new Map();
    const slashData = [];
    const categories = fs.readdirSync(path.join(__dirname, '..', 'commands'));

    for (const category of categories) {
        const categoryPath = path.join(__dirname, '..', 'commands', category);
        if (!fs.statSync(categoryPath).isDirectory()) continue;

        const files = fs.readdirSync(categoryPath).filter(f => f.endsWith('.js'));
        for (const file of files) {
            const command = require(path.join(categoryPath, file));
            commands.set(command.name, command);

            if (command.data) {
                slashData.push(command.data.toJSON());
            }
            logger.success(`Loaded command: ${command.name} [${category}]`);
        }
    }

    client.commands = commands;
    return slashData;
}

module.exports = { loadCommands };
