import {test} from 'node:test';
import assert from 'node:assert/strict';
import {matches,questions,initial,pickQuestion,progress,allKeys,normalize} from './game.ts';
const q=questions[0];
test('한글 초성과 비한글 보존',()=>{assert.equal(initial('꿈'),'ㄲ');assert.equal(initial('!'),'!');});
test('조사와 반복된 단어의 부분 일치',()=>{assert.equal(matches(q,'마음').length,4);assert.equal(matches(q,'이').length,1);assert.equal(matches(q,'너').length,0);});
test('영어 원문과 발음 일치',()=>{assert.deepEqual(matches(q,'SUMMER'),matches(q,'서머'));assert.equal(matches(q,'서머').length,1);});
test('진행률과 제목 정규화',()=>{assert.equal(progress(q,allKeys(q)).count,progress(q,allKeys(q)).total);assert.equal(normalize('우리의 계절!'),'우리의계절');});
test('여러 구간은 하나의 곡에 연결되고 연속 출제 방지',()=>{assert.equal(questions.find(v=>v.id==='0-a-verse')?.songId,q.songId);for(let i=0;i<50;i++){const next=pickQuestion(['NCT U'],[q.id],q.id);assert.notEqual(next.songId,q.songId);assert.equal(next.unit,'NCT U');}});
