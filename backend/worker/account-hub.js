import { handleDeliveryReviews } from './delivery-reviews.js';
import { marketContext, getMarketOrder, saveProduct } from './commerce.js';
import { financeState, ledgerStatement, RETURN_WINDOW_MS } from './finance.js';
import { preserveLegacyRoles } from './account-roles.js';
import { deliveryCommunes, deliveryCommunesCG } from './catalogue-seeds.js';
import config from '../data/market-config.json' with { type: 'json' };
const reply = (data,status=200) => Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
const fail = (message,status=400) => {throw Object.assign(new Error(message),{status});};
const text = (v,max=2000) => typeof v === 'string' && v.trim() && v.length <= max;
const required = (ok,message,status=400) => {if (!ok) fail(message,status);};
const admin = ctx => required(ctx.isAdmin,'Administration uniquement',403);
function audit(env,ctx,action,target,detail={}) {
 return env.DB.prepare('INSERT INTO audit_events(id,actor_user_id,country,action,target,detail,created_at) VALUES (?,?,?,?,?,?,?)').bind(crypto.randomUUID(),ctx.user,ctx.country,action,String(target || ''),JSON.stringify(detail),Date.now());
}
async function returns(env,ctx) {
 const rows=(await env.DB.prepare('SELECT r.* FROM return_requests r WHERE r.country=?'+(ctx.isAdmin?'':' AND (r.buyer_user_id=? OR EXISTS (SELECT 1 FROM market_participants p WHERE p.order_id=r.order_id AND p.user_id=? AND p.role=\'seller\'))')+' ORDER BY r.created_at DESC LIMIT 200').bind(ctx.country,...(ctx.isAdmin?[]:[ctx.user,ctx.user])).all()).results;
 return rows;
}
async function tickets(env,ctx) {
 const rows=(await env.DB.prepare('SELECT * FROM support_tickets WHERE country=?'+(ctx.isAdmin?'':' AND user_id=?')+' ORDER BY updated_at DESC LIMIT 100').bind(ctx.country,...(ctx.isAdmin?[]:[ctx.user])).all()).results;
 for(const r of rows) r.messages=(await env.DB.prepare('SELECT id,sender_role,message,created_at FROM support_messages WHERE ticket_id=? ORDER BY created_at LIMIT 200').bind(r.id).all()).results;
 return rows;
}
export async function handleAccountHub(request,env) {
 const url=new URL(request.url),user=request.headers.get('yaviya-user-id');
 if(!user) return reply({error:'Connexion requise'},401);
 if(!['GET','POST'].includes(request.method)) return reply({error:'Méthode non autorisée'},405);
 if(request.method==='POST' && request.headers.get('origin')!==url.origin) return reply({error:'Origine refusée'},403);
 try {
  const ctx=await marketContext(env,user);
  if(request.method==='GET') {
   const resource=url.searchParams.get('resource') || 'overview';
   if(resource==='reviews') {
    const view=url.searchParams.get('view') || 'buyer';
    const reviewsRequest=new Request(url.origin+'/api/delivery-reviews?country='+ctx.country+'&view='+encodeURIComponent(view),{headers:request.headers});
    const response=await handleDeliveryReviews(reviewsRequest,env);
    const data=await response.json();return response.ok?reply({reviews:data}):reply(data,response.status);
   }
   if(resource==='finance') return reply(await financeState(env,ctx));
   if(resource==='returns') return reply({returns:await returns(env,ctx)});
   if(resource==='support') return reply({tickets:await tickets(env,ctx)});
   if(resource==='shops') return reply({shops:(await env.DB.prepare('SELECT id,name,address,country FROM owned_stores WHERE country=?'+(ctx.isAdmin?'':' AND user_id=?')).bind(ctx.country,...(ctx.isAdmin?[]:[user])).all()).results});
   if(resource==='addresses') return reply({addresses:(await env.DB.prepare('SELECT * FROM account_addresses WHERE user_id=? ORDER BY updated_at DESC LIMIT 30').bind(user).all()).results});
   if(resource==='listings') return reply({sellerId:ctx.personalSellerId,commissionPercent:12,listings:(await env.DB.prepare('SELECT data,stock,revision FROM market_products WHERE country=? AND owner_user_id=? AND seller_id=? ORDER BY updated_at DESC').bind(ctx.country,user,ctx.personalSellerId || 0).all()).results.map(r=>({...JSON.parse(r.data),stock:r.stock,revision:r.revision}))});
   if(resource==='subscriptions') return reply({electronicEnabled:false,requests:(await env.DB.prepare('SELECT * FROM subscription_requests WHERE country=?'+(ctx.isAdmin?'':' AND user_id=?')+' ORDER BY created_at DESC LIMIT 100').bind(ctx.country,...(ctx.isAdmin?[]:[user])).all()).results});
   if(resource==='admin' || resource==='content') {
    admin(ctx);
    const users=(await env.DB.prepare("SELECT c.user_id,c.name,c.account_type,COALESCE(a.suspended,0) AS suspended FROM customers c LEFT JOIN account_controls a ON a.user_id=c.user_id WHERE "+(ctx.country==='CG'?"c.user_id LIKE 'cg:%'":"c.user_id NOT LIKE 'cg:%'")+" LIMIT 200").all()).results;
    for(const u of users) u.roles=(await env.DB.prepare('SELECT role,status FROM account_roles WHERE user_id=?').bind(u.user_id).all()).results;
    return reply({users,audit:(await env.DB.prepare('SELECT * FROM audit_events WHERE country=? ORDER BY created_at DESC LIMIT 200').bind(ctx.country).all()).results,content:(await env.DB.prepare('SELECT * FROM admin_content WHERE country=? ORDER BY updated_at DESC').bind(ctx.country).all()).results,professionalCommissionBps:(await env.DB.prepare('SELECT value FROM commerce_settings WHERE key=?').bind('professionalCommissionBps').first())?.value ?? null,categories:config.categorySections.map(s=>s[0])});
   }
   return reply({roles:{buyer:true,particular:!!ctx.personalSellerId,seller:ctx.professionalSeller,courier:ctx.courier,admin:ctx.isAdmin},payments:{electronicEnabled:false,escrowEnabled:false},loyalty:{demo:true,name:'YaviCoins / coupons'},returnWindowHours:72});
  }
  const d=await request.json();
  if(d.action==='enable_particular') {
   required(ctx.profile,'Complétez votre profil',409); required(d.acceptCommission===true,'Confirmez la commission YAVIYA de 12 %');
   const sellerId=1000000000+Math.floor(Math.random()*900000000);
   await env.DB.batch([env.DB.prepare('INSERT INTO personal_sellers(user_id,seller_id,country,consent_at) VALUES (?,?,?,?) ON CONFLICT(user_id) DO NOTHING').bind(user,sellerId,ctx.country,Date.now()),audit(env,ctx,d.action,user,{commissionBps:1200})]);
   return reply({ok:true,sellerId:(await env.DB.prepare('SELECT seller_id FROM personal_sellers WHERE user_id=?').bind(user).first()).seller_id});
  }
  if(d.action==='save_listing') {
   required(ctx.personalSellerId,'Activez la revente occasionnelle',403);
   required(d.product && typeof d.product==='object','Annonce invalide');
   const p={...d.product,seller:ctx.personalSellerId,stock:d.product.visible===false?0:1,approved:false};
   if(!p.id) p.id=1000000000+Math.floor(Math.random()*900000000);
   await saveProduct(env,ctx,p); return reply({ok:true,id:p.id});
  }
  if(d.action==='shop_save') {
   required(ctx.professionalSeller || ctx.isAdmin,'Vendeur professionnel validé requis',403);
   required(text(d.name,150)&&text(d.address,250)&&d.addressConfirmed===true,'Confirmez le nom et l’adresse de la boutique');
   if(d.id) {
    const shop=await env.DB.prepare('SELECT user_id,country FROM owned_stores WHERE id=?').bind(d.id).first();
    required(shop && shop.country===ctx.country && (shop.user_id===user || ctx.isAdmin),'Boutique privée',403);
    await env.DB.batch([env.DB.prepare('UPDATE owned_stores SET name=?,address=? WHERE id=?').bind(d.name.trim(),d.address.trim(),d.id),audit(env,ctx,d.action,d.id)]);
   } else {
    required(ctx.professionalSeller,'Créez une boutique depuis un compte vendeur approuvé',403);
    const count=await env.DB.prepare('SELECT COUNT(*) AS n FROM owned_stores WHERE user_id=?').bind(user).first();required(count.n<5,'Maximum pilote de cinq boutiques',409);
    await env.DB.batch([env.DB.prepare('INSERT INTO owned_stores(user_id,name,country,address) VALUES (?,?,?,?)').bind(user,d.name.trim(),ctx.country,d.address.trim()),audit(env,ctx,d.action,user)]);
   }
   return reply({ok:true});
  }
  if(d.action==='address_save' || d.action==='address_delete') {
   if(d.action==='address_delete') {required(text(d.id,100),'Identifiant requis');await env.DB.prepare('DELETE FROM account_addresses WHERE id=? AND user_id=?').bind(d.id,user).run();return reply({ok:true});}
   required(text(d.label,60)&&text(d.address,250)&&text(d.phone,30),'Complétez l’adresse');
   required((ctx.country==='CG'?deliveryCommunesCG:deliveryCommunes)[d.city]?.includes(d.commune),'Ville ou commune invalide');
   const id=d.id || crypto.randomUUID(),prior=await env.DB.prepare('SELECT user_id FROM account_addresses WHERE id=?').bind(id).first();
   required(!prior || prior.user_id===user,'Adresse privée',403);
   const count=await env.DB.prepare('SELECT COUNT(*) AS n FROM account_addresses WHERE user_id=?').bind(user).first();required(prior || count.n<30,'Maximum 30 adresses',409);
   await env.DB.prepare('INSERT INTO account_addresses(id,user_id,label,city,commune,address,phone,updated_at) VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET label=excluded.label,city=excluded.city,commune=excluded.commune,address=excluded.address,phone=excluded.phone,updated_at=excluded.updated_at WHERE account_addresses.user_id=excluded.user_id').bind(id,user,d.label.trim(),d.city,d.commune,d.address.trim(),d.phone.trim(),Date.now()).run();return reply({ok:true,id});
  }
  if(d.action==='return_request') {
   const o=await getMarketOrder(env,d.orderId,ctx.country);
   required(o && o.buyerUserId===user,'Commande de votre compte requise',403);
   required(o.buyerConfirmed&&!o.cancelled&&Number.isSafeInteger(o.receivedAt)&&Date.now()-o.receivedAt<=RETURN_WINDOW_MS,'Demande disponible pendant les 72 h suivant la réception. Pour une ancienne commande, contactez le support.',409);
   required(text(d.reason,2000),'Expliquez le motif');
   const id='RET-'+o.id;
   const result=await env.DB.batch([env.DB.prepare("INSERT INTO return_requests(id,order_id,buyer_user_id,country,reason,status,revision,note,created_at,updated_at) SELECT ?,?,?,?,?,'requested',1,'',?,? WHERE NOT EXISTS (SELECT 1 FROM seller_settlements WHERE order_id=? AND status='paid_manual') ON CONFLICT(order_id) DO NOTHING").bind(id,o.id,user,ctx.country,d.reason.trim(),Date.now(),Date.now(),o.id),audit(env,ctx,d.action,id)]);
   required(result[0].meta.changes,'Une demande existe déjà ou un règlement a été enregistré.',409);return reply({ok:true,id});
  }
  if(d.action==='return_decision') {
   admin(ctx); const r=await env.DB.prepare('SELECT * FROM return_requests WHERE id=? AND country=?').bind(d.id,ctx.country).first();
   required(r,'Retour introuvable',404);required(r.revision===d.revision,'Dossier modifié : actualisez',409);
   const transitions={requested:['approved','rejected'],approved:['received'],received:['refunded_manual']};
   required(transitions[r.status]?.includes(d.status),'Transition de retour invalide',409);required(text(d.note,2000),'Motif de la décision requis');
   const token=crypto.randomUUID();
   const statements=[env.DB.prepare('UPDATE return_requests SET operation_token=?,status=?,note=?,reference=?,channel=?,revision=revision+1,updated_at=? WHERE id=? AND revision=?').bind(token,d.status,d.note.trim(),d.reference || null,d.channel || null,Date.now(),r.id,r.revision)];
   if(d.status==='refunded_manual') {
    required(d.externalOperationConfirmed===true&&text(d.reference,150)&&['cash','bank','mobile_money'].includes(d.channel),'Confirmez le remboursement déjà effectué et sa référence');
    const settlements=(await env.DB.prepare('SELECT * FROM seller_settlements WHERE order_id=?').bind(r.order_id).all()).results;
    required(settlements.length && settlements.every(s=>['held','seller_collected'].includes(s.status)),'Paiement non confirmé ou reversement déjà déclaré : traitement financier séparé requis',409);
    const remitted=await env.DB.prepare('SELECT order_id FROM cash_remittances WHERE order_id=?').bind(r.order_id).first();
    for(const s of settlements) {
     statements.push(env.DB.prepare("UPDATE seller_settlements SET status='refunded',updated_at=? WHERE id=? AND status IN ('held','seller_collected') AND EXISTS (SELECT 1 FROM return_requests WHERE id=? AND operation_token=?)").bind(Date.now(),s.id,r.id,token));
     for(const [suffix,amount,debit] of [['net',s.net,'seller_payable'],['commission',s.commission,'commission_accrued']]) {if(s.custodian_kind==='seller' && suffix==='net') continue;const entry=ledgerStatement(env,ctx,{id:s.id+':refund:'+suffix,orderId:s.order_id,sellerId:s.seller_id,userId:s.user_id,amount,debit,credit:s.custodian_kind==='seller'?'commission_receivable_from_seller':remitted?'external_refund_declared':'cod_custodian_receivable',kind:'refund_manual',reference:d.reference,guard:{returnId:r.id,token}});if(entry) statements.push(entry);}
    }
   }
   statements.push(audit(env,ctx,d.action,r.id,{status:d.status,reference:d.reference || null}));
   // Serialize with row revision; rollback every ledger entry on a stale request.
   const result=await env.DB.batch(statements);required(result[0].meta.changes,'Dossier modifié : actualisez',409);return reply({ok:true});
  }
  if(d.action==='commission_receipt') {
   admin(ctx);required(d.externalOperationConfirmed===true&&text(d.reference,150)&&['cash','bank','mobile_money'].includes(d.channel),'Confirmez la commission effectivement reçue et sa référence');
   const s=await env.DB.prepare('SELECT * FROM seller_settlements WHERE id=? AND country=?').bind(d.id,ctx.country).first();
   required(s?.status==='seller_collected'&&s.policy_confirmed&&s.commission>0&&s.available_at<=Date.now(),'Commission non disponible',409);
   required(d.amount===s.commission,'Montant de commission incorrect');
   const result=await env.DB.batch([env.DB.prepare("UPDATE seller_settlements SET status='commission_received',reference=?,channel=?,recorded_by=?,updated_at=? WHERE id=? AND status='seller_collected' AND NOT EXISTS (SELECT 1 FROM return_requests WHERE order_id=? AND status NOT IN ('rejected','refunded_manual'))").bind(d.reference.trim(),d.channel,user,Date.now(),s.id,s.order_id),env.DB.prepare("INSERT INTO finance_entries(id,country,order_id,seller_id,user_id,currency,debit_account,credit_account,amount,kind,reference,created_at) SELECT ?,?,?,?,?,?,'external_collection_declared','commission_receivable_from_seller',?,'commission_receipt_manual',?,? WHERE EXISTS (SELECT 1 FROM seller_settlements WHERE id=? AND status='commission_received' AND reference=?) ON CONFLICT(id) DO NOTHING").bind(s.id+':commission-receipt',ctx.country,s.order_id,s.seller_id,s.user_id,s.currency,s.commission,d.reference.trim(),Date.now(),s.id,d.reference.trim()),audit(env,ctx,d.action,s.id,{reference:d.reference,amount:s.commission})]);
   required(result[0].meta.changes,'Retour en cours ou commission déjà enregistrée',409);return reply({ok:true});
  }
  if(d.action==='cash_remittance') {
   admin(ctx);required(d.externalOperationConfirmed===true&&text(d.reference,150)&&['cash','bank','mobile_money'].includes(d.channel),'Confirmez les fonds effectivement reçus et leur référence');
   const o=await getMarketOrder(env,d.orderId,ctx.country);required(o?.requestedCourier&&o.buyerConfirmed&&o.paymentStatus==='cash_confirmed'&&!o.cancelled,'Encaissement et réception à confirmer',409);
   required(Number.isSafeInteger(d.amount)&&d.amount===o.total,'La remise doit correspondre exactement au total encaissé');
   const result=await env.DB.batch([env.DB.prepare('INSERT INTO cash_remittances(order_id,country,amount,reference,channel,recorded_by,created_at) VALUES (?,?,?,?,?,?,?) ON CONFLICT(order_id) DO NOTHING').bind(o.id,ctx.country,o.total,d.reference.trim(),d.channel,user,Date.now()),env.DB.prepare("INSERT INTO finance_entries(id,country,order_id,seller_id,user_id,currency,debit_account,credit_account,amount,kind,reference,created_at) SELECT ?,?,?,0,?,?,'external_remittance_declared','cod_custodian_receivable',?,'cash_remittance_manual',?,? WHERE EXISTS (SELECT 1 FROM cash_remittances WHERE order_id=? AND reference=?) ON CONFLICT(id) DO NOTHING").bind(o.id+':remittance',ctx.country,o.id,o.courierUserId,ctx.country==='CG'?'XAF':'CDF',o.total,d.reference.trim(),Date.now(),o.id,d.reference.trim()),audit(env,ctx,d.action,o.id,{reference:d.reference,amount:o.total})]);
   required(result[0].meta.changes,'Remise des fonds déjà enregistrée',409);return reply({ok:true});
  }
  if(d.action==='seller_payout') {
   admin(ctx);required(d.externalOperationConfirmed===true&&text(d.reference,150)&&['cash','bank','mobile_money'].includes(d.channel),'Confirmez le règlement déjà effectué et sa référence');
   const s=await env.DB.prepare('SELECT * FROM seller_settlements WHERE id=? AND country=?').bind(d.id,ctx.country).first();required(s,'Règlement introuvable',404);
   required(s.net>0&&s.status==='held'&&s.policy_confirmed&&s.available_at<=Date.now(),'Règlement bloqué : délai de retour, politique de commission ou statut',409);
   const update=env.DB.prepare("UPDATE seller_settlements SET status='paid_manual',reference=?,channel=?,recorded_by=?,updated_at=? WHERE id=? AND status='held' AND EXISTS (SELECT 1 FROM cash_remittances WHERE order_id=seller_settlements.order_id) AND NOT EXISTS (SELECT 1 FROM return_requests WHERE order_id=? AND status NOT IN ('rejected','refunded_manual'))").bind(d.reference.trim(),d.channel,user,Date.now(),s.id,s.order_id);
   const entry=env.DB.prepare("INSERT INTO finance_entries(id,country,order_id,seller_id,user_id,currency,debit_account,credit_account,amount,kind,reference,created_at) SELECT ?,?,?,?,?,?,'seller_payable','external_payout_declared',?,'payout_manual',?,? WHERE EXISTS (SELECT 1 FROM seller_settlements WHERE id=? AND status='paid_manual' AND reference=?) ON CONFLICT(id) DO NOTHING").bind(s.id+':payout',ctx.country,s.order_id,s.seller_id,s.user_id,s.currency,s.net,d.reference.trim(),Date.now(),s.id,d.reference.trim());
   const result=await env.DB.batch([update,entry,audit(env,ctx,d.action,s.id,{reference:d.reference})]);required(result[0].meta.changes,'Retour en cours ou règlement déjà enregistré',409);return reply({ok:true});
  }
  if(d.action==='professional_commission') {
   admin(ctx);required(Number.isInteger(d.basisPoints)&&d.basisPoints>=0&&d.basisPoints<=10000,'Taux invalide');
   await env.DB.batch([env.DB.prepare('INSERT INTO commerce_settings(key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').bind('professionalCommissionBps',String(d.basisPoints)),audit(env,ctx,d.action,'professional',{basisPoints:d.basisPoints})]);return reply({ok:true,appliesTo:'future_orders'});
  }
  if(d.action==='subscription_request') {
   required(['delivery','seller'].includes(d.kind)&&text(d.plan,80),'Choisissez un abonnement');
   required(d.kind!=='seller'||ctx.professionalSeller,'Compte vendeur validé requis',403);
   const plans=d.kind==='seller'?['free','plus','premium','business','enterprise']:['monthly','annual'];required(plans.includes(d.plan),'Forfait inconnu');
   const id=user+':'+d.kind+':'+d.plan;
   await env.DB.prepare("INSERT INTO subscription_requests(id,user_id,country,kind,plan,status,created_at) VALUES (?,?,?,?,?,'requested_not_paid',?) ON CONFLICT(id) DO NOTHING").bind(id,user,ctx.country,d.kind,d.plan,Date.now()).run();return reply({ok:true,status:'requested_not_paid',active:false,debited:false});
  }
  if(d.action==='support_create') {
   required(text(d.topic,100)&&text(d.message,2000),'Choisissez le sujet et écrivez votre message');
   const id='SUP-'+crypto.randomUUID();
   await env.DB.batch([env.DB.prepare("INSERT INTO support_tickets(id,user_id,country,topic,status,revision,created_at,updated_at) VALUES (?,?,?,?,'open',1,?,?)").bind(id,user,ctx.country,d.topic.trim(),Date.now(),Date.now()),env.DB.prepare('INSERT INTO support_messages VALUES (?,?,?,?,?,?)').bind(crypto.randomUUID(),id,user,'customer',d.message.trim(),Date.now())]);return reply({ok:true,id});
  }
  if(d.action==='support_reply') {
   const t=await env.DB.prepare('SELECT * FROM support_tickets WHERE id=? AND country=?').bind(d.id,ctx.country).first();required(t&&(ctx.isAdmin||t.user_id===user),'Dossier privé',403);required(text(d.message,2000),'Message requis');required(t.revision===d.revision,'Dossier modifié',409);
   const status=ctx.isAdmin&&['open','resolved'].includes(d.status)?d.status:'open';
   const token=crypto.randomUUID();
   const result=await env.DB.batch([env.DB.prepare('UPDATE support_tickets SET operation_token=?,status=?,revision=revision+1,updated_at=? WHERE id=? AND revision=?').bind(token,status,Date.now(),t.id,t.revision),env.DB.prepare('INSERT INTO support_messages(id,ticket_id,user_id,sender_role,message,created_at) SELECT ?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM support_tickets WHERE id=? AND operation_token=?)').bind(crypto.randomUUID(),t.id,user,ctx.isAdmin?'admin':'customer',d.message.trim(),Date.now(),t.id,token)]);required(result[0].meta.changes,'Dossier modifié',409);return reply({ok:true});
  }
  if(d.action==='suspend_account' || d.action==='revoke_role') {
   admin(ctx);required(text(d.userId,150)&&text(d.note,500),'Compte et justification requis');required(d.userId!==ctx.user&&d.userId!==ctx.owner,'Impossible de bloquer le propriétaire',403);
   const target=await env.DB.prepare('SELECT user_id FROM customers WHERE user_id=?').bind(d.userId).first();required(target&&d.userId.startsWith('cg:')===(ctx.country==='CG'),'Compte introuvable dans ce marché',404);
   await preserveLegacyRoles(env,d.userId);
   const statement=d.action==='suspend_account'?env.DB.prepare('INSERT INTO account_controls(user_id,suspended,note,updated_at) VALUES (?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET suspended=excluded.suspended,note=excluded.note,updated_at=excluded.updated_at').bind(d.userId,d.suspended?1:0,d.note,Date.now()):env.DB.prepare("UPDATE account_roles SET status='revoked',updated_at=? WHERE user_id=? AND role=?").bind(Date.now(),d.userId,d.role);
   if(d.action==='revoke_role') required(['seller','courier'].includes(d.role),'Rôle invalide');
   const statements=[statement];
   if(d.action==='revoke_role' && d.role==='seller') {
     const rows=(await env.DB.prepare('SELECT key,data FROM market_products WHERE owner_user_id=? AND country=?').bind(d.userId,ctx.country).all()).results;
     for(const row of rows) {const product=JSON.parse(row.data);if(product.sellerKind!=='particular') statements.push(env.DB.prepare('UPDATE market_products SET data=?,revision=revision+1 WHERE key=?').bind(JSON.stringify({...product,approved:false}),row.key));}
   }
   statements.push(audit(env,ctx,d.action,d.userId,{role:d.role || null,note:d.note}));
   await env.DB.batch(statements);return reply({ok:true});
  }
  if(d.action==='content_save') {
   admin(ctx);required(['promotion','advertisement','category'].includes(d.kind)&&text(d.data?.title,100),'Contenu invalide');required(JSON.stringify(d.data).length<10000,'Contenu trop long');
   if(d.kind==='category') required(config.categorySections.some(s=>s[0]===d.data.title),'Utilisez une catégorie existante pour préserver les produits');
   if(d.kind==='advertisement') {
    required(text(d.data.image,1000),'Image de la publicité requise');
    let image;try{image=new URL(d.data.image)}catch{fail('Image HTTPS publique requise')}required(image.protocol==='https:'&&!image.username&&!image.password,'Image HTTPS publique requise');
   }
   const id=d.id || crypto.randomUUID(),prior=await env.DB.prepare('SELECT country FROM admin_content WHERE id=?').bind(id).first();
   required(!prior || prior.country===ctx.country,'Contenu d’un autre marché',403);
   const statements=[];
   if(d.kind==='promotion') {
    required(Number.isSafeInteger(d.data.productId)&&Number.isSafeInteger(d.data.price)&&Number.isSafeInteger(d.data.regularPrice)&&d.data.price>0&&d.data.regularPrice>d.data.price,'Prix promotionnels invalides');
    const key=ctx.country+':'+d.data.productId,row=await env.DB.prepare('SELECT data,revision FROM market_products WHERE key=?').bind(key).first();required(row,'Produit introuvable',404);
    const product=JSON.parse(row.data);
    if(d.data.enabled===true) {product.price=d.data.price;product.regularPrice=d.data.regularPrice;product.promotionId=id;}
    else if(product.promotionId===id) {product.price=product.regularPrice;delete product.regularPrice;delete product.promotionId;}
    statements.push(env.DB.prepare('UPDATE market_products SET data=?,revision=revision+1,updated_at=? WHERE key=? AND revision=?').bind(JSON.stringify(product),Date.now(),key,row.revision));
   }
   statements.push(env.DB.prepare('INSERT INTO admin_content(id,country,kind,data,revision,updated_at) VALUES (?,?,?,?,1,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data,revision=admin_content.revision+1,updated_at=excluded.updated_at WHERE admin_content.country=excluded.country').bind(id,ctx.country,d.kind,JSON.stringify(d.data),Date.now()),audit(env,ctx,d.action,id,{kind:d.kind,enabled:d.data.enabled===true}));
   const result=await env.DB.batch(statements);required(result[0].meta.changes,'Contenu modifié. Actualisez.',409);return reply({ok:true,id});
  }
  if(d.action==='electronic_payment' || d.action==='wallet_withdraw' || d.action==='escrow_release') return reply({error:'Prestataire financier non activé. Aucune opération monétaire effectuée.',debited:false},503);
  return reply({error:'Action inconnue'},400);
 } catch(e) {if(!e.status) console.error('Account hub unavailable',e);return reply({error:e.status?e.message:'Service indisponible. Réessayez.'},e.status || 503);}
}
