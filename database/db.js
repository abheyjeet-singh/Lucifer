const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'lucifer.json');
const defaultData = { guilds: {}, warnings: [], tempbans: [], forced_names: [], dynamic_vcs: [], reaction_roles: [], giveaways: [], sticky_user_roles: {}, economy: {} };

function loadDB() {
    try {
        if (!fs.existsSync(dbPath)) { fs.writeFileSync(dbPath, JSON.stringify(defaultData, null, 2)); return JSON.parse(JSON.stringify(defaultData)); }
        const data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
        if (!data.tempbans) data.tempbans = [];
        if (!data.warnings) data.warnings = [];
        if (!data.forced_names) data.forced_names = [];
        if (!data.dynamic_vcs) data.dynamic_vcs = [];
        if (!data.reaction_roles) data.reaction_roles = [];
        if (!data.guilds) data.guilds = {};
        if (!data.afk) data.afk = {};
        if (!data.stickies) data.stickies = {};
        if (!data.sticky_user_roles) data.sticky_user_roles = {};
        if (!data.auto_delete) data.auto_delete = {};
        if (!data.counting) data.counting = {};
        if (!data.reminders) data.reminders = [];
        if (!data.giveaways) data.giveaways = [];
        if (!data.economy) data.economy = {};
        return data;
    } catch (e) { console.error('DB Load Error:', e); return JSON.parse(JSON.stringify(defaultData)); }
}

function saveDB(data) { try { fs.writeFileSync(dbPath, JSON.stringify(data, null, 2)); } catch (e) { console.error('DB Save Error:', e); } }

function ensureGuild(db, guildId) {
    if (!db.guilds[guildId]) {
        db.guilds[guildId] = {
            prefix: 'l!', log_channel_id: null, mute_role_id: null,
            hardbans: [], ai_usage: { date: null, count: 0 }, dynamic_vc_hub: null,
            automod: { enabled: false, anti_link: false, anti_spam: false, anti_badwords: false, anti_massmention: false, badwords: [] },
            welcome: { channel_id: null, role_id: null, message: null, leave_channel_id: null },
            verify: { channel_id: null, role_id: null, message_id: null },
            tickets: { category_id: null, log_channel_id: null, count: 0, active: {} },
            auto_translate_channels: {},
            starboard_channel_id: null, starboard_emoji: '⭐', starboard_threshold: 3,
            suggestion_channel_id: null,
            counting_channel_id: null,
            sticky_roles_enabled: false,
            sticky_roles_ignore: [],
            auto_responders: [],
            ai_mention_enabled: false,
            booster_roles: [],
            boost_perks_channel_id: null,
            boost_dm_status: {},
            giveaway_ping_role_id: null
        };
    }
    const g = db.guilds[guildId];
    if (!g.hardbans) g.hardbans = [];
    if (!g.ai_usage) g.ai_usage = { date: null, count: 0 };
    if (!g.dynamic_vc_hub) g.dynamic_vc_hub = null;
    if (!g.automod) g.automod = { enabled: false, anti_link: false, anti_spam: false, anti_badwords: false, anti_massmention: false, badwords: [] };
    if (!g.welcome) g.welcome = { channel_id: null, role_id: null, message: null, leave_channel_id: null };
    if (!g.welcome.leave_channel_id) g.welcome.leave_channel_id = null;
    if (!g.verify) g.verify = { channel_id: null, role_id: null, message_id: null };
    if (!g.tickets) g.tickets = { category_id: null, log_channel_id: null, count: 0, active: {} };
    if (!g.auto_translate_channels) g.auto_translate_channels = {};
    if (!g.starboard_channel_id) g.starboard_channel_id = null;
    if (!g.starboard_emoji) g.starboard_emoji = '⭐';
    if (!g.starboard_threshold) g.starboard_threshold = 3;
    if (!g.suggestion_channel_id) g.suggestion_channel_id = null;
    if (!g.counting_channel_id) g.counting_channel_id = null;
    if (g.sticky_roles_enabled === undefined) g.sticky_roles_enabled = false;
    if (!g.sticky_roles_ignore) g.sticky_roles_ignore = [];
    if (!g.auto_responders) g.auto_responders = [];
    if (g.ai_mention_enabled === undefined) g.ai_mention_enabled = false;
    if (!g.booster_roles) g.booster_roles = [];
    if (!g.boost_perks_channel_id) g.boost_perks_channel_id = null;
    if (!g.boost_dm_status) g.boost_dm_status = {};
    if (!g.giveaway_ping_role_id) g.giveaway_ping_role_id = null;
    
    if (g.booster_role_id !== undefined) {
        if (g.booster_role_id && !g.booster_roles.find(b => b.role_id === g.booster_role_id)) {
            g.booster_roles.push({ role_id: g.booster_role_id, bonus_entries: g.booster_bonus_entries || 1 });
        }
        delete g.booster_role_id;
        delete g.booster_bonus_entries;
    }
    saveDB(db); return db;
}

