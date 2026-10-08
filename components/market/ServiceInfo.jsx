import { useState } from "react";
import { amount } from "../../lib/market/api";
import { sellerPlans } from "../../lib/market/plans";
export function SellerPlans({ country, onChoose }) {
  const [billing, setBilling] = useState("monthly");
  return (
    <section>
      <p className="yv-eyebrow">VOTRE ACTIVITÉ, VOTRE FORMULE</p>
      <h3>Abonnements vendeurs</h3>
      <div className="yv-actions">
        <button
          type="button"
          aria-pressed={billing === "monthly"}
          onClick={() => setBilling("monthly")}
        >
          Mensuel
        </button>
        <button
          type="button"
          aria-pressed={billing === "annual"}
          onClick={() => setBilling("annual")}
        >
          Annuel
        </button>
      </div>
      <div className="yv-plan-grid">
        {sellerPlans.map((plan) => (
          <article key={plan.id}>
            <h4>{plan.name}</h4>
            <p>{plan.description}</p>
            <strong>
              {plan[billing] === null
                ? "Sur accord"
                : amount(plan[billing], country)}
              {plan[billing] > 0 && (
                <small> / {billing === "annual" ? "an" : "mois"}</small>
              )}
            </strong>
            <p>
              Commission proposée :{" "}
              {plan.commission === null ? "négociée" : plan.commission + " %"}
            </p>
            <ul>
              {plan.features.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
            {onChoose && (
              <button
                type="button"
                className="yv-primary"
                onClick={() => onChoose(plan.id)}
              >
                Choisir {plan.name}
              </button>
            )}
          </article>
        ))}
      </div>
      <p className="yv-muted">
        Offres de démonstration, sans facturation ni prélèvement. La commission
        est présentée à titre indicatif ; aucune comptabilité ni aucun
        reversement vendeur automatique ne sont activés.
      </p>
    </section>
  );
}
export default function ServiceInfo({
  type,
  country,
  config,
  onNavigate,
  onSeller,
}) {
  if (type === "seller-plans")
    return <SellerPlans country={country} onChoose={onSeller} />;
  if (type === "payments")
    return (
      <section className="yv-service-info">
        <p className="yv-eyebrow">DES PAIEMENTS ADAPTÉS À VOTRE QUOTIDIEN</p>
        <h3>Comment régler votre commande ?</h3>
        <div className="yv-info-grid">
          {[
            [
              "Espèces à réception",
              "Disponible : confirmez votre paiement à la réception, puis retrouvez son statut dans le suivi de commande.",
            ],
            [
              "M-Pesa · Orange Money · Airtel Money · Afrimoney",
              "Intégrations prévues. Ces moyens ne sont pas encore activés : aucun débit ni accès à votre compte mobile money.",
            ],
            [
              "Visa · Mastercard",
              "Paiement par carte prévu après activation du compte marchand et validation des webhooks.",
            ],
            [
              "Protection du paiement",
              "La réception est confirmée par l’acheteur. Aucun fonds réel n’est détenu en escrow par cette version.",
            ],
          ].map(([title, copy]) => (
            <article key={title}>
              <h4>{title}</h4>
              <p>{copy}</p>
            </article>
          ))}
        </div>
        <button type="button" onClick={() => onNavigate("orders")}>
          Suivre mon paiement et ma commande
        </button>
      </section>
    );
  if (type === "logistics")
    return (
      <section className="yv-service-info">
        <p className="yv-eyebrow">DU VENDEUR JUSQU’À VOUS</p>
        <h3>Livraison et retrait</h3>
        <div className="yv-info-grid">
          {[
            [
              "Main propre",
              "Retrait chez le vendeur, sans frais de transport.",
            ],
            [
              "À domicile",
              "Livraison à l’adresse confirmée, avec suivi partagé entre acheteur, vendeur et livreur.",
            ],
            [
              "Point relais",
              "Choix d’un point de retrait dans le parcours de commande.",
            ],
            [
              "Express",
              "Supplément indiqué dans le récapitulatif ; disponibilité à confirmer.",
            ],
          ].map(([title, copy]) => (
            <article key={title}>
              <h4>{title}</h4>
              <p>{copy}</p>
            </article>
          ))}
        </div>
        <p>
          Estimation indicative : 1 à 3 jours après validation du vendeur. Les
          frais sont calculés par colis vendeur et affichés avant confirmation.
        </p>
        <h4>Tarifs du parcours actuel par commune</h4>
        {country === "CD" ? (
          Object.entries(config.deliveryRates).map(([city, rates]) => (
            <details className="yv-faq" key={city}>
              <summary>{city}</summary>
              <div className="yv-table">
                <table>
                  <thead>
                    <tr>
                      <th>Commune</th>
                      <th>Standard / colis</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(rates).map(([commune, fee]) => (
                      <tr key={commune}>
                        <td>{commune}</td>
                        <td>{amount(fee, country)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          ))
        ) : (
          <p>
            Le tarif du marché Congo est présenté au paiement, en FCFA. Barème
            de démonstration à confirmer localement.
          </p>
        )}
        <button type="button" onClick={() => onNavigate("subscriptions")}>
          Voir les abonnements de livraison
        </button>
      </section>
    );
  if (type === "subscriptions" || type === "benefits")
    return (
      <section className="yv-service-info">
        <p className="yv-eyebrow">YAVIYA BENEFITS</p>
        <h3>Plus d’avantages pour vos achats</h3>
        <div className="yv-info-grid">
          <article>
            <h4>Livraison mensuelle</h4>
            <strong>{amount(25000, country)} / mois</strong>
            <p>
              Formule proposée. Nombre de livraisons, zones, plafonds et
              exclusions à confirmer avant activation.
            </p>
            <button type="button" disabled>
              Bientôt disponible
            </button>
          </article>
          <article className="yv-prime-card">
            <h4>YAVIYA Prime</h4>
            <strong>{amount(250000, country)} / an</strong>
            <ul>
              {[
                "Livraisons gratuites selon conditions",
                "Réductions exclusives prévues",
                "Accès anticipé aux promotions",
                "Support prioritaire prévu",
                "Offres partenaires",
                "Fidélité avec coupons",
              ].map((v) => (
                <li key={v}>{v}</li>
              ))}
            </ul>
            <button type="button" disabled>
              Souscription disponible au lancement
            </button>
          </article>
          <article>
            <h4>Coupons</h4>
            <p>
              Retrouvez votre portefeuille, les récompenses et l’historique des
              échanges de démonstration.
            </p>
            <button type="button" onClick={() => onNavigate("coupons")}>
              Ouvrir mes coupons
            </button>
          </article>
          <article>
            <h4>Vos achats, au même endroit</h4>
            <p>
              Suivez vos commandes, confirmez la réception et évaluez le vendeur
              et le livreur affecté.
            </p>
            <button type="button" onClick={() => onNavigate("orders")}>
              Mes commandes
            </button>
          </article>
        </div>
        <p className="yv-muted">
          Offres proposées, sans abonnement réel activé. L’express n’est pas
          automatiquement inclus. Les montants du marché Congo restent
          indicatifs.
        </p>
      </section>
    );
  return (
    <section>
      <h3>Devenir partenaire YAVIYA</h3>
      <p>
        Marque, entreprise de logistique ou prestataire : présentez votre
        entreprise, votre ville, vos coordonnées et votre proposition.
      </p>
      <a
        className="yv-primary"
        href="mailto:partenariat@yaviya.cd?subject=Proposition%20de%20partenariat%20YAVIYA"
      >
        Contacter partenariat@yaviya.cd
      </a>
    </section>
  );
}
