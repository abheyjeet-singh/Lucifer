function ts() {
    return new Date().toLocaleString('en-US', { hour12: false });
}

module.exports = {
    info:    (msg) => console.log(`\x1b[33m[${ts()}] 🔥 INFO  \x1b[0m| ${msg}`),
    success: (msg) => console.log(`\x1b[32m[${ts()}] ✅ OK    \x1b[0m| ${msg}`),
    error:   (msg) => console.log(`\x1b[31m[${ts()}] ❌ ERR   \x1b[0m| ${msg}`),
    warn:    (msg) => console.log(`\x1b[35m[${ts()}] ⚠️  WARN  \x1b[0m| ${msg}`),
};
