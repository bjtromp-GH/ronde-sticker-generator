const { PDFDocument, rgb } = require('pdf-lib');
const fs = require('fs');

(async () => {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([100, 100]);

  // We need to import the raw operators
  // But wait, can we get them from require('pdf-lib')?
  const pdfLib = require('pdf-lib');
  console.log(Object.keys(pdfLib).filter(k => k.includes('Operator') || k.length <= 2));
})();
