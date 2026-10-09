import { useCallback, useEffect, useState } from 'react';
import { Text } from 'react-native';
import { api } from '../lib/api';
import { Button, Card, ErrorText, Field, Select, styles, money } from './ui';
import { SellerProducts } from './SellerProducts';
import { OrderCard } from './OrderCard';
import type { MarketState, Product } from '../lib/types';
import market from '../lib/market.json';

type Row = Record<string, any>; // API resources have different, server-validated schemas.
export function AccountHub({ resource, admin = false, viewer = 'buyer' }: { resource: string; admin?: boolean; viewer?: string }) {
 const [data,setData]=useState<Row>({}),[error,setError]=useState(''),[busy,setBusy]=useState(false),[draft,setDraft]=useState<Row>({}),[selected,setSelected]=useState<Row | null>(null),[orders,setOrders]=useState<MarketState | null>(null);
 const field=(key:string,value:string)=>setDraft(d=>({...d,[key]:value}));
 const load=useCallback(async()=>{
  try { setData(await api<Row>('/api/account-hub?country=CD&resource='+resource+'&view='+viewer));
   if(resource==='returns' || resource==='listings') setOrders(await api<MarketState>('/api/marketplace?country=CD&view='+(resource==='listings'?'particular':'buyer')).catch(()=>null));
  }catch(e){setError((e as Error).message)}
 },[resource,viewer]);
 useEffect(()=>{
  let live=true;
  Promise.all([api<Row>('/api/account-hub?country=CD&resource='+resource+'&view='+viewer), ['returns','listings'].includes(resource)?api<MarketState>('/api/marketplace?country=CD&view='+(resource==='listings'?'particular':'buyer')).catch(()=>null):Promise.resolve(null)])
   .then(([hub,marketState])=>{if(live){setData(hub);setOrders(marketState);setError('')}})
   .catch(e=>{if(live)setError(e.message)});
  return ()=>{live=false};
 },[resource,viewer]);
 const act=async(body:Row)=>{setBusy(true);setError('');try{await api('/api/account-hub?country=CD',body);await load();setSelected(null);setDraft({});}catch(e){setError((e as Error).message)}finally{setBusy(false)}};
 const input=(key:string,label:string,numeric=false)=><Field key={key} label={label} value={String(draft[key] ?? '')} keyboardType={numeric?'numeric':'default'} onChangeText={v=>field(key,v)} />;
 return <>
  <ErrorText error={error}/>
  <Button outline title="Actualiser" disabled={busy} onPress={load}/>
  {resource==='listings' && <>
   <Card><Text style={styles.heading}>Mes annonces personnelles</Text><Text style={styles.text}>Revendez occasionnellement un article neuf ou d’occasion, sans créer de boutique professionnelle. Commission YAVIYA : 12 % du prix de l’article, calculée côté serveur. Vos annonces sont examinées avant publication.</Text>
   {!data.sellerId && <Button title="Accepter les 12 % et activer mes annonces" disabled={busy} onPress={()=>act({action:'enable_particular',acceptCommission:true})}/>}</Card>
   {data.sellerId && <PersonalProducts sellerId={data.sellerId} listings={data.listings || []} refresh={load}/>}
   {data.sellerId && <PersonalOrders sellerId={data.sellerId}/>}
  </>}
  {resource==='finance' && <>
   <Card><Text style={styles.heading}>Commissions et reversements</Text><Text style={styles.text}>{data.notice}</Text><Text style={styles.muted}>Le portefeuille monétaire n’est pas activé. Vos YaviCoins / coupons restent des récompenses de démonstration.</Text></Card>
   {admin && (data.cashOrders || []).map((o:Row)=><Card key={o.id}><Text style={styles.heading}>Espèces à rapprocher · {o.id}</Text><Text style={styles.text}>Total encaissé déclaré : {money(o.total)}</Text><Button outline title="Enregistrer les fonds effectivement reçus" onPress={()=>{setSelected({...o,operation:'cash_remittance'});setDraft({channel:'cash',amount:String(o.total)})}}/></Card>)}
   {(data.summary || []).map((s:Row)=><Card key={s.currency}><Text style={styles.heading}>Synthèse {s.currency}</Text><Text style={styles.text}>Ventes : {s.gross} · Commissions : {s.commission} · Net : {s.net}</Text></Card>)}
   {(data.entries || []).filter((e:Row)=>e.seller_id===0).map((e:Row)=><Card key={e.id}><Text style={styles.heading}>{e.order_id}</Text><Text style={styles.text}>{e.kind==='payout_manual'?'Règlement externe déclaré':'Rémunération de livraison comptabilisée'} : {e.amount} {e.currency}</Text></Card>)}
   {(data.settlements || []).map((s:Row)=><Card key={s.id}><Text style={styles.heading}>{s.order_id}</Text><Text style={styles.text}>Ventes : {money(s.gross)} · Commission : {money(s.commission)} · Net : {money(s.net)}</Text><Text style={styles.text}>{s.status==='paid_manual'?'Règlement externe déclaré · '+s.reference:s.status==='refunded'?'Remboursement externe déclaré':s.status==='seller_collected'?'Vendeur déjà encaissé · commission à recevoir par YAVIYA':s.payable?'À régler':'En attente : délai de retour, dossier ou politique de commission'}</Text>{admin&&s.commissionCollectible&&<Button outline title="Enregistrer la commission effectivement reçue" onPress={()=>{setSelected({...s,operation:'commission_receipt'});setDraft({channel:'cash',amount:String(s.commission)})}}/>}{admin&&s.payable&&<Button outline title="Enregistrer un règlement déjà effectué" onPress={()=>{setSelected(s);setDraft({channel:'cash'})}}/>}</Card>)}
   {selected&&<Card>{selected.operation&&input('amount','Montant effectivement reçu *',true)}{input('reference','Référence du règlement effectué *')}<Select label="Canal" value={draft.channel || 'cash'} options={['cash','bank','mobile_money']} onChange={v=>field('channel',v)}/><Button title="Confirmer l’opération externe et enregistrer" disabled={busy} onPress={()=>act({action:selected.operation || 'seller_payout',id:selected.id,orderId:selected.id,amount:Number(draft.amount),reference:draft.reference,channel:draft.channel || 'cash',externalOperationConfirmed:true})}/></Card>}
  </>}
  {resource==='returns' && <>
   <Card><Text style={styles.heading}>Retours et remboursements · 72 h</Text><Text style={styles.text}>La demande peut être ouverte dans les 72 heures suivant la réception. Le remboursement est traité après examen et réception du retour.</Text>
   {!admin&&<><Select label="Commande reçue" value={draft.orderId || ''} options={(orders?.orders || []).filter(o=>o.buyerConfirmed&&!o.cancelled).map(o=>o.id)} onChange={v=>field('orderId',v)}/>{input('reason','Motif du retour *')}<Button title="Demander un retour" disabled={busy} onPress={()=>act({action:'return_request',orderId:draft.orderId,reason:draft.reason})}/></>}
   </Card>
   {(data.returns || []).map((r:Row)=><Card key={r.id}><Text style={styles.heading}>{r.order_id} · {r.status}</Text><Text style={styles.text}>{r.reason}</Text><Text style={styles.muted}>{r.note}</Text>{admin&&r.status!=='refunded_manual'&&r.status!=='rejected'&&<Button outline title="Traiter le dossier" onPress={()=>{setSelected(r);setDraft({channel:'cash'})}}/>}</Card>)}
   {admin&&selected&&<Card>{input('note','Justification de la décision *')}{selected.status==='received'&&<>{input('reference','Référence du remboursement déjà effectué *')}<Select label="Canal" options={['cash','bank','mobile_money']} value={draft.channel || 'cash'} onChange={v=>field('channel',v)}/></>}
   {(selected.status==='requested'?['approved','rejected']:selected.status==='approved'?['received']:['refunded_manual']).map(status=><Button key={status} disabled={busy} title={{approved:'Autoriser le retour',rejected:'Refuser avec justification',received:'Confirmer le retour reçu',refunded_manual:'Confirmer le remboursement externe effectué'}[status] || status} onPress={()=>act({action:'return_decision',id:selected.id,revision:selected.revision,status,note:draft.note,reference:draft.reference,channel:draft.channel || 'cash',externalOperationConfirmed:status==='refunded_manual'})}/>)}</Card>}
  </>}
  {resource==='shops'&&<>{(data.shops || []).map((s:Row)=><Card key={s.id}><Text style={styles.heading}>{s.name}</Text><Text style={styles.text}>{s.address}</Text><Button outline title="Modifier la boutique" onPress={()=>{setSelected(s);setDraft(s)}}/></Card>)}<Card>{input('name','Nom de la boutique *')}{input('address','Adresse de la boutique *')}<Button title="Confirmer l’adresse et enregistrer la boutique" disabled={busy} onPress={()=>act({action:'shop_save',id:selected?.id,name:draft.name,address:draft.address,addressConfirmed:true})}/></Card></>}
  {resource==='addresses'&&<>
   {(data.addresses || []).map((a:Row)=><Card key={a.id}><Text style={styles.heading}>{a.label}</Text><Text style={styles.text}>{a.address} · {a.commune}, {a.city}</Text><Button outline title="Supprimer cette adresse" disabled={busy} onPress={()=>act({action:'address_delete',id:a.id})}/></Card>)}
   <Card>{input('label','Nom de l’adresse *')}<Select label="Ville" value={draft.city || ''} options={market.deliverableCities} onChange={v=>{field('city',v);field('commune','')}}/>{input('commune','Commune *')}{input('address','Adresse *')}{input('phone','Téléphone *')}<Button title="Enregistrer l’adresse" disabled={busy} onPress={()=>act({...draft,action:'address_save'})}/></Card>
  </>}
  {resource==='support'&&<>
   <Card><Text style={styles.heading}>Service client</Text><Text style={styles.text}>Un dossier partagé avec l’administration pour suivre votre demande.</Text>{!admin&&<><Select label="Sujet" options={['Livraison','Remboursement','Problème de compte','Coupon','Commande','Paiement']} value={draft.topic || 'Livraison'} onChange={v=>field('topic',v)}/>{input('message','Votre message *')}<Button title="Ouvrir un dossier" disabled={busy} onPress={()=>act({action:'support_create',topic:draft.topic || 'Livraison',message:draft.message})}/></>}</Card>
   {(data.tickets || []).map((t:Row)=><Card key={t.id}><Text style={styles.heading}>{t.topic} · {t.status==='resolved'?'Résolu':'Ouvert'}</Text>{(t.messages || []).map((m:Row)=><Text key={m.id} style={styles.text}>{m.sender_role==='admin'?'YAVIYA':'Client'} : {m.message}</Text>)}<Button outline title="Répondre au dossier" onPress={()=>{setSelected(t);setDraft({})}}/></Card>)}
   {selected&&<Card>{input('message','Réponse *')}<Button title="Envoyer" disabled={busy} onPress={()=>act({action:'support_reply',id:selected.id,revision:selected.revision,message:draft.message,status:'open'})}/>{admin&&<Button outline title="Répondre et marquer résolu" disabled={busy} onPress={()=>act({action:'support_reply',id:selected.id,revision:selected.revision,message:draft.message,status:'resolved'})}/>}</Card>}
  </>}
  {resource==='subscriptions'&&<Card><Text style={styles.heading}>Abonnements</Text><Text style={styles.text}>Enregistrez votre intérêt. Aucun abonnement ne devient actif et aucun montant n’est débité tant que les paiements ne sont pas activés.</Text>{(data.requests || []).map((r:Row)=><Text key={r.id} style={styles.text}>{r.kind} · {r.plan} · Demande non payée</Text>)}{!admin&&<><Select label="Abonnement" options={['delivery','seller']} value={draft.kind || 'delivery'} onChange={v=>{field('kind',v);field('plan','')}}/><Select label="Forfait" options={draft.kind==='seller'?['free','plus','premium','business','enterprise']:['monthly','annual']} value={draft.plan || ''} onChange={v=>field('plan',v)}/><Button title="Enregistrer mon intérêt" disabled={busy} onPress={()=>act({action:'subscription_request',kind:draft.kind || 'delivery',plan:draft.plan})}/></>}</Card>}
  {resource==='reviews'&&<>{(data.reviews || []).map((r:Row)=><Card key={r.orderId}><Text style={styles.heading}>{r.orderId}</Text><Text style={styles.text}>{r.comment || 'Évaluation reçue'}</Text>{Object.entries(r.sellerScores || {}).map(([id,score])=><Text key={id} style={styles.text}>{r.sellerNames?.[id] || 'Vendeur'} : {String(score)} / 5</Text>)}{r.courierScore&&<Text style={styles.text}>Livreur : {r.courierScore} / 5</Text>}</Card>)}</>}
  {resource==='admin'&&admin&&<>
   <Card><Text style={styles.heading}>Politique de commission professionnelle</Text><Text style={styles.text}>Taux actuel : {data.professionalCommissionBps===null?'À définir':Number(data.professionalCommissionBps)/100+' %'}. La revente particulière reste fixée à 12 %. Un changement s’applique aux nouvelles commandes.</Text>{input('percent','Commission professionnelle (%)',true)}<Button title="Enregistrer le taux" disabled={busy} onPress={()=>act({action:'professional_commission',basisPoints:Math.round(Number(draft.percent)*100)})}/></Card>
   {(data.users || []).map((u:Row)=><Card key={u.user_id}><Text style={styles.heading}>{u.name}</Text><Text style={styles.text}>{u.account_type} · {u.suspended?'Suspendu':'Actif'}</Text><Button outline title="Gérer les autorisations" onPress={()=>{setSelected(u);setDraft({})}}/></Card>)}
   {selected&&<Card>{input('note','Justification *')}<Button title={selected.suspended?'Réactiver le compte':'Suspendre le compte'} disabled={busy} onPress={()=>act({action:'suspend_account',userId:selected.user_id,suspended:!selected.suspended,note:draft.note})}/>{['seller','courier'].map(role=><Button key={role} outline title={'Révoquer le rôle '+(role==='seller'?'vendeur':'livreur')} disabled={busy} onPress={()=>act({action:'revoke_role',userId:selected.user_id,role,note:draft.note})}/>)}</Card>}
   <Card><Text style={styles.heading}>Historique des actions</Text>{(data.audit || []).map((e:Row)=><Text key={e.id} style={styles.muted}>{new Date(e.created_at).toLocaleString('fr')} · {e.action} · {e.target}</Text>)}</Card>
  </>}
 </>;
}
function PersonalProducts({sellerId,listings,refresh}:{sellerId:number;listings:Product[];refresh:()=>Promise<void>}) {
 const state={profile:null,roles:{buyer:true,seller:false,courier:false,admin:false},sellerIds:[sellerId],personalSellerId:sellerId,catalogue:listings,orders:[],opportunities:[],stores:[{id:sellerId,name:'Mes annonces personnelles',reviewed:false}],courierSettings:null} as MarketState;
 return <SellerProducts data={state} refresh={refresh} personal/>;
}
function PersonalOrders({sellerId}:{sellerId:number}) {
 const [state,setState]=useState<MarketState | null>(null),[error,setError]=useState('');
 const load=useCallback(async()=>{try{await Promise.resolve();setState(await api<MarketState>('/api/marketplace?country=CD&view=particular'))}catch(e){setError((e as Error).message)}},[]);
 useEffect(()=>{let live=true;api<MarketState>('/api/marketplace?country=CD&view=particular').then(d=>{if(live)setState(d)}).catch(e=>{if(live)setError(e.message)});return ()=>{live=false}},[]);
 return <><ErrorText error={error}/><Text style={styles.heading}>Commandes de mes annonces</Text>{state?.orders.filter(o=>o.items.some(i=>i.seller===sellerId)).map(o=><OrderCard key={o.id} order={o} role="seller" sellerIds={[sellerId]} refresh={load}/>)}</>;
}
