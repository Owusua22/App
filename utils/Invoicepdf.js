import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 42;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const GREEN = rgb(0.02, 0.47, 0.36);
const DARK = rgb(0.07, 0.09, 0.15);
const MUTED = rgb(0.39, 0.44, 0.52);
const PALE_GREEN = rgb(0.91, 0.98, 0.95);
const RULE = rgb(0.87, 0.90, 0.93);
const WHITE = rgb(1, 1, 1);

// Standard PDF fonts use WinAnsi. Normalize user-entered text to a safe,
// readable character set, and spell out the Ghana cedi sign as the ISO code.
function safePdfText(value) {
  return String(value ?? "")
    .replace(/₵/g, "GHS ")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2026/g, "...")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E\u00A0-\u00FF\n\t]/g, "?");
}

function wrapText(value, font, fontSize, maxWidth) {
  const paragraphs = safePdfText(value).split(/\n/);
  const lines = [];

  paragraphs.forEach((paragraph) => {
    const words = paragraph.trim().split(/\s+/).filter(Boolean);
    if (!words.length) {
      lines.push("");
      return;
    }

    let line = "";
    words.forEach((word) => {
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, fontSize) <= maxWidth) {
        line = candidate;
        return;
      }

      if (line) lines.push(line);
      line = "";

      // Break unusually long unspaced values (such as a long product code).
      let piece = "";
      for (const character of word) {
        const nextPiece = piece + character;
        if (piece && font.widthOfTextAtSize(nextPiece, fontSize) > maxWidth) {
          lines.push(piece);
          piece = character;
        } else {
          piece = nextPiece;
        }
      }
      line = piece;
    });

    if (line) lines.push(line);
  });

  return lines.length ? lines : [""];
}

function drawRightText(page, value, rightX, y, font, fontSize, color = DARK) {
  const text = safePdfText(value);
  const textWidth = font.widthOfTextAtSize(text, fontSize);
  page.drawText(text, { x: rightX - textWidth, y, size: fontSize, font, color });
}

function drawPageHeader(page, data, boldFont, regularFont, continued = false) {
  page.drawRectangle({
    x: 0,
    y: PAGE_HEIGHT - 8,
    width: PAGE_WIDTH,
    height: 8,
    color: GREEN,
  });

  page.drawText(continued ? "INVOICE (CONTINUED)" : "INVOICE", {
    x: MARGIN,
    y: PAGE_HEIGHT - 59,
    size: 24,
    font: boldFont,
    color: GREEN,
  });
  page.drawText("Franko Trading Limited", {
    x: MARGIN,
    y: PAGE_HEIGHT - 78,
    size: 10,
    font: regularFont,
    color: MUTED,
  });

  const meta = [
    `Order: ${data.orderCode}`,
    `Order date: ${data.orderDate}`,
    `Invoice date: ${data.invoiceDate}`,
  ];
  let metaY = PAGE_HEIGHT - 42;
  meta.forEach((value) => {
    const lines = wrapText(value, regularFont, 8.5, 205);
    lines.forEach((line) => {
      drawRightText(
        page,
        line,
        PAGE_WIDTH - MARGIN,
        metaY,
        regularFont,
        8.5,
        DARK
      );
      metaY -= 12;
    });
  });

  page.drawLine({
    start: { x: MARGIN, y: PAGE_HEIGHT - 101 },
    end: { x: PAGE_WIDTH - MARGIN, y: PAGE_HEIGHT - 101 },
    thickness: 1.5,
    color: GREEN,
  });

  return PAGE_HEIGHT - 124;
}

function drawDeliveryDetails(page, data, boldFont, regularFont, startY) {
  let y = startY;
  page.drawText("DELIVERY DETAILS", {
    x: MARGIN,
    y,
    size: 10,
    font: boldFont,
    color: GREEN,
  });
  y -= 20;

  const fields = [
    ["Recipient", data.recipientName],
    ["Contact", data.recipientContactNumber],
    ["Address", data.deliveryAddress],
  ];
  const labelX = MARGIN;
  const valueX = MARGIN + 92;
  const valueWidth = PAGE_WIDTH - MARGIN - valueX;

  fields.forEach(([label, rawValue]) => {
    const value = rawValue || "Not provided";
    const lines = wrapText(value, regularFont, 9, valueWidth);
    page.drawText(`${label}:`, {
      x: labelX,
      y,
      size: 9,
      font: boldFont,
      color: MUTED,
    });
    lines.forEach((line, index) => {
      page.drawText(line, {
        x: valueX,
        y: y - index * 13,
        size: 9,
        font: regularFont,
        color: DARK,
      });
    });
    y -= Math.max(1, lines.length) * 13 + 3;
  });

  return y - 8;
}

