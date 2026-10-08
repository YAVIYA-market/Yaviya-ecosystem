import {useState} from "react";
export default function PopularQuestions({faq,lang="fr"}) {
 const [query,setQuery]=useState("");
 const results=faq.filter(q=>q[lang].join(" ").toLocaleLowerCase("fr").includes(query.toLocaleLowerCase("fr")));
 return <section className="yv-popular-questions" aria-label="Questions populaires"><div className="yv-faq-heading"><div><p className="yv-eyebrow">VOS QUESTIONS, NOS RÉPONSES</p><h2>{lang==="en"?"Popular questions":"Achetez en toute confiance"}</h2><p>Commande, livraison, vendeurs : les réponses utiles avant votre prochain achat.</p></div><label><span>Rechercher une réponse</span><input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Ex. livraison, paiement…"/></label></div><div className="yv-faq-list">{results.map((q,i)=><details key={q.id} className="yv-faq"><summary><span className="yv-faq-number">{String(i+1).padStart(2,"0")}</span><span>{q[lang][0]}</span><span className="yv-faq-toggle" aria-hidden="true">+</span></summary><p>{q[lang][1]}</p></details>)}</div>{!results.length&&<p role="status">Aucune réponse trouvée. Essayez un autre mot ou ouvrez « Besoin d’aide ».</p>}</section>;
}
