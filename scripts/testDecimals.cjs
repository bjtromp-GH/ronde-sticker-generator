const { PDFDocument, rgb } = require('pdf-lib');
(async () => {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([100, 100]);
  
  // Test A command with commas and explicit parsing
  const path = "M 0 -42.519 A 42.519 42.519 0 1 0 0 42.519";
  try {
    page.drawSvgPath(path, { x: 50, y: 50 });
    console.log('Success without decimals');
  } catch (err) {
    console.error('Error:', err.message);
  }
})();
