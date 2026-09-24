import fs from 'node:fs';
import http from 'node:http';
import readline from 'node:readline';

const csvPath = process.env.MEDICINE_CSV || 'C:/Users/Roshan/Downloads/indian_medicine_data.csv';
const parse = (line) => { const out=[]; let value='', quoted=false; for(let i=0;i<line.length;i++){ const c=line[i]; if(c==='"') quoted=!quoted; else if(c===','&&!quoted){out.push(value.trim());value='';} else value+=c; } out.push(value.trim()); return out; };
const items=[];
const input=fs.createReadStream(csvPath); const lines=readline.createInterface({input,crlfDelay:Infinity}); let header=true;
for await (const line of lines) { if(header){header=false;continue;} const [id,name,,,manufacturer,type,pack,composition1,composition2]=parse(line); if(id&&name)items.push({id,name,strength:[composition1,composition2].filter(Boolean).join(' + '),manufacturer,type,pack}); }
console.log(`Loaded ${items.length} medicine records.`);
http.createServer((req,res)=>{const u=new URL(req.url,'http://localhost'); if(u.pathname!=='/search')return res.writeHead(404).end(); const q=(u.searchParams.get('q')||'').toLowerCase().trim(); const found=q.length<2?[]:items.filter(x=>(x.name+' '+x.strength).toLowerCase().includes(q)).slice(0,10); res.writeHead(200,{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}).end(JSON.stringify(found));}).listen(3001,'0.0.0.0',()=>console.log('Medicine search API running on port 3001'));
