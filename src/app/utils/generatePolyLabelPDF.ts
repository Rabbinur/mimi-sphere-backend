import PDFDocument from 'pdfkit';
import { Response } from 'express';
import { TOrder } from '../modules/orders/order.interface';
import axios from 'axios';

// Helper to fetch image buffer
const fetchBuffer = async (url: string): Promise<Buffer | null> => {
  try {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    return Buffer.from(response.data, 'binary');
  } catch (error) {
    console.error(`Failed to fetch from ${url}`);
    return null;
  }
};

/**
 * Core logic to generate the Landscape A4 Poly Label PDF.
 * Returns a Buffer of the generated PDF.
 */
export const createPolyLabelPDFBuffer = async (
  order: TOrder,
): Promise<Buffer> => {
  return new Promise(async (resolve, reject) => {
    // Landscape A4 size
    const doc = new PDFDocument({
      size: 'A4',
      layout: 'landscape',
      margin: 20,
    });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks as any)));
    doc.on('error', (err) => reject(err));

    // --- Load Logo Asset ---
    const logoUrl = 'https://www.shoppingcart.bd/logo.png';
    const [logoBuffer] = await Promise.all([fetchBuffer(logoUrl)]);

    // Helper to write text with standard built-in font (Helvetica)
    const writeText = (
      text: string,
      x: number,
      y: number,
      fontSize: number,
      isBold: boolean = false,
    ) => {
      doc.fontSize(fontSize);
      doc.font(isBold ? 'Helvetica-Bold' : 'Helvetica').text(text, x, y);
    };

    // Draw solid thick black border around the main label area (border width: 6)
    doc.rect(20, 20, 802, 555).lineWidth(6).strokeColor('#000000').stroke();

    // Draw watermark logo in the center
    if (logoBuffer) {
      try {
        doc.save();
        doc.opacity(0.06);
        // Center x = (842 - 360) / 2 = 241, y = (595 - 200) / 2 = 197
        doc.image(logoBuffer, 241, 197, { width: 360 });
        doc.restore();
      } catch (e) {
        console.error('Failed to draw watermark logo:', e);
      }
    }

    // --- Header Section ---

    // Company Logo (Top Left) - Positioned at y = 40 (COMPANY NAME black box removed)
    if (logoBuffer) {
      try {
        doc.image(logoBuffer, 40, 40, { height: 35 });
      } catch (e) {
        doc
          .fillColor('#000000')
          .fontSize(16)
          .font('Helvetica-Bold')
          .text('Shopping Cart BD', 40, 40);
      }
    } else {
      doc
        .fillColor('#000000')
        .fontSize(16)
        .font('Helvetica-Bold')
        .text('Shopping Cart BD', 40, 40);
    }

    // Order No (Top Right)
    doc
      .fillColor('#000000')
      .fontSize(18)
      .font('Helvetica-Bold')
      .text('Order No:', 520, 45, { continued: true });
    doc.font('Helvetica-Bold').text(` ${order.order_id}`, { underline: true });

    // --- Middle Fields Section ---

    // Name Row
    doc.fillColor('#000000');
    writeText('Name:', 50, 160, 20, true);
    writeText(order.customer_name, 130, 158, 20, true);
    doc
      .moveTo(125, 182)
      .lineTo(770, 182)
      .lineWidth(2)
      .strokeColor('#000000')
      .stroke();

    // Phone Row
    writeText('Phone:', 50, 220, 20, true);
    // Use Courier for Phone for tabular numbers alignment
    doc.fontSize(22).font('Courier-Bold').text(order.phone, 135, 218);
    doc
      .moveTo(130, 242)
      .lineTo(770, 242)
      .lineWidth(2)
      .strokeColor('#000000')
      .stroke();

    // Address Row 1
    writeText('Address:', 50, 280, 20, true);
    writeText(order.village_or_area || '', 150, 278, 20, true);
    doc
      .moveTo(145, 302)
      .lineTo(770, 302)
      .lineWidth(2)
      .strokeColor('#000000')
      .stroke();

    // Address Row 2 (upazila, district)
    writeText(
      `${order.upazila || ''}, ${order.district || ''}`,
      150,
      338,
      20,
      true,
    );
    doc
      .moveTo(145, 362)
      .lineTo(770, 362)
      .lineWidth(2)
      .strokeColor('#000000')
      .stroke();

    // Extra empty underline row for overflow
    doc
      .moveTo(50, 422)
      .lineTo(770, 422)
      .lineWidth(2)
      .strokeColor('#000000')
      .stroke();

    // --- Bottom Section ---

    // Price Box & Value
    doc.rect(50, 475, 100, 35).fill('#000000');
    doc
      .fillColor('#ffffff')
      .fontSize(18)
      .font('Helvetica-Bold')
      .text('Price:', 65, 485);

    // Taka value (rendered as TK to avoid standard Helvetica character mapping issues)
    doc.fillColor('#000000');
    doc
      .font('Helvetica-Bold')
      .fontSize(24)
      .text(`TK ${order.total_price.toLocaleString()}`, 170, 480);
    doc
      .moveTo(165, 508)
      .lineTo(380, 508)
      .lineWidth(3)
      .strokeColor('#000000')
      .stroke();

    // Footer Greeting (Times-BoldItalic for elegant serif italic style)
    doc
      .fillColor('#000000')
      .fontSize(22)
      .font('Times-BoldItalic')
      .text('Have a nice day!', 20, 530, { align: 'center', width: 802 });

    doc.end();
  });
};

/**
 * Standard utility to generate and stream the Poly Label PDF to an Express Response.
 */
export const generatePolyLabelPDF = async (order: TOrder, res: Response) => {
  try {
    const buffer = await createPolyLabelPDFBuffer(order);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=shoppingcart-poly-label-${order.order_id}.pdf`,
    );

    res.end(buffer);
  } catch (error) {
    console.error('Poly Label PDF Generation Error:', error);
    res.status(500).send('Error generating PDF');
  }
};
