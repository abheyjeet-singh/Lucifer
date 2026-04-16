const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

function loadEvents(client) {
    const eventsPath = path.join(__dirname, '..', 'events');
    const files = fs.readdirSync(eventsPath).filter(f => f.endsWith('.js'));

    for (const file of files) {
        const event = require(path.join(eventsPath, file));
        const eventName = file.replace('.js', '');

        if (event.once) {
            client.once(eventName, (...args) => event.execute(...args, client));
        } else {
            client.on(eventName, (...args) => event.execute(...args, client));
        }
        logger.success(`Loaded event: ${eventName}`);
    }
}

module.exports = { loadEvents };
