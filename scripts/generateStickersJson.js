import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pdfsDir = path.join(__dirname, '..', 'public', 'PDFs');
const thumbnailsDir = path.join(__dirname, '..', 'public', 'thumbnails');
const outputJson = path.join(__dirname, '..', 'public', 'stickers.json');

const colors = ['#10b981', '#f59e0b', '#3b82f6', '#ec4899', '#84cc16', '#6366f1', '#14b8a6', '#f43f5e'];
const fontsSrcDir = path.join(__dirname, '..', 'node_modules', 'pdfjs-dist', 'standard_fonts');
const fontsDestDir = path.join(__dirname, '..', 'public', 'standard_fonts');

export function copyStandardFonts() {
    if (fs.existsSync(fontsSrcDir)) {
        if (!fs.existsSync(fontsDestDir)) {
            fs.mkdirSync(fontsDestDir, { recursive: true });
        }
        const fontFiles = fs.readdirSync(fontsSrcDir);
        for (const fontFile of fontFiles) {
            const src = path.join(fontsSrcDir, fontFile);
            const dst = path.join(fontsDestDir, fontFile);
            if (!fs.existsSync(dst)) {
                fs.copyFileSync(src, dst);
            }
        }
        console.log('Standard PDF fonts verified for offline use.');
    }
}

export async function generateThumbnails() {
    if (!fs.existsSync(thumbnailsDir)) {
        fs.mkdirSync(thumbnailsDir, { recursive: true });
    }

    const files = fs.readdirSync(pdfsDir).filter(f => f.endsWith('.pdf'));

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

export async function generateStickersAndThumbnails() {
    if (!fs.existsSync(pdfsDir)) {
        fs.mkdirSync(pdfsDir, { recursive: true });
    }
    if (!fs.existsSync(thumbnailsDir)) {
        fs.mkdirSync(thumbnailsDir, { recursive: true });
    }

    copyStandardFonts();

    const files = fs.readdirSync(pdfsDir).filter(f => f.endsWith('.pdf'));

    const stickers = files.map((file, index) => {
        let name = file.replace(/\.pdf$/i, '')
                       .replace(/^VE_Ø30mm_/, '')
                       .replace(/_/g, ' ');
        
        return {
            id: index + 1,
            name: name,
            fileName: file,
            color: colors[index % colors.length],
            icon: "FileText",
            text: name
        };
    });

    fs.writeFileSync(outputJson, JSON.stringify(stickers, null, 2));
    console.log(`Generated stickers.json with ${stickers.length} stickers.`);

    await generateThumbnails();
    console.log('Thumbnail check complete.');

    return stickers;
}

// If executed directly from command line
if (process.argv[1] && process.argv[1].endsWith('generateStickersJson.js')) {
    generateStickersAndThumbnails().catch(err => {
        console.error('Fatal error in generateStickersJson:', err);
        process.exit(1);
    });
}
