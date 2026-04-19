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

function wrapText(ctx, text, maxWidth) {
    const words = text.split(' ');
    const lines = [];
    let currentLine = words[0] || '';
    for (let i = 1; i < words.length; i++) {
        const testLine = `${currentLine} ${words[i]}`;
        if (ctx.measureText(testLine).width < maxWidth) {
            currentLine = testLine;
        } else {
            lines.push(currentLine);
            currentLine = words[i];
        }
    }
    lines.push(currentLine);
    return lines;
}

function drawRolesWithNames(ctx, roles, startX, startY, maxWidth) {
    let x = startX;
    let y = startY;
    const spacing = 12;
    const lineHeight = 28;

    for (const role of roles) {
        ctx.font = '14px RobotoMedium';
        const nameWidth = ctx.measureText(role.name).width;
        const pillWidth = nameWidth + 24; 

        if (x + pillWidth > startX + maxWidth) {
            x = startX;
            y += lineHeight;
        }

        // Draw color dot
        ctx.save();
        ctx.shadowColor = role.hexColor;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(x + 6, y - 4, 6, 0, Math.PI * 2);
        ctx.fillStyle = role.hexColor;
        ctx.fill();
        ctx.restore();

        // Draw role name
        ctx.fillStyle = COLORS.textPrimary;
        ctx.textAlign = 'left';
        ctx.fillText(role.name, x + 18, y);

        x += pillWidth + spacing;
    }
    return y;
}

// ─── PREMIUM WELCOME IMAGE (BOT BANNER BACKGROUND) ───
async function buildWelcomeImage(member, client) {
    const canvas = createCanvas(800, 450);
    const ctx = canvas.getContext('2d');

    // 1. Fetch Bot Banner as Primary Background
    let bannerURL = null;
    try {
        await client.user.fetch(true);
        bannerURL = client.user.bannerURL({ size: 1024, extension: 'png' });
    } catch (e) {
        console.error('Banner Fetch Error:', e);
    }

    // 2. Draw Dark Base Background
    drawBackground(ctx, canvas.width, canvas.height);

    // 3. Draw Background Image (Bot Banner or Fallback)
    const innerX = 30, innerY = 30, innerW = canvas.width - 60, innerH = canvas.height - 60;

    if (bannerURL) {
        try {
            ctx.save();
            roundedRect(ctx, innerX, innerY, innerW, innerH, 30);
            ctx.clip();

            const bannerImg = await loadImage(bannerURL);

            // Scale to cover (maintains aspect ratio, crops excess)
            const imgRatio = bannerImg.width / bannerImg.height;
            const boxRatio = innerW / innerH;
            let dw, dh, dx, dy;
            if (imgRatio > boxRatio) {
                dh = innerH; dw = dh * imgRatio;
                dx = innerX + (innerW - dw) / 2; dy = innerY;
            } else {
                dw = innerW; dh = dw / imgRatio;
                dx = innerX; dy = innerY + (innerH - dh) / 2;
            }
            ctx.drawImage(bannerImg, dx, dy, dw, dh);

            // Semi-transparent dark overlay for readability
            ctx.fillStyle = 'rgba(17, 17, 27, 0.50)';
            ctx.fillRect(innerX, innerY, innerW, innerH);

            // Vignette for depth
            const vig = ctx.createRadialGradient(400, 225, 80, 400, 225, 500);
            vig.addColorStop(0, 'rgba(17, 17, 27, 0)');
            vig.addColorStop(1, 'rgba(17, 17, 27, 0.30)');
            ctx.fillStyle = vig;
            ctx.fillRect(innerX, innerY, innerW, innerH);

            // Thin accent border on inner card
            ctx.strokeStyle = 'rgba(142, 68, 173, 0.25)';
            ctx.lineWidth = 1;
            roundedRect(ctx, innerX, innerY, innerW, innerH, 30);
            ctx.stroke();

            ctx.restore();
        } catch {
            drawGlassPanel(ctx, innerX, innerY, innerW, innerH, 30);
        }
    } else {
        // Fallback: Glass panel + Blurred header image
        drawGlassPanel(ctx, innerX, innerY, innerW, innerH, 30);

        const fallbackURL = member.guild.iconURL({ extension: 'png', size: 256 })
            || member.user.displayAvatarURL({ extension: 'png', size: 256 });
        try {
            ctx.save();
            roundedRect(ctx, innerX, innerY, innerW, 180, 30);
            ctx.clip();
            const fbImg = await loadImage(fallbackURL);
            ctx.filter = 'blur(30px) brightness(0.3)';
            ctx.drawImage(fbImg, innerX, -50, innerW, 400);
            ctx.filter = 'none';
            const fade = ctx.createLinearGradient(0, 120, 0, 210);
            fade.addColorStop(0, 'rgba(17, 17, 27, 0)');
            fade.addColorStop(1, 'rgba(17, 17, 27, 1)');
            ctx.fillStyle = fade;
            ctx.fillRect(innerX, 120, innerW, 100);
            ctx.restore();
        } catch {}
    }

    // 4. Flowing Glass Light Sweeps
    ctx.save();
    ctx.strokeStyle = 'rgba(142, 68, 173, 0.25)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(30, 150); ctx.lineTo(770, 50); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(30, 160); ctx.lineTo(770, 60); ctx.stroke();
    ctx.restore();

    // 5. Centered Avatar with Double Royal Glow
    const avatarSize = 120;
    const avatarX = (canvas.width - avatarSize) / 2;
    const avatarY = 80;
    await drawAvatar(ctx, member.user.displayAvatarURL({ extension: 'png', size: 512 }), avatarX, avatarY, avatarSize);

    ctx.save(); ctx.shadowColor = '#FFD700'; ctx.shadowBlur = 40;
    ctx.beginPath(); ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2 + 10, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.4)'; ctx.lineWidth = 3; ctx.stroke(); ctx.restore();

    ctx.save(); ctx.shadowColor = COLORS.accentGlow; ctx.shadowBlur = 20;
    ctx.beginPath(); ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2 + 4, 0, Math.PI * 2);
    ctx.strokeStyle = COLORS.accent; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();

    // 6. Centered Typography
    ctx.save(); ctx.shadowColor = '#FFD700'; ctx.shadowBlur = 20;
    ctx.fillStyle = '#FFFFFF'; ctx.font = 'bold 40px RobotoBold'; ctx.textAlign = 'center';
    ctx.fillText(member.user.username, canvas.width / 2, 260); ctx.restore();

    ctx.fillStyle = COLORS.textSecondary; ctx.font = '22px RobotoMedium'; ctx.textAlign = 'center';
    ctx.fillText(`WELCOME TO ${member.guild.name.toUpperCase()}`, canvas.width / 2, 295);

    // 7. Stats Sub-Panel
    drawSubPanel(ctx, 150, 330, 500, 70, '', COLORS.accent);
    ctx.fillStyle = COLORS.textSecondary; ctx.font = '16px RobotoMedium'; ctx.textAlign = 'center';
    ctx.fillText(`MEMBER #${member.guild.memberCount}`, canvas.width / 2, 358);

    const accountAgeDays = Math.floor((Date.now() - member.user.createdTimestamp) / (1000 * 60 * 60 * 24));
    ctx.fillStyle = COLORS.textPrimary; ctx.font = 'bold 16px RobotoBold';
    ctx.fillText(`ACCOUNT AGE: ${accountAgeDays} DAYS`, canvas.width / 2, 382);

    return canvas.encode('png');
}

// ─── PREMIUM LEAVE IMAGE (BOT BANNER BACKGROUND) ───
async function buildLeaveImage(member, client) {
    const canvas = createCanvas(800, 400);
    const ctx = canvas.getContext('2d');

    // 1. Fetch Bot Banner as Primary Background
    let bannerURL = null;
    try {
        await client.user.fetch(true);
        bannerURL = client.user.bannerURL({ size: 1024, extension: 'png' });
    } catch (e) {
        console.error('Banner Fetch Error:', e);
    }

    // 2. Draw Dark Base Background
    drawBackground(ctx, canvas.width, canvas.height);

    // 3. Draw Background Image (Bot Banner or Fallback)
    const innerX = 30, innerY = 30, innerW = canvas.width - 60, innerH = canvas.height - 60;

    if (bannerURL) {
        try {
            ctx.save();
            roundedRect(ctx, innerX, innerY, innerW, innerH, 30);
            ctx.clip();

            const bannerImg = await loadImage(bannerURL);

            // Scale to cover
            const imgRatio = bannerImg.width / bannerImg.height;
            const boxRatio = innerW / innerH;
            let dw, dh, dx, dy;
            if (imgRatio > boxRatio) {
                dh = innerH; dw = dh * imgRatio;
                dx = innerX + (innerW - dw) / 2; dy = innerY;
            } else {
                dw = innerW; dh = dw / imgRatio;
                dx = innerX; dy = innerY + (innerH - dh) / 2;
            }
            ctx.drawImage(bannerImg, dx, dy, dw, dh);

            // Red-tinted dark overlay for leave theme
            ctx.fillStyle = 'rgba(50, 10, 10, 0.55)';
            ctx.fillRect(innerX, innerY, innerW, innerH);

            // Vignette for depth
            const vig = ctx.createRadialGradient(400, 200, 80, 400, 200, 450);
            vig.addColorStop(0, 'rgba(17, 17, 27, 0)');
            vig.addColorStop(1, 'rgba(17, 17, 27, 0.30)');
            ctx.fillStyle = vig;
            ctx.fillRect(innerX, innerY, innerW, innerH);

            // Thin red-tinted border
            ctx.strokeStyle = 'rgba(231, 76, 60, 0.25)';
            ctx.lineWidth = 1;
            roundedRect(ctx, innerX, innerY, innerW, innerH, 30);
            ctx.stroke();

            ctx.restore();
        } catch {
            drawGlassPanel(ctx, innerX, innerY, innerW, innerH, 30);
        }
    } else {
        // Fallback: Glass panel + Blurred header image
        drawGlassPanel(ctx, innerX, innerY, innerW, innerH, 30);

        const fallbackURL = member.guild.iconURL({ extension: 'png', size: 256 })
            || member.user.displayAvatarURL({ extension: 'png', size: 256 });
        try {
            ctx.save();
            roundedRect(ctx, innerX, innerY, innerW, 160, 30);
            ctx.clip();
            const fbImg = await loadImage(fallbackURL);
            ctx.filter = 'blur(30px) brightness(0.2) saturate(0.5)';
            ctx.drawImage(fbImg, innerX, -50, innerW, 350);
            ctx.filter = 'none';
            const fade = ctx.createLinearGradient(0, 80, 0, 190);
            fade.addColorStop(0, 'rgba(17, 17, 27, 0)');
            fade.addColorStop(1, 'rgba(17, 17, 27, 1)');
            ctx.fillStyle = fade;
            ctx.fillRect(innerX, 80, innerW, 120);
            ctx.restore();
        } catch {}
    }

    // 4. Flowing Glass Light Sweeps (Red tinted)
    ctx.save();
    ctx.strokeStyle = 'rgba(231, 76, 60, 0.25)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(30, 120); ctx.lineTo(770, 20); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(30, 130); ctx.lineTo(770, 30); ctx.stroke();
    ctx.restore();

    // 5. Centered Avatar with Red Glow
    const avatarSize = 110;
    const avatarX = (canvas.width - avatarSize) / 2;
    const avatarY = 60;
    await drawAvatar(ctx, member.user.displayAvatarURL({ extension: 'png', size: 512 }), avatarX, avatarY, avatarSize);

    ctx.save(); ctx.shadowColor = '#e74c3c'; ctx.shadowBlur = 40;
    ctx.beginPath(); ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2 + 10, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(231, 76, 60, 0.5)'; ctx.lineWidth = 3; ctx.stroke(); ctx.restore();

    // 6. Centered Typography
    ctx.save(); ctx.shadowColor = '#e74c3c'; ctx.shadowBlur = 20;
    ctx.fillStyle = '#FFFFFF'; ctx.font = 'bold 40px RobotoBold'; ctx.textAlign = 'center';
    ctx.fillText(member.user.username, canvas.width / 2, 230); ctx.restore();

    ctx.fillStyle = COLORS.textSecondary; ctx.font = '22px RobotoMedium'; ctx.textAlign = 'center';
    ctx.fillText("SOUL DEPARTED", canvas.width / 2, 265);

    // 7. Member Count Sub-Panel
    drawSubPanel(ctx, 200, 300, 400, 60, '', '#e74c3c');
    ctx.fillStyle = COLORS.textPrimary; ctx.font = 'bold 18px RobotoBold'; ctx.textAlign = 'center';
    ctx.fillText(`REMAINING SOULS: ${member.guild.memberCount}`, canvas.width / 2, 338);

    return canvas.encode('png');
}

