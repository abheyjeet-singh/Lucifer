const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'lucifer.db');
const jsonPath = path.join(__dirname, 'lucifer.json');

// ── Initialize SQLite Database ──
const db = new Database(dbPath);
db.pragma('journal_mode = WAL'); // Makes writes faster and safer
db.pragma('foreign_keys = ON');

// ── Create Tables if they don't exist ──
db.exec(`
    CREATE TABLE IF NOT EXISTS guilds (
        guild_id TEXT PRIMARY KEY,
        prefix TEXT DEFAULT 'l!',
        log_channel_id TEXT,
        mute_role_id TEXT,
        data TEXT DEFAULT '{}'
    );
    CREATE TABLE IF NOT EXISTS ships (
        guild_id TEXT,
        user_id1 TEXT,
        user_id2 TEXT,
        percentage INTEGER,
        timestamp INTEGER,
        PRIMARY KEY (guild_id, user_id1, user_id2)
    );
    CREATE TABLE IF NOT EXISTS inventory (
        key TEXT,
        item_id TEXT,
        expires INTEGER,
        PRIMARY KEY (key, item_id)
    );
    CREATE TABLE IF NOT EXISTS timezones (
        user_id TEXT PRIMARY KEY,
        timezone TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS economy (
        key TEXT PRIMARY KEY,
        wallet INTEGER DEFAULT 0,
        bank INTEGER DEFAULT 0,
        last_daily INTEGER DEFAULT 0,
        last_work INTEGER DEFAULT 0,
        last_rob INTEGER DEFAULT 0,
        last_crime INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS warnings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id TEXT,
        user_id TEXT,
        moderator_id TEXT,
        reason TEXT,
        timestamp INTEGER
    );
    CREATE TABLE IF NOT EXISTS tempbans (
        guild_id TEXT,
        user_id TEXT,
        unban_timestamp INTEGER,
        PRIMARY KEY (guild_id, user_id)
    );
    CREATE TABLE IF NOT EXISTS autoresponders (
        id INTEGER PRIMARY KEY,
        guild_id TEXT,
        trigger TEXT,
        response TEXT,
        match_type TEXT,
        image_url TEXT,
        emoji TEXT
    );
    CREATE TABLE IF NOT EXISTS giveaways (
        messageId TEXT PRIMARY KEY,
        data TEXT,
        ended INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS reminders (
        id INTEGER PRIMARY KEY,
        user_id TEXT,
        channel_id TEXT,
        timestamp INTEGER,
        reason TEXT
    );
    CREATE TABLE IF NOT EXISTS button_roles (
        message_id TEXT,
        custom_id TEXT,
        role_id TEXT,
        PRIMARY KEY (message_id, custom_id)
    );
    CREATE TABLE IF NOT EXISTS marriages (
        user_id TEXT PRIMARY KEY,
        partner_id TEXT NOT NULL,
        timestamp INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS badges (
        guild_id TEXT,
        user_id TEXT,
        badge_id TEXT,
        timestamp INTEGER,
        PRIMARY KEY (guild_id, user_id, badge_id)
    );
    CREATE TABLE IF NOT EXISTS invite_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id TEXT NOT NULL,
        channel_id TEXT NOT NULL,
        message_id TEXT NOT NULL,
        host_id TEXT NOT NULL,
        prize TEXT NOT NULL,
        winner_count INTEGER DEFAULT 1,
        start_time INTEGER NOT NULL,
        end_time INTEGER NOT NULL,
        invite_snapshot TEXT DEFAULT '{}',
        status TEXT DEFAULT 'active'
    );
    CREATE TABLE IF NOT EXISTS invite_event_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_id INTEGER NOT NULL,
        user_id TEXT NOT NULL,
        invites INTEGER DEFAULT 0,
        UNIQUE(event_id, user_id)
    );
`);

// ── Migrations: Add Streak Columns if they don't exist ──
try { db.exec('ALTER TABLE economy ADD COLUMN daily_streak INTEGER DEFAULT 0'); } catch {}
try { db.exec('ALTER TABLE economy ADD COLUMN work_streak INTEGER DEFAULT 0'); } catch {}
try { db.exec('ALTER TABLE economy ADD COLUMN profile_bg TEXT DEFAULT NULL'); } catch {}
try { db.exec('ALTER TABLE economy ADD COLUMN profile_badge TEXT DEFAULT NULL'); } catch {}
try { db.exec('ALTER TABLE invite_events ADD COLUMN image_url TEXT DEFAULT NULL'); } catch {}

