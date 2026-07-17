const { PDFDocument, rgb } = require('pdf-lib');
(async () => {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([100, 100]);
  const radiusPt = 42.519;
  const maskPath = `
            M -${radiusPt} -${radiusPt} 
            L ${radiusPt} -${radiusPt} 
            L ${radiusPt} ${radiusPt} 
            L -${radiusPt} ${radiusPt} 
            Z
            M 0 -${radiusPt}
            A ${radiusPt} ${radiusPt} 0 1 0 0 ${radiusPt}
            A ${radiusPt} ${radiusPt} 0 1 0 0 -${radiusPt}
            Z
          `;
  try {
    page.drawSvgPath(maskPath, { x: 50, y: 50 });
    console.log('Success');
  } catch (err) {
    console.error('Stack:', err.stack);
  }
})();
