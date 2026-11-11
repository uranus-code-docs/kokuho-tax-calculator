import XLSX from 'xlsx';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
const wb = XLSX.read(fs.readFileSync('../../xlsx/2026-102024.xlsx'), { cellFormula: true });
for (const n of wb.SheetNames) for (const [k,c] of Object.entries(wb.Sheets[n])) if (k[0]!=='!' && c.f) { delete c.v; delete c.w; c.t='z'; }
const ws = wb.Sheets['入力'];
const serial=(y,m,d)=>(Date.UTC(y,m-1,d)-Date.UTC(1899,11,30))/86400000;
ws['F16']={t:'n',v:serial(1976,5,10)}; ws['G16']={t:'n',v:3000000}; ws['C19']={t:'s',v:'全員申告済み'};
fs.mkdirSync('tmp',{recursive:true});
XLSX.writeFile(wb,'tmp/in.xlsx',{bookType:'xlsx'});
const soffice='C:/LibreOffice/program/soffice.com';
const t=performance.now();
execFileSync(soffice,['--headless','--norestore','-env:UserInstallation=file:///C:/htdocs-c/00-tax/tools/lo-profile','--convert-to','xlsx:Calc MS Excel 2007 XML','--outdir','tmp/out','tmp/in.xlsx'],{stdio:'inherit'});
console.log('LibreOffice 1回(起動+計算+保存):',((performance.now()-t)/1000).toFixed(1),'秒');
const r=XLSX.read(fs.readFileSync('tmp/out/in.xlsx'));
const s=r.Sheets['入力'];
console.log(['H26','H27','H28','H29','H30','H31','P16'].map(a=>a+'='+(s[a]?.v)).join(' '));
