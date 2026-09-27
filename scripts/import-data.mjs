import {readFile,writeFile} from 'node:fs/promises';
export function parseCSV(text){const rows=[];let row=[],v='',quoted=false;for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){v+='"';i++;}else quoted=!quoted;}else if(c===','&&!quoted){row.push(v);v='';}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(v);rows.push(row);row=[];v='';}else v+=c;}if(quoted)throw Error('CSV 따옴표 오류');if(v||row.length){row.push(v);rows.push(row);}return rows;}
const root=new URL('../',import.meta.url);
const records=async name=>{const rows=parseCSV((await readFile(new URL(`data/${name}.csv`,root),'utf8')).replace(/^\uFEFF/,''));const h=rows.shift().map(v=>v.trim());return rows.map((r,i)=>({...Object.fromEntries(h.map((v,j)=>[v,(r[j]||'').trim()])),_row:i+2}));};
const lyrics=await records('lyrics'),dictionary=await records('dictionary');
const errors=[],songMap=new Map(),nameMap=new Map(),ids=new Set(),dict=new Map(),questions=[];
for(const r of dictionary.filter(r=>r['영어'])){const english=r['영어'].trim();const key=english.toLowerCase().replace(/[’‘]/g,"'");if(!r['표시발음'])errors.push(`표시발음 누락: ${key}`);const entry={english,pronunciation:r['표시발음'],alternatives:(r['추가 허용 발음']||r['추가허용발음']||'').split('|').map(v=>v.trim()).filter(Boolean)};const previous=dict.get(key);if(previous){if(previous.pronunciation!==entry.pronunciation)errors.push(`영어 사전 ${r._row}행 발음 충돌: ${key}`);else previous.alternatives=[...new Set([...previous.alternatives,...entry.alternatives])];}else dict.set(key,entry);}
for(const r of lyrics){if(!r['곡명'])continue;if(!['Y','N'].includes(r['사용여부']))errors.push(`가사 ${r._row}행 사용여부 오류`);for(const f of ['문제ID','곡ID','가수명','곡명','가사1','가사2'])if(!r[f])errors.push(`${r._row}행 ${f} 누락`);if(ids.has(r['문제ID']))errors.push(`문제ID 중복: ${r['문제ID']}`);ids.add(r['문제ID']);const song={id:r['곡ID'],artist:r['가수명'],unit:r['가수명'],title:r['곡명'],aliases:(r['정답별칭']||'').split('|').filter(Boolean)};const name=`${song.artist}/${song.title}`;if(songMap.has(song.id)&&`${songMap.get(song.id).artist}/${songMap.get(song.id).title}`!==name)errors.push(`곡ID 충돌: ${song.id}`);if(nameMap.has(name)&&nameMap.get(name)!==song.id)errors.push(`같은 곡의 ID 불일치: ${name}`);songMap.set(song.id,song);nameMap.set(name,song.id);if(r['사용여부']==='Y')questions.push({id:r['문제ID'],songId:song.id,lines:[r['가사1'],r['가사2'],r['가사3']].filter(Boolean)});}
const englishKey=s=>s.normalize('NFKC').toLowerCase().replace(/[’‘]/g,"'");
const latin=c=>!!c&&/[\p{Script=Latin}\d'’‘]/u.test(c);
const entries=[...dict.values()].sort((a,b)=>b.english.length-a.english.length);
const missing=new Map();
for(const q of questions)for(const line of q.lines){
  let i=0;
  while(i<line.length){
    const entry=entries.find(d=>englishKey(line.slice(i,i+d.english.length))===englishKey(d.english)&&!latin(line[i-1]||'')&&!latin(line[i+d.english.length]||''));
    if(entry){i+=entry.english.length;continue;}
    if(/[\p{Script=Latin}]/u.test(line[i])){
      const word=line.slice(i).match(/^[\p{Script=Latin}\d'’‘-]+/u)?.[0]||line[i];
      if(!missing.has(englishKey(word)))missing.set(englishKey(word),{word,ids:new Set()});
      missing.get(englishKey(word)).ids.add(q.id);
      i+=word.length;continue;
    }
    i++;
  }
}
for(const {word,ids} of missing.values())errors.push(`영어 발음 누락: ${word} (${[...ids].join(', ')})`);
if(!questions.length)errors.push('출제 가능한 문제 없음');if(errors.length)throw Error(errors.join('\n'));
const active=new Set(questions.map(q=>q.songId));const catalog={source:'https://docs.google.com/spreadsheets/d/14CWX0pD6GDcjDhlPboF1MpZG5CAWpf_Pj_RpUA8xpqw/edit',songs:[...songMap.values()].filter(s=>active.has(s.id)),questions,dictionary:[...dict.values()]};
await writeFile(new URL('src/catalog.ts',root),`// Generated from source CSVs by scripts/import-data.mjs.\nexport const catalog = ${JSON.stringify(catalog,null,2)};\n`);console.log(JSON.stringify({songs:catalog.songs.length,questions:questions.length,dictionary:dict.size}));