function drawTableHeader(page, boldFont, topY) {
  const headerHeight = 25;
  page.drawRectangle({
    x: MARGIN,
    y: topY - headerHeight,
    width: CONTENT_WIDTH,
    height: headerHeight,
    color: PALE_GREEN,
  });

  const baseline = topY - 16;
  page.drawText("Item", {
    x: MARGIN + 8,
    y: baseline,
    size: 8.5,
    font: boldFont,
    color: GREEN,
  });
  drawRightText(page, "Qty", MARGIN + 325, baseline, boldFont, 8.5, GREEN);
  drawRightText(page, "Unit price", MARGIN + 430, baseline, boldFont, 8.5, GREEN);
  drawRightText(
    page,
    "Amount",
    PAGE_WIDTH - MARGIN - 8,
    baseline,
    boldFont,
    8.5,
    GREEN
  );

  return topY - headerHeight - 5;
}

function money(value) {
  const amount = Number(value);
  return `GHS ${(Number.isFinite(amount) ? amount : 0).toFixed(2)}`;
}

/**
 * Generates a PDF invoice with pdf-lib and returns the PDF as a base64 string.
 * File storage and sharing are handled separately by the React Native screen.
 */
export async function generateOrderInvoiceBase64(invoice) {
  const pdfDoc = await PDFDocument.create();
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const code = safePdfText(invoice?.orderCode || "Order");

  pdfDoc.setTitle(`Invoice ${code}`);
  pdfDoc.setAuthor("Franko Trading Limited");
  pdfDoc.setSubject(`Order invoice ${code}`);
  pdfDoc.setCreator("Franko Trading Limited");
  pdfDoc.setCreationDate(new Date());

  const data = {
    orderCode: code,
    orderDate: safePdfText(invoice?.orderDate || "Date not available"),
    invoiceDate: safePdfText(invoice?.invoiceDate || new Date().toLocaleDateString()),
    recipientName: safePdfText(invoice?.recipientName || "Not provided"),
    recipientContactNumber: safePdfText(
      invoice?.recipientContactNumber || "Not provided"
    ),
    deliveryAddress: safePdfText(invoice?.deliveryAddress || "Not provided"),
    items: Array.isArray(invoice?.items) ? invoice.items : [],
    totalAmount: Number(invoice?.totalAmount) || 0,
  };

  let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = drawPageHeader(page, data, boldFont, regularFont);
  y = drawDeliveryDetails(page, data, boldFont, regularFont, y);
  y = drawTableHeader(page, boldFont, y);

  const productX = MARGIN + 8;
  const productWidth = 222;
  const qtyRight = MARGIN + 325;
  const unitPriceRight = MARGIN + 430;
  const amountRight = PAGE_WIDTH - MARGIN - 8;
  const bottomLimit = MARGIN + 48;

  const addContinuationPage = () => {
    page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    y = drawPageHeader(page, data, boldFont, regularFont, true);
    y = drawTableHeader(page, boldFont, y);
  };

  data.items.forEach((item) => {
    const name = safePdfText(item?.name || "Product");
    const quantity = Math.max(0, Number.parseInt(item?.quantity ?? 0, 10) || 0);
    const itemLines = wrapText(name, regularFont, 9, productWidth);
    const rowHeight = Math.max(34, itemLines.length * 12 + 15);

    if (y - rowHeight < bottomLimit) addContinuationPage();

    page.drawRectangle({
      x: MARGIN,
      y: y - rowHeight,
      width: CONTENT_WIDTH,
      height: rowHeight,
      color: WHITE,
      borderColor: RULE,
      borderWidth: 0.6,
    });

    itemLines.forEach((line, index) => {
      page.drawText(line, {
        x: productX,
        y: y - 14 - index * 12,
        size: 9,
        font: regularFont,
        color: DARK,
      });
    });

    const baseline = y - 15;
    drawRightText(page, String(quantity), qtyRight, baseline, regularFont, 8.5);
    drawRightText(
      page,
      money(item?.unitPrice),
      unitPriceRight,
      baseline,
      regularFont,
      8
    );
    drawRightText(
      page,
      money(item?.lineTotal),
      amountRight,
      baseline,
      regularFont,
      8
    );

    y -= rowHeight;
  });

  if (y - 58 < bottomLimit) addContinuationPage();

  const totalWidth = 225;
  const totalHeight = 42;
  const totalX = PAGE_WIDTH - MARGIN - totalWidth;
  const totalY = y - totalHeight - 12;
  page.drawRectangle({
    x: totalX,
    y: totalY,
    width: totalWidth,
    height: totalHeight,
    color: PALE_GREEN,
    borderColor: GREEN,
    borderWidth: 1,
  });
  page.drawText("TOTAL", {
    x: totalX + 12,
    y: totalY + 16,
    size: 10,
    font: boldFont,
    color: GREEN,
  });
  drawRightText(
    page,
    money(data.totalAmount),
    totalX + totalWidth - 12,
    totalY + 16,
    boldFont,
    10,
    GREEN
  );

  page.drawLine({
    start: { x: MARGIN, y: 34 },
    end: { x: PAGE_WIDTH - MARGIN, y: 34 },
    thickness: 0.7,
    color: RULE,
  });
  page.drawText("Thank you for shopping with Franko Trading Limited.", {
    x: MARGIN,
    y: 20,
    size: 8,
    font: regularFont,
    color: MUTED,
  });

  return pdfDoc.saveAsBase64({ dataUri: false });
}
