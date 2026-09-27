import {test} from 'node:test';
import assert from 'node:assert/strict';
import {questions,allKeys} from './game.ts';
const memory=new Map<string,string>();
Object.defineProperty(globalThis,'localStorage',{value:{getItem:(k:string)=>memory.get(k)??null,setItem:(k:string,v:string)=>memory.set(k,v),removeItem:(k:string)=>memory.delete(k)},configurable:true});
Object.defineProperty(globalThis,'window',{value:{localStorage:globalThis.localStorage},configurable:true});
const {useGame}=await import('./store.ts');

test('첫 문제를 아무 입력 전에 저장하고 재수화해도 유지',async()=>{
 const firstId=useGame.getState().round.id;
 const saved=memory.get('chosung-lyrics-live-v1');
 assert.ok(saved);
 assert.equal(JSON.parse(saved!).state.round.id,firstId);
 await useGame.persist.rehydrate();
 assert.equal(useGame.getState().round.id,firstId);
});
test('제목 정답 후 가사 계속 풀기, 중복 집계 방지, 저장 복원, 포기',async()=>{
 useGame.getState().reset();const q=questions.find(q=>q.id===useGame.getState().round.id)!;
 assert.ok(useGame.getState().solve(q.title));assert.equal(useGame.getState().stats.streak,1);
 assert.equal(useGame.getState().solve(q.title),false);assert.equal(useGame.getState().stats.solved,1);
 for(const line of q.lines)for(const t of line)useGame.getState().guess(t.text);
 assert.equal(useGame.getState().round.revealed.length,allKeys(q).length);assert.equal(useGame.getState().stats.completed,1);assert.equal(useGame.getState().stats.direct,1);
 await useGame.persist.rehydrate();assert.equal(useGame.getState().round.id,q.id);assert.equal(useGame.getState().stats.completed,1);
 useGame.getState().next();assert.notEqual(useGame.getState().round.id,q.id);useGame.getState().giveUp();assert.equal(useGame.getState().stats.streak,0);assert.equal(useGame.getState().stats.skipped,1);
 useGame.getState().giveUp();assert.equal(useGame.getState().stats.skipped,1);
});

test('공개 전 실패한 한 글자를 부분 공개 후 다시 입력 가능',()=>{
 const q=questions.find(q=>q.lines.some(line=>line.some(t=>!t.pronunciation&&/^[가-힣]{3,}$/.test(t.text)&&!t.text.slice(0,-1).includes(t.text.at(-1)!)) ))!;
 const token=q.lines.flat().find(t=>!t.pronunciation&&/^[가-힣]{3,}$/.test(t.text)&&!t.text.slice(0,-1).includes(t.text.at(-1)!))!;
 useGame.getState().reset();useGame.setState({round:{...useGame.getState().round,id:q.id}});
 const suffix=token.text.at(-1)!;useGame.getState().guess(suffix);
 useGame.getState().guess(token.text.slice(0,-1));
 const before=useGame.getState().round.revealed.length;
 useGame.getState().guess(suffix);
 assert.ok(useGame.getState().round.revealed.length>before);
});