function getPrefix(guildId) { const db = loadDB(); ensureGuild(db, guildId); return db.guilds[guildId].prefix; }
function setPrefix(guildId, prefix) { const db = loadDB(); ensureGuild(db, guildId); db.guilds[guildId].prefix = prefix; saveDB(db); }
function getGuildSettings(guildId) { const db = loadDB(); ensureGuild(db, guildId); return db.guilds[guildId]; }
function setLogChannel(guildId, channelId) { const db = loadDB(); ensureGuild(db, guildId); db.guilds[guildId].log_channel_id = channelId; saveDB(db); }
function removeLogChannel(guildId) { const db = loadDB(); ensureGuild(db, guildId); db.guilds[guildId].log_channel_id = null; saveDB(db); }

function addHardban(guildId, userId) { const db = loadDB(); ensureGuild(db, guildId); if (!db.guilds[guildId].hardbans.includes(userId)) { db.guilds[guildId].hardbans.push(userId); saveDB(db); } }
function removeHardban(guildId, userId) { const db = loadDB(); ensureGuild(db, guildId); db.guilds[guildId].hardbans = db.guilds[guildId].hardbans.filter(id => id !== userId); saveDB(db); }
function isHardbanned(guildId, userId) { const db = loadDB(); ensureGuild(db, guildId); return db.guilds[guildId].hardbans.includes(userId); }

function addTempban(guildId, userId, unbanTimestamp) { const db = loadDB(); db.tempbans = db.tempbans.filter(t => !(t.guild_id === guildId && t.user_id === userId)); db.tempbans.push({ guild_id: guildId, user_id: userId, unban_timestamp: unbanTimestamp }); saveDB(db); }
function removeTempban(guildId, userId) { const db = loadDB(); db.tempbans = db.tempbans.filter(t => !(t.guild_id === guildId && t.user_id === userId)); saveDB(db); }
function getExpiredTempbans(nowTimestamp) { const db = loadDB(); if (!db.tempbans) return []; return db.tempbans.filter(t => t.unban_timestamp <= nowTimestamp); }

const AI_DAILY_LIMIT = 25;
function getAiUsage(guildId) { const db = loadDB(); ensureGuild(db, guildId); const today = new Date().toISOString().split('T')[0]; if (db.guilds[guildId].ai_usage.date !== today) { db.guilds[guildId].ai_usage = { date: today, count: 0 }; saveDB(db); } return db.guilds[guildId].ai_usage.count; }
function incrementAiUsage(guildId) { const db = loadDB(); ensureGuild(db, guildId); const today = new Date().toISOString().split('T')[0]; if (db.guilds[guildId].ai_usage.date !== today) { db.guilds[guildId].ai_usage = { date: today, count: 1 }; } else { db.guilds[guildId].ai_usage.count++; } saveDB(db); return db.guilds[guildId].ai_usage.count; }
function resetAiUsage(guildId) { const db = loadDB(); ensureGuild(db, guildId); db.guilds[guildId].ai_usage = { date: new Date().toISOString().split('T')[0], count: 0 }; saveDB(db); }

