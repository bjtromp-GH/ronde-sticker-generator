import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import fs from 'fs';

async function extract() {
  const data = new Uint8Array(fs.readFileSync('public/po9457.pdf'));
  const doc = await getDocument({
    data,
    standardFontDataUrl: `node_modules/pdfjs-dist/standard_fonts/`,
  }).promise;
  let text = '';
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map(item => item.str).join(' ') + '\n';
  }
  console.log(text);
}
extract().catch(console.error);
