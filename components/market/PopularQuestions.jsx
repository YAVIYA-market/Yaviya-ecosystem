import { useState } from "react";
import { api } from "../../lib/market/api";
export default function PopularQuestions({
  faq,
  lang = "fr",
  onContact,
  user,
  country,
}) {
  const [query, setQuery] = useState(""),
    [responses, setResponses] = useState({}),
    [error, setError] = useState("");
  async function feedback(question, resolved) {
    setError("");
    if (!user) {
      setResponses((v) => ({ ...v, [question]: resolved }));
      return;
    }
    try {
      await api("/api/faq-feedback", { country, body: { question, resolved } });
      setResponses((v) => ({ ...v, [question]: resolved }));
    } catch (e) {
      setError(e.message);
    }
  }

  const results = faq.filter((q) =>
    q[lang]
      .join(" ")
      .toLocaleLowerCase("fr")
      .includes(query.toLocaleLowerCase("fr")),
  );
  return (
    <section className="yv-popular-questions" aria-label="Questions populaires">
      <div className="yv-faq-heading">
        <div>
          <p className="yv-eyebrow">VOS QUESTIONS, NOS RÉPONSES</p>
          <h2>
            {lang === "en" ? "Popular questions" : "Achetez en toute confiance"}
          </h2>
          <p>
            Commande, livraison, vendeurs : les réponses utiles avant votre
            prochain achat.
          </p>
        </div>
        <label>
          <span>Rechercher une réponse</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ex. livraison, paiement…"
          />
        </label>
      </div>
      <div className="yv-faq-list">
        {results.map((q) => (
          <details key={q.id} className="yv-faq">
            <summary>
              <span>{q[lang][0]}</span>
              <span className="yv-faq-toggle" aria-hidden="true">
                +
              </span>
            </summary>
            <p>{q[lang][1]}</p>
            <div className="yv-faq-feedback">
              <span>Problème résolu ?</span>
              <button
                type="button"
                aria-pressed={responses[q.id] === true}
                onClick={() => feedback(q.id, true)}
              >
                Oui
              </button>
              <button
                type="button"
                aria-pressed={responses[q.id] === false}
                onClick={() => feedback(q.id, false)}
              >
                Non
              </button>
              {responses[q.id] === true && (
                <small role="status">Merci pour votre retour.</small>
              )}
              {responses[q.id] === false && (
                <button
                  type="button"
                  className="yv-primary"
                  onClick={onContact}
                >
                  Contacter le support client
                </button>
              )}
            </div>
          </details>
        ))}
      </div>
      {!results.length && (
        <p role="status">
          Aucune réponse trouvée. Essayez un autre mot ou ouvrez « Besoin d’aide
          ».
        </p>
      )}
      <div className="yv-faq-contact">
        <p>Vous avez besoin d’un accompagnement personnalisé ?</p>
        <button type="button" onClick={onContact}>
          Contacter le support client
        </button>
      </div>
      {error && (
        <p role="alert" className="yv-error">
          {error}
        </p>
      )}
    </section>
  );
}