function addForcedName(guildId, userId, nickname) { const db = loadDB(); db.forced_names = db.forced_names.filter(f => !(f.guild_id === guildId && f.user_id === userId)); db.forced_names.push({ guild_id: guildId, user_id: userId, nickname: nickname }); saveDB(db); }
function removeForcedName(guildId, userId) { const db = loadDB(); db.forced_names = db.forced_names.filter(f => !(f.guild_id === guildId && f.user_id === userId)); saveDB(db); }
function getForcedName(guildId, userId) { const db = loadDB(); const entry = db.forced_names.find(f => f.guild_id === guildId && f.user_id === userId); return entry ? entry.nickname : null; }

function setDynamicVcHub(guildId, channelId) { const db = loadDB(); ensureGuild(db, guildId); db.guilds[guildId].dynamic_vc_hub = channelId; saveDB(db); }
function getDynamicVcHub(guildId) { const db = loadDB(); ensureGuild(db, guildId); return db.guilds[guildId].dynamic_vc_hub; }
function addDynamicVc(channelId) { const db = loadDB(); if (!db.dynamic_vcs.includes(channelId)) { db.dynamic_vcs.push(channelId); saveDB(db); } }
function removeDynamicVc(channelId) { const db = loadDB(); db.dynamic_vcs = db.dynamic_vcs.filter(id => id !== channelId); saveDB(db); }
function isDynamicVc(channelId) { const db = loadDB(); return db.dynamic_vcs.includes(channelId); }

function getAutomod(guildId) { const db = loadDB(); ensureGuild(db, guildId); return db.guilds[guildId].automod; }
function setAutomod(guildId, data) { const db = loadDB(); ensureGuild(db, guildId); db.guilds[guildId].automod = data; saveDB(db); }

function getWelcome(guildId) { const db = loadDB(); ensureGuild(db, guildId); return db.guilds[guildId].welcome; }
function setWelcome(guildId, data) { const db = loadDB(); ensureGuild(db, guildId); db.guilds[guildId].welcome = data; saveDB(db); }

function getVerify(guildId) { const db = loadDB(); ensureGuild(db, guildId); return db.guilds[guildId].verify; }
function setVerify(guildId, data) { const db = loadDB(); ensureGuild(db, guildId); db.guilds[guildId].verify = data; saveDB(db); }

function getTickets(guildId) { const db = loadDB(); ensureGuild(db, guildId); return db.guilds[guildId].tickets; }
function setTickets(guildId, data) { const db = loadDB(); ensureGuild(db, guildId); db.guilds[guildId].tickets = data; saveDB(db); }
function addActiveTicket(guildId, userId, channelId) { const db = loadDB(); ensureGuild(db, guildId); db.guilds[guildId].tickets.active[userId] = channelId; saveDB(db); }
function removeActiveTicket(guildId, userId) { const db = loadDB(); ensureGuild(db, guildId); delete db.guilds[guildId].tickets.active[userId]; saveDB(db); }
function getActiveTicket(guildId, userId) { const db = loadDB(); ensureGuild(db, guildId); return db.guilds[guildId].tickets.active[userId]; }

function addReactionRole(guildId, messageId, emoji, roleId) { const db = loadDB(); db.reaction_roles.push({ guild_id: guildId, message_id: messageId, emoji, role_id: roleId }); saveDB(db); }
function removeReactionRole(messageId, emoji) { const db = loadDB(); db.reaction_roles = db.reaction_roles.filter(r => !(r.message_id === messageId && r.emoji === emoji)); saveDB(db); }
function getReactionRoles(messageId) { const db = loadDB(); return db.reaction_roles.filter(r => r.message_id === messageId); }

