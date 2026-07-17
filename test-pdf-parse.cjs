const fs = require('fs');
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');

async function extractText() {
  const data = new Uint8Array(fs.readFileSync('public/po9457.pdf'));
  const doc = await pdfjsLib.getDocument({ data }).promise;
  let text = '';
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const textContent = await page.getTextContent();
    text += textContent.items.map(item => item.str).join(' ') + '\n';
  }
  console.log(text);
}
extractText().catch(console.error);