// ════════════════════════════════════════
// ── ONE-TIME JSON MIGRATION ──
// ════════════════════════════════════════
if (fs.existsSync(jsonPath)) {
    try {
        console.log('🔥 Old lucifer.json found. Migrating to SQLite...');
        const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        
        const insertGuild = db.prepare(`INSERT OR REPLACE INTO guilds (guild_id, prefix, log_channel_id, mute_role_id, data) VALUES (?, ?, ?, ?, ?)`);
        const insertEco = db.prepare(`INSERT OR REPLACE INTO economy (key, wallet, bank, last_daily, last_work, last_rob, last_crime) VALUES (?, ?, ?, ?, ?, ?, ?)`);
        const insertWarn = db.prepare(`INSERT INTO warnings (guild_id, user_id, moderator_id, reason, timestamp) VALUES (?, ?, ?, ?, ?)`);
        const insertTempban = db.prepare(`INSERT OR REPLACE INTO tempbans (guild_id, user_id, unban_timestamp) VALUES (?, ?, ?)`);
        const insertAR = db.prepare(`INSERT OR REPLACE INTO autoresponders (id, guild_id, trigger, response, match_type, image_url, emoji) VALUES (?, ?, ?, ?, ?, ?, ?)`);
        const insertGiveaway = db.prepare(`INSERT OR REPLACE INTO giveaways (messageId, data, ended) VALUES (?, ?, ?)`);
        const insertReminder = db.prepare(`INSERT OR REPLACE INTO reminders (id, user_id, channel_id, timestamp, reason) VALUES (?, ?, ?, ?, ?)`);

        const transaction = db.transaction(() => {
            if (jsonData.guilds) {
                for (const [gid, g] of Object.entries(jsonData.guilds)) {
                    const { prefix, log_channel_id, mute_role_id, ...rest } = g;
                    insertGuild.run(gid, prefix || 'l!', log_channel_id || null, mute_role_id || null, JSON.stringify(rest));
                }
            }
            if (jsonData.economy) {
                for (const [key, val] of Object.entries(jsonData.economy)) {
                    insertEco.run(key, val.wallet || 0, val.bank || 0, val.last_daily || 0, val.last_work || 0, val.last_rob || 0, val.last_crime || 0);
                }
            }
            if (jsonData.warnings && jsonData.warnings.length > 0) {
                for (const w of jsonData.warnings) {
                    insertWarn.run(w.guild_id, w.user_id, w.moderator_id, w.reason, w.timestamp);
                }
            }
            if (jsonData.tempbans && jsonData.tempbans.length > 0) {
                for (const t of jsonData.tempbans) {
                    insertTempban.run(t.guild_id, t.user_id, t.unban_timestamp);
                }
            }
            if (jsonData.guilds) {
                for (const [gid, g] of Object.entries(jsonData.guilds)) {
                    if (g.auto_responders && g.auto_responders.length > 0) {
                        for (const ar of g.auto_responders) {
                            insertAR.run(ar.id, gid, ar.trigger, ar.response, ar.match_type, ar.image_url, ar.emoji);
                        }
                    }
                }
            }
            if (jsonData.giveaways && jsonData.giveaways.length > 0) {
                for (const g of jsonData.giveaways) {
                    insertGiveaway.run(g.messageId, JSON.stringify(g), g.ended ? 1 : 0);
                }
            }
            if (jsonData.reminders && jsonData.reminders.length > 0) {
                for (const r of jsonData.reminders) {
                    insertReminder.run(r.id, r.user_id, r.channel_id, r.timestamp, r.reason);
                }
            }
        });

        transaction();
        fs.renameSync(jsonPath, path.join(__dirname, 'lucifer.json.migrated'));
        console.log('✅ Migration Complete! lucifer.json has been renamed to lucifer.json.migrated');
    } catch (error) {
        console.error('❌ Migration Failed! Fix the error and try again. Your JSON file was not deleted.', error);
    }
}


// ════════════════════════════════════════
// ── HELPER FUNCTIONS ──
// ════════════════════════════════════════

function getGuildData(guildId) {
    let row = db.prepare('SELECT * FROM guilds WHERE guild_id = ?').get(guildId);
    if (!row) {
        db.prepare('INSERT INTO guilds (guild_id) VALUES (?)').run(guildId);
        row = db.prepare('SELECT * FROM guilds WHERE guild_id = ?').get(guildId);
    }
    let data = {};
    try { data = JSON.parse(row.data); } catch {}
    return { ...row, ...data };
}

function setGuildData(guildId, updateObj) {
    const current = getGuildData(guildId);
    const merged = { ...current, ...updateObj };
    
    const { guild_id, prefix, log_channel_id, mute_role_id, data, ...rest } = merged;
    db.prepare(`
        INSERT OR REPLACE INTO guilds (guild_id, prefix, log_channel_id, mute_role_id, data) 
        VALUES (@guild_id, @prefix, @log_channel_id, @mute_role_id, @data)
    `).run({
        guild_id, prefix, log_channel_id, mute_role_id,
        data: JSON.stringify(rest)
    });
}

// ════════════════════════════════════════
// ── EXPORTED FUNCTIONS ──
// ════════════════════════════════════════

function getPrefix(guildId) { return getGuildData(guildId).prefix; }
function setPrefix(guildId, prefix) { setGuildData(guildId, { prefix }); }
function getGuildSettings(guildId) { return getGuildData(guildId); }

function setLogChannel(guildId, channelId) { setGuildData(guildId, { log_channel_id: channelId }); }
function removeLogChannel(guildId) { setGuildData(guildId, { log_channel_id: null }); }

