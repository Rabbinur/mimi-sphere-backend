import axios from 'axios';
import { Response } from 'express';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import fs from 'fs';
import path from 'path';
import { TOrder } from '../modules/orders/order.interface';

// Cache font buffer in memory to avoid repeated network requests
let cachedFontBuffer: Buffer | null = null;

// Helper to fetch image or font buffer with timeout
const fetchBuffer = async (url: string, timeout = 2000): Promise<Buffer | null> => {
  try {
    const response = await axios.get(url, { responseType: 'arraybuffer', timeout });
    return Buffer.from(response.data, 'binary');
  } catch (error) {
    return null;
  }
};

const getLocalLogoBuffer = (): Buffer | null => {
  const possiblePaths = [
    path.resolve(process.cwd(), '../mimi-sphere-bd/public/logo.png'),
    path.resolve(__dirname, '../../../../mimi-sphere-bd/public/logo.png'),
    path.resolve(process.cwd(), 'public/logo.png'),
  ];
  for (const p of possiblePaths) {
    try {
      if (fs.existsSync(p)) {
        return fs.readFileSync(p);
      }
    } catch {
      // Continue to next path
    }
  }
  return null;
};

/**
 * Core logic to generate the invoice PDF.
 * Returns a Buffer of the generated PDF.
 */
