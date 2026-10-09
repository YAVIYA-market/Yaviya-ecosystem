// Disposable local fixtures only. Never connects to Supabase, Turso or production.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { createDatabase } from '../backend/database.js';
import { createApplication } from '../backend/application.js';
import { migrate } from './migrate.mjs';
import config from '../backend/data/market-config.json' with {type:'json'};
if(process.env.VERCEL || process.env.NODE_ENV==='production') throw Error('Fixtures autorisées uniquement en local.');
const sqlite='.local/yaviya-unified-demo.sqlite',envFile='.local/yaviya-demo.env';
await mkdir('.local',{recursive:true});
let key=randomBytes(32).toString('hex');
try{key=/MFA_ENCRYPTION_KEY=([a-f0-9]{64})/.exec(await readFile(envFile,'utf8'))?.[1] || key}catch{}
process.env.MFA_ENCRYPTION_KEY=key;
await writeFile(envFile,'SQLITE_PATH='+sqlite+'\nMFA_ENCRYPTION_KEY='+key+'\nPOSTGRES_URL=\nDATABASE_URL=\nTURSO_DATABASE_URL=\nVERCEL=\n',{mode:0o600});
const db=await createDatabase({SQLITE_PATH:sqlite}),app=createApplication(db),origin='http://localhost:3000',password='Yaviya-demo-2026!';
const accounts={};
try {
 await migrate(db);
 for(const role of ['buyer','particular','seller','courier','admin']) {
  const callAuth=action=>app(new Request(origin+'/api/auth/mobile/'+action,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({login:role+'@yaviya.example.test',password})}));
  let response=await callAuth('signup');if(response.status===409)response=await callAuth('login');
  const account=await response.json();if(!response.ok || !account.user || !account.sessionToken)throw Error('Compte local indisponible : '+role);
  const call=async(path,body)=>{const r=await app(new Request(origin+path,{method:body?'POST':'GET',headers:{Origin:origin,Authorization:'Bearer yv.'+account.sessionToken,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined}));if(!r.ok)throw Error(await r.text());return r.json()};
  accounts[role]={id:account.user.id,call};
  await call('/api/customer',{name:role+' · recette locale',phone:'+243999999999',email:'',address:'Adresse de recette · Gombe',accountType:role==='seller'||role==='courier'?role:'buyer',privacyConsent:true,privacyVersion:'2026-10-02'});
  if(role==='seller'||role==='courier') {
   await db.prepare("INSERT INTO identity_checks(user_id,kind,document_type,object_key,file_name,status,issuing_country,document_mime,submitted_at,activity_address) VALUES (?,?,'identity','local-fixture','RECETTE-UNIQUEMENT.png','approved','CD','image/png',?,?) ON CONFLICT(user_id) DO NOTHING").bind(account.user.id,role,Date.now(),'Adresse de recette · Gombe').run();
  }
  if(role==='admin') await db.prepare("INSERT INTO admin_access(id,user_id) VALUES ('owner',?) ON CONFLICT(id) DO NOTHING").bind(account.user.id).run();
 }
 await db.prepare("INSERT INTO owned_stores(user_id,name,country,address) SELECT ?,'Boutique recette locale','CD','Adresse de recette · Gombe' WHERE NOT EXISTS (SELECT 1 FROM owned_stores WHERE user_id=?)").bind(accounts.seller.id,accounts.seller.id).run();
 await accounts.courier.call('/api/marketplace/courier',{available:true,payoutMethod:'cash',payoutAccount:'',benefitsAccepted:true});
 await accounts.admin.call('/api/account-hub',{action:'professional_commission',basisPoints:1200});
 const personal=await accounts.particular.call('/api/account-hub',{action:'enable_particular',acceptCommission:true});
 const state=await accounts.seller.call('/api/marketplace?view=seller');
 for(const [role,id,seller,title,image] of [['seller',1900010001,state.sellerIds[0],'Produit professionnel · recette','headphones.png'],['particular',1900010002,personal.sellerId,'Article particulier · recette','sneakers.png']]) {
  const exists=await db.prepare('SELECT key FROM market_products WHERE key=?').bind('CD:'+id).first();if(exists)continue;
  const product={id,seller,title,category:config.categorySections[0][0],price:10000,stock:role==='particular'?1:10,condition:'used',visible:true,approved:false,desc:'Article fictif uniquement destiné à la recette locale.',images:[image],img:image};
  await accounts[role].call(role==='particular'?'/api/account-hub':'/api/marketplace/catalogue',role==='particular'?{action:'save_listing',product}:product);
  const row=await db.prepare('SELECT data,revision FROM market_products WHERE key=?').bind('CD:'+id).first();
  await accounts.admin.call('/api/marketplace/catalogue',{...JSON.parse(row.data),revision:row.revision,approved:true});
 }
 const prep=spawnSync(process.execPath,['scripts/prepare-next.mjs'],{stdio:'inherit'});if(prep.status)throw Error('Préparation des images échouée');
 console.log('Recette locale prête. npm run demo:web puis http://localhost:3000 et /admin.');
 console.log('Comptes : buyer, particular, seller, courier, admin @yaviya.example.test. Mot de passe local : '+password);
 console.log('Admin : activer la double authentification dans le compte avant usage d’un serveur de production. Aucun compte ni paiement réel créé.');
}finally{await db.close()}
