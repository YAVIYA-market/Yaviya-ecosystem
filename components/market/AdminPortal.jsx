import Head from 'next/head';
import { useCallback, useEffect, useState } from 'react';
import { api } from '../../lib/market/api';
import AuthForm from './AuthForm';
import Dashboard from './Dashboard';
import AccountSettings from './AccountSettings';
export default function AdminPortal({data}) {
 const [user,setUser]=useState(null),[state,setState]=useState(null),[profile,setProfile]=useState(null),[error,setError]=useState(''),[ready,setReady]=useState(false),[security,setSecurity]=useState(false);
 const load=useCallback(async()=>{try{const p=await api('/api/customer');setProfile(p);const market=await api('/api/marketplace?view=admin');setState(market);setError('');setSecurity(false)}catch(e){setError(e.message);if(e.code==='ADMIN_MFA_REQUIRED')setSecurity(true)}},[]);
 useEffect(()=>{let live=true;api('/api/auth/session').then(async s=>{if(!live)return;setUser(s.user);setReady(true);if(s.user)await load()}).catch(e=>{if(live){setError(e.message);setReady(true)}});return ()=>{live=false}},[load]);
 return <><Head><title>Administration · YAVIYA</title><meta name="robots" content="noindex,nofollow"/></Head><main className="yv-app"><header className="yv-heading"><a href="/" className="yv-brand">YAVIYA</a><h1>Administration</h1>{user&&<button onClick={async()=>{await api('/api/auth/logout',{body:{}});setUser(null);setState(null)}}>Se déconnecter</button>}</header>{error&&<p className="yv-error" role="alert">{error}</p>}{!ready?<p>Chargement…</p>:!user?<AuthForm country="CD" onSuccess={async u=>{setUser(u);await load()}}/>:security&&profile?<><AccountSettings profile={profile} country="CD" config={data.config} onSaved={setProfile}/><button className="yv-primary" onClick={load}>Vérifier mon accès administrateur</button></>:state?<Dashboard country="CD" config={data.config} state={state} role="admin" onRefresh={load} onManagePlan={()=>{}}/>:<p>Ce compte ne dispose pas d’un accès administrateur autorisé.</p>}</main></>;
}