// ─── THE ULTIMATE PROFILE CARD ───
async function buildProfileCard(member, eco, marriage, joinTimestamp, createdTimestamp, inventoryCount, badges = [], bgURL = null) {
    const canvas = createCanvas(800, 620); // Made slightly taller to fit badges
    const ctx = canvas.getContext('2d');
    drawBackground(ctx, canvas.width, canvas.height);

    // ── DYNAMIC BACKGROUND LOGIC ──
    if (bgURL) {
        try {
            const bgImg = await loadImage(bgURL);
            const imgRatio = bgImg.width / bgImg.height;
            const boxRatio = canvas.width / canvas.height;
            let dw, dh, dx, dy;
            if (imgRatio > boxRatio) {
                dh = canvas.height; dw = dh * imgRatio;
                dx = (canvas.width - dw) / 2; dy = 0;
            } else {
                dw = canvas.width; dh = dw / imgRatio;
                dx = 0; dy = (canvas.height - dh) / 2;
            }
            ctx.drawImage(bgImg, dx, dy, dw, dh);
            // Heavy dark overlay so text remains readable
            ctx.fillStyle = 'rgba(17, 17, 27, 0.70)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        } catch {
            // Fallback if URL breaks
            drawBackground(ctx, canvas.width, canvas.height);
        }
    }

    // Default blurred avatar header (only runs if no bgURL)
    if (!bgURL) {
        try {
            ctx.save();
            roundedRect(ctx, 30, 30, canvas.width - 60, 170, 30);
            ctx.clip();
            const bannerImg = await loadImage(member.user.displayAvatarURL({ extension: 'png', size: 256 }));
            ctx.filter = 'blur(25px) brightness(0.5)'; 
            ctx.drawImage(bannerImg, 30, -50, canvas.width - 60, 350);
            ctx.filter = 'none';
            
            const fadeGrad = ctx.createLinearGradient(0, 100, 0, 200);
            fadeGrad.addColorStop(0, 'rgba(17, 17, 27, 0)');
            fadeGrad.addColorStop(1, 'rgba(17, 17, 27, 1)');
            ctx.fillStyle = fadeGrad;
            ctx.fillRect(30, 100, canvas.width - 60, 100);
            ctx.restore();
        } catch {}
    }

    drawGlassPanel(ctx, 30, 160, canvas.width - 60, canvas.height - 190, 30);

    const avatarSize = 160;
    await drawAvatar(ctx, member.user.displayAvatarURL({ extension: 'png', size: 512 }), 75, 85, avatarSize);

    // ── EQUIPPED BADGE LOGIC (GLOW + [NAME]) ──
    const equippedBadge = eco.profile_badge ? require('../utils/badges').BADGES[eco.profile_badge] : null;
    let displayName = member.user.username;
    let nameColor = '#FFFFFF'; // Default white
    let glowColor = null;

    if (equippedBadge) {
        displayName = `${member.user.username} [${equippedBadge.name}]`;
        nameColor = equippedBadge.color || '#FFFFFF';
        glowColor = equippedBadge.color || '#FFD700';
    }

    // Draw Username with conditional glow
    ctx.save();
    if (glowColor) {
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = 25;
    }
    ctx.fillStyle = nameColor;
    ctx.font = 'bold 42px RobotoBold';
    
    // Truncate if [Badge Name] makes it too long for the canvas
    while (ctx.measureText(displayName).width > 480 && displayName.length > 0) {
        displayName = displayName.slice(0, -1);
    }
    
    ctx.fillText(displayName, 275, 225);
    ctx.restore();

    ctx.fillStyle = COLORS.textSecondary;
    ctx.font = '18px RobotoRegular';
    ctx.fillText(`Joined Server: ${new Date(joinTimestamp).toLocaleDateString()}`, 275, 255);
    ctx.fillText(`Account Created: ${new Date(createdTimestamp).toLocaleDateString()}`, 275, 280);

    // ── BADGES ROW ──
    if (badges.length > 0) {
        let badgeX = 275;
        const badgeY = 310;
        for (let i = 0; i < Math.min(badges.length, 8); i++) {
            const info = require('../utils/badges').BADGES[badges[i].badge_id];
            if (info) {
                ctx.save();
                ctx.shadowColor = '#FFD700'; ctx.shadowBlur = 10;
                ctx.font = '24px RobotoBold';
                ctx.fillText(info.emoji, badgeX, badgeY);
                ctx.restore();
                badgeX += 35;
            }
        }
    }

    drawGlow(ctx, 70, 340, canvas.width - 140, 3, COLORS.accent);

    const col1X = 90;
    const col2X = 440;
    const statStartY = 380;
    const lineSpacing = 55;

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

    drawGlassPanel(ctx, 70, 530, canvas.width - 140, 50, 15); // Moved down
    const netWorth = eco.wallet + eco.bank;
    ctx.fillStyle = COLORS.accent;
    ctx.font = 'bold 22px RobotoBold';
    ctx.fillText(`💎 NET WORTH: ${netWorth.toLocaleString()} LC`, 105, 563); // Moved down

    // ── STREAKS FOOTER ──
    if (eco.daily_streak > 1 || eco.work_streak > 1) {
        ctx.fillStyle = COLORS.textSecondary;
        ctx.font = '14px RobotoMedium';
        ctx.textAlign = 'right';
        let streakTxt = '';
        if (eco.daily_streak > 1) streakTxt += `🔥 Daily: ${eco.daily_streak}  `;
        if (eco.work_streak > 1) streakTxt += `⚒️ Work: ${eco.work_streak}`;
        ctx.fillText(streakTxt, canvas.width - 90, 563);
        ctx.textAlign = 'left';
    }

    return canvas.encode('png');
}

