import { useCallback, useEffect, useState } from 'react';
import { api } from './api';
export default function useSellerFollows(user, country) {
  const key = user ? country + ':' + user.id : '';
  const [snapshot,setSnapshot] = useState(null), [error,setError] = useState(''), [busy,setBusy] = useState(false);
  const refresh = useCallback(async (signal) => {
    if (!key) return;
    const result = await api('/api/seller-follows',{country,signal});
    setSnapshot({key,...result}); setError('');
  },[key,country]);
  useEffect(() => {
    if (!key) {setSnapshot(null);setError('');return;}
    const controller = new AbortController();
    refresh(controller.signal).catch(e=>{if(!controller.signal.aborted)setError(e.message)});
    const timer = setInterval(()=>{if(document.visibilityState==='visible')refresh(controller.signal).catch(()=>{})},60000);
    return ()=>{controller.abort();clearInterval(timer)};
  },[key,refresh]);
  const current = snapshot?.key === key ? snapshot : null;
  async function toggle(sellerId) {
    if (busy || !key || !current) return;
    setBusy(true);setError('');
    try {
      const result = await api('/api/seller-follows',{country,body:{sellerId,follow:!current.follows.some(f=>f.sellerId===sellerId)}});
      setSnapshot({key,...result});
    } catch(e) {setError(e.message)} finally {setBusy(false)}
  }
  return {follows:current?.follows || [], counts:current ? Object.fromEntries(current.counts.map(c=>[c.sellerId,Number(c.followerCount)])) : null, ready:!!current, error,busy,toggle,refresh};
}
