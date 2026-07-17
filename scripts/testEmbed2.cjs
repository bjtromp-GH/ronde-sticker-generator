const { PDFDocument } = require('pdf-lib');
const fs = require('fs');
(async () => {
  const bytes = fs.readFileSync('public/PDFs/VE_Ø30mm_1+1_Gratis.pdf');
  const pdf = await PDFDocument.load(bytes);
  const page = pdf.getPages()[0];
  const origW = page.getWidth();
  const origH = page.getHeight();
  const bleedX = origW * (3/36);
  const bleedY = origH * (3/36);
  const bbox = { left: bleedX, bottom: bleedY, right: origW - bleedX, top: origH - bleedY };

  const outPdf = await PDFDocument.create();
  const embedded = await outPdf.embedPage(page, bbox);
  console.log('Embedded width:', embedded.width, 'Height:', embedded.height);
})();