async function buildBadgeLeaderboardCard(client, guild, leaderboard) {
    const entryHeight = 50;
    const baseHeight = 210; 
    const canvasHeight = baseHeight + (leaderboard.length * entryHeight) + 40; 
    
    const canvas = createCanvas(800, canvasHeight);
    const ctx = canvas.getContext('2d');
    drawBackground(ctx, canvas.width, canvas.height);
    drawGlassPanel(ctx, 30, 30, canvas.width - 60, canvas.height - 60, 30);

    ctx.save();
    ctx.shadowColor = '#FFD700'; // Gold for badges
    ctx.shadowBlur = 20;
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 36px RobotoBold';
    ctx.textAlign = 'center';
    ctx.fillText('🏅 ACHIEVEMENT HALL OF FAME', canvas.width / 2, 85);
    ctx.restore();

    ctx.fillStyle = COLORS.textSecondary;
    ctx.font = '18px RobotoMedium';
    ctx.textAlign = 'center';
    ctx.fillText(`Most decorated souls in ${guild.name}`, canvas.width / 2, 115);

    drawGlow(ctx, 70, 140, canvas.width - 140, 3, '#FFD700');

    let y = 190;
    const rankColors = ['#FFD700', '#C0C0C0', '#CD7F32']; 

    for (let i = 0; i < leaderboard.length; i++) {
        const entry = leaderboard[i];
        const rankNum = i + 1;
        const user = await client.users.fetch(entry.user_id).catch(() => null);
        const name = user ? user.username : 'Unknown Soul';
        const avatarURL = user ? user.displayAvatarURL({ extension: 'png', size: 128 }) : null;

        ctx.save();
        ctx.beginPath();
        ctx.arc(105, y, 18, 0, Math.PI * 2);
        ctx.fillStyle = rankNum <= 3 ? rankColors[rankNum - 1] : COLORS.textSecondary;
        ctx.fill();
        ctx.restore();

        ctx.fillStyle = COLORS.bgEnd;
        ctx.font = 'bold 18px RobotoBold';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${rankNum}`, 105, y + 1);

        if (avatarURL) {
            await drawAvatar(ctx, avatarURL, 145, y - 20, 40);
        }

        ctx.fillStyle = COLORS.textPrimary;
        ctx.font = '22px RobotoMedium';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        const displayName = name.length > 15 ? name.substring(0, 12) + '...' : name;
        ctx.fillText(displayName, 205, y);

        ctx.fillStyle = rankNum === 1 ? '#FFD700' : COLORS.textPrimary;
        ctx.font = 'bold 22px RobotoBold';
        ctx.textAlign = 'right';
        ctx.fillText(`🏅 ${entry.badge_count} Badges`, canvas.width - 90, y);

        y += entryHeight;
    }

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

// ─── PREMIUM MOD LOG CARD (ROYAL RICED EDITION) ───
async function buildModLogCard(targetAvatar, accentColor, title, details) {
    const canvas = createCanvas(800, 480); 
    const ctx = canvas.getContext('2d');
    drawBackground(ctx, canvas.width, canvas.height);
    drawGlassPanel(ctx, 30, 30, canvas.width - 60, canvas.height - 60, 30);

    // 1. Blurred Banner Header
    try {
        ctx.save();
        roundedRect(ctx, 30, 30, canvas.width - 60, 180, 30);
        ctx.clip();
        const bannerImg = await loadImage(targetAvatar || 'https://cdn.discordapp.com/embed/avatars/0.png');
        ctx.filter = 'blur(30px) brightness(0.25)'; 
        ctx.drawImage(bannerImg, 30, -50, canvas.width - 60, 400);
        ctx.filter = 'none';
        const fadeGrad = ctx.createLinearGradient(0, 120, 0, 210);
        fadeGrad.addColorStop(0, 'rgba(17, 17, 27, 0)');
        fadeGrad.addColorStop(1, 'rgba(17, 17, 27, 1)');
        ctx.fillStyle = fadeGrad;
        ctx.fillRect(30, 120, canvas.width - 60, 100);
        ctx.restore();
    } catch {}

    // 2. Flowing Light Lines
    ctx.save();
    ctx.strokeStyle = `${accentColor}33` || 'rgba(142, 68, 173, 0.2)'; 
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(30, 150); ctx.lineTo(770, 50); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(30, 160); ctx.lineTo(770, 60); ctx.stroke();
    ctx.restore();

    // 3. Overlapping Avatar with Double Glow
    const avatarSize = 110;
    await drawAvatar(ctx, targetAvatar || 'https://cdn.discordapp.com/embed/avatars/0.png', 75, 85, avatarSize);
    
    ctx.save(); ctx.shadowColor = accentColor || COLORS.accentGlow; ctx.shadowBlur = 40;
    ctx.beginPath(); ctx.arc(75 + avatarSize / 2, 85 + avatarSize / 2, avatarSize / 2 + 10, 0, Math.PI * 2);
    ctx.strokeStyle = `${accentColor}66` || 'rgba(255, 215, 0, 0.4)'; ctx.lineWidth = 3; ctx.stroke(); ctx.restore();

    ctx.save(); ctx.shadowColor = COLORS.accentGlow; ctx.shadowBlur = 20;
    ctx.beginPath(); ctx.arc(75 + avatarSize / 2, 85 + avatarSize / 2, avatarSize / 2 + 4, 0, Math.PI * 2);
    ctx.strokeStyle = COLORS.accent; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();

    // 4. Title Typography
    ctx.save(); ctx.shadowColor = accentColor || COLORS.accent; ctx.shadowBlur = 20;
    ctx.fillStyle = '#FFFFFF'; ctx.font = 'bold 38px RobotoBold'; ctx.textAlign = 'left';
    ctx.fillText(title, 230, 145); ctx.restore();

    ctx.fillStyle = COLORS.textSecondary; ctx.font = '18px RobotoMedium';
    ctx.fillText('OFFICIAL COUNCIL DECREE', 230, 175);

    // Accent Divider
    drawGlow(ctx, 70, 210, canvas.width - 140, 3, accentColor || COLORS.accent);

    // 5. Details Sub-Panel
    drawSubPanel(ctx, 70, 235, canvas.width - 140, 170, '', accentColor);

    ctx.font = '20px RobotoMedium'; ctx.textAlign = 'left';
    let y = 275;
    
    for (const line of details) {
        if (y > 385) break; // Stop if we run out of panel space
        
        const parts = line.split(':');
        if (parts.length > 1) {
            // Draw Label (e.g., "Added:")
            ctx.fillStyle = accentColor || COLORS.accent;
            const label = `${parts[0]}: `;
            ctx.fillText(label, 100, y);
            const labelWidth = ctx.measureText(label).width;
            
            // Draw Value (Wrapped text)
            ctx.fillStyle = COLORS.textPrimary;
            const valueText = parts.slice(1).join(':').trim();
            const maxWidth = (canvas.width - 200) - labelWidth; // Calculate remaining space
            const wrappedLines = wrapText(ctx, valueText, maxWidth);
            
            for (let i = 0; i < wrappedLines.length; i++) {
                if (y > 385) break;
                ctx.fillText(wrappedLines[i], 100 + labelWidth, y);
                if (i < wrappedLines.length - 1) y += 28; // Tighter line height for wrapped text
            }
        } else {
            ctx.fillStyle = COLORS.textPrimary;
            const wrappedLines = wrapText(ctx, line, canvas.width - 200);
            for (let i = 0; i < wrappedLines.length; i++) {
                if (y > 385) break;
                ctx.fillText(wrappedLines[i], 100, y);
                if (i < wrappedLines.length - 1) y += 28;
            }
        }
        y += 38; // Spacing between different details
    }

    return canvas.encode('png');
}

// ─── THE INFERNAL LEADERBOARD CARD ───
async function buildLeaderboardCard(client, guild, leaderboard, page = 1) {
    const entryHeight = 50;
    const baseHeight = 210; 
    const canvasHeight = baseHeight + (leaderboard.length * entryHeight) + 40; 
    
    const canvas = createCanvas(800, canvasHeight);
    const ctx = canvas.getContext('2d');
    drawBackground(ctx, canvas.width, canvas.height);
    
    drawGlassPanel(ctx, 30, 30, canvas.width - 60, canvas.height - 60, 30);

    ctx.save();
    ctx.shadowColor = COLORS.accentGlow;
    ctx.shadowBlur = 20;
    ctx.fillStyle = COLORS.accent;
    ctx.font = 'bold 36px RobotoBold';
    ctx.textAlign = 'center';
    ctx.fillText('👑 THE INFERNAL RICH LIST', canvas.width / 2, 85);
    ctx.restore();

    ctx.fillStyle = COLORS.textSecondary;
    ctx.font = '18px RobotoMedium';
    ctx.textAlign = 'center';
    ctx.fillText(`Wealth is power in ${guild.name} • Page ${page}`, canvas.width / 2, 115);

    drawGlow(ctx, 70, 140, canvas.width - 140, 3, COLORS.accent);

    let y = 190;
    const rankColors = ['#FFD700', '#C0C0C0', '#CD7F32']; 
    const startRank = (page - 1) * 10; 

    for (let i = 0; i < leaderboard.length; i++) {
        const entry = leaderboard[i];
        const rankNum = startRank + i + 1;
        const user = await client.users.fetch(entry.userId).catch(() => null);
        const name = user ? user.username : 'Unknown Soul';
        const avatarURL = user ? user.displayAvatarURL({ extension: 'png', size: 128 }) : null;

        ctx.save();
        ctx.beginPath();
        ctx.arc(105, y, 18, 0, Math.PI * 2);
        ctx.fillStyle = rankNum <= 3 ? rankColors[rankNum - 1] : COLORS.textSecondary;
        ctx.fill();
        ctx.restore();

        ctx.fillStyle = COLORS.bgEnd;
        ctx.font = 'bold 18px RobotoBold';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${rankNum}`, 105, y + 1);

        if (avatarURL) {
            await drawAvatar(ctx, avatarURL, 145, y - 20, 40);
        }

        ctx.fillStyle = COLORS.textPrimary;
        ctx.font = '22px RobotoMedium';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        const displayName = name.length > 15 ? name.substring(0, 12) + '...' : name;
        ctx.fillText(displayName, 205, y);

        ctx.fillStyle = rankNum === 1 ? '#FFD700' : COLORS.textPrimary;
        ctx.font = 'bold 22px RobotoBold';
        ctx.textAlign = 'right';
        ctx.fillText(`💎 ${entry.netWorth.toLocaleString()} LC`, canvas.width - 90, y);

        y += entryHeight;
    }

    drawGlow(ctx, 70, y + 10, canvas.width - 140, 3, COLORS.accent);

    return canvas.encode('png');
}

// ─── THE INFERNAL BALANCE CARD ───
async function buildBalanceCard(member, eco) {
    const canvas = createCanvas(800, 400);
    const ctx = canvas.getContext('2d');
    drawBackground(ctx, canvas.width, canvas.height);
    drawGlassPanel(ctx, 30, 30, canvas.width - 60, canvas.height - 60, 30);

    const avatarSize = 160;
    await drawAvatar(ctx, member.user.displayAvatarURL({ extension: 'png', size: 512 }), 85, 85, avatarSize);

    ctx.fillStyle = COLORS.textSecondary;
    ctx.font = '22px RobotoMedium';
    ctx.textAlign = 'left';
    ctx.fillText('👑 INFERNAL VAULT', 295, 120);

    ctx.fillStyle = COLORS.textPrimary;
    ctx.font = 'bold 40px RobotoBold';
    ctx.fillText(member.user.username, 295, 170);

    drawGlow(ctx, 295, 195, 460, 3, COLORS.accent);

    const col1X = 295;
    const col2X = 540;
    const statStartY = 240;

    ctx.fillStyle = COLORS.textSecondary;
    ctx.font = '16px RobotoMedium';
    ctx.fillText('💳 WALLET', col1X, statStartY);
    ctx.fillStyle = COLORS.textPrimary;
    ctx.font = 'bold 26px RobotoBold';
    ctx.fillText(`${eco.wallet.toLocaleString()} LC`, col1X, statStartY + 35);

    ctx.fillStyle = COLORS.textSecondary;
    ctx.font = '16px RobotoMedium';
    ctx.fillText('🏦 BANK', col2X, statStartY);
    ctx.fillStyle = COLORS.textPrimary;
    ctx.font = 'bold 26px RobotoBold';
    ctx.fillText(`${eco.bank.toLocaleString()} LC`, col2X, statStartY + 35);

    drawGlassPanel(ctx, 295, 310, 460, 55, 15);
    
    ctx.save();
    ctx.shadowColor = COLORS.accentGlow;
    ctx.shadowBlur = 15;
    ctx.fillStyle = COLORS.accent;
    ctx.font = 'bold 24px RobotoBold';
    ctx.fillText(`💎 NET WORTH: ${(eco.wallet + eco.bank).toLocaleString()} LC`, 320, 345);
    ctx.restore();

    return canvas.encode('png');
}

