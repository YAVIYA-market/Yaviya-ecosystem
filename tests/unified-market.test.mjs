import test from 'node:test';
import assert from 'node:assert/strict';
import { createDatabase } from '../backend/database.js';
import { createApplication } from '../backend/application.js';
import { migrate } from '../scripts/migrate.mjs';
const origin='https://yaviya.test';
async function fixture(){
 const db=await createDatabase({SQLITE_PATH:':memory:'});await migrate(db);const app=createApplication(db);
 const client=async(name)=>{
  const response=await app(new Request(origin+'/api/auth/mobile/signup',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({login:name+'@example.test',password:'Yaviya-test-password-2026!'})}));
  const signup=await response.json();assert.equal(response.status,200);assert.ok(signup.sessionToken);
  const call=async(path,body)=>{const r=await app(new Request(origin+path,{method:body?'POST':'GET',headers:{Origin:origin,Authorization:'Bearer yv.'+signup.sessionToken,...(!(body instanceof FormData)?{'Content-Type':'application/json'}:{})},body:body?(body instanceof FormData?body:JSON.stringify(body)):undefined}));return {...await r.json(),status:r.status}};
  assert.equal((await call('/api/customer',{name,phone:'+243999999999',email:'',address:'Gombe',accountType:'buyer',privacyConsent:true,privacyVersion:'2026-10-02'})).status,200);
  return {id:signup.user.id,call,hub:body=>call('/api/account-hub',body)};
 };
 const admin=await client('admin'),seller=await client('seller'),buyer=await client('buyer'),courier=await client('courier'),outsider=await client('outsider');
 await db.prepare('INSERT INTO admin_access(id,user_id) VALUES (?,?)').bind('owner',admin.id).run();
 async function verify(c,kind){const f=new FormData();for(const[k,v]of Object.entries({kind,companyName:'Boutique '+kind,unregistered:'true',documentType:'identity',issuingCountry:'CD',identityConfirmed:'true',sellerPlan:'free',courierPlan:'standard',courierBenefitsAccepted:'true',courierPayoutMethod:'cash',courierPayoutAccount:''}))f.set(k,v);f.set('document',new File([Uint8Array.from([137,80,78,71,13,10,26,10,0])],'identity.png',{type:'image/png'}));assert.equal((await c.call('/api/verification',f)).status,200);assert.equal((await admin.call('/api/verification/reviews',{userId:c.id,decision:'approve',identityChecked:true,companyChecked:true})).status,200)}
 return {db,client,admin,seller,buyer,courier,outsider,verify};
}
async function handOrder(f,product,buyer=f.buyer){
 const created=await buyer.call('/api/marketplace/orders',{requestKey:crypto.randomUUID(),items:[{id:product.id,q:1,price:1}],city:'Kinshasa',commune:'Gombe',address:'Gombe',recipient:{name:'Client',phone:'+243999999999'},delivery:{mode:'hand'},paymentId:'cod',commission:0,total:1});assert.equal(created.status,201);let o=created.order;
 const mutate=async(c,action,extra={})=>{const r=await c.call('/api/marketplace/orders/action',{orderId:o.id,revision:o.revision,action,sellerId:product.seller,...extra});assert.equal(r.status,200,JSON.stringify(r));o=r.order};
 await mutate(f.seller,'seller_accept');await mutate(f.seller,'seller_prepare');await mutate(f.seller,'seller_handover',{cashCollected:true});await mutate(buyer,'buyer_receipt',{cashPaid:true});return o;
}
test('one identity preserves buyer, professional seller, courier and particular roles; private listings have a server-side 12% commission',async()=>{
 const f=await fixture();try{
  await f.verify(f.seller,'seller');await f.verify(f.seller,'courier');
  const roles=await f.seller.call('/api/marketplace');assert.equal(roles.roles.seller,true);assert.equal(roles.roles.courier,true);assert.equal(roles.roles.buyer,true);
  assert.equal((await f.outsider.call('/api/marketplace?view=seller')).status,403);
  assert.equal((await f.seller.hub({action:'enable_particular',acceptCommission:false})).status,400);
  const enabled=await f.seller.hub({action:'enable_particular',acceptCommission:true});assert.equal(enabled.status,200);
  assert.equal((await f.seller.hub({action:'enable_particular',acceptCommission:true})).sellerId,enabled.sellerId);
  const draft={title:'Guitare personnelle',category:'musique & divertissement',price:10000,condition:'used',stock:1,desc:'Mon article',visible:true,approved:false,images:['guitar.jpg'],img:'guitar.jpg'};
  // Use the real configured category and a supported filename.
  const config=(await import('../backend/data/market-config.json',{with:{type:'json'}})).default;draft.category=config.categorySections.find(s=>/musique/i.test(s[0]))[0];
  const saved=await f.seller.hub({action:'save_listing',product:draft});assert.equal(saved.status,200,JSON.stringify(saved));
  const listings=await f.seller.call('/api/account-hub?resource=listings');let p=listings.listings[0];assert.equal(p.sellerKind,'particular');assert.equal(p.approved,false);
  assert.equal((await f.outsider.hub({action:'save_listing',product:{...p,approved:true}})).status,403);
  assert.equal((await f.admin.call('/api/marketplace/catalogue',{...p,approved:true})).status,200);
  p={...p,approved:true};const o=await handOrder(f,p);assert.equal(o.total,10000);assert.equal(o.sellerTerms[0].commission,1200);assert.equal(o.sellerTerms[0].net,8800);
  const finance=await f.seller.call('/api/account-hub?resource=finance');assert.equal(finance.settlements.length,1);assert.equal(finance.entries.length,1);assert.equal(finance.settlements[0].payable,false);
  assert.deepEqual((await f.outsider.call('/api/account-hub?resource=finance')).entries,[]);
  assert.equal((await f.admin.hub({action:'seller_payout',id:finance.settlements[0].id,reference:'cash-receipt',channel:'cash',externalOperationConfirmed:true})).status,409);
  assert.equal((await f.buyer.hub({action:'return_request',orderId:o.id,reason:'Article endommagé'})).status,200);
  let r=(await f.admin.call('/api/account-hub?resource=returns')).returns[0];
  for(const status of ['approved','received']){assert.equal((await f.admin.hub({action:'return_decision',id:r.id,revision:r.revision,status,note:'Contrôle effectué'})).status,200);r=(await f.admin.call('/api/account-hub?resource=returns')).returns[0]}
  assert.equal((await f.admin.hub({action:'return_decision',id:r.id,revision:r.revision,status:'refunded_manual',note:'Règlement externe',reference:'refund-123',channel:'cash'})).status,400);
  const body={action:'return_decision',id:r.id,revision:r.revision,status:'refunded_manual',note:'Règlement externe',reference:'refund-123',channel:'cash',externalOperationConfirmed:true};
  assert.equal((await f.admin.hub(body)).status,200);assert.equal((await f.admin.hub(body)).status,409);
  const after=await f.seller.call('/api/account-hub?resource=finance');assert.equal(after.settlements[0].status,'refunded');assert.equal(after.entries.length,2);
  assert.equal((await f.seller.call('/api/marketplace?view=particular')).orders.length,1);
  assert.equal((await f.seller.call('/api/marketplace?view=seller')).orders.length,0);
 }finally{await f.db.close()}
});
test('support, saved addresses, subscriptions and administrative permissions remain private; electronic operations fail closed',async()=>{
 const f=await fixture();try{
  const a=await f.buyer.hub({action:'address_save',label:'Maison',city:'Kinshasa',commune:'Gombe',address:'Avenue test',phone:'+243999999999'});assert.equal(a.status,200);
  assert.equal((await f.outsider.hub({action:'address_save',id:a.id,label:'Intrusion',city:'Kinshasa',commune:'Gombe',address:'Test',phone:'123'})).status,403);
  assert.equal((await f.outsider.call('/api/account-hub?resource=addresses')).addresses.length,0);
  const t=await f.buyer.hub({action:'support_create',topic:'Livraison',message:'Où est mon colis ?'});assert.equal(t.status,200);
  assert.equal((await f.outsider.hub({action:'support_reply',id:t.id,revision:1,message:'Intrusion'})).status,403);
  assert.equal((await f.admin.hub({action:'support_reply',id:t.id,revision:1,message:'Nous examinons votre demande',status:'resolved'})).status,200);
  const own=await f.buyer.call('/api/account-hub?resource=support');assert.equal(own.tickets[0].status,'resolved');assert.equal(own.tickets[0].messages.length,2);
  const sub=await f.buyer.hub({action:'subscription_request',kind:'delivery',plan:'monthly'});assert.equal(sub.debited,false);assert.equal(sub.active,false);
  assert.equal((await f.buyer.hub({action:'electronic_payment',amount:1000})).status,503);
  assert.equal((await f.buyer.call('/api/account-hub?resource=admin')).status,403);
  await f.verify(f.seller,'seller');
  assert.equal((await f.seller.hub({action:'shop_save',name:'Seconde boutique',address:'Adresse confirmée',addressConfirmed:true})).status,200);
  const shops=await f.seller.call('/api/account-hub?resource=shops');assert.equal(shops.shops.length,2);
  assert.equal((await f.outsider.hub({action:'shop_save',id:shops.shops[0].id,name:'Intrusion',address:'Test',addressConfirmed:true})).status,403);
  assert.equal((await f.admin.hub({action:'content_save',kind:'advertisement',data:{title:'Campagne recette',image:'javascript:alert(1)',enabled:true}})).status,400);
  const ad=await f.admin.hub({action:'content_save',kind:'advertisement',data:{title:'Campagne recette',image:'https://cdn.example.test/banner.png',enabled:true}});assert.equal(ad.status,200);
  const publicCatalogue=await f.buyer.call('/api/catalogue');assert.equal(publicCatalogue.campaigns[0].title,'Campagne recette');
  assert.equal((await f.outsider.hub({action:'content_save',kind:'advertisement',data:{title:'Intrusion',image:'https://cdn.example.test/banner.png',enabled:true}})).status,403);
  assert.equal((await f.admin.hub({action:'revoke_role',userId:f.seller.id,role:'seller',note:'Test révocation'})).status,200);
  assert.equal((await f.seller.call('/api/marketplace?view=seller')).status,403);
  assert.equal((await f.seller.call('/api/seller-messages')).status,403);
  assert.equal((await f.admin.hub({action:'suspend_account',userId:f.buyer.id,suspended:true,note:'Test suspension'})).status,200);
  assert.equal((await f.buyer.call('/api/account-hub?resource=addresses')).status,403);
  assert.equal((await f.admin.hub({action:'suspend_account',userId:f.admin.id,suspended:true,note:'Owner'})).status,403);
 }finally{await f.db.close()}
});
test('courier cash custody must be reconciled before seller payout, frozen terms survive policy changes, duplicate payouts create no extra entry',async()=>{
 const f=await fixture();try {
  await f.verify(f.seller,'seller');await f.verify(f.courier,'courier');
  assert.equal((await f.admin.hub({action:'professional_commission',basisPoints:1200})).status,200);
  const state=await f.seller.call('/api/marketplace?view=seller'),seller=state.sellerIds[0];
  const cfg=(await import('../backend/data/market-config.json',{with:{type:'json'}})).default;
  const p={id:1900000100,seller,title:'Produit professionnel',category:cfg.categorySections[0][0],price:10000,stock:2,desc:'Recette',visible:true,approved:false,images:['headphones.png'],img:'headphones.png'};
  assert.equal((await f.seller.call('/api/marketplace/catalogue',p)).status,200);
  let product=(await f.admin.call('/api/marketplace?view=admin')).catalogue.find(x=>x.id===p.id);
  assert.equal((await f.admin.call('/api/marketplace/catalogue',{...product,approved:true})).status,200);
  let o=(await f.buyer.call('/api/marketplace/orders',{requestKey:crypto.randomUUID(),items:[{id:p.id,q:1}],city:'Kinshasa',commune:'Gombe',address:'Gombe',recipient:{name:'Client',phone:'123'},delivery:{mode:'home'},paymentId:'cod'})).order;
  const mutate=async(c,action,extra={})=>{const r=await c.call('/api/marketplace/orders/action',{orderId:o.id,revision:o.revision,action,sellerId:seller,...extra});assert.equal(r.status,200,JSON.stringify(r));o=r.order};
  await mutate(f.seller,'seller_accept');await mutate(f.seller,'seller_prepare');
  await f.courier.call('/api/marketplace/courier',{available:true,payoutMethod:'cash',payoutAccount:'',benefitsAccepted:true});
  await mutate(f.courier,'courier_claim');await mutate(f.courier,'courier_collect');
  const proof=new FormData();proof.set('orderId',o.id);proof.set('revision',String(o.revision));proof.set('cashCollected','true');proof.set('delivered','true');proof.set('photo',new File([Uint8Array.from([137,80,78,71,13,10,26,10,0])],'proof.png',{type:'image/png'}));
  const delivered=await f.courier.call('/api/marketplace/proof',proof);assert.equal(delivered.status,200);o=delivered.order;
  await mutate(f.buyer,'buyer_receipt',{cashPaid:true});
  assert.equal((await f.admin.hub({action:'professional_commission',basisPoints:2000})).status,200);
  let finance=await f.seller.call('/api/account-hub?resource=finance');assert.equal(finance.settlements[0].commission,1200);
  await f.db.prepare('UPDATE seller_settlements SET available_at=0 WHERE order_id=?').bind(o.id).run();
  const payout={action:'seller_payout',id:finance.settlements[0].id,reference:'seller-pay-123',channel:'cash',externalOperationConfirmed:true};
  assert.equal((await f.admin.hub(payout)).status,409);
  assert.equal((await f.admin.hub({action:'cash_remittance',orderId:o.id,amount:1,reference:'cash-123',channel:'cash',externalOperationConfirmed:true})).status,400);
  assert.equal((await f.admin.hub({action:'cash_remittance',orderId:o.id,amount:o.total,reference:'cash-123',channel:'cash',externalOperationConfirmed:true})).status,200);
  assert.equal((await f.admin.hub(payout)).status,200);assert.equal((await f.admin.hub(payout)).status,409);
  finance=await f.seller.call('/api/account-hub?resource=finance');assert.equal(finance.settlements[0].status,'paid_manual');assert.equal(finance.entries.filter(e=>e.kind==='payout_manual').length,1);
  await mutate(f.admin,'courier_payout',{reference:'courier-pay-123',channel:'cash'});
  assert.equal((await f.courier.call('/api/account-hub?resource=finance')).entries.filter(e=>e.kind==='payout_manual').length,1);
 }finally{await f.db.close()}
});
