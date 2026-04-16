const { createCanvas, loadImage } = require('@napi-rs/canvas');

// ── Strip Discord Markdown ──
function stripMarkdown(text) {
    return text
        .replace(/\*\*\*(.*?)\*\*\*/g, '$1')
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/\*(.*?)\*/g, '$1')
        .replace(/__(.*?)__/g, '$1')
        .replace(/_(.*?)_/g, '$1')
        .replace(/~~(.*?)~~/g, '$1')
        .replace(/`{3}(.*?)`{3}/gs, '$1')
        .replace(/`(.*?)`/g, '$1')
        .replace(/\|\|(.*?)\|\|/g, '$1')
        .replace(/<a?:(\w+):\d+>/g, ':$1:')
        .replace(/https?:\/\/\S+/g, '');
}

// ── Word Wrap (Handles Newlines) ──
function wrapText(ctx, text, maxWidth) {
    const paragraphs = text.split('\n');
    const allLines = [];

    for (const paragraph of paragraphs) {
        if (paragraph.trim() === '') { allLines.push(''); continue; }
        const words = paragraph.split(' ');
        let currentLine = words[0] || '';
        for (let i = 1; i < words.length; i++) {
            const testLine = currentLine + ' ' + words[i];
            if (ctx.measureText(testLine).width < maxWidth) {
                currentLine = testLine;
            } else {
                allLines.push(currentLine);
                currentLine = words[i];
            }
        }
        allLines.push(currentLine);
    }
    return allLines;
}

// ── Draw Circular Image ──
function drawCircleImage(ctx, img, cx, cy, radius) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(img, cx - radius, cy - radius, radius * 2, radius * 2);
    ctx.restore();
}

// ── Draw Circle Stroke ──
function drawCircleStroke(ctx, cx, cy, radius, color, lineWidth) {
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.closePath();
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
}

// ── Style Themes ──
const STYLES = {
    lucifer: {
        name: '😈 Lucifer',
        rightBg: '#0F0000',
        textColor: '#FFFFFF',
        nameColor: '#FFD700',
        handleColor: '#CC9900',
        overlayColor: 'rgba(5, 0, 0, 0.50)',
        accentColor: '#FFD700',
        separatorColor: '#FFD700'
    },
    dark: {
        name: '🌑 Dark',
        rightBg: '#111111',
        textColor: '#FFFFFF',
        nameColor: '#FFFFFF',
        handleColor: '#888888',
        overlayColor: 'rgba(0, 0, 0, 0.50)',
        accentColor: '#5865F2',
        separatorColor: '#5865F2'
    },
    light: {
        name: '☀️ Light',
        rightBg: '#F5F5F5',
        textColor: '#1E1F22',
        nameColor: '#1E1F22',
        handleColor: '#888888',
        overlayColor: 'rgba(255, 255, 255, 0.55)',
        accentColor: '#5865F2',
        separatorColor: '#5865F2'
    }
};