function addAutoTranslateChannel(guildId, channelId, lang) { const db = loadDB(); ensureGuild(db, guildId); db.guilds[guildId].auto_translate_channels[channelId] = lang; saveDB(db); }
function removeAutoTranslateChannel(guildId, channelId) { const db = loadDB(); ensureGuild(db, guildId); delete db.guilds[guildId].auto_translate_channels[channelId]; saveDB(db); }
function getAutoTranslateLang(guildId, channelId) { const db = loadDB(); ensureGuild(db, guildId); return db.guilds[guildId].auto_translate_channels[channelId] || null; }

function setStarboard(guildId, channelId, emoji, threshold) { const db = loadDB(); ensureGuild(db, guildId); db.guilds[guildId].starboard_channel_id = channelId; db.guilds[guildId].starboard_emoji = emoji; db.guilds[guildId].starboard_threshold = threshold; saveDB(db); }
function getStarboard(guildId) { const db = loadDB(); ensureGuild(db, guildId); return { channel_id: db.guilds[guildId].starboard_channel_id, emoji: db.guilds[guildId].starboard_emoji, threshold: db.guilds[guildId].starboard_threshold }; }

function setSuggestionChannel(guildId, channelId) { const db = loadDB(); ensureGuild(db, guildId); db.guilds[guildId].suggestion_channel_id = channelId; saveDB(db); }
function getSuggestionChannel(guildId) { const db = loadDB(); ensureGuild(db, guildId); return db.guilds[guildId].suggestion_channel_id; }

function setCountingChannel(guildId, channelId) { const db = loadDB(); ensureGuild(db, guildId); db.guilds[guildId].counting_channel_id = channelId; db.counting[guildId] = { count: 0, last_user_id: null }; saveDB(db); }
function getCounting(guildId) { const db = loadDB(); return db.counting[guildId] || { count: 0, last_user_id: null }; }
function updateCounting(guildId, count, userId) { const db = loadDB(); db.counting[guildId] = { count, last_user_id: userId }; saveDB(db); }

const stickies = {}; const afk = {}; const autoDelete = {};
function loadCaches() { const db = loadDB(); Object.assign(stickies, db.stickies || {}); Object.assign(afk, db.afk || {}); Object.assign(autoDelete, db.auto_delete || {}); }
function saveCaches() { const db = loadDB(); db.stickies = stickies; db.afk = afk; db.auto_delete = autoDelete; saveDB(db); }
function getSticky(channelId) { return stickies[channelId] || null; }
function setSticky(channelId, content) { stickies[channelId] = content; saveCaches(); }
function removeSticky(channelId) { delete stickies[channelId]; saveCaches(); }
function isAfk(userId, guildId) { return afk[`${guildId}-${userId}`] || null; }
function setAfk(userId, guildId, reason) { afk[`${guildId}-${userId}`] = { reason, timestamp: Date.now() }; saveCaches(); }
function removeAfk(userId, guildId) { delete afk[`${guildId}-${userId}`]; saveCaches(); }
function getAutoDelete(channelId) { return autoDelete[channelId] || null; }
function setAutoDelete(channelId, seconds) { autoDelete[channelId] = seconds; saveCaches(); }
function removeAutoDelete(channelId) { delete autoDelete[channelId]; saveCaches(); }

function addReminder(userId, channelId, timestamp, reason) { const db = loadDB(); const id = Date.now(); db.reminders.push({ id, user_id: userId, channel_id: channelId, timestamp, reason }); saveDB(db); return id; }
function getExpiredReminders(now) { const db = loadDB(); return db.reminders.filter(r => r.timestamp <= now); }
function removeReminder(id) { const db = loadDB(); db.reminders = db.reminders.filter(r => r.id !== id); saveDB(db); }