// ─── 1. INVENTORY CARD ───
async function buildInventoryCard(member, items, itemMap) {
    const canvas = createCanvas(800, 400);
    const ctx = canvas.getContext('2d');
    drawBackground(ctx, canvas.width, canvas.height);
    drawGlassPanel(ctx, 30, 30, canvas.width - 60, canvas.height - 60, 30);

    const avatarSize = 100;
    await drawAvatar(ctx, member.user.displayAvatarURL({ extension: 'png', size: 256 }), 70, 60, avatarSize);

    ctx.fillStyle = COLORS.textPrimary;
    ctx.font = 'bold 32px RobotoBold';
    ctx.textAlign = 'left';
    ctx.fillText("🎒 Demon's Hoard", 200, 110);

    ctx.fillStyle = COLORS.textSecondary;
    ctx.font = '18px RobotoRegular';
    ctx.fillText(`${items.length} Item(s) Stored`, 200, 140);

    drawGlow(ctx, 70, 175, canvas.width - 140, 3, COLORS.accent);

    if (!items.length) {
        ctx.fillStyle = COLORS.textSecondary;
        ctx.font = '20px RobotoMedium';
        ctx.textAlign = 'center';
        ctx.fillText('Your hoard is empty. Visit the shop!', canvas.width / 2, 260);
    } else {
        let y = 210;
        for (let i = 0; i < Math.min(items.length, 5); i++) {
            const item = items[i];
            const details = itemMap[item.item_id] || { name: item.item_id, emoji: '📦' };
            
            ctx.fillStyle = COLORS.textPrimary;
            ctx.font = '22px RobotoMedium';
            ctx.textAlign = 'left';
            ctx.fillText(`${details.emoji} ${details.name}`, 100, y);

            ctx.fillStyle = item.expires ? '#e74c3c' : COLORS.accent;
            ctx.font = '16px RobotoRegular';
            ctx.textAlign = 'right';
            ctx.fillText(item.expires ? `Expires <t:${Math.floor(item.expires / 1000)}:R>` : 'Permanent', canvas.width - 100, y);
            y += 40;
        }
        if (items.length > 5) {
            ctx.fillStyle = COLORS.textSecondary;
            ctx.font = '16px RobotoRegular';
            ctx.textAlign = 'center';
            ctx.fillText(`...and ${items.length - 5} more items!`, canvas.width / 2, y);
        }
    }
    return canvas.encode('png');
}

// ─── 2. SHOP CARD ───
async function buildShopCard(eco, shopItems) {
    const baseHeight = 190;
    const canvasHeight = baseHeight + (shopItems.length * 75) + 40;
    const canvas = createCanvas(800, canvasHeight);
    const ctx = canvas.getContext('2d');
    drawBackground(ctx, canvas.width, canvas.height);
    drawGlassPanel(ctx, 30, 30, canvas.width - 60, canvas.height - 60, 30);

    ctx.fillStyle = COLORS.accent; ctx.font = 'bold 36px RobotoBold'; ctx.textAlign = 'center';
    ctx.fillText('🛒 Infernal Shop', canvas.width / 2, 85);

    ctx.fillStyle = COLORS.textPrimary; ctx.font = '20px RobotoMedium';
    ctx.fillText(`💳 Your Wallet: ${eco.wallet.toLocaleString()} LC`, canvas.width / 2, 120);

    drawGlow(ctx, 70, 145, canvas.width - 140, 3, COLORS.accent);

    let y = 190;
    for (const item of shopItems) {
        ctx.fillStyle = COLORS.textPrimary; ctx.font = 'bold 24px RobotoBold'; ctx.textAlign = 'left';
        ctx.fillText(`${item.name}`, 100, y);

        ctx.fillStyle = '#FFD700'; ctx.font = 'bold 22px RobotoBold'; ctx.textAlign = 'right';
        ctx.fillText(`${item.price.toLocaleString()} LC`, canvas.width - 100, y);

        ctx.fillStyle = COLORS.textSecondary; ctx.font = '16px RobotoRegular'; ctx.textAlign = 'left';
        ctx.fillText(item.desc, 100, y + 28);
        y += 75;
    }
    return canvas.encode('png');
}

// ─── 3. RECEIPT CARD (Updated for flexibility) ───
async function buildReceiptCard(member, title, amountString, detail, isSuccess = true) {
    const canvas = createCanvas(800, 300);
    const ctx = canvas.getContext('2d');
    drawBackground(ctx, canvas.width, canvas.height);
    drawGlassPanel(ctx, 30, 30, canvas.width - 60, canvas.height - 60, 30);

    const avatarSize = 100;
    await drawAvatar(ctx, member.user.displayAvatarURL({ extension: 'png', size: 256 }), 70, 70, avatarSize);

    ctx.fillStyle = COLORS.textSecondary;
    ctx.font = '20px RobotoMedium';
    ctx.textAlign = 'left';
    ctx.fillText(title.toUpperCase(), 200, 100);

    ctx.fillStyle = isSuccess ? '#00FF7F' : '#e74c3c';
    ctx.font = 'bold 40px RobotoBold';
    ctx.fillText(amountString, 200, 150);

    if (detail) {
        ctx.fillStyle = COLORS.textPrimary;
        ctx.font = '18px RobotoRegular';
        const lines = wrapText(ctx, detail, 500);
        lines.slice(0, 2).forEach((line, i) => ctx.fillText(line, 200, 185 + (i * 25)));
    }

    drawGlow(ctx, 70, canvas.height - 70, canvas.width - 140, 3, isSuccess ? '#00FF7F' : '#e74c3c');
    return canvas.encode('png');
}

// ─── 6. USER DOSSIER CARD (FULL INFO) ───
async function buildUserDossierCard(member, data) {
    const canvas = createCanvas(800, 680); 
    const ctx = canvas.getContext('2d');
    drawBackground(ctx, canvas.width, canvas.height);
    drawGlassPanel(ctx, 30, 30, canvas.width - 60, canvas.height - 60, 30);

    // 1. BLUR BANNER HEADER
    try {
        ctx.save();
        roundedRect(ctx, 30, 30, canvas.width - 60, 160, 30);
        ctx.clip();
        const bannerImg = await loadImage(member.user.displayAvatarURL({ extension: 'png', size: 256 }));
        ctx.filter = 'blur(25px) brightness(0.4)'; 
        ctx.drawImage(bannerImg, 30, -50, canvas.width - 60, 350);
        ctx.filter = 'none';
        
        const fadeGrad = ctx.createLinearGradient(0, 100, 0, 190);
        fadeGrad.addColorStop(0, 'rgba(17, 17, 27, 0)');
        fadeGrad.addColorStop(1, 'rgba(17, 17, 27, 1)');
        ctx.fillStyle = fadeGrad;
        ctx.fillRect(30, 100, canvas.width - 60, 100);
        ctx.restore();
    } catch {}

    // 2. Overlapping Avatar
    const avatarSize = 100; 
    await drawAvatar(ctx, member.user.displayAvatarURL({ extension: 'png', size: 512 }), 75, 75, avatarSize);

    // 3. Username & Top Details (ADJUSTED Y-COORDINATES TO CENTER NEXT TO AVATAR)
    ctx.fillStyle = COLORS.textPrimary;
    ctx.font = 'bold 40px RobotoBold';
    ctx.textAlign = 'left';
    ctx.fillText(member.user.username, 230, 125); // Pulled up to center vertically

    ctx.fillStyle = COLORS.textSecondary;
    ctx.font = '16px RobotoRegular';
    ctx.fillText(`🆔 ${member.id}`, 230, 155); // Pulled up

    ctx.fillStyle = COLORS.textPrimary;
    ctx.font = '16px RobotoMedium';
    ctx.fillText(`🏅 ${data.badges}`, 230, 175); // Pulled up to align with avatar bottom

    // Accent Divider
    drawGlow(ctx, 70, 200, canvas.width - 140, 3, COLORS.accent);

    // 4. Stats Grid
    const col1X = 100;
    const col2X = 440;
    let y = 230; // Adjusted start slightly

    // Left Col
    ctx.fillStyle = COLORS.textSecondary; ctx.font = '14px RobotoMedium'; ctx.textAlign = 'left'; ctx.fillText('📅 ACCOUNT BORN', col1X, y);
    ctx.fillStyle = COLORS.textPrimary; ctx.font = '18px RobotoBold'; ctx.fillText(data.created, col1X, y + 24);
    
    y += 65;
    ctx.fillStyle = COLORS.textSecondary; ctx.font = '14px RobotoMedium'; ctx.fillText('🚪 REALM JOINED', col1X, y);
    ctx.fillStyle = COLORS.textPrimary; ctx.font = '18px RobotoBold'; ctx.fillText(data.joined, col1X, y + 24);

    // Right Col
    y = 230; // Adjusted start slightly
    ctx.fillStyle = COLORS.textSecondary; ctx.font = '14px RobotoMedium'; ctx.fillText('💎 BOOSTING', col2X, y);
    ctx.fillStyle = COLORS.textPrimary; ctx.font = '18px RobotoBold'; ctx.fillText(data.boosting, col2X, y + 24);

    y += 65;
    ctx.fillStyle = COLORS.textSecondary; ctx.font = '14px RobotoMedium'; ctx.fillText('⚠️ WARNINGS', col2X, y);
    ctx.fillStyle = data.warnings > 0 ? '#e74c3c' : COLORS.textPrimary; ctx.font = '18px RobotoBold'; ctx.fillText(data.warnings.toString(), col2X, y + 24);

    // Key Permissions Section
    y = 385;
    drawGlow(ctx, 70, y - 15, canvas.width - 140, 2, COLORS.glassBorder);
    ctx.fillStyle = COLORS.textSecondary; ctx.font = '14px RobotoMedium'; ctx.textAlign = 'left'; ctx.fillText('🔑 KEY PERMISSIONS', col1X, y);
    ctx.fillStyle = COLORS.textPrimary; ctx.font = '16px RobotoRegular';
    const permLines = wrapText(ctx, data.permissions, canvas.width - 200);
    permLines.slice(0, 2).forEach((line, i) => ctx.fillText(line, col1X, y + 25 + (i * 22)));

    // Roles Section
    y = 475;
    drawGlow(ctx, 70, y - 15, canvas.width - 140, 2, COLORS.glassBorder);
    ctx.fillStyle = COLORS.textSecondary; ctx.font = '14px RobotoMedium'; ctx.textAlign = 'left'; ctx.fillText(`🎭 ROLES [${data.roleCount}]`, col1X, y);
    
    drawRolesWithNames(ctx, data.roles, col1X, y + 30, canvas.width - 200);

    return canvas.encode('png');
}

// Add this helper function right above buildServerDossierCard if you don't have it already
function drawSubPanel(ctx, x, y, width, height, title, titleColor) {
    drawGlassPanel(ctx, x, y, width, height, 15);
    ctx.save();
    ctx.shadowColor = titleColor || COLORS.accentGlow;
    ctx.shadowBlur = 10;
    ctx.fillStyle = titleColor || COLORS.accent;
    ctx.font = 'bold 16px RobotoBold';
    ctx.textAlign = 'left';
    ctx.fillText(title, x + 20, y + 30);
    ctx.restore();
}

