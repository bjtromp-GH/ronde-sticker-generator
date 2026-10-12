import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'sticker-upload-api',
        configureServer(server) {
          // Pre-middleware to sanitize any raw '%' in URLs so decodeURI doesn't throw 'URI malformed'
          server.middlewares.use((req, _res, next) => {
            if (req.url && req.url.includes('%')) {
              req.url = req.url.replace(/%(?![0-9a-fA-F]{2})/g, '%25');
            }
            next();
          });

          server.middlewares.use('/api/upload-stickers', async (req, res, next) => {
            if (req.method !== 'POST') {
              return next();
            }

            try {
              const chunks: Buffer[] = [];
              for await (const chunk of req) {
                chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
              }
              const body = Buffer.concat(chunks).toString('utf8');

              const { files } = JSON.parse(body);
              if (!Array.isArray(files) || files.length === 0) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                return res.end(JSON.stringify({ error: 'Geen bestanden ontvangen' }));
              }

              const pdfsDir = path.resolve(__dirname, 'public/PDFs');
              if (!fs.existsSync(pdfsDir)) {
                fs.mkdirSync(pdfsDir, { recursive: true });
              }

              const savedFiles = [];
              for (const file of files) {
                let safeName = path.basename(file.name);
                if (!safeName.toLowerCase().endsWith('.pdf')) {
                  safeName += '.pdf';
                }
                const destPath = path.join(pdfsDir, safeName);
                const rawBase64 = (file.dataBase64 || '').replace(/^data:.*?;base64,/, '');
                const buffer = Buffer.from(rawBase64, 'base64');
                if (buffer.length === 0) {
                  throw new Error(`Bestand ${safeName} bevat geen geldige PDF-inhoud (0 bytes)`);
                }
                fs.writeFileSync(destPath, buffer);
                savedFiles.push(safeName);
              }

              // Regenerate stickers.json and thumbnails
              const { generateStickersAndThumbnails } = await import('./scripts/generateStickersJson.js');
              const updatedStickers = await generateStickersAndThumbnails();

              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({
                success: true,
                savedFiles,
                stickers: updatedStickers,
                serverSaved: true,
              }));
            } catch (err: any) {
              console.error('Fout bij upload-stickers API:', err);
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err?.message || 'Server error' }));
            }
          });
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
