import { HyperFormula } from 'hyperformula';
import fs from 'node:fs';
const sheets = JSON.parse(fs.readFileSync('sheets.json','utf8'));
const hf = HyperFormula.buildFromSheets(sheets,{licenseKey:'gpl-v3'});
const S = hf.getSheetId('入力');
const serial=(y,m,d)=>(Date.UTC(y,m-1,d)-Date.UTC(1899,11,30))/86400000;
const A=a=>{const m=a.match(/^([A-Z]+)(\d+)$/);let c=0;for(const ch of m[1])c=c*26+ch.charCodeAt(0)-64;return{sheet:S,row:+m[2]-1,col:c-1};};
const set=(a,v)=>hf.setCellContents(A(a),[[v]]);
// 3607ページの計算例: 本人42歳(営業所得250万) / 妻38歳 / 子12歳 (令和8/1/1時点)
set('C19','全員申告済み');
set('F16',serial(1983,6,1)); set('I16',2500000);
set('F17',serial(1987,6,1)); set('I17',0);
set('F18',serial(2013,6,1)); set('I18',0);
const g=a=>hf.getCellValue(A(a));
console.log('Excel :',JSON.stringify({軽減:g('H26'),医療:g('H27'),後期:g('H28'),介護:g('H29'),子ども:g('H30'),合計:g('H31')}));
console.log('ページ:',JSON.stringify({医療:244300,後期:87700,介護:60100,子ども:9600,合計:401700}));
// Sheet1(旧高崎の平等割軽減表)
const s1=sheets['Sheet1']; const out=[];
s1.forEach((r,i)=>{const c=r.map((v,j)=>v===null?null:`${j}:${v}`).filter(Boolean); if(c.length) out.push((i+1)+' | '+c.join(' | '));});
fs.writeFileSync('sheet1.txt',out.join('\n')); console.log('Sheet1 データ行数',out.length);