// ─── 7. SERVER DOSSIER CARD (PREMIUM DASHBOARD) ───
async function buildServerDossierCard(guild, data) {
    const canvas = createCanvas(800, 720); 
    const ctx = canvas.getContext('2d');
    drawBackground(ctx, canvas.width, canvas.height);
    drawGlassPanel(ctx, 30, 30, canvas.width - 60, canvas.height - 60, 30);

    // 1. BLUR BANNER HEADER
    try {
        ctx.save();
        roundedRect(ctx, 30, 30, canvas.width - 60, 160, 30);
        ctx.clip();
        const bannerImg = await loadImage(guild.iconURL({ extension: 'png', size: 256 }) || 'https://cdn.discordapp.com/embed/avatars/0.png');
        ctx.filter = 'blur(25px) brightness(0.4)'; 
        ctx.drawImage(bannerImg, 30, -50, canvas.width - 60, 350);
        ctx.filter = 'none';
        
        const fadeGrad = ctx.createLinearGradient(0, 100, 0, 190);
        fadeGrad.addColorStop(0, 'rgba(17, 17, 27, 0)');
        fadeGrad.addColorStop(1, 'rgba(17, 17, 27, 1)');
        ctx.fillStyle = fadeGrad;
        ctx.fillRect(30, 100, canvas.width - 60, 100);
        ctx.restore();
    } catch {}

    // Overlapping Server Icon (Made smaller and moved up)
    if (guild.iconURL()) {
        await drawAvatar(ctx, guild.iconURL({ extension: 'png', size: 256 }), 75, 75, 100); // Was y=95, size=120
    }

    // Server Name & Top Details
    ctx.fillStyle = COLORS.textPrimary;
    ctx.font = 'bold 40px RobotoBold';
    ctx.textAlign = 'left';
    ctx.fillText(guild.name, 230, 145);

    ctx.fillStyle = COLORS.textSecondary;
    ctx.font = '16px RobotoRegular';
    ctx.fillText(`🆔 ${guild.id}  •  📅 Created ${data.created}`, 230, 175);

    // Accent Divider
    drawGlow(ctx, 70, 200, canvas.width - 140, 3, COLORS.accent);

    // 2. TOP ROW STATS (3 Columns)
    const col1X = 100;
    const col2X = 330;
    const col3X = 560;
    const y = 235;

    // Ownership
    ctx.fillStyle = COLORS.textSecondary; ctx.font = '14px RobotoMedium'; ctx.fillText('👑 OWNERSHIP', col1X, y);
    ctx.fillStyle = COLORS.textPrimary; ctx.font = 'bold 18px RobotoBold'; ctx.fillText(data.owner, col1X, y + 24);
    ctx.fillStyle = COLORS.textSecondary; ctx.font = '14px RobotoRegular'; ctx.fillText(data.ownerId, col1X, y + 46);

    // Verification
    ctx.fillStyle = COLORS.textSecondary; ctx.font = '14px RobotoMedium'; ctx.fillText('🛡️ VERIFICATION', col2X, y);
    ctx.fillStyle = COLORS.textPrimary; ctx.font = 'bold 18px RobotoBold'; ctx.fillText(data.verification, col2X, y + 24);

    // Boosts
    ctx.fillStyle = COLORS.textSecondary; ctx.font = '14px RobotoMedium'; ctx.fillText('💎 NITRO BOOSTS', col3X, y);
    ctx.fillStyle = '#FFD700'; ctx.font = 'bold 18px RobotoBold'; ctx.fillText(data.boostLevel, col3X, y + 24);
    ctx.fillStyle = COLORS.textPrimary; ctx.font = '16px RobotoRegular'; ctx.fillText(`${data.boosts} Boosters`, col3X, y + 46);

    // 3. MIDDLE SECTION (Sub-Panels for Population & Channels)
    
    // Left Sub-Panel: Population
    drawSubPanel(ctx, 70, 320, 310, 140, `👥 POPULATION [${data.totalMembers}]`, '#8e44ad');
    ctx.fillStyle = COLORS.textPrimary; ctx.font = '24px RobotoMedium'; ctx.textAlign = 'left';
    ctx.fillText(`🧑 Humans`, 100, 375);
    ctx.fillText(`🤖 Bots`, 100, 420);
    
    ctx.textAlign = 'right';
    ctx.fillStyle = '#00FF7F'; ctx.font = 'bold 24px RobotoBold'; ctx.fillText(data.humans, 350, 375);
    ctx.fillStyle = '#e74c3c'; ctx.font = 'bold 24px RobotoBold'; ctx.fillText(data.bots, 350, 420);
    ctx.textAlign = 'left';

    // Right Sub-Panel: Channels
    drawSubPanel(ctx, 420, 320, 310, 140, `💬 CHANNELS [${data.totalChannels}]`, '#8e44ad');
    ctx.fillStyle = COLORS.textPrimary; ctx.font = '20px RobotoMedium';
    ctx.fillText(`📝 Text: ${data.textCh}`, 450, 375);
    ctx.fillText(`🔊 Voice: ${data.voiceCh}`, 450, 405);
    ctx.fillText(`📢 News: ${data.newsCh}`, 450, 435);
    
    ctx.fillStyle = COLORS.textSecondary;
    ctx.fillText(`📋 Forums: ${data.forumCh}`, 620, 375);
    ctx.fillText(`🎤 Stage: ${data.stageCh}`, 620, 405);
    ctx.fillText(`📂 Cats: ${data.categories}`, 620, 435);

    // 4. BOTTOM ATMOSPHERE BAR
    drawGlassPanel(ctx, 70, 500, canvas.width - 140, 60, 15);
    
    const atmoY = 538;
    ctx.fillStyle = COLORS.accent; ctx.font = 'bold 18px RobotoMedium'; ctx.textAlign = 'left';
    ctx.fillText(`🎭 ${data.roles} Roles`, 110, atmoY);
    
    ctx.textAlign = 'center';
    ctx.fillText(`😄 ${data.emojis} Emojis`, 400, atmoY);
    
    ctx.textAlign = 'right';
    ctx.fillText(`🖼️ ${data.stickers} Stickers`, 700, atmoY);
    ctx.textAlign = 'left';

    return canvas.encode('png');
}

// ─── 8. WARNINGS CARD ───
async function buildWarningsCard(target, warnings, title) {
    const entryHeight = 60;
    const baseHeight = 220;
    const canvas = createCanvas(800, baseHeight + (warnings.length * entryHeight) + 40);
    const ctx = canvas.getContext('2d');
    drawBackground(ctx, canvas.width, canvas.height);
    drawGlassPanel(ctx, 30, 30, canvas.width - 60, canvas.height - 60, 30);

    const avatarSize = 100;
    await drawAvatar(ctx, target.user.displayAvatarURL({ extension: 'png', size: 256 }), 70, 60, avatarSize);

    ctx.fillStyle = '#e74c3c'; 
    ctx.font = 'bold 32px RobotoBold';
    ctx.textAlign = 'left';
    ctx.fillText(title, 200, 105);

    ctx.fillStyle = COLORS.textSecondary;
    ctx.font = '18px RobotoRegular';
    ctx.fillText(`Total Sins: ${warnings.length}`, 200, 135);

    drawGlow(ctx, 70, 160, canvas.width - 140, 3, '#e74c3c');

    let y = 200;
    for (const w of warnings.slice(0, 8)) {
        ctx.fillStyle = COLORS.textPrimary;
        ctx.font = 'bold 20px RobotoBold';
        ctx.textAlign = 'left';
        const reasonText = w.reason.length > 50 ? w.reason.substring(0, 47) + '...' : w.reason;
        ctx.fillText(`#${w.id} — ${reasonText}`, 100, y);

        ctx.fillStyle = COLORS.textSecondary;
        ctx.font = '16px RobotoRegular';
        ctx.textAlign = 'right';
        ctx.fillText(`<t:${Math.floor(w.timestamp / 1000)}:R> • Mod: <@${w.moderator_id}>`, canvas.width - 100, y);
        y += entryHeight;
    }

    return canvas.encode('png');
}

// ─── TICKET PANEL CARD (FLOWING GLASS AESTHETIC) ───
async function buildTicketPanelCard(guild) {
    const canvas = createCanvas(800, 450);
    const ctx = canvas.getContext('2d');
    drawBackground(ctx, canvas.width, canvas.height);
    drawGlassPanel(ctx, 30, 30, canvas.width - 60, canvas.height - 60, 30);

    // 1. Blurred Server Icon Banner
    try {
        ctx.save();
        roundedRect(ctx, 30, 30, canvas.width - 60, 200, 30);
        ctx.clip();
        const bannerImg = await loadImage(guild.iconURL({ extension: 'png', size: 256 }) || 'https://cdn.discordapp.com/embed/avatars/0.png');
        ctx.filter = 'blur(30px) brightness(0.3)'; 
        ctx.drawImage(bannerImg, 30, -50, canvas.width - 60, 400);
        ctx.filter = 'none';
        
        const fadeGrad = ctx.createLinearGradient(0, 120, 0, 230);
        fadeGrad.addColorStop(0, 'rgba(17, 17, 27, 0)');
        fadeGrad.addColorStop(1, 'rgba(17, 17, 27, 1)');
        ctx.fillStyle = fadeGrad;
        ctx.fillRect(30, 120, canvas.width - 60, 120);
        ctx.restore();
    } catch {}

    // 2. Flowing Glass Light Sweep (Diagonal glowing lines)
    ctx.save();
    ctx.strokeStyle = 'rgba(142, 68, 173, 0.2)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(30, 150); ctx.lineTo(770, 50); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(30, 160); ctx.lineTo(770, 60); ctx.stroke();
    ctx.restore();

    // 3. Overlapping Server Icon with Double Glow
    if (guild.iconURL()) {
        await drawAvatar(ctx, guild.iconURL({ extension: 'png', size: 256 }), 345, 110, 120);
        // Extra glow ring
        ctx.save();
        ctx.shadowColor = '#FFD700'; 
        ctx.shadowBlur = 40;
        ctx.beginPath();
        ctx.arc(345 + 60, 110 + 60, 65, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 215, 0, 0.4)';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
    }

    // 4. Royal Typography
    ctx.save();
    ctx.shadowColor = '#FFD700'; 
    ctx.shadowBlur = 30;
    ctx.fillStyle = '#FFFFFF'; 
    ctx.font = 'bold 46px RobotoBold';
    ctx.textAlign = 'center';
    ctx.fillText('USER SUPPORT', canvas.width / 2, 305);
    ctx.restore();

    ctx.fillStyle = COLORS.textSecondary;
    ctx.font = '20px RobotoMedium';
    ctx.textAlign = 'center';
    ctx.fillText('Require an audience with the council?', canvas.width / 2, 345);
    
    ctx.fillStyle = COLORS.accent;
    ctx.font = '18px RobotoMedium';
    ctx.fillText('Click the button below to open a private ticket.', canvas.width / 2, 375);

    // Bottom Flowing Line
    drawGlow(ctx, 70, canvas.height - 65, canvas.width - 140, 3, COLORS.accent);

    return canvas.encode('png');
}