async function generateQuote(avatarURL, displayName, username, content, styleName = 'lucifer') {
    const style = STYLES[styleName] || STYLES.lucifer;

    const cleanContent = stripMarkdown(content) || '...';
    const name = displayName || 'Unknown';
    const handle = username ? `@${username}` : '';

    // ── Dimensions ──
    const canvasWidth = 1500;
    const leftWidth = 750;
    const rightWidth = 750;
    const rightPadding = 80;
    const textMaxWidth = rightWidth - (rightPadding * 2);
    const textLineHeight = 58;
    const nameGap = 50;
    const handleGap = 10;

    // ── Measure Text ──
    const tempCanvas = createCanvas(canvasWidth, 1000);
    const tempCtx = tempCanvas.getContext('2d');

    tempCtx.font = 'bold 46px Roboto, sans-serif';
    const lines = wrapText(tempCtx, cleanContent, textMaxWidth);
    const textBlockHeight = lines.length * textLineHeight;
    const nameBlockHeight = 40 + handleGap + 30;
    const totalContentHeight = textBlockHeight + nameGap + nameBlockHeight;

    const canvasHeight = Math.max(700, totalContentHeight + 200);

    // ── Create Canvas ──
    const canvas = createCanvas(canvasWidth, canvasHeight);
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // ── Load Avatar ──
    let avatarImg;
    try {
        const cleanURL = avatarURL.replace(/\.(gif|webp)$/i, '.png').replace(/\?size=\d+/, '') + '?size=1024';
        avatarImg = await loadImage(cleanURL);
    } catch (e) {
        avatarImg = createCanvas(100, 100);
    }

    // ════════════════════════════════════════
    // ── STEP 1: Fill ENTIRE canvas with right bg ──
    // ════════════════════════════════════════
    ctx.fillStyle = style.rightBg;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // ════════════════════════════════════════
    // ── STEP 2: LEFT HALF — Blurred Avatar ──
    // ════════════════════════════════════════

    const blurW = 200;
    const blurH = Math.round(200 * (canvasHeight / leftWidth));
    const blurCanvas = createCanvas(blurW, blurH);
    const blurCtx = blurCanvas.getContext('2d');

    const imgAspect = avatarImg.width / avatarImg.height;
    const targetAspect = leftWidth / canvasHeight;
    let sx = 0, sy = 0, sw = avatarImg.width, sh = avatarImg.height;

    if (imgAspect > targetAspect) {
        sw = avatarImg.height * targetAspect;
        sx = (avatarImg.width - sw) / 2;
    } else {
        sh = avatarImg.width / targetAspect;
        sy = (avatarImg.height - sh) / 2;
    }

    blurCtx.drawImage(avatarImg, sx, sy, sw, sh, 0, 0, blurW, blurH);
    ctx.drawImage(blurCanvas, 0, 0, blurW, blurH, 0, 0, leftWidth, canvasHeight);

    // Dark overlay
    ctx.fillStyle = style.overlayColor;
    ctx.fillRect(0, 0, leftWidth, canvasHeight);

    // ════════════════════════════════════════
    // ── STEP 3: SEPARATOR LINE ──
    // ════════════════════════════════════════

    ctx.fillStyle = style.separatorColor;
    ctx.fillRect(leftWidth - 4, 0, 4, canvasHeight);

    // ════════════════════════════════════════
    // ── STEP 4: CENTERED TEXT ──
    // ════════════════════════════════════════

    const centerX = leftWidth + (rightWidth / 2);
    const contentStartY = (canvasHeight - totalContentHeight) / 2;

    // ── Quote Text ──
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 46px Roboto, sans-serif';
    ctx.fillStyle = style.textColor;

    let textY = contentStartY + (textLineHeight / 2);
    for (const line of lines) {
        ctx.fillText(line, centerX, textY);
        textY += textLineHeight;
    }

    // ── Separator Line (thin, between text and name) ──
    const sepY = textY + (nameGap / 2);
    const sepHalfWidth = 60;
    ctx.fillStyle = style.separatorColor;
    ctx.globalAlpha = 0.4;
    ctx.fillRect(centerX - sepHalfWidth, sepY - 1, sepHalfWidth * 2, 2);
    ctx.globalAlpha = 1.0;

    // ── Display Name ──
    const nameY = textY + nameGap + 20;
    ctx.font = 'bold 40px Roboto, sans-serif';
    ctx.fillStyle = style.nameColor;
    ctx.fillText(name, centerX, nameY);

    // ── @Username ──
    const handleY = nameY + 20 + handleGap + 15;
    ctx.font = '28px Roboto, sans-serif';
    ctx.fillStyle = style.handleColor;
    ctx.fillText(handle, centerX, handleY);

    // ════════════════════════════════════════
    // ── STEP 5: SMALL CIRCULAR AVATAR ──
    // ════════════════════════════════════════

    const miniSize = 70;
    const miniCX = canvasWidth - rightPadding - (miniSize / 2);
    const miniCY = canvasHeight - 60 - (miniSize / 2);

    drawCircleImage(ctx, avatarImg, miniCX, miniCY, miniSize / 2);
    drawCircleStroke(ctx, miniCX, miniCY, (miniSize / 2) + 3, style.accentColor, 4);

    // ── Return Buffer ──
    return canvas.toBuffer('image/png');
}

module.exports = { generateQuote, STYLES };