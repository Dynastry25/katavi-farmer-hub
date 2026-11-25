const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const MARGIN = 50;
const LINE_HEIGHT = 16;
const LINES_PER_PAGE = 44;

const sanitizeText = (value) => String(value ?? '')
  .normalize('NFKD')
  .replace(/[^\x20-\x7E]/g, '?');

const escapePdfText = (value) => sanitizeText(value)
  .replace(/\\/g, '\\\\')
  .replace(/\(/g, '\\(')
  .replace(/\)/g, '\\)');

const wrapLines = (text, width = 86) => {
  const words = sanitizeText(text).split(/\s+/).filter(Boolean);
  if (!words.length) return [''];
  const lines = [];
  let current = '';
  for (const word of words) {
    if (!current) {
      current = word.slice(0, width);
      continue;
    }
    if (`${current} ${word}`.length <= width) {
      current = `${current} ${word}`;
    } else {
      lines.push(current);
      current = word.slice(0, width);
    }
  }
  if (current) lines.push(current);
  return lines;
};

// Minimal dependency-free PDF 1.4 writer: one core font, titled pages, and a
// proper xref table so files open in every standard reader.
const buildPdf = ({ title = 'Katavi E-Kilimo', lines = [] } = {}) => {
  const wrapped = [];
  for (const line of lines) {
    const parts = wrapLines(line);
    for (const part of parts) wrapped.push(part);
  }

  const bodyPages = [];
  for (let i = 0; i < wrapped.length; i += LINES_PER_PAGE) {
    bodyPages.push(wrapped.slice(i, i + LINES_PER_PAGE));
  }
  if (!bodyPages.length) bodyPages.push([]);

  const contentFor = (pageLines, isFirst) => {
    const commands = [];
    let y = PAGE_HEIGHT - MARGIN - 10;
    if (isFirst) {
      commands.push(`BT /F1 16 Tf ${MARGIN} ${y} Td (${escapePdfText(title)}) Tj ET`);
      y -= 32;
    }
    for (const line of pageLines) {
      commands.push(`BT /F1 10 Tf ${MARGIN} ${y} Td (${escapePdfText(line)}) Tj ET`);
      y -= LINE_HEIGHT;
    }
    return commands.join('\n');
  };

  const objects = [];
  const addObject = (id, body) => {
    objects[id] = body;
  };

  const pageIds = bodyPages.map((_, index) => 4 + index * 2);
  addObject(1, '<< /Type /Catalog /Pages 2 0 R >>');
  addObject(2, `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`);
  addObject(3, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');

  bodyPages.forEach((pageLines, index) => {
    const pageId = pageIds[index];
    const contentId = pageId + 1;
    const content = contentFor(pageLines, index === 0);
    addObject(pageId, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentId} 0 R >>`);
    addObject(contentId, `<< /Length ${Buffer.byteLength(content, 'ascii')} >>\nstream\n${content}\nendstream`);
  });

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  for (let id = 1; id < objects.length; id += 1) {
    offsets[id] = Buffer.byteLength(pdf, 'ascii');
    pdf += `${id} 0 obj\n${objects[id]}\nendobj\n`;
  }

  const xrefOffset = Buffer.byteLength(pdf, 'ascii');
  const total = objects.length;
  let xref = `xref\n0 ${total}\n0000000000 65535 f \n`;
  for (let id = 1; id < total; id += 1) {
    xref += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += xref;
  pdf += `trailer\n<< /Size ${total} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.from(pdf, 'ascii');
};

module.exports = {
  sanitizeText,
  escapePdfText,
  wrapLines,
  buildPdf,
};
