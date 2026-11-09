const E=require('../src/engine.js');
const D='URDL';
function strip(rows, ch, rep){return rows.map(r=>r.split(ch).join(rep));}
function necessary(L, feature){
  const r=L.rows;
  if(feature==='crate'){const L2=E.parseLevel(strip(r,'C','.'));const s=E.solve(L2,80000);return !s||s.moves>L.par;}
  if(feature==='phase'){for(const rep of ['.','#']){const L2=E.parseLevel(strip(strip(r,'b',rep),'o',rep));const s=E.solve(L2,80000);if(s&&s.moves<=L.par)return false;}return true;}
  if(feature==='spike'){const L2=E.parseLevel(strip(r,'x','#'));const s=E.solve(L2,80000);return !s||s.moves!==L.par||true;}
  return true;
}
function pick(stage, n, P, feats, seed0){
  const out=[];let seed=seed0;
  while(out.length<n && seed<seed0+50000){
    seed++;
    const L=E.generateP(seed,P,200);
    if(!L)continue;
    if(feats.every(f=>necessary(L,f))){L.seed=seed;out.push(L);}
  }
  return out;
}
const base={walls:0.2,phase:0,crates:0,spikes:0,shards:2};
const stages=[
 ['shards',3,{...base,w:6,h:7,shards:2,minMoves:3,maxMoves:4},[]],
 ['shards',3,{...base,w:6,h:7,shards:3,minMoves:5,maxMoves:7},[]],
 ['crate',4,{...base,w:6,h:7,shards:2,crates:1,minMoves:4,maxMoves:8},['crate']],
 ['spike',4,{...base,w:7,h:7,shards:3,crates:0,spikes:2,minMoves:5,maxMoves:9},[]],
 ['phase',4,{...base,w:7,h:8,shards:2,phase:0.12,minMoves:5,maxMoves:9},['phase']],
 ['mixed',4,{...base,w:7,h:8,shards:3,crates:1,spikes:2,phase:0.08,minMoves:8,maxMoves:12},['crate']],
 ['hard',4,{...base,w:8,h:9,shards:4,crates:2,spikes:2,phase:0.1,minMoves:12,maxMoves:18},['crate','phase']],
];
const all=[];
let s0=1000;
for(const [name,n,P,f] of stages){const ls=pick(name,n,P,f,s0);s0+=100000;ls.sort((a,b)=>a.par-b.par);for(const L of ls){all.push({stage:name,rows:L.rows,par:L.par,sol:L.solution.map(d=>D[d]).join('')});}}
for(const l of all){console.log(l.stage,l.par,l.sol);console.log(l.rows.join('\n'));console.log();}
require('fs').writeFileSync(__dirname+'/generated-levels.json',JSON.stringify(all));
