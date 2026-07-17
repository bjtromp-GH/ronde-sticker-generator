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
  page.setCropBox(bleedX, bleedY, origW - 2*bleedX, origH - 2*bleedY);

  const outPdf = await PDFDocument.create();
  const [embedded] = await outPdf.embedPages([page]);
  
  const outPage = outPdf.addPage([200, 200]);
  outPage.drawPage(embedded, {
    x: 50,
    y: 50,
    width: embedded.width,
    height: embedded.height
  });
  
  fs.writeFileSync('scripts/testOut.pdf', await outPdf.save());
})();
