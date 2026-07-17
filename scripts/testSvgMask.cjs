const { PDFDocument, rgb } = require('pdf-lib');
const fs = require('fs');

(async () => {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([100, 100]);

  // Draw a red background to represent the sticker
  page.drawRectangle({
    x: 10, y: 10, width: 80, height: 80, color: rgb(1, 0, 0)
  });

  // SVG for a donut: Outer square 80x80 (clockwise), Inner circle r=40 (counter-clockwise)
  // Square: M 10 10 L 90 10 L 90 90 L 10 90 Z
  // Circle: M 50 90 A 40 40 0 1 0 50 10 A 40 40 0 1 0 50 90 Z
  // Let's use relative coordinates for the circle or just absolute.
  
  const cx = 50, cy = 50, r = 40;
  // A circular path with 4 bezier curves counter-clockwise
  // Or just use SVG Arc commands! pdf-lib drawSvgPath supports A commands.
  const svgPath = `
    M 10 10 L 90 10 L 90 90 L 10 90 Z
    M ${cx} ${cy - r}
    A ${r} ${r} 0 1 0 ${cx} ${cy + r}
    A ${r} ${r} 0 1 0 ${cx} ${cy - r}
    Z
  `;

  page.drawSvgPath(svgPath, {
    x: 0, y: 100, // drawSvgPath is inverted y or something? Wait, pdf-lib drawSvgPath coordinates: (0,0) is bottom-left, but SVG is top-left.
    color: rgb(1, 1, 1) // white mask
  });

  fs.writeFileSync('scripts/testMask.pdf', await pdf.save());
})();
