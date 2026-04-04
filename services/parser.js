const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const XLSX = require('xlsx');
const mammoth = require('mammoth');

async function parseFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();

  switch (ext) {
    case '.pdf':
      return parsePdf(filePath);
    case '.xlsx':
    case '.xls':
      return parseExcel(filePath);
    case '.docx':
    case '.doc':
      return parseDocx(filePath);
    default:
      throw new Error(`Unsupported file type: ${ext}`);
  }
}

async function parsePdf(filePath) {
  const buffer = fs.readFileSync(filePath);
  const data = await pdfParse(buffer);
  return {
    text: data.text,
    metadata: { pages: data.numpages },
  };
}

function parseExcel(filePath) {
  const workbook = XLSX.readFile(filePath);
  const texts = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const csv = XLSX.utils.sheet_to_csv(sheet);
    if (csv.trim()) {
      texts.push(`--- Sheet: ${sheetName} ---\n${csv}`);
    }
  }

  return {
    text: texts.join('\n\n'),
    metadata: { sheets: workbook.SheetNames.length },
  };
}

async function parseDocx(filePath) {
  const result = await mammoth.extractRawText({ path: filePath });
  return {
    text: result.value,
    metadata: {},
  };
}

module.exports = { parseFile };
