// Verify white text on each accent's button fill (action-600) meets WCAG AA (>=4.5).
import { readFileSync } from 'fs';
const src = readFileSync('src/config/accents.ts','utf8');
function lum(hex){const c=hex.replace('#','');const r=parseInt(c.slice(0,2),16)/255,g=parseInt(c.slice(2,4),16)/255,b=parseInt(c.slice(4,6),16)/255;const f=x=>x<=0.03928?x/12.92:((x+0.055)/1.055)**2.4;return 0.2126*f(r)+0.7152*f(g)+0.0722*f(b);}
function ratio(a,b){const L1=lum(a),L2=lum(b);const hi=Math.max(L1,L2),lo=Math.min(L1,L2);return (hi+0.05)/(lo+0.05);}
// crude parse: find each accent block label + its action-600 in vars and darkVars
const blocks = src.split(/\{\s*key:/).slice(1);
let fail=0;
for(const b of blocks){
  const label=(b.match(/label:\s*'([^']+)'/)||[])[1]; if(!label) continue;
  // first action-600 = light, second = dark
  const a600 = [...b.matchAll(/--color-action-600':\s*'(#[0-9A-Fa-f]{6})'/g)].map(m=>m[1]);
  const b600 = [...b.matchAll(/--color-brand-600':\s*'(#[0-9A-Fa-f]{6})'/g)].map(m=>m[1]);
  const checks=[
    ['light action fill', a600[0]],['dark action fill', a600[1]],
    ['light brand fill', b600[0]],['dark brand fill', b600[1]],
  ];
  for(const [name,hex] of checks){ if(!hex) continue; const r=ratio('#FFFFFF',hex); const ok=r>=4.5; if(!ok)fail++; console.log(`${ok?'✓':'✗'} ${label.padEnd(15)} ${name.padEnd(18)} ${hex} white→${r.toFixed(2)}:1`);}
}
console.log(fail? `\n${fail} FAIL`:'\nAll fills pass AA (white text >=4.5:1)');
process.exit(fail?1:0);
