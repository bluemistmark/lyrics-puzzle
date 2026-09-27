export const units = ['NCT U', 'NCT 127', 'NCT DREAM', 'WayV', 'NCT WISH'];
export type Token = { text: string; pronunciation?: string };
export type Song = {id:string;artist:string;unit:string;title:string;aliases:string[]};
export type Question = { id: string; songId:string; section:string; unit: string; title: string; lines: Token[][] };
export const songs:Song[]=units.flatMap((unit,i)=>['우리의 계절','푸른 밤','같은 하늘'].map((title,j)=>({id:`song-${i}-${j}`,artist:'NCT',unit,title,aliases:[]})));
const samples = units.flatMap((unit, i) => [
 { id: `${i}-a`, unit, title: '우리의 계절', lines: [[{text:'너의'},{text:'마음이'},{text:'내'},{text:'마음에'},{text:'닿아'}],[{text:'지금'},{text:'이'},{text:'순간'},{text:'함께'},{text:'걸어가'}],[{text:'우리의'},{text:'summer',pronunciation:'서머'},{text:'다시'},{text:'시작돼'}]] },
 { id: `${i}-b`, unit, title: '푸른 밤', lines: [[{text:'푸른'},{text:'밤을'},{text:'지나'},{text:'너에게'},{text:'가'}],[{text:'작은'},{text:'별빛이'},{text:'우리를'},{text:'비춰'}],[{text:'너와'},{text:'나의'},{text:'dream',pronunciation:'드림'},{text:'깨어나'}]] },
 { id: `${i}-c`, unit, title: '같은 하늘', lines: [[{text:'같은'},{text:'하늘'},{text:'아래'},{text:'너를'},{text:'불러'}],[{text:'멀리'},{text:'있어도'},{text:'마음은'},{text:'가까이'}],[{text:'우리'},{text:'다시'},{text:'hello',pronunciation:'헬로'},{text:'인사해'}]] }
]);
export const questions:Question[]=samples.map((q,i)=>({...q,songId:songs[i].id,section:'후렴'}));
questions.push(...songs.filter((_,i)=>i%3===0).map((song,i)=>({id:`${i}-a-verse`,songId:song.id,unit:song.unit,title:song.title,section:'1절',lines:[[{text:'바람이'},{text:'건네는'},{text:'작은'},{text:'인사'}],[{text:'너의'},{text:'미소가'},{text:'하루를'},{text:'물들여'}],[{text:'다시'},{text:'만난'},{text:'summer',pronunciation:'서머'},{text:'눈부셔'}]]})));
export const normalize = (s: string) => s.normalize('NFKC').toLowerCase().replace(/[\s\p{P}\p{S}]/gu, '');
export const initial = (c: string) => { const n = c.charCodeAt(0)-0xac00; return n >= 0 && n <= 11171 ? 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ'[Math.floor(n/588)] : c; };
export const tokenKey = (line: number, token: number) => `${line}:${token}`;
export function matches(q: Question, word: string): string[] {
 const term = normalize(word); if (!term) return [];
 const found: string[] = [];
 q.lines.forEach((line,l)=>line.forEach((t,w)=>{
  if(t.pronunciation) { if([t.text,t.pronunciation].some(v=>normalize(v)===term)) found.push(`${l}:${w}:en`); return; }
  const text=normalize(t.text); if(term.length===1 && text!==term) return;
  let pos=text.indexOf(term); while(pos!==-1) { for(let j=pos;j<pos+term.length;j++) found.push(`${l}:${w}:${j}`); pos=text.indexOf(term,pos+1); }
 })); return [...new Set(found)];
}
export function allKeys(q:Question) { return q.lines.flatMap((line,l)=>line.flatMap((t,w)=>t.pronunciation?[`${l}:${w}:en`]:[...t.text].map((_,c)=>`${l}:${w}:${c}`))); }
export function progress(q:Question, revealed:string[]) { const keys=allKeys(q); return {count:keys.filter(k=>revealed.includes(k)).length,total:keys.length}; }
export function pickQuestion(selected:string[], seen:string[], current?:string) { const pool=questions.filter(q=>selected.includes(q.unit)); const fresh=pool.filter(q=>!seen.includes(q.id)); const choices=fresh.length?fresh:pool.filter(q=>q.id!==current); const currentSong=questions.find(q=>q.id===current)?.songId;const different=choices.filter(q=>q.songId!==currentSong); const actual=different.length?different:choices.length?choices:pool; return actual[Math.floor(Math.random()*actual.length)]; }
