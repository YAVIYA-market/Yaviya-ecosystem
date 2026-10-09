import { useState } from 'react';
export default function Invitation({ code, country }) {
  const [message,setMessage] = useState('');
  const url = typeof window === 'undefined' || !code ? '' : window.location.origin + (country === 'CG' ? '/congo.html' : '/') + '?invitation=' + encodeURIComponent(code);
  async function share() {
    try {
      if(navigator.share) await navigator.share({title:'Découvrez YAVIYA',text:'Retrouvez vos boutiques et vos produits sur YAVIYA.',url});
      else {await navigator.clipboard.writeText(url);setMessage('Lien d’invitation copié.');}
    } catch(e) {if(e.name !== 'AbortError')setMessage('Copiez le lien ci-dessous pour le partager.');}
  }
  return <section className="yv-form"><p className="yv-eyebrow">INVITER UN AMI</p><h3>Les bonnes découvertes se partagent.</h3><p>Invitez vos proches à découvrir YAVIYA avec votre lien personnel.</p>{code ? <><label>Votre code d’invitation<input readOnly value={code}/></label><label>Votre lien à partager<input readOnly value={url} onFocus={e=>e.target.select()}/></label><button className="yv-primary" onClick={share}>Partager mon invitation</button></> : <p>Votre code sera disponible après l’enregistrement de votre profil.</p>}<p role="status">{message}</p><small>Le partage d’une invitation ne déclenche pas de récompense financière.</small></section>;
}