// ─── TICKET WELCOME CARD (FLOWING GLASS AESTHETIC) ───
async function buildTicketWelcomeCard(member, ticketId, client) {
    const canvas = createCanvas(800, 450);
    const ctx = canvas.getContext('2d');
    drawBackground(ctx, canvas.width, canvas.height);
    drawGlassPanel(ctx, 30, 30, canvas.width - 60, canvas.height - 60, 30);

    // 1. Blurred Bot Banner Header
    try {
        await client.user.fetch(true);
        const bannerURL = client.user.bannerURL({ size: 1024 }) || member.user.displayAvatarURL({ extension: 'png', size: 256 });
        ctx.save();
        roundedRect(ctx, 30, 30, canvas.width - 60, 180, 30);
        ctx.clip();
        const bannerImg = await loadImage(bannerURL);
        ctx.filter = 'blur(25px) brightness(0.3)'; 
        ctx.drawImage(bannerImg, 30, -30, canvas.width - 60, 350);
        ctx.filter = 'none';
        
        const fadeGrad = ctx.createLinearGradient(0, 100, 0, 210);
        fadeGrad.addColorStop(0, 'rgba(17, 17, 27, 0)');
        fadeGrad.addColorStop(1, 'rgba(17, 17, 27, 1)');
        ctx.fillStyle = fadeGrad;
        ctx.fillRect(30, 100, canvas.width - 60, 120);
        ctx.restore();
    } catch {}

    // 2. Flowing Glass Lines
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.15)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(30, 170); ctx.lineTo(770, 80); ctx.stroke();
    ctx.restore();

    // 3. User Avatar with Gold Ring
    const avatarSize = 110;
    const avatarX = 75;
    const avatarY = 100;
    await drawAvatar(ctx, member.user.displayAvatarURL({ extension: 'png', size: 256 }), avatarX, avatarY, avatarSize);
    
    ctx.save();
    ctx.shadowColor = '#FFD700'; 
    ctx.shadowBlur = 30;
    ctx.beginPath();
    ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2 + 8, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.6)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    // 4. Royal Welcome Typography
    ctx.fillStyle = COLORS.textSecondary;
    ctx.font = '18px RobotoMedium';
    ctx.textAlign = 'left';
    ctx.fillText(`TICKET #${ticketId}`, 230, 140);

    ctx.save();
    ctx.shadowColor = '#FFD700'; 
    ctx.shadowBlur = 20;
    ctx.fillStyle = '#FFFFFF'; 
    ctx.font = 'bold 36px RobotoBold';
    ctx.fillText(member.user.username, 230, 180);
    ctx.restore();

    // 5. Captivating Message Area
    drawGlow(ctx, 70, 220, canvas.width - 140, 3, COLORS.accent);

    ctx.fillStyle = COLORS.textPrimary;
    ctx.font = 'bold 24px RobotoMedium';
    ctx.textAlign = 'center';
    ctx.fillText('YOUR AUDIENCE HAS BEEN GRANTED', canvas.width / 2, 280);

    ctx.fillStyle = COLORS.textSecondary;
    ctx.font = '20px RobotoRegular';
    ctx.fillText('State your purpose clearly below.', canvas.width / 2, 320);
    
    ctx.fillStyle = COLORS.accent;
    ctx.font = '18px RobotoMedium';
    ctx.fillText('A member of the council will attend to you shortly.', canvas.width / 2, 360);

    drawGlow(ctx, 70, canvas.height - 65, canvas.width - 140, 3, '#FFD700');

    return canvas.encode('png');
}

// ─── TICKET PANEL CARD (DROPDOWN AESTHETIC) ───
async function buildTicketPanelCard(guild) {
    const canvas = createCanvas(800, 450);
    const ctx = canvas.getContext('2d');
    drawBackground(ctx, canvas.width, canvas.height);
    drawGlassPanel(ctx, 30, 30, canvas.width - 60, canvas.height - 60, 30);

    try {
        ctx.save();
        roundedRect(ctx, 30, 30, canvas.width - 60, 200, 30);
        ctx.clip();
        const bannerImg = await loadImage(guild.iconURL({ extension: 'png', size: 256 }) || 'https://cdn.discordapp.com/embed/avatars/0.png');
        ctx.filter = 'blur(30px) brightness(0.3)'; 
        ctx.drawImage(bannerImg, 30, -50, canvas.width - 60, 400);
        ctx.filter = 'none';
        const fadeGrad = ctx.createLinearGradient(0, 120, 0, 230);
        fadeGrad.addColorStop(0, 'rgba(17, 17, 27, 0)');
        fadeGrad.addColorStop(1, 'rgba(17, 17, 27, 1)');
        ctx.fillStyle = fadeGrad;
        ctx.fillRect(30, 120, canvas.width - 60, 120);
        ctx.restore();
    } catch {}

    ctx.save();
    ctx.strokeStyle = 'rgba(142, 68, 173, 0.2)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(30, 150); ctx.lineTo(770, 50); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(30, 160); ctx.lineTo(770, 60); ctx.stroke();
    ctx.restore();

    if (guild.iconURL()) {
        await drawAvatar(ctx, guild.iconURL({ extension: 'png', size: 256 }), 345, 110, 120);
        ctx.save(); ctx.shadowColor = '#FFD700'; ctx.shadowBlur = 40;
        ctx.beginPath(); ctx.arc(345 + 60, 110 + 60, 65, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 215, 0, 0.4)'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
    }

    ctx.save(); ctx.shadowColor = '#FFD700'; ctx.shadowBlur = 30;
    ctx.fillStyle = '#FFFFFF'; ctx.font = 'bold 46px RobotoBold'; ctx.textAlign = 'center';
    ctx.fillText('USER SUPPORT', canvas.width / 2, 305); ctx.restore();

    ctx.fillStyle = COLORS.textSecondary; ctx.font = '20px RobotoMedium'; ctx.textAlign = 'center';
    ctx.fillText('Require an audience with the council?', canvas.width / 2, 345);
    ctx.fillStyle = COLORS.accent; ctx.font = '18px RobotoMedium';
    ctx.fillText('Select a topic from the dropdown below to open a ticket.', canvas.width / 2, 375);

    drawGlow(ctx, 70, canvas.height - 65, canvas.width - 140, 3, COLORS.accent);
    return canvas.encode('png');
}

// ─── TICKET WELCOME CARD (WITH TOPIC) ───
async function buildTicketWelcomeCard(member, ticketId, topic, client) {
    const canvas = createCanvas(800, 450);
    const ctx = canvas.getContext('2d');
    drawBackground(ctx, canvas.width, canvas.height);
    drawGlassPanel(ctx, 30, 30, canvas.width - 60, canvas.height - 60, 30);

    try {
        await client.user.fetch(true);
        const bannerURL = client.user.bannerURL({ size: 1024 }) || member.user.displayAvatarURL({ extension: 'png', size: 256 });
        ctx.save();
        roundedRect(ctx, 30, 30, canvas.width - 60, 180, 30);
        ctx.clip();
        const bannerImg = await loadImage(bannerURL);
        ctx.filter = 'blur(25px) brightness(0.3)'; 
        ctx.drawImage(bannerImg, 30, -30, canvas.width - 60, 350);
        ctx.filter = 'none';
        const fadeGrad = ctx.createLinearGradient(0, 100, 0, 210);
        fadeGrad.addColorStop(0, 'rgba(17, 17, 27, 0)');
        fadeGrad.addColorStop(1, 'rgba(17, 17, 27, 1)');
        ctx.fillStyle = fadeGrad;
        ctx.fillRect(30, 100, canvas.width - 60, 120);
        ctx.restore();
    } catch {}

    ctx.save(); ctx.strokeStyle = 'rgba(255, 215, 0, 0.15)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(30, 170); ctx.lineTo(770, 80); ctx.stroke(); ctx.restore();

    const avatarSize = 110;
    await drawAvatar(ctx, member.user.displayAvatarURL({ extension: 'png', size: 256 }), 75, 100, avatarSize);
    ctx.save(); ctx.shadowColor = '#FFD700'; ctx.shadowBlur = 30;
    ctx.beginPath(); ctx.arc(75 + avatarSize / 2, 100 + avatarSize / 2, avatarSize / 2 + 8, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.6)'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();

    ctx.fillStyle = COLORS.textSecondary; ctx.font = '18px RobotoMedium'; ctx.textAlign = 'left';
    ctx.fillText(`TICKET #${ticketId} — ${topic.toUpperCase()}`, 230, 140);

    ctx.save(); ctx.shadowColor = '#FFD700'; ctx.shadowBlur = 20;
    ctx.fillStyle = '#FFFFFF'; ctx.font = 'bold 36px RobotoBold';
    ctx.fillText(member.user.username, 230, 180); ctx.restore();

    drawGlow(ctx, 70, 220, canvas.width - 140, 3, COLORS.accent);
    ctx.fillStyle = COLORS.textPrimary; ctx.font = 'bold 24px RobotoMedium'; ctx.textAlign = 'center';
    ctx.fillText('YOUR AUDIENCE HAS BEEN GRANTED', canvas.width / 2, 280);
    ctx.fillStyle = COLORS.textSecondary; ctx.font = '20px RobotoRegular';
    ctx.fillText('State your purpose clearly below.', canvas.width / 2, 320);
    ctx.fillStyle = COLORS.accent; ctx.font = '18px RobotoMedium';
    ctx.fillText('A member of the council will attend to you shortly.', canvas.width / 2, 360);

    drawGlow(ctx, 70, canvas.height - 65, canvas.width - 140, 3, '#FFD700');
    return canvas.encode('png');
}

// ─── TICKET CLOSED CARD (FOR LOGS) ───
async function buildTicketClosedCard(closedBy, ticketId, reason) {
    const canvas = createCanvas(800, 300);
    const ctx = canvas.getContext('2d');
    drawBackground(ctx, canvas.width, canvas.height);
    drawGlassPanel(ctx, 30, 30, canvas.width - 60, canvas.height - 60, 30);

    ctx.save(); ctx.shadowColor = '#e74c3c'; ctx.shadowBlur = 30;
    ctx.fillStyle = '#e74c3c'; ctx.font = 'bold 40px RobotoBold'; ctx.textAlign = 'center';
    ctx.fillText('TICKET CLOSED', canvas.width / 2, 110); ctx.restore();

    ctx.fillStyle = COLORS.textPrimary; ctx.font = '24px RobotoMedium';
    ctx.fillText(`Ticket #${ticketId}`, canvas.width / 2, 160);

    ctx.fillStyle = COLORS.textSecondary; ctx.font = '20px RobotoRegular';
    ctx.fillText(`Closed by: ${closedBy.tag}`, canvas.width / 2, 200);

    ctx.fillStyle = COLORS.accent; ctx.font = 'bold 22px RobotoBold';
    ctx.fillText(`Reason: ${reason}`, canvas.width / 2, 240);

    drawGlow(ctx, 70, canvas.height - 65, canvas.width - 140, 3, '#e74c3c');
    return canvas.encode('png');
}

// ─── BOT INFO DASHBOARD CARD (ROYAL EDITION) ───
function drawSubPanel(ctx, x, y, width, height, title, titleColor) {
    drawGlassPanel(ctx, x, y, width, height, 15);
    ctx.save();
    ctx.shadowColor = titleColor || COLORS.accentGlow;
    ctx.shadowBlur = 10;
    ctx.fillStyle = titleColor || COLORS.accent;
    ctx.font = 'bold 16px RobotoBold';
    ctx.textAlign = 'left';
    ctx.fillText(title, x + 20, y + 30);
    ctx.restore();
}