function getNextId(db) { if (db.warnings.length === 0) return 1; return Math.max(...db.warnings.map(w => w.id)) + 1; }
function addWarning(guildId, userId, moderatorId, reason) { const db = loadDB(); const id = getNextId(db); db.warnings.push({ id, guild_id: guildId, user_id: userId, moderator_id: moderatorId, reason: reason, timestamp: Date.now() }); saveDB(db); }
function getWarnings(guildId, userId) { const db = loadDB(); return db.warnings.filter(w => w.guild_id === guildId && w.user_id === userId).sort((a, b) => b.timestamp - a.timestamp); }
function getAllWarnings(guildId) { const db = loadDB(); return db.warnings.filter(w => w.guild_id === guildId).sort((a, b) => b.timestamp - a.timestamp); }
function clearWarning(id) { const db = loadDB(); const index = db.warnings.findIndex(w => w.id === id); if (index === -1) return false; db.warnings.splice(index, 1); saveDB(db); return true; }
function clearUserWarnings(guildId, userId) { const db = loadDB(); db.warnings = db.warnings.filter(w => !(w.guild_id === guildId && w.user_id === userId)); saveDB(db); }
function getWarningCount(guildId, userId) { const db = loadDB(); return db.warnings.filter(w => w.guild_id === guildId && w.user_id === userId).length; }

function removeStarboard(guildId) { const db = loadDB(); ensureGuild(db, guildId); db.guilds[guildId].starboard_channel_id = null; db.guilds[guildId].starboard_emoji = '⭐'; db.guilds[guildId].starboard_threshold = 3; saveDB(db); }
function removeSuggestionChannel(guildId) { const db = loadDB(); ensureGuild(db, guildId); db.guilds[guildId].suggestion_channel_id = null; saveDB(db); }
function removeCountingChannel(guildId) { const db = loadDB(); ensureGuild(db, guildId); db.guilds[guildId].counting_channel_id = null; delete db.counting[guildId]; saveDB(db); }
function removeWelcome(guildId) { const db = loadDB(); ensureGuild(db, guildId); db.guilds[guildId].welcome = { channel_id: null, role_id: null, message: null, leave_channel_id: null }; saveDB(db); }
function removeVerify(guildId) { const db = loadDB(); ensureGuild(db, guildId); db.guilds[guildId].verify = { channel_id: null, role_id: null, message_id: null }; saveDB(db); }
function removeDynamicVcHub(guildId) { const db = loadDB(); ensureGuild(db, guildId); db.guilds[guildId].dynamic_vc_hub = null; saveDB(db); }

function addGiveaway(data) { const db = loadDB(); db.giveaways.push(data); saveDB(db); }
function removeGiveaway(messageId) { const db = loadDB(); db.giveaways = db.giveaways.filter(g => g.messageId !== messageId); saveDB(db); }
function getActiveGiveaways() { const db = loadDB(); return db.giveaways.filter(g => !g.ended); }
function getGiveawayById(messageId) { const db = loadDB(); return db.giveaways.find(g => g.messageId === messageId); }
function setGiveawayEnded(guildId, messageId) { 
    const db = loadDB(); 
    const g = db.giveaways.find(g => g.messageId === messageId && g.guildId === guildId);
    if (g) { g.ended = true; saveDB(db); }
}