function setMuteRole(guildId, roleId) { setGuildData(guildId, { mute_role_id: roleId }); }
function removeMuteRole(guildId) { setGuildData(guildId, { mute_role_id: null }); }

function setStarboard(guildId, channelId, emoji, threshold) { setGuildData(guildId, { starboard_channel_id: channelId, starboard_emoji: emoji, starboard_threshold: threshold }); }
function getStarboard(guildId) { const d = getGuildData(guildId); return { channel_id: d.starboard_channel_id, emoji: d.starboard_emoji || '⭐', threshold: d.starboard_threshold || 3 }; }
function removeStarboard(guildId) { setGuildData(guildId, { starboard_channel_id: null, starboard_emoji: '⭐', starboard_threshold: 3 }); }

function setSuggestionChannel(guildId, channelId) { setGuildData(guildId, { suggestion_channel_id: channelId }); }
function getSuggestionChannel(guildId) { return getGuildData(guildId).suggestion_channel_id; }
function removeSuggestionChannel(guildId) { setGuildData(guildId, { suggestion_channel_id: null }); }

function setCountingChannel(guildId, channelId) { 
    setGuildData(guildId, { counting_channel_id: channelId }); 
    const d = getGuildData('0'); 
    if (!d.counting) d.counting = {};
    if (!d.counting[guildId]) d.counting[guildId] = { count: 0, last_user_id: null };
    setGuildData('0', { counting: d.counting });
}
function getCounting(guildId) { const d = getGuildData('0'); return d.counting?.[guildId] || { count: 0, last_user_id: null }; }
function updateCounting(guildId, count, userId) { const d = getGuildData('0'); if (!d.counting) d.counting = {}; d.counting[guildId] = { count, last_user_id: userId }; setGuildData('0', { counting: d.counting }); }
function removeCountingChannel(guildId) { setGuildData(guildId, { counting_channel_id: null }); const d = getGuildData('0'); if (d.counting) { delete d.counting[guildId]; setGuildData('0', { counting: d.counting }); } }

function addAutoTranslateChannel(guildId, channelId, lang) { const d = getGuildData(guildId); if (!d.auto_translate_channels) d.auto_translate_channels = {}; d.auto_translate_channels[channelId] = lang; setGuildData(guildId, { auto_translate_channels: d.auto_translate_channels }); }
function removeAutoTranslateChannel(guildId, channelId) { const d = getGuildData(guildId); if (d.auto_translate_channels) { delete d.auto_translate_channels[channelId]; setGuildData(guildId, { auto_translate_channels: d.auto_translate_channels }); } }
function getAutoTranslateLang(guildId, channelId) { return getGuildData(guildId).auto_translate_channels?.[channelId] || null; }

function removeDynamicVcHub(guildId) { setGuildData(guildId, { dynamic_vc_hub: null }); }

function addHardban(guildId, userId) { const d = getGuildData(guildId); if (!d.hardbans) d.hardbans = []; if (!d.hardbans.includes(userId)) { d.hardbans.push(userId); setGuildData(guildId, { hardbans: d.hardbans }); } }
function removeHardban(guildId, userId) { const d = getGuildData(guildId); if (d.hardbans) { d.hardbans = d.hardbans.filter(id => id !== userId); setGuildData(guildId, { hardbans: d.hardbans }); } }
function isHardbanned(guildId, userId) { const d = getGuildData(guildId); return d.hardbans && d.hardbans.includes(userId); }

// Tempbans
function addTempban(guildId, userId, unbanTimestamp) { db.prepare('INSERT OR REPLACE INTO tempbans (guild_id, user_id, unban_timestamp) VALUES (?, ?, ?)').run(guildId, userId, unbanTimestamp); }
function removeTempban(guildId, userId) { db.prepare('DELETE FROM tempbans WHERE guild_id = ? AND user_id = ?').run(guildId, userId); }
function getExpiredTempbans(nowTimestamp) { return db.prepare('SELECT * FROM tempbans WHERE unban_timestamp <= ?').all(nowTimestamp); }

// AI Usage
const AI_DAILY_LIMIT = 25;
function getAiUsage(guildId) { const d = getGuildData(guildId); const today = new Date().toISOString().split('T')[0]; if (!d.ai_usage || d.ai_usage.date !== today) { setGuildData(guildId, { ai_usage: { date: today, count: 0 } }); return 0; } return d.ai_usage.count; }
function incrementAiUsage(guildId) { const d = getGuildData(guildId); const today = new Date().toISOString().split('T')[0]; let usage = d.ai_usage || { date: today, count: 0 }; if (usage.date !== today) usage = { date: today, count: 1 }; else usage.count++; setGuildData(guildId, { ai_usage: usage }); return usage.count; }
function resetAiUsage(guildId) { setGuildData(guildId, { ai_usage: { date: new Date().toISOString().split('T')[0], count: 0 } }); }

