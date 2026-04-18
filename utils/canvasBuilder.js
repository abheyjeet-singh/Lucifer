const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');
const path = require('path');

// Register Fonts
GlobalFonts.registerFromPath(path.join(__dirname, '..', 'Roboto-Bold.ttf'), 'RobotoBold');
GlobalFonts.registerFromPath(path.join(__dirname, '..', 'Roboto-Medium.ttf'), 'RobotoMedium');
GlobalFonts.registerFromPath(path.join(__dirname, '..', 'Roboto-Regular.ttf'), 'RobotoRegular');

// ─── LUXURY DESIGN SYSTEM HELPERS ───
const COLORS = {
    bgStart: '#1e1e2e',
    bgEnd: '#11111b',
    textPrimary: '#cdd6f4',
    textSecondary: '#a6adc8',
    accent: '#8e44ad',
    accentGlow: 'rgba(142, 68, 173, 0.6)',
    glass: 'rgba(30, 30, 46, 0.7)',
    glassBorder: 'rgba(255, 255, 255, 0.05)'
};

function roundedRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}

function drawGlow(ctx, x, y, width, height, color) {
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = 20;
    ctx.fillStyle = color;
    roundedRect(ctx, x, y, width, height, 10);
    ctx.fill();
    ctx.restore();
}

function drawBackground(ctx, width, height) {
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, COLORS.bgStart);
    gradient.addColorStop(1, COLORS.bgEnd);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    // Premium Subtle Grid Pattern
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.015)';
    ctx.lineWidth = 1;
    for (let i = 0; i < width; i += 40) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, height); ctx.stroke();
    }
    for (let i = 0; i < height; i += 40) {
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(width, i); ctx.stroke();
    }
}

async function drawAvatar(ctx, url, x, y, size) {
    if (!url) return;
    try {
        const avatar = await loadImage(url);
        
        // Outer Glow Ring
        ctx.save();
        ctx.shadowColor = COLORS.accentGlow;
        ctx.shadowBlur = 30;
        ctx.beginPath();
        ctx.arc(x + size / 2, y + size / 2, size / 2 + 6, 0, Math.PI * 2);
        ctx.fillStyle = COLORS.accent;
        ctx.fill();
        ctx.restore();

        // Inner Black Ring
        ctx.beginPath();
        ctx.arc(x + size / 2, y + size / 2, size / 2 + 3, 0, Math.PI * 2);
        ctx.fillStyle = COLORS.bgEnd;
        ctx.fill();

        // Clip Avatar
        ctx.save();
        ctx.beginPath();
        ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(avatar, x, y, size, size);
        ctx.restore();
    } catch {}
}

function drawGlassPanel(ctx, x, y, width, height, radius = 20) {
    ctx.save();
    ctx.fillStyle = COLORS.glass;
    ctx.strokeStyle = COLORS.glassBorder;
    ctx.lineWidth = 1;
    roundedRect(ctx, x, y, width, height, radius);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
}

// ─── PREMIUM CARDS ───

async function buildWelcomeImage(member) {
    const canvas = createCanvas(800, 300);
    const ctx = canvas.getContext('2d');
    drawBackground(ctx, canvas.width, canvas.height);
    drawGlassPanel(ctx, 30, 30, canvas.width - 60, canvas.height - 60, 30);

    const avatarSize = 140;
    await drawAvatar(ctx, member.user.displayAvatarURL({ extension: 'png', size: 256 }), 70, 80, avatarSize);

    ctx.fillStyle = COLORS.textSecondary;
    ctx.font = '26px RobotoMedium';
    ctx.fillText('WELCOME TO HELL', 260, 120);

    ctx.fillStyle = COLORS.textPrimary;
    ctx.font = 'bold 44px RobotoBold';
    ctx.fillText(member.user.username, 260, 170);

    ctx.fillStyle = COLORS.accent;
    ctx.font = '24px RobotoMedium';
    ctx.fillText(`Member #${member.guild.memberCount}`, 260, 210);

    drawGlow(ctx, 30, canvas.height - 30, canvas.width - 60, 6, COLORS.accent);

    return canvas.encode('png');
}

