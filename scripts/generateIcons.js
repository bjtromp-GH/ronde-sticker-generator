import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createCanvas } from '@napi-rs/canvas';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const iconsDir = path.join(__dirname, '..', 'public', 'icons');
const publicDir = path.join(__dirname, '..', 'public');

if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

function renderStickerIcon(size, isMaskable = false) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  const center = size / 2;
  const radius = isMaskable ? size * 0.44 : size * 0.47;

  // Background for maskable icon needs full bleed
  if (isMaskable) {
    const bgGrad = ctx.createLinearGradient(0, 0, size, size);
    bgGrad.addColorStop(0, '#4f46e5');
    bgGrad.addColorStop(1, '#3730a3');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, size, size);
  }

  // Draw main badge circle
  ctx.save();
  ctx.shadowColor = 'rgba(15, 23, 42, 0.25)';
  ctx.shadowBlur = size * 0.05;
  ctx.shadowOffsetY = size * 0.02;

  const circleGrad = ctx.createLinearGradient(center - radius, center - radius, center + radius, center + radius);
  circleGrad.addColorStop(0, '#6366f1');
  circleGrad.addColorStop(1, '#4338ca');
  ctx.fillStyle = circleGrad;
  ctx.beginPath();
  ctx.arc(center, center, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Dashed outline
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.lineWidth = size * 0.015;
  ctx.setLineDash([size * 0.03, size * 0.02]);
  ctx.beginPath();
  ctx.arc(center, center, radius * 0.82, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  // Inner white round sticker
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(center, center, radius * 0.65, 0, Math.PI * 2);
  ctx.fill();

  // Sticker graphic details
  const w = radius * 0.8;
  // Header bar
  ctx.fillStyle = '#4f46e5';
  roundRect(ctx, center - w / 2, center - radius * 0.35, w, radius * 0.15, radius * 0.075);
  ctx.fill();

  // Lines of text
  ctx.fillStyle = '#94a3b8';
  roundRect(ctx, center - w * 0.4, center - radius * 0.12, w * 0.8, radius * 0.1, radius * 0.05);
  ctx.fill();

  ctx.fillStyle = '#cbd5e1';
  roundRect(ctx, center - w * 0.3, center + radius * 0.05, w * 0.6, radius * 0.08, radius * 0.04);
  ctx.fill();

  // 30mm pill badge
  ctx.fillStyle = '#4f46e5';
  roundRect(ctx, center - w * 0.32, center + radius * 0.22, w * 0.64, radius * 0.16, radius * 0.08);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${Math.round(radius * 0.09)}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Ø 30mm', center, center + radius * 0.30);

  return canvas.toBuffer('image/png');
}

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

console.log('Generating PWA icons...');
fs.writeFileSync(path.join(iconsDir, 'icon-192.png'), renderStickerIcon(192, false));
fs.writeFileSync(path.join(iconsDir, 'icon-512.png'), renderStickerIcon(512, false));
fs.writeFileSync(path.join(iconsDir, 'icon-maskable-192.png'), renderStickerIcon(192, true));
fs.writeFileSync(path.join(iconsDir, 'icon-maskable-512.png'), renderStickerIcon(512, true));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), renderStickerIcon(180, true));
console.log('PWA icons successfully created in public/icons/');