async function buildBotInfoCard(client, data) {
    const canvas = createCanvas(800, 600); 
    const ctx = canvas.getContext('2d');
    drawBackground(ctx, canvas.width, canvas.height);
    drawGlassPanel(ctx, 30, 30, canvas.width - 60, canvas.height - 60, 30);

    // 1. Blurred Bot Avatar Banner
    try {
        ctx.save();
        roundedRect(ctx, 30, 30, canvas.width - 60, 200, 30);
        ctx.clip();
        const bannerImg = await loadImage(client.user.displayAvatarURL({ extension: 'png', size: 256 }));
        ctx.filter = 'blur(30px) brightness(0.3)'; 
        ctx.drawImage(bannerImg, 30, -50, canvas.width - 60, 400);
        ctx.filter = 'none';
        
        const fadeGrad = ctx.createLinearGradient(0, 120, 0, 230);
        fadeGrad.addColorStop(0, 'rgba(17, 17, 27, 0)');
        fadeGrad.addColorStop(1, 'rgba(17, 17, 27, 1)');
        ctx.fillStyle = fadeGrad;
        ctx.fillRect(30, 120, canvas.width - 60, 120);
        ctx.restore();
    } catch {}

    // 2. Flowing Glass Light Sweeps
    ctx.save();
    ctx.strokeStyle = 'rgba(142, 68, 173, 0.2)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(30, 150); ctx.lineTo(770, 50); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(30, 160); ctx.lineTo(770, 60); ctx.stroke();
    ctx.restore();

    // 3. Bot Avatar with Double Royal Glow
    const avatarSize = 120;
    await drawAvatar(ctx, client.user.displayAvatarURL({ extension: 'png', size: 512 }), 345, 85, avatarSize);
    
    ctx.save();
    ctx.shadowColor = '#FFD700'; ctx.shadowBlur = 40;
    ctx.beginPath();
    ctx.arc(345 + avatarSize / 2, 85 + avatarSize / 2, avatarSize / 2 + 10, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.4)'; ctx.lineWidth = 3; ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.shadowColor = COLORS.accentGlow; ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.arc(345 + avatarSize / 2, 85 + avatarSize / 2, avatarSize / 2 + 4, 0, Math.PI * 2);
    ctx.strokeStyle = COLORS.accent; ctx.lineWidth = 2; ctx.stroke();
    ctx.restore();

    // 4. Bot Name & Royal Owner Tag
    ctx.save();
    ctx.shadowColor = '#FFD700'; ctx.shadowBlur = 30;
    ctx.fillStyle = '#FFFFFF'; 
    ctx.font = 'bold 44px RobotoBold';
    ctx.textAlign = 'center';
    ctx.fillText(client.user.username, canvas.width / 2, 270);
    ctx.restore();

    ctx.fillStyle = '#FFD700'; 
    ctx.font = '22px RobotoMedium';
    ctx.fillText(`👑 Ruled by: ${data.owner}`, canvas.width / 2, 305);

    // Accent Divider
    drawGlow(ctx, 70, 330, canvas.width - 140, 3, COLORS.accent);

    // 5. Sub-Panels for Stats (Clean Dashboard Layout)
    
    // Left Sub-Panel: System Status
    drawSubPanel(ctx, 70, 355, 310, 150, '⚙️ SYSTEM STATUS', '#8e44ad');
    ctx.textAlign = 'left';
    
    ctx.fillStyle = COLORS.textSecondary; ctx.font = '18px RobotoMedium';
    ctx.fillText('⏱️ Uptime', 100, 400);
    ctx.fillText('📶 Ping', 100, 440);
    ctx.fillText('🐍 Node.js', 100, 480);

    ctx.textAlign = 'right';
    ctx.fillStyle = COLORS.textPrimary; ctx.font = 'bold 18px RobotoBold';
    ctx.fillText(data.uptime, 350, 400);
    ctx.fillText(data.ping, 350, 440);
    ctx.fillText(data.node, 350, 480);

    // Right Sub-Panel: The Empire
    drawSubPanel(ctx, 420, 355, 310, 150, '🔥 THE EMPIRE', '#FFD700');
    ctx.textAlign = 'left';
    
    ctx.fillStyle = COLORS.textSecondary; ctx.font = '18px RobotoMedium';
    ctx.fillText('🏰 Realms', 450, 400);
    ctx.fillText('👥 Souls', 450, 440);
    ctx.fillText('📚 Commands', 450, 480);

    ctx.textAlign = 'right';
    ctx.fillStyle = COLORS.textPrimary; ctx.font = 'bold 18px RobotoBold';
    ctx.fillText(data.guilds, 700, 400);
    ctx.fillText(data.users, 700, 440);
    ctx.fillText(data.commands, 700, 480);

    // 6. Version Footer
    ctx.textAlign = 'center';
    ctx.fillStyle = COLORS.textSecondary;
    ctx.font = '16px RobotoRegular';
    ctx.fillText(`v${data.version} | Lucifer Bot`, canvas.width / 2, 555);

    return canvas.encode('png');
}

// ─── PREMIUM MARRIAGE CARD (CAELESTIA VIBE) ───
async function buildMarriageCard(member1, member2, timestamp) {
    const canvas = createCanvas(800, 400);
    const ctx = canvas.getContext('2d');
    drawBackground(ctx, canvas.width, canvas.height);
    drawGlassPanel(ctx, 30, 30, canvas.width - 60, canvas.height - 60, 30);

    // Flowing Lines (Purple)
    ctx.save();
    ctx.strokeStyle = 'rgba(142, 68, 173, 0.2)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(30, 100); ctx.lineTo(770, 0); ctx.stroke();
    ctx.restore();

    // Left Avatar with Purple Glow
    const avatarSize = 110;
    await drawAvatar(ctx, member1.user.displayAvatarURL({ extension: 'png', size: 256 }), 100, 90, avatarSize);
    ctx.save(); ctx.shadowColor = COLORS.accentGlow; ctx.shadowBlur = 30;
    ctx.beginPath(); ctx.arc(100 + avatarSize / 2, 90 + avatarSize / 2, avatarSize / 2 + 6, 0, Math.PI * 2);
    ctx.strokeStyle = COLORS.accent; ctx.lineWidth = 3; ctx.stroke(); ctx.restore();

    // Right Avatar with Purple Glow
    await drawAvatar(ctx, member2.user.displayAvatarURL({ extension: 'png', size: 256 }), 590, 90, avatarSize);
    ctx.save(); ctx.shadowColor = COLORS.accentGlow; ctx.shadowBlur = 30;
    ctx.beginPath(); ctx.arc(590 + avatarSize / 2, 90 + avatarSize / 2, avatarSize / 2 + 6, 0, Math.PI * 2);
    ctx.strokeStyle = COLORS.accent; ctx.lineWidth = 3; ctx.stroke(); ctx.restore();

    // Center Heart
    ctx.save(); ctx.shadowColor = '#FFD700'; ctx.shadowBlur = 40;
    ctx.fillStyle = '#FFD700'; ctx.font = '60px RobotoBold'; ctx.textAlign = 'center';
    ctx.fillText('💜', canvas.width / 2, 165); ctx.restore();

    // Title
    ctx.save(); ctx.shadowColor = '#FFD700'; ctx.shadowBlur = 20;
    ctx.fillStyle = '#FFFFFF'; ctx.font = 'bold 38px RobotoBold'; ctx.textAlign = 'center';
    ctx.fillText('SOULS UNITED', canvas.width / 2, 255); ctx.restore();

    // Sub-panel Date
    drawSubPanel(ctx, 200, 285, 400, 60, '', COLORS.accent);
    const marryDate = new Date(timestamp).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    ctx.fillStyle = COLORS.textSecondary; ctx.font = '18px RobotoMedium'; ctx.textAlign = 'center';
    ctx.fillText(`Bound since ${marryDate}`, canvas.width / 2, 322);

    return canvas.encode('png');
}

// ─── PREMIUM DIVORCE CARD (CAELESTIA VIBE) ───
async function buildDivorceCard(member1, member2, timestamp) {
    const canvas = createCanvas(800, 400);
    const ctx = canvas.getContext('2d');
    drawBackground(ctx, canvas.width, canvas.height);
    drawGlassPanel(ctx, 30, 30, canvas.width - 60, canvas.height - 60, 30);

    // Flowing Lines (Red)
    ctx.save();
    ctx.strokeStyle = 'rgba(231, 76, 60, 0.2)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(30, 100); ctx.lineTo(770, 0); ctx.stroke();
    ctx.restore();

    // Left Avatar with Red Glow
    const avatarSize = 110;
    await drawAvatar(ctx, member1.user.displayAvatarURL({ extension: 'png', size: 256 }), 100, 90, avatarSize);
    ctx.save(); ctx.shadowColor = '#e74c3c'; ctx.shadowBlur = 30;
    ctx.beginPath(); ctx.arc(100 + avatarSize / 2, 90 + avatarSize / 2, avatarSize / 2 + 6, 0, Math.PI * 2);
    ctx.strokeStyle = '#e74c3c'; ctx.lineWidth = 3; ctx.stroke(); ctx.restore();

    // Right Avatar with Red Glow
    await drawAvatar(ctx, member2.user.displayAvatarURL({ extension: 'png', size: 256 }), 590, 90, avatarSize);
    ctx.save(); ctx.shadowColor = '#e74c3c'; ctx.shadowBlur = 30;
    ctx.beginPath(); ctx.arc(590 + avatarSize / 2, 90 + avatarSize / 2, avatarSize / 2 + 6, 0, Math.PI * 2);
    ctx.strokeStyle = '#e74c3c'; ctx.lineWidth = 3; ctx.stroke(); ctx.restore();

    // Center Broken Heart
    ctx.save(); ctx.shadowColor = '#e74c3c'; ctx.shadowBlur = 40;
    ctx.fillStyle = '#e74c3c'; ctx.font = '60px RobotoBold'; ctx.textAlign = 'center';
    ctx.fillText('💔', canvas.width / 2, 165); ctx.restore();

    // Title
    ctx.save(); ctx.shadowColor = '#e74c3c'; ctx.shadowBlur = 20;
    ctx.fillStyle = '#FFFFFF'; ctx.font = 'bold 38px RobotoBold'; ctx.textAlign = 'center';
    ctx.fillText('UNION DISSOLVED', canvas.width / 2, 255); ctx.restore();

    // Sub-panel Date
    drawSubPanel(ctx, 200, 285, 400, 60, '', '#e74c3c');
    const divorceDate = new Date(timestamp).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    ctx.fillStyle = COLORS.textSecondary; ctx.font = '18px RobotoMedium'; ctx.textAlign = 'center';
    ctx.fillText(`Severed on ${divorceDate}`, canvas.width / 2, 322);

    return canvas.encode('png');
}