function isStickyRolesEnabled(guildId) { const db = loadDB(); ensureGuild(db, guildId); return db.guilds[guildId].sticky_roles_enabled; }
function setStickyRolesEnabled(guildId, enabled) { const db = loadDB(); ensureGuild(db, guildId); db.guilds[guildId].sticky_roles_enabled = enabled; saveDB(db); }
function getStickyRolesIgnore(guildId) { const db = loadDB(); ensureGuild(db, guildId); return db.guilds[guildId].sticky_roles_ignore; }
function setStickyRolesIgnore(guildId, roleIds) { const db = loadDB(); ensureGuild(db, guildId); db.guilds[guildId].sticky_roles_ignore = roleIds; saveDB(db); }
function saveStickyUserRoles(guildId, userId, roleIds) { const db = loadDB(); if (!db.sticky_user_roles[guildId]) db.sticky_user_roles[guildId] = {}; db.sticky_user_roles[guildId][userId] = roleIds; saveDB(db); }
function getStickyUserRoles(guildId, userId) { const db = loadDB(); if (!db.sticky_user_roles[guildId]) return null; return db.sticky_user_roles[guildId][userId] || null; }
function removeStickyUserRoles(guildId, userId) { const db = loadDB(); if (!db.sticky_user_roles[guildId]) return; delete db.sticky_user_roles[guildId][userId]; saveDB(db); }
function removeStickyRolesConfig(guildId) { const db = loadDB(); ensureGuild(db, guildId); db.guilds[guildId].sticky_roles_enabled = false; db.guilds[guildId].sticky_roles_ignore = []; delete db.sticky_user_roles[guildId]; saveDB(db); }

function getAutoResponders(guildId) { const db = loadDB(); ensureGuild(db, guildId); return db.guilds[guildId].auto_responders || []; }
function addAutoResponder(guildId, trigger, response, matchType, imageUrl = null, emoji = null) {
    const db = loadDB(); ensureGuild(db, guildId);
    if (!db.guilds[guildId].auto_responders) db.guilds[guildId].auto_responders = [];
    const id = Date.now();
    db.guilds[guildId].auto_responders.push({ 
        id, 
        trigger: trigger.toLowerCase(), 
        response, 
        match_type: matchType,
        image_url: imageUrl,
        emoji: emoji
    });
    saveDB(db); return id;
}
function removeAutoResponder(guildId, id) {
    const db = loadDB(); ensureGuild(db, guildId);
    const numId = Number(id);
    db.guilds[guildId].auto_responders = db.guilds[guildId].auto_responders.filter(a => a.id !== numId);
    saveDB(db);
}
function clearAutoResponders(guildId) {
    const db = loadDB(); ensureGuild(db, guildId);
    db.guilds[guildId].auto_responders = [];
    saveDB(db);
}

function isAiMentionEnabled(guildId) { const db = loadDB(); ensureGuild(db, guildId); return db.guilds[guildId].ai_mention_enabled || false; }
function setAiMentionEnabled(guildId, enabled) { const db = loadDB(); ensureGuild(db, guildId); db.guilds[guildId].ai_mention_enabled = enabled; saveDB(db); }

function getBoosterRoles(guildId) { const db = loadDB(); ensureGuild(db, guildId); return db.guilds[guildId].booster_roles || []; }
function addBoosterRole(guildId, roleId, bonusEntries) {
    const db = loadDB(); ensureGuild(db, guildId);
    if (!db.guilds[guildId].booster_roles) db.guilds[guildId].booster_roles = [];
    if (db.guilds[guildId].booster_roles.find(b => b.role_id === roleId)) return false;
    if (db.guilds[guildId].booster_roles.length >= 10) return 'max';
    db.guilds[guildId].booster_roles.push({ role_id: roleId, bonus_entries: bonusEntries });
    saveDB(db); return true;
}
function removeBoosterRole(guildId, roleId) {
    const db = loadDB(); ensureGuild(db, guildId);
    db.guilds[guildId].booster_roles = db.guilds[guildId].booster_roles.filter(b => b.role_id !== roleId);
    saveDB(db);
}
function clearBoosterRoles(guildId) {
    const db = loadDB(); ensureGuild(db, guildId);
    db.guilds[guildId].booster_roles = [];
    saveDB(db);
}

