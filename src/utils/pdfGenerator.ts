import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { Sticker, SelectedItem, GridLayout } from '../types';
import { getStickerPdfUrl } from './urlHelper';

// Convert millimeters to PDF points (1 inch = 25.4 mm = 72 points)
const MM_TO_PT = 2.83464567;

// Utility to convert hex color to RGB (0-1 range for pdf-lib)
function hexToPdfRgb(hex: string) {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255 || 0;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255 || 0;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255 || 0;
  return { r, g, b };
}

export async function generateA4StickerPDF(
  selectedItems: SelectedItem[],
  layout: GridLayout
): Promise<void> {
  // Create a new PDF document
  const pdfDoc = await PDFDocument.create();

  // A4 Page size in points (210 x 297 mm)
  const pageWidth = 210 * MM_TO_PT; // ~595.27 pt
  const pageHeight = 297 * MM_TO_PT; // ~841.89 pt

  // Add the page
  const page = pdfDoc.addPage([pageWidth, pageHeight]);

  // Load fonts
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // Pre-fetch all needed standard PDFs
  const fetchedPdfs: Record<string, Uint8Array> = {};
  const stickersToDraw: Sticker[] = [];

  for (const item of selectedItems) {
    if (!item.sticker.isCustom && item.sticker.fileName && !fetchedPdfs[item.sticker.fileName]) {
      try {
        const urlPath = getStickerPdfUrl(item.sticker.fileName);
        const response = await fetch(urlPath);
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          fetchedPdfs[item.sticker.fileName] = new Uint8Array(arrayBuffer);
        }
      } catch (err) {
        console.error('Fout bij het ophalen van sticker PDF:', err);
      }
    }

    for (let i = 0; i < item.quantity; i++) {
      stickersToDraw.push(item.sticker);
    }
  }

  // Calculate layout dimensions in points
  const labelWidthPt = layout.labelWidth * MM_TO_PT;
  const labelHeightPt = layout.labelHeight * MM_TO_PT;
  const spacingXPt = layout.spacingX * MM_TO_PT;
  const spacingYPt = layout.spacingY * MM_TO_PT;
  const marginTopPt = layout.marginTop * MM_TO_PT;
  const marginLeftPt = layout.marginLeft * MM_TO_PT;

  const totalCapacity = layout.rows * layout.cols;

  // Let's draw the grid structure
  for (let i = 0; i < totalCapacity; i++) {
    // Stop if we have run out of selected stickers
    if (i >= stickersToDraw.length) {
      break;
    }

    const sticker = stickersToDraw[i];

    // Determine grid row and column
    const row = Math.floor(i / layout.cols);
    const col = i % layout.cols;

    // Calculate bounding box coordinates
    // Remember: in PDF coordinates, (0,0) is at the bottom-left corner.
    const x = marginLeftPt + col * (labelWidthPt + spacingXPt);
    const y = pageHeight - marginTopPt - (row * (labelHeightPt + spacingYPt)) - labelHeightPt;

    const centerX = x + labelWidthPt / 2;
    const centerY = y + labelHeightPt / 2;

    const diameterPt = Math.min(labelWidthPt, labelHeightPt);
    const radiusPt = diameterPt / 2;

    // Handle Custom Uploaded PDF or pre-fetched standard PDF
    const pdfBytesToUse = (sticker.isCustom && sticker.pdfBytes) 
      ? sticker.pdfBytes 
      : (sticker.fileName ? fetchedPdfs[sticker.fileName] : null);

    if (pdfBytesToUse) {
      try {
        const donorPdf = await PDFDocument.load(pdfBytesToUse);
        const donorPages = donorPdf.getPages();
        if (donorPages.length > 0) {
          const donorPage = donorPages[0];
          let embeddedPage;

          if (!sticker.isCustom) {
            // For standard stickers (36x36mm), crop the 3mm bleed (1/12th of width) 
            // so it doesn't overlap neighboring stickers on the sheet.
            const origW = donorPage.getWidth();
            const origH = donorPage.getHeight();
            const bleedX = origW * (3 / 36);
            const bleedY = origH * (3 / 36);
            
            const bbox = {
              left: bleedX,
              bottom: bleedY,
              right: origW - bleedX,
              top: origH - bleedY
            };
            embeddedPage = await pdfDoc.embedPage(donorPage, bbox);
          } else {
            // Custom uploaded PDF
            const embeddedPages = await pdfDoc.embedPages([donorPage]);
            embeddedPage = embeddedPages[0];
          }
          
          // Calculate scale to fit inside our sticker diameter
          let scale = Math.min(
            diameterPt / embeddedPage.width,
            diameterPt / embeddedPage.height
          );

          const drawWidth = embeddedPage.width * scale;
          const drawHeight = embeddedPage.height * scale;
          const drawX = centerX - drawWidth / 2;
          const drawY = centerY - drawHeight / 2;

          // Draw the embedded PDF page
          page.drawPage(embeddedPage, {
            x: drawX,
            y: drawY,
            width: drawWidth,
            height: drawHeight,
          });

          // Draw a white mask to cover the square corners of the cropped PDF
          // This creates a perfect circle by masking the corners of the 30x30 bounding box
          // Note: pdf-lib's drawSvgPath parser has issues with newlines, so we keep it on one line.
          const maskPath = `M -${radiusPt} -${radiusPt} L ${radiusPt} -${radiusPt} L ${radiusPt} ${radiusPt} L -${radiusPt} ${radiusPt} Z M 0 -${radiusPt} A ${radiusPt} ${radiusPt} 0 1 0 0 ${radiusPt} A ${radiusPt} ${radiusPt} 0 1 0 0 -${radiusPt} Z`;
          
          page.drawSvgPath(maskPath, {
            x: centerX,
            y: centerY,
            color: rgb(1, 1, 1),
          });

          // Draw a clean cutting boundary circle
          page.drawCircle({
            x: centerX,
            y: centerY,
            size: radiusPt,
            color: undefined,
            borderColor: rgb(0.8, 0.8, 0.8),
            borderWidth: 1,
            borderDashArray: [3, 3],
          });
        }
      } catch (err) {
        console.error('Fout bij het invoegen van sticker PDF:', err);
        // Fallback to text drawing in case embedding fails
        drawFallbackSticker(page, centerX, centerY, radiusPt, sticker, helvetica, helveticaBold);
      }
    } else {
      // Draw dynamic styled sticker
      drawFallbackSticker(page, centerX, centerY, radiusPt, sticker, helvetica, helveticaBold);
    }
  }

  // Save and download the PDF
  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `A4_sticker_vel_${layout.id}_${Date.now()}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Function to draw a highly stylized circular sticker in the PDF
function drawFallbackSticker(
  page: any,
  centerX: number,
  centerY: number,
  radiusPt: number,
  sticker: Sticker,
  helvetica: any,
  helveticaBold: any
) {
  const { r, g, b } = hexToPdfRgb(sticker.color);

  // 1. Draw the filled main sticker circle
  page.drawCircle({
    x: centerX,
    y: centerY,
    size: radiusPt,
    color: rgb(r, g, b),
  });

  // 2. Draw a dotted white inner line (looks like standard precut border)
  page.drawCircle({
    x: centerX,
    y: centerY,
    size: radiusPt - 4,
    color: undefined,
    borderColor: rgb(1, 1, 1),
    borderWidth: 1.2,
    borderDashArray: [3, 3],
  });

  // 3. Draw a white highlight badge in the upper center of the sticker
  const badgeRadius = radiusPt * 0.28;
  const badgeY = centerY + radiusPt * 0.22;
  page.drawCircle({
    x: centerX,
    y: badgeY,
    size: badgeRadius,
    color: rgb(1, 1, 1),
  });

  // Draw initial letter or a small star in the badge
  const initial = sticker.name.charAt(0).toUpperCase();
  const initialFontSize = Math.max(8, badgeRadius * 1.1);
  const initialWidth = helveticaBold.widthOfTextAtSize(initial, initialFontSize);
  
  page.drawText(initial, {
    x: centerX - initialWidth / 2,
    y: badgeY - initialFontSize * 0.35,
    size: initialFontSize,
    font: helveticaBold,
    color: rgb(r, g, b),
  });

  // 4. Draw Main Sticker Title
  const titleText = sticker.name;
  // Calculate dynamic font size based on sticker size (approx 15% of radius)
  const titleFontSize = Math.max(7, Math.min(14, radiusPt * 0.25));
  const titleWidth = helveticaBold.widthOfTextAtSize(titleText, titleFontSize);
  
  page.drawText(titleText, {
    x: centerX - titleWidth / 2,
    y: centerY - radiusPt * 0.15,
    size: titleFontSize,
    font: helveticaBold,
    color: rgb(1, 1, 1),
  });

  // 5. Draw Helper Text / Description below the title
  if (sticker.text) {
    const descText = sticker.text;
    const descFontSize = Math.max(5, titleFontSize * 0.65);
    // Trim text if it exceeds label boundary
    const maxDescWidth = (radiusPt * 2) - 15;
    let trimmedDesc = descText;
    let descWidth = helvetica.widthOfTextAtSize(trimmedDesc, descFontSize);
    
    if (descWidth > maxDescWidth) {
      trimmedDesc = descText.substring(0, 18) + '...';
      descWidth = helvetica.widthOfTextAtSize(trimmedDesc, descFontSize);
    }

    page.drawText(trimmedDesc, {
      x: centerX - descWidth / 2,
      y: centerY - radiusPt * 0.45,
      size: descFontSize,
      font: helvetica,
      color: rgb(0.95, 0.95, 0.95),
    });
  }
}