async function buildLeaveImage(member) {
    const canvas = createCanvas(800, 300);
    const ctx = canvas.getContext('2d');
    drawBackground(ctx, canvas.width, canvas.height);
    drawGlassPanel(ctx, 30, 30, canvas.width - 60, canvas.height - 60, 30);

    const avatarSize = 140;
    await drawAvatar(ctx, member.user.displayAvatarURL({ extension: 'png', size: 256 }), 70, 80, avatarSize);

    ctx.fillStyle = COLORS.textSecondary;
    ctx.font = '26px RobotoMedium';
    ctx.fillText('SOUL DEPARTED', 260, 120);

    ctx.fillStyle = COLORS.textPrimary;
    ctx.font = 'bold 44px RobotoBold';
    ctx.fillText(member.user.username, 260, 170);

    ctx.fillStyle = '#e74c3c';
    ctx.font = '24px RobotoMedium';
    ctx.fillText('We hope you find your way.', 260, 210);

    drawGlow(ctx, 30, canvas.height - 30, canvas.width - 60, 6, '#e74c3c');

    return canvas.encode('png');
}

// ─── THE ULTIMATE PROFILE CARD ───
async function buildProfileCard(member, eco, marriage, joinTimestamp, createdTimestamp, inventoryCount) {
    const canvas = createCanvas(800, 580); // Increased height for breathing room
    const ctx = canvas.getContext('2d');
    drawBackground(ctx, canvas.width, canvas.height);

    // 1. BLUR BANNER HEADER (Brightened slightly for better color pop)
    try {
        ctx.save();
        roundedRect(ctx, 30, 30, canvas.width - 60, 170, 30);
        ctx.clip();
        const bannerImg = await loadImage(member.user.displayAvatarURL({ extension: 'png', size: 256 }));
        ctx.filter = 'blur(25px) brightness(0.5)'; 
        ctx.drawImage(bannerImg, 30, -50, canvas.width - 60, 350);
        ctx.filter = 'none';
        
        // Gradient Fade from Banner to Glass Body
        const fadeGrad = ctx.createLinearGradient(0, 100, 0, 200);
        fadeGrad.addColorStop(0, 'rgba(17, 17, 27, 0)');
        fadeGrad.addColorStop(1, 'rgba(17, 17, 27, 1)');
        ctx.fillStyle = fadeGrad;
        ctx.fillRect(30, 100, canvas.width - 60, 100);
        
        ctx.restore();
    } catch {}

    // Main Glass Body (Overlapping banner)
    drawGlassPanel(ctx, 30, 160, canvas.width - 60, canvas.height - 190, 30);

    // 2. OVERLAPPING AVATAR
    const avatarSize = 160;
    await drawAvatar(ctx, member.user.displayAvatarURL({ extension: 'png', size: 512 }), 75, 85, avatarSize);

    // 3. TYPOGRAPHY (Better spacing)
    ctx.fillStyle = COLORS.textPrimary;
    ctx.font = 'bold 42px RobotoBold';
    ctx.fillText(member.user.username, 275, 225);

    ctx.fillStyle = COLORS.textSecondary;
    ctx.font = '18px RobotoRegular';
    ctx.fillText(`Joined Server: ${new Date(joinTimestamp).toLocaleDateString()}`, 275, 255);
    ctx.fillText(`Account Created: ${new Date(createdTimestamp).toLocaleDateString()}`, 275, 280);

    // 4. ROLE PILLS (Top 5 Roles)
    const roles = member.roles.cache.filter(r => r.id !== member.guild.id).sort((a, b) => b.position - a.position).first(7);
    let roleX = 275;
    for (const role of roles) {
        ctx.save();
        ctx.shadowColor = role.hexColor;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(roleX + 7, 310, 7, 0, Math.PI * 2);
        ctx.fillStyle = role.hexColor;
        ctx.fill();
        ctx.restore();
        roleX += 26;
    }

    // 5. SEPARATOR LINE
    drawGlow(ctx, 70, 340, canvas.width - 140, 3, COLORS.accent);

    // 6. STATS GRID (2 Columns for clean layout)
    const col1X = 90;
    const col2X = 440;
    const statStartY = 380;
    const lineSpacing = 55;

    // Left Column: Economy
    ctx.fillStyle = COLORS.textSecondary;
    ctx.font = '16px RobotoMedium';
    ctx.fillText('💳 WALLET', col1X, statStartY);
    ctx.fillStyle = COLORS.textPrimary;
    ctx.font = 'bold 24px RobotoBold';
    ctx.fillText(`${eco.wallet.toLocaleString()} LC`, col1X, statStartY + 30);

    ctx.fillStyle = COLORS.textSecondary;
    ctx.font = '16px RobotoMedium';
    ctx.fillText('🏦 BANK', col1X, statStartY + lineSpacing);
    ctx.fillStyle = COLORS.textPrimary;
    ctx.font = 'bold 24px RobotoBold';
    ctx.fillText(`${eco.bank.toLocaleString()} LC`, col1X, statStartY + lineSpacing + 30);

    // Right Column: Social & Inventory
    ctx.fillStyle = COLORS.textSecondary;
    ctx.font = '16px RobotoMedium';
    ctx.fillText('💍 MARITAL STATUS', col2X, statStartY);
    ctx.fillStyle = COLORS.textPrimary;
    ctx.font = 'bold 24px RobotoBold';
    ctx.fillText(marriage ? `Married` : 'Single', col2X, statStartY + 30);

    ctx.fillStyle = COLORS.textSecondary;
    ctx.font = '16px RobotoMedium';
    ctx.fillText('🎒 INVENTORY', col2X, statStartY + lineSpacing);
    ctx.fillStyle = COLORS.textPrimary;
    ctx.font = 'bold 24px RobotoBold';
    ctx.fillText(`${inventoryCount} Item(s)`, col2X, statStartY + lineSpacing + 30);

    // Net Worth Bar (Bottom Sub-panel)
    drawGlassPanel(ctx, 70, 510, canvas.width - 140, 50, 15);
    const netWorth = eco.wallet + eco.bank;
    ctx.fillStyle = COLORS.accent;
    ctx.font = 'bold 22px RobotoBold';
    ctx.fillText(`💎 NET WORTH: ${netWorth.toLocaleString()} LC`, 105, 543);

    return canvas.encode('png');
}