// Sticky Names / AFK (Stored in JSON text column for simplicity)
function addForcedName(guildId, userId, nickname) { const d = getGuildData(guildId); if (!d.forced_names) d.forced_names = []; d.forced_names = d.forced_names.filter(f => !(f.guild_id === guildId && f.user_id === userId)); d.forced_names.push({ guild_id: guildId, user_id: userId, nickname }); setGuildData(guildId, { forced_names: d.forced_names }); }
function removeForcedName(guildId, userId) { const d = getGuildData(guildId); if (d.forced_names) { d.forced_names = d.forced_names.filter(f => !(f.guild_id === guildId && f.user_id === userId)); setGuildData(guildId, { forced_names: d.forced_names }); } }
function getForcedName(guildId, userId) { const d = getGuildData(guildId); const entry = (d.forced_names || []).find(f => f.guild_id === guildId && f.user_id === userId); return entry ? entry.nickname : null; }

// Dynamic VC
function setDynamicVcHub(guildId, channelId) { setGuildData(guildId, { dynamic_vc_hub: channelId }); }
function getDynamicVcHub(guildId) { return getGuildData(guildId).dynamic_vc_hub; }
function addDynamicVc(channelId) { const d = getGuildData('global'); if (!d.dynamic_vcs) d.dynamic_vcs = []; if (!d.dynamic_vcs.includes(channelId)) { d.dynamic_vcs.push(channelId); setGuildData('global', { dynamic_vcs: d.dynamic_vcs }); } }
function removeDynamicVc(channelId) { const d = getGuildData('global'); if (d.dynamic_vcs) { d.dynamic_vcs = d.dynamic_vcs.filter(id => id !== channelId); setGuildData('global', { dynamic_vcs: d.dynamic_vcs }); } }
function isDynamicVc(channelId) { const d = getGuildData('global'); return d.dynamic_vcs && d.dynamic_vcs.includes(channelId); }

// Settings Helpers
function getAutomod(guildId) { return getGuildData(guildId).automod || { enabled: false, anti_link: false, anti_spam: false, anti_badwords: false, anti_massmention: false, badwords: [] }; }
function setAutomod(guildId, data) { setGuildData(guildId, { automod: data }); }
function getWelcome(guildId) { return getGuildData(guildId).welcome || { channel_id: null, role_id: null, message: null, leave_channel_id: null }; }
function setWelcome(guildId, data) { setGuildData(guildId, { welcome: data }); }
function removeWelcome(guildId) { setGuildData(guildId, { welcome: { channel_id: null, role_id: null, message: null, leave_channel_id: null } }); }
function getVerify(guildId) { return getGuildData(guildId).verify || { channel_id: null, role_id: null, message_id: null }; }
function setVerify(guildId, data) { setGuildData(guildId, { verify: data }); }
function removeVerify(guildId) { setGuildData(guildId, { verify: { channel_id: null, role_id: null, message_id: null } }); }
function getTickets(guildId) { return getGuildData(guildId).tickets || { category_id: null, log_channel_id: null, count: 0, active: {} }; }
function setTickets(guildId, data) { setGuildData(guildId, { tickets: data }); }
function addActiveTicket(guildId, userId, channelId) { const t = getTickets(guildId); t.active[userId] = channelId; setTickets(guildId, t); }
function removeActiveTicket(guildId, userId) { const t = getTickets(guildId); delete t.active[userId]; setTickets(guildId, t); }
function getActiveTicket(guildId, userId) { return getTickets(guildId).active[userId]; }

// Autoresponders
function getAutoResponders(guildId) { return db.prepare('SELECT * FROM autoresponders WHERE guild_id = ?').all(guildId); }
function addAutoResponder(guildId, trigger, response, matchType, imageUrl, emoji) { const id = Date.now(); db.prepare('INSERT INTO autoresponders (id, guild_id, trigger, response, match_type, image_url, emoji) VALUES (?, ?, ?, ?, ?, ?, ?)').run(id, guildId, trigger.toLowerCase(), response, matchType, imageUrl, emoji); return id; }
function removeAutoResponder(guildId, id) { db.prepare('DELETE FROM autoresponders WHERE id = ? AND guild_id = ?').run(id, guildId); }
function clearAutoResponders(guildId) { db.prepare('DELETE FROM autoresponders WHERE guild_id = ?').run(guildId); }

// Warnings
function addWarning(guildId, userId, moderatorId, reason) { db.prepare('INSERT INTO warnings (guild_id, user_id, moderator_id, reason, timestamp) VALUES (?, ?, ?, ?, ?)').run(guildId, userId, moderatorId, reason, Date.now()); }
function getWarnings(guildId, userId) { return db.prepare('SELECT * FROM warnings WHERE guild_id = ? AND user_id = ? ORDER BY timestamp DESC').all(guildId, userId); }
function getAllWarnings(guildId) { return db.prepare('SELECT * FROM warnings WHERE guild_id = ? ORDER BY timestamp DESC').all(guildId); }
function clearWarning(id) { const info = db.prepare('DELETE FROM warnings WHERE id = ?').run(id); return info.changes > 0; }
function clearUserWarnings(guildId, userId) { db.prepare('DELETE FROM warnings WHERE guild_id = ? AND user_id = ?').run(guildId, userId); }
function getWarningCount(guildId, userId) { return db.prepare('SELECT COUNT(*) as count FROM warnings WHERE guild_id = ? AND user_id = ?').get(guildId, userId).count; }

