import XLSX from 'xlsx';
import { HyperFormula } from 'hyperformula';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
const N = +process.argv[2] || 60;
const serial=(y,m,d)=>(Date.UTC(y,m-1,d)-Date.UTC(1899,11,30))/86400000;
let rnd=777; const R=()=>(rnd=(rnd*1103515245+12345)&0x7fffffff)/0x7fffffff;
const cases=[];
for(let i=0;i<N;i++){ const n=1+Math.floor(R()*4); const ps=[];
  for(let p=0;p<n;p++) ps.push({F:serial(1945+Math.floor(R()*80),1+Math.floor(R()*12),1+Math.floor(R()*28)),
    G:R()<.5?Math.floor(R()*9e6):null, H:R()<.4?Math.floor(R()*4e6):null, I:R()<.2?Math.floor(R()*1e6):0});
  cases.push({C19:R()<.8?'全員申告済み':'未申告者有り',ps}); }
const cols=['H27','H28','H29','H30','H31','H26'];

// --- HyperFormula
const sheets=JSON.parse(fs.readFileSync('sheets.json','utf8'));
const hf=HyperFormula.buildFromSheets(sheets,{licenseKey:'gpl-v3'}); const S=hf.getSheetId('入力');
const A=a=>{const m=a.match(/^([A-Z]+)(\d+)$/);let c=0;for(const ch of m[1])c=c*26+ch.charCodeAt(0)-64;return{sheet:S,row:+m[2]-1,col:c-1};};
const hfRes=cases.map(cs=>{
  hf.batch(()=>{ hf.setCellContents(A('C19'),[[cs.C19]]);
    for(let p=0;p<8;p++){const r=16+p,q=cs.ps[p]; for(const k of 'FGHI') hf.setCellContents(A(k+r),[[q?q[k]:null]]); } });
  return cols.map(a=>hf.getCellValue(A(a)));
});

// --- LibreOffice
fs.rmSync('tmp/cmp',{recursive:true,force:true}); fs.mkdirSync('tmp/cmp/in',{recursive:true});
cases.forEach((cs,i)=>{
  const wb=XLSX.read(fs.readFileSync('../../xlsx/2026-102024.xlsx'),{cellFormula:true});
  for(const n of wb.SheetNames) for(const [k,c] of Object.entries(wb.Sheets[n])) if(k[0]!=='!'&&c.f){delete c.v;delete c.w;c.t='z';}
  const ws=wb.Sheets['入力'];
  ws['C19']={t:'s',v:cs.C19};
  for(let p=0;p<8;p++){const r=16+p,q=cs.ps[p]; for(const k of 'FGHI'){const a=k+r; if(q&&q[k]!=null) ws[a]={t:'n',v:q[k]}; else delete ws[a];}}
  XLSX.writeFile(wb,`tmp/cmp/in/c${String(i).padStart(3,'0')}.xlsx`);
});
const files=fs.readdirSync('tmp/cmp/in').map(f=>'tmp/cmp/in/'+f);
const t=performance.now();
execFileSync('C:/LibreOffice/program/soffice.com',['--headless','--norestore','-env:UserInstallation=file:///C:/htdocs-c/00-tax/tools/lo-profile','--convert-to','xlsx:Calc MS Excel 2007 XML','--outdir','tmp/cmp/out',...files],{stdio:'ignore',maxBuffer:1<<28});
const sec=(performance.now()-t)/1000;
let ok=0,ng=0;
cases.forEach((cs,i)=>{
  const s=XLSX.read(fs.readFileSync(`tmp/cmp/out/c${String(i).padStart(3,'0')}.xlsx`)).Sheets['入力'];
  const lo=cols.map(a=>s[a]?.v ?? '');
  const h=hfRes.map?hfRes[i].map(v=>v??''):[];
  const same=lo.every((v,j)=>String(v)===String(h[j]));
  if(same) ok++; else { ng++; if(ng<=8) console.log('差異 case',i,JSON.stringify(cs),'\n  LO',JSON.stringify(lo),'\n  HF',JSON.stringify(h)); }
});
console.log(`一致 ${ok} / 不一致 ${ng} （${N}件）  LibreOffice合計 ${sec.toFixed(1)}秒 (${(sec/N).toFixed(2)}秒/件)`);
