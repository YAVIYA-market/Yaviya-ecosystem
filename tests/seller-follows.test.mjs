import test from 'node:test';
import assert from 'node:assert/strict';
import { createDatabase } from '../backend/database.js';
import { migrate } from '../scripts/migrate.mjs';
import { handleSellerFollows } from '../backend/worker/seller-follows.js';
import { createApplication } from '../backend/application.js';
import { ensureSeeds } from '../backend/worker/commerce.js';
test('seller following is persistent, idempotent, private per buyer and isolated by country',async()=>{
 const db=await createDatabase({SQLITE_PATH:':memory:'});await migrate(db);
 try {
  await ensureSeeds({DB:db},{owner:'demo:catalogue',country:'CD'});
  for(const user of ['buyer:a','buyer:b','cg:buyer:a']) await db.prepare("INSERT INTO customers(user_id,name,phone,email,address,account_type,privacy_version,privacy_accepted_at) VALUES (?,'Test','+243999999999','','Test','buyer','2026-10-02',?)").bind(user,Date.now()).run();
  const call=(user,body,country='CD',origin='https://yaviya.test')=>handleSellerFollows(new Request('https://yaviya.test/api/seller-follows?country='+country,{method:body?'POST':'GET',headers:{...(user?{'yaviya-user-id':user}:{}),Origin:origin},...(body?{body:JSON.stringify(body)}:{})}),{DB:db});
  assert.equal((await call(null)).status,401);
  assert.equal((await call('buyer:a',{sellerId:1,follow:true},'CD','https://evil.test')).status,403);
  assert.equal((await call('buyer:a',{sellerId:9999,follow:true})).status,404);
  assert.equal((await call('buyer:a',{sellerId:1,follow:'yes'})).status,400);
  await call('buyer:a',{sellerId:1,follow:true,buyer_user_id:'buyer:b'});await call('buyer:a',{sellerId:1,follow:true});
  const a=await(await call('buyer:a')).json(), b=await(await call('buyer:b')).json();
  assert.equal(a.follows.length,1);assert.equal(a.counts[0].followerCount,1);assert.deepEqual(b.follows,[]);assert.equal(Object.hasOwn(b.counts[0],'buyer_user_id'),false);
  await call('buyer:b',{sellerId:1,follow:false});assert.equal((await(await call('buyer:a')).json()).follows.length,1);
  assert.deepEqual((await(await call('cg:buyer:a',null,'CG')).json()).counts,[]);
  await call('buyer:a',{sellerId:1,follow:false});assert.deepEqual((await(await call('buyer:a')).json()).follows,[]);
  const app=createApplication(db);assert.equal((await app(new Request('https://yaviya.test/api/seller-follows',{headers:{'yaviya-user-id':'buyer:a'}}))).status,401,'HTTP layer rejects forged user headers');
 }finally{await db.close()}
});
