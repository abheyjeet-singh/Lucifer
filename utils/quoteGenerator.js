const { createCanvas, loadImage } = require('@napi-rs/canvas');

// ── Strip Discord Markdown for clean text ──
function stripMarkdown(text) {
    return text
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/\*(.*?)\*/g, '$1')
        .replace(/__(.*?)__/g, '$1')
        .replace(/_(.*?)_/g, '$1')
        .replace(/~~(.*?)~~/g, '$1')
        .replace(/`{3}(.*?)`{3}/gs, '$1')
        .replace(/`(.*?)`/g, '$1')
        .replace(/\|\|(.*?)\|\|/g, '$1')
        .replace(/<@!?(\d+)>/g, '@user')
        .replace(/<#(\d+)>/g, '#channel')
        .replace(/<@&(\d+)>/g, '@role')
        .replace(/<a?:(\w+):\d+>/g, ':$1:')
        .replace(/https?:\/\/\S+/g, '');
}

// ── Word Wrap ──
function wrapText(ctx, text, maxWidth) {
    const words = text.split(' ');
    const lines = [];
    let currentLine = words[0] || '';

    for (let i = 1; i < words.length; i++) {
        const word = words[i];
        const width = ctx.measureText(currentLine + ' ' + word).width;
        if (width < maxWidth) {
            currentLine += ' ' + word;
        } else {
            lines.push(currentLine);
            currentLine = word;
        }
    }
    lines.push(currentLine);
    return lines;
}

// ── Draw Rounded Rectangle ──
function roundRect(ctx, x, y, width, height, radius) {
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

// ── Draw Circular Image ──
function drawCircularImage(ctx, img, x, y, size) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(img, x, y, size, size);
    ctx.restore();
}

// ── Style Themes ──
const STYLES = {
    lucifer: {
        name: '😈 Lucifer',
        bgStart: '#1a0000',
        bgEnd: '#6b0f0f',
        nameColor: '#FFD700',
        textColor: '#FFFFFF',
        avatarBorder: '#FFD700',
        avatarShadow: 'rgba(255, 215, 0, 0.4)',
        borderColor: 'rgba(255, 215, 0, 0.15)'
    },
    dark: {
        name: '🌑 Dark',
        bgStart: '#0d0d0d',
        bgEnd: '#1a1a2e',
        nameColor: '#FFFFFF',
        textColor: '#DCDDDE',
        avatarBorder: '#5865F2',
        avatarShadow: 'rgba(88, 101, 242, 0.4)',
        borderColor: 'rgba(88, 101, 242, 0.15)'
    },
    light: {
        name: '☀️ Light',
        bgStart: '#FFFFFF',
        bgEnd: '#F0F0F5',
        nameColor: '#1a1a2e',
        textColor: '#5C5E66',
        avatarBorder: '#5865F2',
        avatarShadow: 'rgba(88, 101, 242, 0.2)',
        borderColor: 'rgba(0, 0, 0, 0.08)'
    }
};

async function generateQuote(avatarURL, username, content, styleName = 'lucifer') {
    const style = STYLES[styleName] || STYLES.lucifer;
    const font = "'Segoe UI', 'Helvetica Neue', Helvetica, Arial, sans-serif";

    // ── Prepare Text ──
    const cleanContent = stripMarkdown(content) || '...';
    const displayName = username || 'Unknown';

    // ── Canvas Setup (temporary to measure text) ──
    const tempCanvas = createCanvas(1200, 1000);
    const tempCtx = tempCanvas.getContext('2d');

    // ── Measure Text Height ──
    const padding = 70;
    const avatarSize = 150;
    const textMaxWidth = 1200 - (padding * 2) - 20;
    
    tempCtx.font = `bold 48px ${font}`;
    const nameHeight = tempCtx.measureText(displayName).actualBoundingBoxAscent + 20;

    tempCtx.font = `38px ${font}`;
    const lines = wrapText(tempCtx, cleanContent, textMaxWidth);
    const textBlockHeight = lines.length * 52;

    // ── Calculate Final Canvas Size ──
    const canvasWidth = 1200;
    const canvasHeight = Math.max(400, padding + avatarSize + 30 + nameHeight + textBlockHeight + padding);

    // ── Create Final Canvas ──
    const canvas = createCanvas(canvasWidth, canvasHeight);
    const ctx = canvas.getContext('2d');

    // ── Background Gradient ──
    const gradient = ctx.createLinearGradient(0, 0, canvasWidth, canvasHeight);
    gradient.addColorStop(0, style.bgStart);
    gradient.addColorStop(1, style.bgEnd);
    
    roundRect(ctx, 0, 0, canvasWidth, canvasHeight, 30);
    ctx.fillStyle = gradient;
    ctx.fill();

    // ── Subtle Inner Border ──
    roundRect(ctx, 8, 8, canvasWidth - 16, canvasHeight - 16, 24);
    ctx.strokeStyle = style.borderColor;
    ctx.lineWidth = 2;
    ctx.stroke();

    // ── Avatar ──
    let avatarImg;
    try {
        const cleanURL = avatarURL.replace(/\.(gif|webp)$/i, '.png') + '?size=256';
        avatarImg = await loadImage(cleanURL);
    } catch (e) {
        // Fallback: create a blank avatar
        avatarImg = createCanvas(150, 150);
    }

    const avatarX = padding;
    const avatarY = padding;

    // Avatar Shadow
    ctx.shadowColor = style.avatarShadow;
    ctx.shadowBlur = 30;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 5;

    // Avatar Border Circle
    ctx.beginPath();
    ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2 + 5, 0, Math.PI * 2);
    ctx.fillStyle = style.avatarBorder;
    ctx.fill();

    // Reset Shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // Avatar Image (Circular)
    drawCircularImage(ctx, avatarImg, avatarX, avatarY, avatarSize);

    // ── Username ──
    const textStartX = padding;
    const textStartY = avatarY + avatarSize + 30;

    ctx.font = `bold 48px ${font}`;
    ctx.fillStyle = style.nameColor;
    ctx.fillText(displayName, textStartX, textStartY + 48);

    // ── Message Content ──
    ctx.font = `38px ${font}`;
    ctx.fillStyle = style.textColor;

    let currentY = textStartY + 48 + 25;
    for (const line of lines) {
        ctx.fillText(line, textStartX, currentY);
        currentY += 52;
    }

    // ── Return Buffer ──
    return canvas.toBuffer('image/png');
}

module.exports = { generateQuote, STYLES };