// ─── PREMIUM SHIP CARD (ROLLS ROYCE EDITION) ───
async function buildShipCard(member1, member2, percentage) {
    const canvas = createCanvas(800, 450);
    const ctx = canvas.getContext('2d');
    drawBackground(ctx, canvas.width, canvas.height);
    drawGlassPanel(ctx, 30, 30, canvas.width - 60, canvas.height - 60, 30);

    // Flowing Lines (Pink/Purple)
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 105, 180, 0.2)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(30, 100); ctx.lineTo(770, 0); ctx.stroke();
    ctx.restore();

    // Left Avatar with Pink Glow
    const avatarSize = 110;
    await drawAvatar(ctx, member1.user.displayAvatarURL({ extension: 'png', size: 256 }), 100, 70, avatarSize);
    ctx.save(); ctx.shadowColor = '#FF69B4'; ctx.shadowBlur = 30;
    ctx.beginPath(); ctx.arc(100 + avatarSize / 2, 70 + avatarSize / 2, avatarSize / 2 + 6, 0, Math.PI * 2);
    ctx.strokeStyle = '#FF69B4'; ctx.lineWidth = 3; ctx.stroke(); ctx.restore();

    // Right Avatar with Pink Glow
    await drawAvatar(ctx, member2.user.displayAvatarURL({ extension: 'png', size: 256 }), 590, 70, avatarSize);
    ctx.save(); ctx.shadowColor = '#FF69B4'; ctx.shadowBlur = 30;
    ctx.beginPath(); ctx.arc(590 + avatarSize / 2, 70 + avatarSize / 2, avatarSize / 2 + 6, 0, Math.PI * 2);
    ctx.strokeStyle = '#FF69B4'; ctx.lineWidth = 3; ctx.stroke(); ctx.restore();

    // Center Heart
    ctx.save(); ctx.shadowColor = '#FF69B4'; ctx.shadowBlur = 40;
    ctx.fillStyle = '#FF69B4'; ctx.font = '60px RobotoBold'; ctx.textAlign = 'center';
    ctx.fillText('💕', canvas.width / 2, 145); ctx.restore();

    // USERNAMES (Added below avatars)
    ctx.fillStyle = COLORS.textPrimary; ctx.font = 'bold 22px RobotoBold'; ctx.textAlign = 'center';
    ctx.fillText(member1.user.username, 155, 210);
    ctx.fillText(member2.user.username, 645, 210);

    // Percentage Title
    ctx.save(); ctx.shadowColor = '#FFD700'; ctx.shadowBlur = 20;
    ctx.fillStyle = '#FFFFFF'; ctx.font = 'bold 44px RobotoBold'; ctx.textAlign = 'center';
    ctx.fillText(`${percentage}%`, canvas.width / 2, 260); ctx.restore();

    // Relationship Label
    let label = 'Strangers';
    let labelColor = COLORS.textSecondary;
    if (percentage >= 90) { label = 'Soulmates'; labelColor = '#FFD700'; }
    else if (percentage >= 70) { label = 'Lovers'; labelColor = '#FF69B4'; }
    else if (percentage >= 50) { label = 'Close Friends'; labelColor = '#9b59b6'; }
    else if (percentage >= 30) { label = 'Acquaintances'; labelColor = '#3498db'; }
    else if (percentage >= 10) { label = 'Fated Rivals'; labelColor = '#e67e22'; }
    else { label = 'Sworn Enemies'; labelColor = '#e74c3c'; }

    ctx.fillStyle = labelColor; ctx.font = 'bold 22px RobotoMedium'; ctx.textAlign = 'center';
    ctx.fillText(label.toUpperCase(), canvas.width / 2, 295);

    // Progress Bar Sub-Panel
    drawSubPanel(ctx, 150, 320, 500, 60, '', labelColor);

    // Progress Bar Track (Dark background)
    ctx.save();
    roundedRect(ctx, 180, 340, 440, 20, 10);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fill();
    ctx.restore();

    // Progress Bar Fill (Glowing Gradient)
    const fillWidth = (440 * percentage) / 100;
    if (fillWidth > 0) {
        ctx.save();
        roundedRect(ctx, 180, 340, fillWidth, 20, 10);
        const grad = ctx.createLinearGradient(180, 340, 180 + fillWidth, 340);
        grad.addColorStop(0, labelColor);
        grad.addColorStop(1, '#FFD700');
        ctx.fillStyle = grad;
        ctx.fill();
        
        ctx.shadowColor = labelColor; ctx.shadowBlur = 15;
        ctx.fill(); // Double fill for glow effect
        ctx.restore();
    }

    return canvas.encode('png');
}

// ─── WANTED POSTER CARD ───
async function buildWantedCard(member, bounty) {
    const canvas = createCanvas(800, 1000);
    const ctx = canvas.getContext('2d');
    
    // Vintage Parchment / Dark Infernal Poster Background
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#2c1810');
    gradient.addColorStop(0.5, '#4a2c20');
    gradient.addColorStop(1, '#1a0f0a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Ornate Border
    ctx.strokeStyle = '#8b5a2b'; ctx.lineWidth = 15;
    ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);
    ctx.strokeStyle = '#5c3a1e'; ctx.lineWidth = 5;
    ctx.strokeRect(35, 35, canvas.width - 70, canvas.height - 70);

    // WANTED Text
    ctx.save(); ctx.shadowColor = '#ff0000'; ctx.shadowBlur = 20;
    ctx.fillStyle = '#cc0000'; ctx.font = 'bold 100px RobotoBold'; ctx.textAlign = 'center';
    ctx.fillText('WANTED', canvas.width / 2, 150); ctx.restore();
    
    // DEAD OR ALIVE
    ctx.fillStyle = '#e0c097'; ctx.font = 'bold 30px RobotoBold'; ctx.textAlign = 'center';
    ctx.fillText('DEAD OR ALIVE', canvas.width / 2, 200);

    // Avatar Frame
    const avatarSize = 300;
    const avatarX = (canvas.width - avatarSize) / 2;
    const avatarY = 250;
    ctx.save(); ctx.shadowColor = '#000'; ctx.shadowBlur = 20;
    ctx.strokeStyle = '#8b5a2b'; ctx.lineWidth = 10;
    ctx.beginPath(); ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2 + 5, 0, Math.PI * 2);
    ctx.stroke(); ctx.restore();
    
    // Draw Avatar
    ctx.save();
    ctx.beginPath(); ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2); ctx.closePath(); ctx.clip();
    const avatar = await loadImage(member.user.displayAvatarURL({ extension: 'png', size: 512 }));
    ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);
    ctx.restore();

    // Username
    ctx.fillStyle = '#e0c097'; ctx.font = 'bold 50px RobotoBold'; ctx.textAlign = 'center';
    ctx.fillText(member.user.username.toUpperCase(), canvas.width / 2, 650);

    // Bounty
    ctx.save(); ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 15;
    ctx.fillStyle = '#ffd700'; ctx.font = 'bold 60px RobotoBold'; ctx.textAlign = 'center';
    ctx.fillText(`BOUNTY: ${bounty} LC`, canvas.width / 2, 780); ctx.restore();

    // Infernal Footer
    ctx.fillStyle = '#8b5a2b'; ctx.font = '24px RobotoMedium'; ctx.textAlign = 'center';
    ctx.fillText('By order of the Infernal Council', canvas.width / 2, 900);

    return canvas.encode('png');
}

// ─── WANTED POSTER CARD ───
async function buildWantedCard(member, bounty) {
    const canvas = createCanvas(800, 1000);
    const ctx = canvas.getContext('2d');
    
    // Vintage Parchment / Dark Infernal Poster Background
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#2c1810');
    gradient.addColorStop(0.5, '#4a2c20');
    gradient.addColorStop(1, '#1a0f0a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Ornate Border
    ctx.strokeStyle = '#8b5a2b'; ctx.lineWidth = 15;
    ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);
    ctx.strokeStyle = '#5c3a1e'; ctx.lineWidth = 5;
    ctx.strokeRect(35, 35, canvas.width - 70, canvas.height - 70);

    // WANTED Text
    ctx.save(); ctx.shadowColor = '#ff0000'; ctx.shadowBlur = 20;
    ctx.fillStyle = '#cc0000'; ctx.font = 'bold 100px RobotoBold'; ctx.textAlign = 'center';
    ctx.fillText('WANTED', canvas.width / 2, 150); ctx.restore();
    
    // DEAD OR ALIVE
    ctx.fillStyle = '#e0c097'; ctx.font = 'bold 30px RobotoBold'; ctx.textAlign = 'center';
    ctx.fillText('DEAD OR ALIVE', canvas.width / 2, 200);

    // Avatar Frame
    const avatarSize = 300;
    const avatarX = (canvas.width - avatarSize) / 2;
    const avatarY = 250;
    ctx.save(); ctx.shadowColor = '#000'; ctx.shadowBlur = 20;
    ctx.strokeStyle = '#8b5a2b'; ctx.lineWidth = 10;
    ctx.beginPath(); ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2 + 5, 0, Math.PI * 2);
    ctx.stroke(); ctx.restore();
    
    // Draw Avatar
    ctx.save();
    ctx.beginPath(); ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2); ctx.closePath(); ctx.clip();
    const avatar = await loadImage(member.user.displayAvatarURL({ extension: 'png', size: 512 }));
    ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);
    ctx.restore();

    // Username
    ctx.fillStyle = '#e0c097'; ctx.font = 'bold 50px RobotoBold'; ctx.textAlign = 'center';
    ctx.fillText(member.user.username.toUpperCase(), canvas.width / 2, 650);

    // Bounty
    ctx.save(); ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 15;
    ctx.fillStyle = '#ffd700'; ctx.font = 'bold 60px RobotoBold'; ctx.textAlign = 'center';
    ctx.fillText(`BOUNTY: ${bounty} LC`, canvas.width / 2, 780); ctx.restore();

    // Infernal Footer
    ctx.fillStyle = '#8b5a2b'; ctx.font = '24px RobotoMedium'; ctx.textAlign = 'center';
    ctx.fillText('By order of the Infernal Council', canvas.width / 2, 900);

    return canvas.encode('png');
}

// Update module.exports
module.exports = { 
    buildWelcomeImage, buildProfileCard, buildMarriageCard, buildModLogCard, buildLeaveImage, 
    buildLeaderboardCard, buildBalanceCard, 
    buildInventoryCard, buildShopCard, buildReceiptCard, buildUserDossierCard, buildServerDossierCard, buildWarningsCard,
    buildTicketPanelCard, buildTicketWelcomeCard, buildTicketClosedCard,
    buildBotInfoCard, buildDivorceCard, buildShipCard,
    buildBadgeLeaderboardCard,
    buildWantedCard // <--- MAKE SURE THIS IS HERE
};