export const createInvoicePDFBuffer = async (order: TOrder): Promise<Buffer> => {
  return new Promise(async (resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks as any)));
    doc.on('error', (err) => reject(err));

    const primaryColor = '#333333';
    const secondaryColor = '#555555';
    const lightGrey = '#eeeeee';
    const headerBg = '#f4f4f4';
    const accentColor = '#0056b3';

    // --- Load Assets ---
    let logoBuffer = getLocalLogoBuffer();
    if (!logoBuffer) {
      logoBuffer = await fetchBuffer('https://mimisphere.com/logo.png');
    }

    let fontBuffer = cachedFontBuffer;
    if (!fontBuffer) {
      const fontUrl =
        'https://github.com/googlefonts/noto-fonts/raw/main/hinted/ttf/NotoSansBengali/NotoSansBengali-Regular.ttf';
      fontBuffer = await fetchBuffer(fontUrl, 2500);
      if (fontBuffer) {
        cachedFontBuffer = fontBuffer;
      }
    }

    // Register font if loaded
    if (fontBuffer) {
      doc.registerFont('Bengali', fontBuffer);
    }

    // Helper to format currency with Taka symbol
    const writeCurrency = (
      amount: number,
      x: number,
      y: number,
      options: any = {},
    ) => {
      const formatted = amount.toLocaleString();
      if (fontBuffer) {
        doc
          .font('Bengali')
          .fontSize(options.fontSize || 10)
          .text(`৳${formatted}`, x, y, options);
        doc.font('Helvetica'); // Reset to default
      } else {
        doc
          .font('Helvetica')
          .fontSize(options.fontSize || 10)
          .text(`${formatted} BDT`, x, y, options);
      }
    };

    doc.font('Helvetica');

    // --- Header Section ---
    const headerY = 40;

    // Logo
    if (logoBuffer) {
      try {
        doc.image(logoBuffer, 40, headerY, { height: 30 });
      } catch (e) {
        doc
          .fontSize(20)
          .fillColor(primaryColor)
          .font('Helvetica-Bold')
          .text('Mimi Sphere', 40, headerY);
      }
    } else {
      doc
        .fontSize(20)
        .fillColor(primaryColor)
        .font('Helvetica-Bold')
        .text('Mimi Sphere', 40, headerY);
    }

    // Company Info
    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .fillColor(primaryColor)
      .text('Mimi Sphere', 300, headerY, { align: 'right' });
    doc
      .font('Helvetica')
      .text('support@mimisphere.com', 300, headerY + 14, { align: 'right' });
    doc.text('+880 1719-713061', 300, headerY + 28, { align: 'right' });

    // Border bottom
    doc
      .moveTo(40, headerY + 60)
      .lineTo(555, headerY + 60)
      .lineWidth(2)
      .strokeColor(primaryColor)
      .stroke();

    // --- Details Section ---
    const detailsY = headerY + 80;

    // Bill To
    doc
      .font('Helvetica-Bold')
      .fontSize(12)
      .fillColor(secondaryColor)
      .text('BILL TO:', 40, detailsY);
    doc
      .font('Helvetica-Bold')
      .fontSize(11)
      .fillColor(primaryColor)
      .text(order.customer_name, 40, detailsY + 20);
    doc.font('Helvetica').fontSize(10);

    const addressLines = [
      order.village_or_area,
      order.upazila,
      order.district,
    ].filter((line): line is string => Boolean(line));

    let currentBillY = detailsY + 35;
    addressLines.forEach((line) => {
      doc.text(line, 40, currentBillY);
      currentBillY += 14;
    });
    doc.text(`Phone: ${order.phone}`, 40, currentBillY);

    // Order Info
    doc
      .font('Helvetica-Bold')
      .fontSize(12)
      .fillColor(secondaryColor)
      .text('ORDER INFO:', 300, detailsY, { align: 'right' });

    doc.font('Helvetica').fontSize(10).fillColor(primaryColor);
    doc.text(`Order ID: ${order.order_id}`, 300, detailsY + 20, {
      align: 'right',
    });

    const dateStr = new Date(
      (order as any).createdAt || new Date(),
    ).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    doc
      .font('Helvetica')
      .text(`Date: ${dateStr}`, 300, detailsY + 35, { align: 'right' });

    doc.text(
      `Payment: ${order.payment_method} [${order.payment_status.toUpperCase()}]`,
      300,
      detailsY + 50,
      { align: 'right' },
    );
    doc.text(
      `Delivery: ${order.delivery_zone === 'inside_dhaka' ? 'Inside Dhaka' : 'Outside Dhaka'
      }`,
      300,
      detailsY + 65,
      { align: 'right' },
    );

    // --- Table Header ---
    let tableY = Math.max(currentBillY + 30, detailsY + 100);

    doc.rect(40, tableY, 515, 30).fill(headerBg);

    doc.font('Helvetica-Bold').fontSize(10).fillColor(primaryColor);
    doc.text('Product Description', 50, tableY + 10);
    doc.text('Price', 320, tableY + 10);
    doc.text('Qty', 420, tableY + 10);
    doc.text('Total', 480, tableY + 10, { width: 65, align: 'right' });

    // Table Bottom Border
    doc
      .moveTo(40, tableY + 30)
      .lineTo(555, tableY + 30)
      .lineWidth(2)
      .strokeColor(lightGrey)
      .stroke();

    // --- Table Rows ---
    let rowY = tableY + 40;
    doc.font('Helvetica').fontSize(10);

    for (const product of order.products) {
      if (rowY > 680) {
        doc.addPage();
        rowY = 40;
      }

      let itemHeight = 40;

      if (product.thumbnail) {
        const imgBuffer = await fetchBuffer(product.thumbnail);
        if (imgBuffer) {
          try {
            doc.image(imgBuffer, 45, rowY, { width: 35, height: 35 });
          } catch (e) { }
        }
      }

      doc
        .font('Helvetica-Bold')
        .text(product.title, 95, rowY + 5, { width: 210 });

      if (product.selected_variant_values) {
        let variantEntries: [string, any][] = [];
        const svv = product.selected_variant_values as any;

        if (svv instanceof Map) {
          variantEntries = Array.from(svv.entries());
        } else if (typeof svv.toJSON === 'function') {
          variantEntries = Object.entries(svv.toJSON());
        } else {
          variantEntries = Object.entries(svv).filter(([k]) => !k.startsWith('$'));
        }

        const variants = variantEntries
          .map(([k, v]) => `${k}: ${v}`)
          .join(', ');

        if (variants) {
          doc
            .fontSize(8)
            .font('Helvetica')
            .fillColor(secondaryColor)
            .text(`(${variants})`, 95, doc.y + 2, { width: 210 });
          doc.fontSize(10).fillColor(primaryColor);
        }
      }

      const textHeight = doc.y - (rowY + 5);
      itemHeight = Math.max(itemHeight, textHeight + 10);

      writeCurrency(product.price, 320, rowY + 15);
      doc.text(product.quantity.toString(), 420, rowY + 15);
      writeCurrency(product.total_price, 480, rowY + 15, {
        width: 65,
        align: 'right',
      });

      rowY += itemHeight;
      doc
        .moveTo(40, rowY)
        .lineTo(555, rowY)
        .lineWidth(0.5)
        .strokeColor(lightGrey)
        .stroke();
      rowY += 15;
    }

    // --- Totals Section ---
    if (rowY > 650) {
      doc.addPage();
      rowY = 40;
    }

    const totalsX = 350;
    const totalsValX = 460;
    let totalsY = rowY + 10;

    const subtotal = order.products.reduce((sum, p) => sum + p.total_price, 0);

    doc.font('Helvetica').fontSize(10).fillColor(secondaryColor);
    doc.text('Subtotal:', totalsX, totalsY);
    writeCurrency(subtotal, totalsValX, totalsY, { width: 95, align: 'right' });
    totalsY += 18;

    doc.text('Delivery Charge:', totalsX, totalsY);
    writeCurrency(order.delivery_charge, totalsValX, totalsY, {
      width: 95,
      align: 'right',
    });
    totalsY += 18;

    if (order.discount_amount) {
      doc.text('Discount:', totalsX, totalsY);
      writeCurrency(-order.discount_amount, totalsValX, totalsY, {
        width: 95,
        align: 'right',
      });
      totalsY += 18;
    }

    doc
      .moveTo(totalsX, totalsY)
      .lineTo(555, totalsY)
      .lineWidth(1)
      .strokeColor(primaryColor)
      .stroke();
    totalsY += 10;

    doc.font('Helvetica-Bold').fontSize(12).fillColor(accentColor);
    doc.text('Total Amount:', totalsX, totalsY);
    writeCurrency(order.total_price, totalsValX, totalsY, {
      width: 95,
      align: 'right',
      fontSize: 12,
    });

    // --- Professional Footer ---
    const footerY = 740;
    doc
      .moveTo(40, footerY)
      .lineTo(555, footerY)
      .lineWidth(1)
      .strokeColor(lightGrey)
      .stroke();

    doc.font('Helvetica-Bold').fontSize(8).fillColor(secondaryColor);
    doc.text('CONTACT INFORMATION', 40, footerY + 15);
    doc.font('Helvetica').text('Phone: +880 1719-713061', 40, footerY + 27);
    doc.text('Email: support@mimisphere.com', 40, footerY + 37);
    doc.text('Web: www.mimisphere.com', 40, footerY + 47);

    // Col 2: QR Code
    const baseUrl = process.env.FRONTEND_URL || 'https://www.mimisphere.com';
    const trackingUrl = `${baseUrl}/track-order?orderId=${encodeURIComponent(order.order_id)}&phone=${encodeURIComponent(order.phone || '')}`;
    const qrData = `Order ID: ${order.order_id}\nCustomer: ${order.customer_name}\nTotal: ৳${order.total_price}\nTrack: ${trackingUrl}`;
    const qrCodeDataUrl = await QRCode.toDataURL(qrData, { margin: 1 });
    doc.image(qrCodeDataUrl, 235, footerY + 5, { width: 45 });
    doc
      .fontSize(7)
      .text('Scan to Verify', 230, footerY + 52, { width: 55, align: 'center' });

    doc
      .font('Helvetica-Bold')
      .text('THANK YOU', 400, footerY + 15, { align: 'right' });
    doc
      .font('Helvetica')
      .text('Thank you for choosing', 400, footerY + 27, { align: 'right' });
    doc
      .font('Helvetica-Bold')
      .fillColor(accentColor)
      .text('Mimi Sphere', 400, footerY + 37, { align: 'right' });

    // --- Return Policy Section (Hidden by default, toggle SHOW_RETURN_POLICY_ON_INVOICE to true when needed) ---
    const SHOW_RETURN_POLICY_ON_INVOICE = false;

    if (SHOW_RETURN_POLICY_ON_INVOICE) {
      const returnY = footerY + 60;
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor(primaryColor);
      doc.text('Return Policy', 40, returnY);
      doc.font('Helvetica').fontSize(6.5).fillColor(secondaryColor);
      const policyText =
        '1. If any defect is found (damaged/ defective/ wrong product) after opening the box, inform MIMI SPHERE Customer Service (via hotline +880 1719-713061 or support@mimisphere.com) as soon as possible along with picture/video proof. ' +
        '2. Return process must be initiated within 7 days of receiving the parcel. ' +
        '3. Product quality needs to be in the original condition. Products must not be used, worn, altered, or washed. Product hand tags, packaging, and the original invoice must be returned along with the products. ' +
        '4. Exchange delivery cost may be applicable. ' +
        '5. Promotional offers are not applicable for returned products.';
      doc.text(policyText, 40, returnY + 10, { width: 515, lineGap: 1.5 });

      doc.font('Helvetica-Bold').fontSize(6).text('Disclaimer: ', 40, returnY + 44, { continued: true });
      doc.font('Helvetica').text('This document & any information transmitted with it are confidential & intended solely for the use of the customer. Copyright © 2026 Mimi Sphere. All Rights Reserved.', { width: 515 });
    }

    doc.end();
  });
};

/**
 * Standard utility to generate and stream the PDF to an express Response.
 */
export const generateInvoicePDF = async (order: TOrder, res: Response) => {
  try {
    const buffer = await createInvoicePDFBuffer(order);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=invoice_${order.order_id}.pdf`,
    );

    res.end(buffer);
  } catch (error) {
    console.error('PDF Generation Error:', error);
    res.status(500).send('Error generating PDF');
  }
};
