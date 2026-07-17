const { PDFDocument, rgb } = require('pdf-lib');
const fs = require('fs');

(async () => {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([100, 100]);

  // Red square
  page.drawRectangle({
    x: 10, y: 10, width: 80, height: 80, color: rgb(1, 0, 0)
  });

  // White donut!
  page.drawCircle({
    x: 50, y: 50,
    size: 40 + 10, // outer size
    borderWidth: 20, // so inner size is 50 - 20 = 30? Wait, how does borderWidth work? It centers on the path!
    borderColor: rgb(1, 1, 1),
    color: undefined
  });

  fs.writeFileSync('scripts/testMask.pdf', await pdf.save());
})();