async function buildMarriageCard(member1, member2, timestamp) {
    const canvas = createCanvas(800, 350);
    const ctx = canvas.getContext('2d');
    drawBackground(ctx, canvas.width, canvas.height);
    drawGlassPanel(ctx, 30, 30, canvas.width - 60, canvas.height - 60, 30);

    await drawAvatar(ctx, member1.user.displayAvatarURL({ extension: 'png', size: 256 }), 90, 90, 160);
    await drawAvatar(ctx, member2.user.displayAvatarURL({ extension: 'png', size: 256 }), 550, 90, 160);

    ctx.save();
    ctx.shadowColor = 'rgba(142, 68, 173, 0.8)';
    ctx.shadowBlur = 30;
    ctx.fillStyle = COLORS.accent;
    ctx.font = '70px RobotoBold'; 
    ctx.fillText('💜', 365, 195);
    ctx.restore();

    ctx.fillStyle = COLORS.textPrimary;
    ctx.font = 'bold 28px RobotoBold';
    ctx.textAlign = 'center';
    ctx.fillText(member1.user.username, 170, 290);
    ctx.fillText(member2.user.username, 630, 290);

    ctx.fillStyle = COLORS.textSecondary;
    ctx.font = '20px RobotoMedium';
    ctx.fillText(`United since ${new Date(timestamp).toLocaleDateString()}`, 400, 330);
    ctx.textAlign = 'left';

    return canvas.encode('png');
}

async function buildModLogCard(avatarURL, accentColor, title, details) {
    const canvas = createCanvas(700, 220);
    const ctx = canvas.getContext('2d');
    drawBackground(ctx, canvas.width, canvas.height);
    drawGlassPanel(ctx, 20, 20, canvas.width - 40, canvas.height - 40, 25);
    drawGlow(ctx, 20, 20, 8, canvas.height - 40, accentColor || COLORS.accent);

    if (avatarURL) {
        await drawAvatar(ctx, avatarURL, 55, 55, 90);
    }

    ctx.save();
    ctx.shadowColor = accentColor || COLORS.accent;
    ctx.shadowBlur = 10;
    ctx.fillStyle = accentColor || COLORS.accent;
    ctx.font = 'bold 30px RobotoBold';
    ctx.fillText(title, 175, 95);
    ctx.restore();

    ctx.fillStyle = COLORS.textPrimary;
    ctx.font = '19px RobotoMedium';
    let y = 135;
    for (const line of details) {
        if (y > 190) break;
        const truncLine = line.length > 65 ? line.substring(0, 62) + '...' : line;
        ctx.fillText(truncLine, 175, y);
        y += 30;
    }

    return canvas.encode('png');
}

module.exports = { buildWelcomeImage, buildProfileCard, buildMarriageCard, buildModLogCard, buildLeaveImage };