// Caches (AFK, Stickies) - Store in global guild '0'
function isAfk(userId, guildId) { const d = getGuildData('0'); return d.afk?.[`${guildId}-${userId}`] || null; }
function setAfk(userId, guildId, reason) { const d = getGuildData('0'); if (!d.afk) d.afk = {}; d.afk[`${guildId}-${userId}`] = { reason, timestamp: Date.now() }; setGuildData('0', { afk: d.afk }); }
function removeAfk(userId, guildId) { const d = getGuildData('0'); if (d.afk) { delete d.afk[`${guildId}-${userId}`]; setGuildData('0', { afk: d.afk }); } }

function getSticky(channelId) { const d = getGuildData('0'); return d.stickies?.[channelId] || null; }
function setSticky(channelId, content) { const d = getGuildData('0'); if (!d.stickies) d.stickies = {}; d.stickies[channelId] = content; setGuildData('0', { stickies: d.stickies }); }
function removeSticky(channelId) { const d = getGuildData('0'); if (d.stickies) { delete d.stickies[channelId]; setGuildData('0', { stickies: d.stickies }); } }

function getAutoDelete(channelId) { const d = getGuildData('0'); return d.auto_delete?.[channelId] || null; }
function setAutoDelete(channelId, seconds) { const d = getGuildData('0'); if (!d.auto_delete) d.auto_delete = {}; d.auto_delete[channelId] = seconds; setGuildData('0', { auto_delete: d.auto_delete }); }
function removeAutoDelete(channelId) { const d = getGuildData('0'); if (d.auto_delete) { delete d.auto_delete[channelId]; setGuildData('0', { auto_delete: d.auto_delete }); } }

// Reminders
function addReminder(userId, channelId, timestamp, reason) { const id = Date.now(); db.prepare('INSERT INTO reminders (id, user_id, channel_id, timestamp, reason) VALUES (?, ?, ?, ?, ?)').run(id, userId, channelId, timestamp, reason); return id; }
function getExpiredReminders(now) { return db.prepare('SELECT * FROM reminders WHERE timestamp <= ?').all(now); }
function removeReminder(id) { db.prepare('DELETE FROM reminders WHERE id = ?').run(id); }

// Giveaways
function addGiveaway(data) { db.prepare('INSERT INTO giveaways (messageId, data, ended) VALUES (?, ?, 0)').run(data.messageId, JSON.stringify(data)); }
function removeGiveaway(messageId) { db.prepare('DELETE FROM giveaways WHERE messageId = ?').run(messageId); }
function getActiveGiveaways() { return db.prepare('SELECT * FROM giveaways WHERE ended = 0').all().map(g => JSON.parse(g.data)); }
function getGiveawayById(messageId) { const row = db.prepare('SELECT * FROM giveaways WHERE messageId = ?').get(messageId); return row ? JSON.parse(row.data) : null; }
function setGiveawayEnded(guildId, messageId) { const row = getGiveawayById(messageId); if (row) { row.ended = true; db.prepare('UPDATE giveaways SET data = ?, ended = 1 WHERE messageId = ?').run(JSON.stringify(row), messageId); } }

// Giveaway Ping Role
function getGiveawayPingRole(guildId) { return getGuildData(guildId).giveaway_ping_role_id || null; }
function setGiveawayPingRole(guildId, roleId) { setGuildData(guildId, { giveaway_ping_role_id: roleId }); }
function removeGiveawayPingRole(guildId) { setGuildData(guildId, { giveaway_ping_role_id: null }); }

// Booster Roles
function getBoosterRoles(guildId) { return getGuildData(guildId).booster_roles || []; }
function addBoosterRole(guildId, roleId, bonusEntries) { const d = getGuildData(guildId); if (!d.booster_roles) d.booster_roles = []; if (d.booster_roles.find(b => b.role_id === roleId)) return false; if (d.booster_roles.length >= 10) return 'max'; d.booster_roles.push({ role_id: roleId, bonus_entries: bonusEntries }); setGuildData(guildId, { booster_roles: d.booster_roles }); return true; }
function removeBoosterRole(guildId, roleId) { const d = getGuildData(guildId); if (d.booster_roles) { d.booster_roles = d.booster_roles.filter(b => b.role_id !== roleId); setGuildData(guildId, { booster_roles: d.booster_roles }); } }
function clearBoosterRoles(guildId) { setGuildData(guildId, { booster_roles: [] }); }

// Boost Perks Channel & DM Status
function getBoostPerksChannel(guildId) { return getGuildData(guildId).boost_perks_channel_id || null; }
function setBoostPerksChannel(guildId, channelId) { setGuildData(guildId, { boost_perks_channel_id: channelId }); }
function removeBoostPerksChannel(guildId) { setGuildData(guildId, { boost_perks_channel_id: null }); }
function getBoostDmStatus(guildId, userId) { const d = getGuildData(guildId); return d.boost_dm_status?.[userId] || null; }
function setBoostDmStatus(guildId, userId, status) { const d = getGuildData(guildId); if (!d.boost_dm_status) d.boost_dm_status = {}; d.boost_dm_status[userId] = status; setGuildData(guildId, { boost_dm_status: d.boost_dm_status }); }

