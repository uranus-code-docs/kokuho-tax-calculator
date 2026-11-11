import { HyperFormula } from 'hyperformula';
import fs from 'node:fs';
const sheets = JSON.parse(fs.readFileSync('sheets.json','utf8'));
const hf = HyperFormula.buildFromSheets(sheets,{licenseKey:'gpl-v3'});
const S = hf.getSheetId('入力');
const serial=(y,m,d)=>(Date.UTC(y,m-1,d)-Date.UTC(1899,11,30))/86400000;
const addr=(c,r)=>({sheet:S,row:r-1,col:c});
const N=500; let rnd=12345; const R=()=>(rnd=(rnd*1103515245+12345)&0x7fffffff)/0x7fffffff;
const t=performance.now(); let bad=0;
for(let i=0;i<N;i++){
  hf.batch(()=>{
    hf.setCellContents(addr(2,19),[['全員申告済み']]);
    for(let p=0;p<3;p++){ const row=16+p;
      hf.setCellContents(addr(5,row),[[serial(1940+Math.floor(R()*75),1+Math.floor(R()*12),1+Math.floor(R()*28))]]); // F
      hf.setCellContents(addr(6,row),[[R()<.5?Math.floor(R()*10e6):null]]); // G 給与
      hf.setCellContents(addr(7,row),[[R()<.4?Math.floor(R()*4e6):null]]); // H 年金
      hf.setCellContents(addr(8,row),[[R()<.2?Math.floor(R()*1e6):0]]);   // I
    }
  });
  const v=hf.getCellValue(addr(7,31)); if(typeof v!=='number') bad++;
}
const ms=performance.now()-t;
console.log(`${N}件 ${ms.toFixed(0)}ms (${(ms/N).toFixed(1)}ms/件) 数値以外の結果:${bad}件 → 1万件≈${(ms/N*10000/1000).toFixed(0)}秒`);