function getBoostPerksChannel(guildId) { const db = loadDB(); ensureGuild(db, guildId); return db.guilds[guildId].boost_perks_channel_id; }
function setBoostPerksChannel(guildId, channelId) { const db = loadDB(); ensureGuild(db, guildId); db.guilds[guildId].boost_perks_channel_id = channelId; saveDB(db); }
function removeBoostPerksChannel(guildId) { const db = loadDB(); ensureGuild(db, guildId); db.guilds[guildId].boost_perks_channel_id = null; saveDB(db); }
function getBoostDmStatus(guildId, userId) { const db = loadDB(); ensureGuild(db, guildId); return db.guilds[guildId].boost_dm_status[userId] || null; }
function setBoostDmStatus(guildId, userId, status) { const db = loadDB(); ensureGuild(db, guildId); db.guilds[guildId].boost_dm_status[userId] = status; saveDB(db); }

function getGiveawayPingRole(guildId) { const db = loadDB(); ensureGuild(db, guildId); return db.guilds[guildId].giveaway_ping_role_id; }
function setGiveawayPingRole(guildId, roleId) { const db = loadDB(); ensureGuild(db, guildId); db.guilds[guildId].giveaway_ping_role_id = roleId; saveDB(db); }
function removeGiveawayPingRole(guildId) { const db = loadDB(); ensureGuild(db, guildId); db.guilds[guildId].giveaway_ping_role_id = null; saveDB(db); }

// ── LUX COINS ECONOMY ──
function getUserEconomy(guildId, userId) {
    const db = loadDB();
    const key = `${guildId}-${userId}`;
    if (!db.economy[key]) {
        db.economy[key] = { wallet: 0, bank: 0, last_daily: 0, last_work: 0, last_rob: 0, last_crime: 0 };
        saveDB(db);
    }
    return db.economy[key];
}

function updateUserEconomy(guildId, userId, data) {
    const db = loadDB();
    const key = `${guildId}-${userId}`;
    db.economy[key] = data;
    saveDB(db);
}

module.exports = {
    db: null, getPrefix, setPrefix, getGuildSettings, setLogChannel, removeLogChannel,
    addHardban, removeHardban, isHardbanned, addTempban, removeTempban, getExpiredTempbans,
    getAiUsage, incrementAiUsage, AI_DAILY_LIMIT, resetAiUsage,
    addForcedName, removeForcedName, getForcedName,
    setDynamicVcHub, getDynamicVcHub, addDynamicVc, removeDynamicVc, isDynamicVc, removeDynamicVcHub,
    getAutomod, setAutomod, getWelcome, setWelcome, removeWelcome, getVerify, setVerify, removeVerify,
    getTickets, setTickets, addActiveTicket, removeActiveTicket, getActiveTicket,
    addReactionRole, removeReactionRole, getReactionRoles,
    addAutoTranslateChannel, removeAutoTranslateChannel, getAutoTranslateLang,
    setStarboard, getStarboard, removeStarboard, setSuggestionChannel, getSuggestionChannel, removeSuggestionChannel,
    setCountingChannel, getCounting, updateCounting, removeCountingChannel,
    loadCaches, getSticky, setSticky, removeSticky,
    isAfk, setAfk, removeAfk, getAutoDelete, setAutoDelete, removeAutoDelete,
    addReminder, getExpiredReminders, removeReminder,
    addWarning, getWarnings, getAllWarnings, clearWarning, clearUserWarnings, getWarningCount,
    addGiveaway, removeGiveaway, getActiveGiveaways, getGiveawayById, setGiveawayEnded,
    isStickyRolesEnabled, setStickyRolesEnabled, getStickyRolesIgnore, setStickyRolesIgnore,
    saveStickyUserRoles, getStickyUserRoles, removeStickyUserRoles, removeStickyRolesConfig,
    getAutoResponders, addAutoResponder, removeAutoResponder, clearAutoResponders,
    isAiMentionEnabled, setAiMentionEnabled,
    getBoosterRoles, addBoosterRole, removeBoosterRole, clearBoosterRoles,
    getBoostPerksChannel, setBoostPerksChannel, removeBoostPerksChannel, getBoostDmStatus, setBoostDmStatus,
    getGiveawayPingRole, setGiveawayPingRole, removeGiveawayPingRole,
    getUserEconomy, updateUserEconomy
};