import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pdfsDir = path.join(__dirname, '..', 'public', 'PDFs');
const thumbnailsDir = path.join(__dirname, '..', 'public', 'thumbnails');
const outputJson = path.join(__dirname, '..', 'public', 'stickers.json');

if (!fs.existsSync(thumbnailsDir)) {
    fs.mkdirSync(thumbnailsDir, { recursive: true });
}

const files = fs.readdirSync(pdfsDir).filter(f => f.endsWith('.pdf'));
const colors = ['#10b981', '#f59e0b', '#3b82f6', '#ec4899', '#84cc16', '#6366f1', '#14b8a6', '#f43f5e'];

async function generateThumbnails() {
    let pdfjsLib = null;
    let createCanvas = null;
    try {
        pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
        const canvasMod = await import('@napi-rs/canvas');
        createCanvas = canvasMod.createCanvas;
    } catch (e) {
        console.warn('Could not load pdfjs-dist or @napi-rs/canvas for thumbnail generation:', e.message);
        return;
    }

    let generatedCount = 0;

    for (const file of files) {
        const pdfPath = path.join(pdfsDir, file);
        const pngName = file.replace(/\.pdf$/i, '.png');
        const pngPath = path.join(thumbnailsDir, pngName);

        if (!fs.existsSync(pngPath)) {
            try {
                const data = new Uint8Array(fs.readFileSync(pdfPath));
                const doc = await pdfjsLib.getDocument({ data }).promise;
                const page = await doc.getPage(1);
                const viewport = page.getViewport({ scale: 2.0 });
                const canvas = createCanvas(viewport.width, viewport.height);
                const context = canvas.getContext('2d');
                await page.render({ canvasContext: context, viewport }).promise;
                const buffer = canvas.toBuffer('image/png');
                fs.writeFileSync(pngPath, buffer);
                generatedCount++;
                console.log(`Generated thumbnail for ${file}`);
            } catch (err) {
                console.error(`Failed to generate thumbnail for ${file}:`, err.message);
            }
        }
    }

    if (generatedCount > 0) {
        console.log(`Generated ${generatedCount} new thumbnails.`);
    }
}

async function main() {
    const stickers = files.map((file, index) => {
        let name = file.replace(/\.pdf$/i, '')
                       .replace(/^VE_Ø30mm_/, '')
                       .replace(/_/g, ' ');
        
        return {
            id: index + 1,
            name: name,
            fileName: file, // Keep just the filename, we'll fetch from /PDFs/ in the frontend
            color: colors[index % colors.length],
            icon: "FileText",
            text: name
        };
    });

    fs.writeFileSync(outputJson, JSON.stringify(stickers, null, 2));
    console.log(`Generated stickers.json with ${stickers.length} stickers.`);

    await generateThumbnails();
    console.log('Thumbnail check complete.');
}

main().catch(err => {
    console.error('Fatal error in generateStickersJson:', err);
    process.exit(1);
});
