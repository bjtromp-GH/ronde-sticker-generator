const { PDFDocument } = require('pdf-lib');
(async () => {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([100, 100]);
  page.setCropBox(10, 10, 80, 80);
  console.log(page.getCropBox());
})();
