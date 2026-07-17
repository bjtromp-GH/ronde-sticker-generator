import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pdfsDir = path.join(__dirname, '..', 'public', 'PDFs');
const outputJson = path.join(__dirname, '..', 'public', 'stickers.json');

const files = fs.readdirSync(pdfsDir).filter(f => f.endsWith('.pdf'));

const colors = ['#10b981', '#f59e0b', '#3b82f6', '#ec4899', '#84cc16', '#6366f1', '#14b8a6', '#f43f5e'];

const stickers = files.map((file, index) => {
    // Generate a readable name from the filename
    let name = file.replace('.pdf', '')
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
