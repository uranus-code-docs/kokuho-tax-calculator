import XLSX from 'xlsx';
import { HyperFormula } from 'hyperformula';
import fs from 'node:fs';

const wb = XLSX.read(fs.readFileSync('../../xlsx/2026-102024.xlsx'), { cellFormula: true, cellDates: false });
const sheets = {};
for (const name of wb.SheetNames) {
  const ws = wb.Sheets[name];
  const ref = XLSX.utils.decode_range(ws['!ref']);
  const rows = [];
  for (let r = 0; r <= ref.e.r; r++) {
    const row = [];
    for (let c = 0; c <= ref.e.c; c++) {
      const cell = ws[XLSX.utils.encode_cell({ r, c })];
      if (!cell) { row.push(null); continue; }
      row.push(cell.f ? '=' + cell.f.replace(/(入力|計算|税率・条件)!/g, "'$1'!") : (cell.v ?? null));
    }
    rows.push(row);
  }
  sheets[name] = rows;
}
console.log('sheets:', Object.keys(sheets).map(k => `${k}(${sheets[k].length}行)`).join(', '));

let t = performance.now();
const hf = HyperFormula.buildFromSheets(sheets, { licenseKey: 'gpl-v3' });
console.log('build ms', Math.round(performance.now() - t));

// errors scan
const errs = {};
for (const name of hf.getSheetNames()) {
  const id = hf.getSheetId(name);
  const { height, width } = hf.getSheetDimensions(id);
  for (let r = 0; r < height; r++) for (let c = 0; c < width; c++) {
    const v = hf.getCellValue({ sheet: id, row: r, col: c });
    if (v && typeof v === 'object' && v.type) {
      const k = `${name}:${v.value ?? v.type}`;
      (errs[k] ??= []).push(XLSX.utils.encode_cell({ r, c }));
    }
  }
}
for (const [k, v] of Object.entries(errs)) console.log('ERR', k, v.length, v.slice(0, 6).join(','));
if (!Object.keys(errs).length) console.log('初期状態でエラーなし');
fs.writeFileSync('sheets.json', JSON.stringify(sheets));
