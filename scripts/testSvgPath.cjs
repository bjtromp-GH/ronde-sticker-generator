const { PDFDocument, rgb } = require('pdf-lib');
const fs = require('fs');

(async () => {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([100, 100]);

  // Red square
  page.drawRectangle({
    x: 10, y: 10, width: 80, height: 80, color: rgb(1, 0, 0)
  });

  // Mask
  // center 50, 50. radius 40. Square 10 to 90.
  // M 10 10 L 90 10 L 90 90 L 10 90 Z
  // SVG arcs for circle:
  // start at 50, 10
  // arc to 50, 90
  // arc to 50, 10
  // In pdf-lib drawSvgPath, does A work?
  
  // Let's try to just draw a circle with bezier curves if A fails
  // But let's try A first without variables to see if it works.
  const path = "M 10 10 L 90 10 L 90 90 L 10 90 Z M 50 10 A 40 40 0 1 0 50 90 A 40 40 0 1 0 50 10 Z";
  
  try {
    page.drawSvgPath(path, { color: rgb(1,1,1) });
    fs.writeFileSync('scripts/testMask.pdf', await pdf.save());
    console.log('Success');
  } catch (err) {
    console.log(err.message);
  }
})();
