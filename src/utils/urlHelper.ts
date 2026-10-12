/**
 * Safely encodes a filename for use in URLs across both local Vite dev server and Vercel hosting.
 * Handles characters that web servers misinterpret:
 * - '+' is encoded to '%2B' so servers don't decode it as a space (which causes 404 on Vercel)
 * - '#' is encoded to '%23' so browsers don't treat it as a URL hash fragment
 * - '%' is encoded to '%25' so decodeURI doesn't throw 'URI malformed'
 */
export function encodeStickerUrl(fileName: string): string {
  return encodeURI(fileName)
    .replace(/#/g, '%23')
    .replace(/\+/g, '%2B');
}

/**
 * Get the full web URL for a sticker thumbnail PNG
 */
export function getStickerThumbnailUrl(fileName: string): string {
  const pngName = fileName.replace(/\.pdf$/i, '.png');
  return `/thumbnails/${encodeStickerUrl(pngName)}`;
}

/**
 * Get the full web URL for a sticker PDF file
 */
export function getStickerPdfUrl(fileName: string): string {
  const cleanName = fileName.replace(/^PDFs\//i, '');
  return `/PDFs/${encodeStickerUrl(cleanName)}`;
}
