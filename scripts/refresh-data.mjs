import {writeFile,readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
const root=new URL('../',import.meta.url);
const base='https://docs.google.com/spreadsheets/d/14CWX0pD6GDcjDhlPboF1MpZG5CAWpf_Pj_RpUA8xpqw/export?format=csv&gid=';
const paths=['data/lyrics.csv','data/dictionary.csv','src/catalog.ts'];
const original=await Promise.all(paths.map(p=>readFile(new URL(p,root))));
try {
  const results=await Promise.all([['lyrics','0'],['dictionary','230201622']].map(async([name,gid])=>{
    const response=await fetch(base+gid);if(!response.ok)throw Error(`시트 읽기 실패: ${response.status}`);
    const text=await response.text();if(/<!doctype html|<html/i.test(text))throw Error('시트 공개/다운로드 권한을 확인하세요.');return {name,text};
  }));
  for(const {name,text} of results)await writeFile(new URL(`data/${name}.csv`,root),text);
  execFileSync(process.execPath,['scripts/import-data.mjs'],{cwd:root,stdio:'inherit'});
  execFileSync(process.execPath,['--experimental-strip-types','-e',"import('./src/game.ts').then(m=>console.log('영어 사전 연결 확인:',m.questions.length,'문제'))"],{cwd:root,stdio:'inherit'});
}catch(error){for(let i=0;i<paths.length;i++)await writeFile(new URL(paths[i],root),original[i]);throw error;}
