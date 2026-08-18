import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';

export function generateCSV(data, columns) {
  const header = columns.map((c) => c.label).join(',');
  const rows = data.map((row) =>
    columns
      .map((c) => {
        const val = typeof c.accessor === 'function' ? c.accessor(row) : row[c.key];
        const str = String(val ?? '');
        return str.includes(',') || str.includes('"') || str.includes('\n')
          ? `"${str.replace(/"/g, '""')}"`
          : str;
      })
      .join(',')
  );
  return [header, ...rows].join('\n');
}

export async function generateExcel(data, columns, sheetName = 'Report') {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName);

  sheet.columns = columns.map((c) => ({
    header: c.label,
    key: c.key,
    width: c.width || 18,
  }));

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF2563EB' },
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

  data.forEach((row) => {
    const values = {};
    columns.forEach((c) => {
      values[c.key] = typeof c.accessor === 'function' ? c.accessor(row) : row[c.key] ?? '';
    });
    sheet.addRow(values);
  });

  sheet.eachRow((row, idx) => {
    if (idx > 1) {
      row.eachCell((cell) => {
        cell.border = {
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        };
      });
    }
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export function generatePDF(data, columns, title = 'Report') {
  return new Promise((resolve) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));

    doc.fontSize(18).font('Helvetica-Bold').text(title, { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(9).font('Helvetica').fillColor('#64748b')
      .text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
    doc.moveDown(1);

    const pageWidth = doc.page.width - 80;
    const colWidth = pageWidth / columns.length;
    const rowHeight = 22;

    doc.fontSize(8).font('Helvetica-Bold').fillColor('#2563eb');
    columns.forEach((c, i) => {
      doc.text(c.label, 40 + i * colWidth, doc.y, {
        width: colWidth - 4,
        continued: false,
      });
    });
    doc.moveDown(0.2);
    doc.moveTo(40, doc.y).lineTo(40 + pageWidth, doc.y).stroke('#e2e8f0');
    doc.moveDown(0.3);

    doc.font('Helvetica').fillColor('#0f172a').fontSize(7);
    data.forEach((row, rowIdx) => {
      if (doc.y > doc.page.height - 80) {
        doc.addPage();
      }
      const y = doc.y;
      columns.forEach((c, i) => {
        const val = typeof c.accessor === 'function' ? c.accessor(row) : row[c.key] ?? '';
        doc.text(String(val).substring(0, 50), 40 + i * colWidth, y, {
          width: colWidth - 4,
          continued: false,
        });
      });
      if (rowIdx < data.length - 1) {
        doc.moveDown(0.1);
        doc.moveTo(40, doc.y).lineTo(40 + pageWidth, doc.y).stroke('#f1f5f9');
        doc.moveDown(0.3);
      }
    });

    doc.end();
  });
}
