import * as pdfjsLib from 'pdfjs-dist';
// @ts-ignore
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

/**
 * Generate a PNG data URL thumbnail from PDF bytes in the browser.
 */
export async function generatePdfThumbnail(pdfBytes: Uint8Array): Promise<string> {
  try {
    const loadingTask = pdfjsLib.getDocument({
      data: pdfBytes.slice(0),
      standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/standard_fonts/`,
    });

    const pdfDoc = await loadingTask.promise;
    const page = await pdfDoc.getPage(1);

    // Render at crisp 2x resolution (~300px)
    const unscaledViewport = page.getViewport({ scale: 1.0 });
    const targetSize = 250;
    const scale = targetSize / Math.max(unscaledViewport.width, unscaledViewport.height);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas 2d context not available');
    }

    await page.render({ canvasContext: ctx, canvas, viewport }).promise;

    return canvas.toDataURL('image/png');
  } catch (err) {
    console.error('Failed to generate PDF thumbnail in browser:', err);
    return '';
  }
}

/**
 * Clean up a raw PDF filename into a friendly sticker title.
 * e.g. "VE_Ø30mm_Kaas_Oud.pdf" -> "Kaas Oud"
 * e.g. "VE_Ø30mm_100%_Spelt.pdf" -> "100% Spelt"
 * e.g. "Prijs_845.pdf" -> "Prijs 845"
 */
export function cleanStickerName(fileName: string): string {
  return fileName
    .replace(/\.pdf$/i, '')
    .replace(/^VE_Ø30mm_/i, '')
    .replace(/_/g, ' ')
    .trim();
}