// Economy
function getUserEconomy(guildId, userId) {
    const key = `${guildId}-${userId}`;
    let row = db.prepare('SELECT * FROM economy WHERE key = ?').get(key);
    if (!row) {
        db.prepare('INSERT INTO economy (key) VALUES (?)').run(key);
        row = db.prepare('SELECT * FROM economy WHERE key = ?').get(key);
    }
    return row;
}
function getEconomyLeaderboard(guildId, limit = 10, offset = 0) {
    const rows = db.prepare(`SELECT key, (wallet + bank) as netWorth FROM economy WHERE key LIKE ? ORDER BY netWorth DESC LIMIT ? OFFSET ?`).all(`${guildId}-%`, limit, offset);
    return rows.map(r => ({ userId: r.key.split('-')[1], netWorth: r.netWorth }));
}
function updateUserEconomy(guildId, userId, data) {
    const key = `${guildId}-${userId}`;
    db.prepare(`INSERT OR REPLACE INTO economy (key, wallet, bank, last_daily, last_work, last_rob, last_crime, daily_streak, work_streak, profile_bg, profile_badge) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(key, data.wallet, data.bank, data.last_daily, data.last_work, data.last_rob, data.last_crime, data.daily_streak || 0, data.work_streak || 0, data.profile_bg || null, data.profile_badge || null);
}

// AI Mode
function isAiMentionEnabled(guildId) { return getGuildData(guildId).ai_mention_enabled || false; }
function setAiMentionEnabled(guildId, enabled) { setGuildData(guildId, { ai_mention_enabled: enabled }); }

// Other Settings Getters/Setters
function isStickyRolesEnabled(guildId) { return getGuildData(guildId).sticky_roles_enabled || false; }
function setStickyRolesEnabled(guildId, enabled) { setGuildData(guildId, { sticky_roles_enabled: enabled }); }
function getStickyRolesIgnore(guildId) { return getGuildData(guildId).sticky_roles_ignore || []; }
function setStickyRolesIgnore(guildId, roleIds) { setGuildData(guildId, { sticky_roles_ignore: roleIds }); }
function saveStickyUserRoles(guildId, userId, roleIds) { const d = getGuildData(guildId); if (!d.sticky_user_roles) d.sticky_user_roles = {}; d.sticky_user_roles[userId] = roleIds; setGuildData(guildId, { sticky_user_roles: d.sticky_user_roles }); }
function getStickyUserRoles(guildId, userId) { const d = getGuildData(guildId); return d.sticky_user_roles?.[userId] || null; }
function removeStickyUserRoles(guildId, userId) { const d = getGuildData(guildId); if (d.sticky_user_roles) { delete d.sticky_user_roles[userId]; setGuildData(guildId, { sticky_user_roles: d.sticky_user_roles }); } }
function removeStickyRolesConfig(guildId) { 
    setGuildData(guildId, { sticky_roles_enabled: false, sticky_roles_ignore: [] }); 
    const d = getGuildData(guildId); 
    if (d.sticky_user_roles) { delete d.sticky_user_roles; setGuildData(guildId, { sticky_user_roles: {} }); } 
}

// Button Roles
function addButtonRole(messageId, customId, roleId) { db.prepare('INSERT OR REPLACE INTO button_roles (message_id, custom_id, role_id) VALUES (?, ?, ?)').run(messageId, customId, roleId); }
function removeButtonRole(messageId, customId) { db.prepare('DELETE FROM button_roles WHERE message_id = ? AND custom_id = ?').run(messageId, customId); }
function getButtonRoles(messageId) { return db.prepare('SELECT * FROM button_roles WHERE message_id = ?').all(messageId); }

// Marriages
function getMarriage(userId) {
    return db.prepare('SELECT * FROM marriages WHERE user_id = ?').get(userId);
}
function marryUsers(userId1, userId2) {
    const now = Date.now();
    const insert = db.prepare('INSERT OR REPLACE INTO marriages (user_id, partner_id, timestamp) VALUES (?, ?, ?)');
    const transaction = db.transaction(() => {
        insert.run(userId1, userId2, now);
        insert.run(userId2, userId1, now);
    });
    transaction();
}
function divorceUsers(userId1, userId2) {
    const remove = db.prepare('DELETE FROM marriages WHERE user_id = ?');
    const transaction = db.transaction(() => {
        remove.run(userId1);
        remove.run(userId2);
    });
    transaction();
}

// Timezones
function getTimezone(userId) {
    const row = db.prepare('SELECT * FROM timezones WHERE user_id = ?').get(userId);
    return row ? row.timezone : null;
}
function setTimezone(userId, tz) {
    db.prepare('INSERT OR REPLACE INTO timezones (user_id, timezone) VALUES (?, ?)').run(userId, tz);
}

// ── SHOP / INVENTORY ──
function hasItem(guildId, userId, itemId) {
    const key = `${guildId}-${userId}`;
    const row = db.prepare('SELECT * FROM inventory WHERE key = ? AND item_id = ?').get(key, itemId);
    if (!row) return false;
    if (row.expires && row.expires < Date.now()) {
        db.prepare('DELETE FROM inventory WHERE key = ? AND item_id = ?').run(key, itemId);
        return false;
    }
    return true;
}
function addItem(guildId, userId, itemId, durationMs = null) {
    const key = `${guildId}-${userId}`;
    const expires = durationMs ? Date.now() + durationMs : null;
    db.prepare('INSERT OR REPLACE INTO inventory (key, item_id, expires) VALUES (?, ?, ?)').run(key, itemId, expires);
}
function removeItem(guildId, userId, itemId) {
    const key = `${guildId}-${userId}`;
    db.prepare('DELETE FROM inventory WHERE key = ? AND item_id = ?').run(key, itemId);
}
function getInventory(guildId, userId) {
    const key = `${guildId}-${userId}`;
    return db.prepare('SELECT * FROM inventory WHERE key = ?').all(key);
}

// ── SHIPS ──
function normalizeIds(id1, id2) {
    return id1 < id2 ? [id1, id2] : [id2, id1];
}

function addShip(guildId, userId1, userId2, percentage) {
    const [id1, id2] = normalizeIds(userId1, userId2);
    db.prepare('INSERT OR REPLACE INTO ships (guild_id, user_id1, user_id2, percentage, timestamp) VALUES (?, ?, ?, ?, ?)')
        .run(guildId, id1, id2, percentage, Date.now());
}

function getShip(guildId, userId1, userId2) {
    const [id1, id2] = normalizeIds(userId1, userId2);
    return db.prepare('SELECT * FROM ships WHERE guild_id = ? AND user_id1 = ? AND user_id2 = ?').get(guildId, id1, id2);
}

function getAllShips(guildId) {
    return db.prepare('SELECT * FROM ships WHERE guild_id = ? ORDER BY percentage DESC').all(guildId);
}

function updateShipPercentage(guildId, userId1, userId2, percentage) {
    const [id1, id2] = normalizeIds(userId1, userId2);
    db.prepare('UPDATE ships SET percentage = ? WHERE guild_id = ? AND user_id1 = ? AND user_id2 = ?')
        .run(percentage, guildId, id1, id2);
}

function removeShip(guildId, userId1, userId2) {
    const [id1, id2] = normalizeIds(userId1, userId2);
    db.prepare('DELETE FROM ships WHERE guild_id = ? AND user_id1 = ? AND user_id2 = ?')
        .run(guildId, id1, id2);
}

// ── BADGES ──
function addBadge(guildId, userId, badgeId) { 
    db.prepare('INSERT OR IGNORE INTO badges (guild_id, user_id, badge_id, timestamp) VALUES (?, ?, ?, ?)')
        .run(guildId, userId, badgeId, Date.now()); 
}
function removeBadge(guildId, userId, badgeId) { 
    db.prepare('DELETE FROM badges WHERE guild_id = ? AND user_id = ? AND badge_id = ?').run(guildId, userId, badgeId); 
}
function getUserBadges(guildId, userId) { 
    return db.prepare('SELECT * FROM badges WHERE guild_id = ? AND user_id = ?').all(guildId, userId); 
}
function getBadgeLeaderboard(guildId, limit = 10) {
    return db.prepare('SELECT user_id, COUNT(*) as badge_count FROM badges WHERE guild_id = ? GROUP BY user_id ORDER BY badge_count DESC LIMIT ?').all(guildId, limit);
}
function hasBadge(guildId, userId, badgeId) {
    return db.prepare('SELECT 1 FROM badges WHERE guild_id = ? AND user_id = ? AND badge_id = ?').get(guildId, userId, badgeId);
}
// ── INVITE EVENTS ──
function addInviteEvent(data) {
    const info = db.prepare(`
        INSERT INTO invite_events (guild_id, channel_id, message_id, host_id, prize, winner_count, start_time, end_time, invite_snapshot, image_url, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
    `).run(data.guild_id, data.channel_id, data.message_id, data.host_id, data.prize, data.winner_count, data.start_time, data.end_time, data.invite_snapshot, data.image_url || null);
    return info.lastInsertRowid;
}

function removeInviteEvent(id) {
    db.prepare('DELETE FROM invite_event_entries WHERE event_id = ?').run(id);
    db.prepare('DELETE FROM invite_events WHERE id = ?').run(id);
}

function getActiveInviteEvents() {
    return db.prepare('SELECT * FROM invite_events WHERE status = ?').all('active');
}

function getInviteEventById(id) {
    return db.prepare('SELECT * FROM invite_events WHERE id = ?').get(id);
}

function getActiveInviteEventsByGuild(guildId) {
    return db.prepare('SELECT * FROM invite_events WHERE guild_id = ? AND status = ?').all(guildId, 'active');
}

function setInviteEventEnded(id) {
    db.prepare('UPDATE invite_events SET status = ? WHERE id = ?').run('ended', id);
}

function incrementInviteEventEntry(eventId, userId, count) {
    const existing = db.prepare('SELECT * FROM invite_event_entries WHERE event_id = ? AND user_id = ?').get(eventId, userId);
    if (existing) {
        db.prepare('UPDATE invite_event_entries SET invites = invites + ? WHERE event_id = ? AND user_id = ?').run(count, eventId, userId);
    } else {
        db.prepare('INSERT INTO invite_event_entries (event_id, user_id, invites) VALUES (?, ?, ?)').run(eventId, userId, count);
    }
}

function getInviteEventLeaderboard(eventId, limit = 10) {
    return db.prepare('SELECT * FROM invite_event_entries WHERE event_id = ? ORDER BY invites DESC LIMIT ?').all(eventId, limit);
}

function getInviteEventEntries(eventId) {
    return db.prepare('SELECT * FROM invite_event_entries WHERE event_id = ? ORDER BY invites DESC').all(eventId);
}

function updateInviteEventSnapshot(id, snapshot) {
    db.prepare('UPDATE invite_events SET invite_snapshot = ? WHERE id = ?').run(snapshot, id);
}
function updateInviteEventMessage(id, messageId, channelId) {
    db.prepare('UPDATE invite_events SET message_id = ?, channel_id = ? WHERE id = ?').run(messageId, channelId, id);
}
// Invite Event Ping Role
function getInviteEventPingRole(guildId) { return getGuildData(guildId).invite_event_ping_role_id || null; }
function setInviteEventPingRole(guildId, roleId) { setGuildData(guildId, { invite_event_ping_role_id: roleId }); }
function removeInviteEventPingRole(guildId) { setGuildData(guildId, { invite_event_ping_role_id: null }); }

module.exports = {
    db, getPrefix, setPrefix, getGuildSettings, setLogChannel, removeLogChannel,
    setMuteRole, removeMuteRole, setStarboard, getStarboard, removeStarboard,
    setSuggestionChannel, getSuggestionChannel, removeSuggestionChannel,
    setCountingChannel, getCounting, updateCounting, removeCountingChannel,
    addAutoTranslateChannel, removeAutoTranslateChannel, getAutoTranslateLang,
    removeDynamicVcHub, addHardban, removeHardban, isHardbanned, addTempban, removeTempban, getExpiredTempbans,
    getAiUsage, incrementAiUsage, AI_DAILY_LIMIT, resetAiUsage,
    addForcedName, removeForcedName, getForcedName,
    setDynamicVcHub, getDynamicVcHub, addDynamicVc, removeDynamicVc, isDynamicVc,
    getAutomod, setAutomod, getWelcome, setWelcome, removeWelcome, getVerify, setVerify, removeVerify,
    getTickets, setTickets, addActiveTicket, removeActiveTicket, getActiveTicket,
    addAutoResponder, removeAutoResponder, getAutoResponders, clearAutoResponders,
    addReactionRole: () => {}, removeReactionRole: () => {}, getReactionRoles: () => [], 
    addWarning, getWarnings, getAllWarnings, clearWarning, clearUserWarnings, getWarningCount,
    addGiveaway, removeGiveaway, getActiveGiveaways, getGiveawayById, setGiveawayEnded, getGiveawayPingRole, setGiveawayPingRole, removeGiveawayPingRole,
    isStickyRolesEnabled, setStickyRolesEnabled, getStickyRolesIgnore, setStickyRolesIgnore,
    saveStickyUserRoles, getStickyUserRoles, removeStickyUserRoles, removeStickyRolesConfig,
    isAfk, setAfk, removeAfk, getSticky, setSticky, removeSticky, getAutoDelete, setAutoDelete, removeAutoDelete,
    addReminder, getExpiredReminders, removeReminder,
    getBoosterRoles, addBoosterRole, removeBoosterRole, clearBoosterRoles, getBoostPerksChannel, setBoostPerksChannel, removeBoostPerksChannel, getBoostDmStatus, setBoostDmStatus,
    isAiMentionEnabled, setAiMentionEnabled,
    getUserEconomy, updateUserEconomy, getEconomyLeaderboard,
    addButtonRole, removeButtonRole, getButtonRoles, getMarriage, marryUsers, divorceUsers,
    getTimezone, setTimezone,
    hasItem, addItem, removeItem, getInventory,
    addShip, getShip, getAllShips, updateShipPercentage, removeShip,
    addBadge, getUserBadges, getBadgeLeaderboard, hasBadge,
    addInviteEvent, removeInviteEvent, getActiveInviteEvents, getInviteEventById,
    getActiveInviteEventsByGuild, setInviteEventEnded, incrementInviteEventEntry,
    getInviteEventLeaderboard, getInviteEventEntries, updateInviteEventMessage, updateInviteEventSnapshot,
    getInviteEventPingRole, setInviteEventPingRole, removeInviteEventPingRole
};