import { useState } from "react";
const campaigns = [
  { id:"payments", label:"M-Pesa", image:"partner-payment.jpg", eyebrow:"VODACOM · M-PESA", title:"Le paiement mobile, à portée de main.", copy:"Découvrez l’univers du paiement mobile sur YAVIYA. Exemple de campagne publicitaire : partenariat et activation des paiements à confirmer.", cta:"Découvrir les paiements" },
  { id:"logistics", label:"Partenaire logistique", image:"partner-logistics.jpg", eyebrow:"TRANSPORT · LIVRAISON · POINTS RELAIS", title:"Le dernier kilomètre, avec vous.", copy:"Un grand espace dédié aux entreprises de logistique pour présenter leurs services. Campagne illustrative ; aucun partenariat annoncé.", cta:"Découvrir la livraison" },
  { id:"benefits", label:"YAVIYA Benefits", image:"partner-benefits.jpg", eyebrow:"YAVIYA BENEFITS", title:"Vos achats méritent des avantages.", copy:"Coupons et services de livraison : découvrez les avantages YAVIYA présentés dans cette version de démonstration.", cta:"Découvrir les avantages" },
];
export default function PartnerPromotions({onHelp}) {
 const [selected,setSelected]=useState("payments");
 const ad=campaigns.find(c=>c.id===selected);
 return <section className="yv-partner-promotions" aria-label="Campagnes partenaires"><div className="yv-promotion-heading"><div><p className="yv-eyebrow">À LA UNE SUR YAVIYA</p><h2>Des services pour aller plus loin</h2></div><a href="/publicite.html">Devenir annonceur ↗</a></div><div className="yv-promotion-tabs" aria-label="Choisir une campagne">{campaigns.map(c=><button key={c.id} aria-pressed={selected===c.id} onClick={()=>setSelected(c.id)}>{c.label}</button>)}</div><article className="yv-partner-campaign"><div><span className="yv-campaign-label">ESPACE PUBLICITAIRE · DÉMO</span><p className="yv-eyebrow">{ad.eyebrow}</p><h3>{ad.title}</h3><p>{ad.copy}</p><button className="yv-primary" onClick={()=>onHelp(ad.id)}>{ad.cta} →</button><a href="mailto:partenariat@yaviya.cd">Proposer un partenariat</a></div><img src={"/"+ad.image} alt={ad.label+" — illustration de campagne"}/></article></section>;
}
