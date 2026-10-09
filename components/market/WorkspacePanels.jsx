import VerifiedSellerBadge from "./VerifiedSellerBadge";
import { amount } from "../../lib/market/api";
import { SellerPlans } from "./ServiceInfo";
export function WorkspaceOverview({ state, role, country, onTab }) {
  const orders = state.orders || [],
    active = orders.filter((o) => !o.cancelled),
    completed = active.filter((o) => o.buyerConfirmed),
    pending = active.filter((o) => !o.buyerConfirmed);
  const catalogue =
    role === "seller"
      ? state.catalogue.filter((p) => state.sellerIds.includes(p.seller))
      : state.catalogue;
  const metrics =
    role === "courier"
      ? [
          ["Mes missions", orders.length],
          ["Livraisons confirmées", completed.length],
          ["Missions proposées", state.opportunities.length],
          [
            "Rémunération à régler",
            amount(
              orders
                .filter((o) => o.courierPayout?.status === "due")
                .reduce((n, o) => n + (o.courierEarnings || 0), 0),
              country,
            ),
          ],
        ]
      : [
          ["Commandes", orders.length],
          ["En cours", pending.length],
          ["Réceptions confirmées", completed.length],
          ["Produits de mon périmètre", catalogue.length],
        ];
  return (
    <section className="yv-workspace-overview">
      <div className="yv-section-heading"><div><h3>Vue d’ensemble</h3><p>{role === "courier" ? "Votre journée de livraison commence ici." : role === "seller" ? "Les repères essentiels pour gérer votre boutique." : "L’activité de votre marché en un coup d’œil."}</p></div><span className="yv-workspace-market">{country === "CG" ? "République du Congo" : "RD Congo"}</span></div>
      <div className="yv-stat-grid">
        {metrics.map(([label, value]) => (
          <p key={label}>
            {label}
            <b>{value}</b>
          </p>
        ))}
      </div>
      <div className="yv-workspace-priority">
        <div><span className="yv-eyebrow">VOTRE PRIORITÉ</span><h4>{role === "courier" ? state.opportunities.length ? "Des missions sont disponibles" : "Préparez votre prochaine mission" : pending.length ? "Des commandes attendent votre suivi" : "Votre activité est à jour"}</h4><p>{role === "courier" ? `${state.opportunities.length} mission(s) proposée(s) · ${pending.length} livraison(s) en cours.` : `${pending.length} commande(s) en cours à suivre avec vos clients.`}</p></div>
        <button className="yv-primary" onClick={() => onTab("orders")}>{role === "courier" ? "Voir mes missions" : "Suivre mes commandes"}</button>
      </div>
      <div className="yv-info-grid yv-workspace-actions">
        <article>
          <span className="yv-action-number" aria-hidden="true">↗</span>
          <h4>{role === "courier" ? "Mes livraisons" : "Mes commandes"}</h4>
          <p>{role === "courier" ? "Retrouvez vos étapes, la preuve de livraison et le règlement de chaque mission." : "Consultez les articles, préparez les commandes et suivez leur progression."}</p>
          <button onClick={() => onTab("orders")}>Ouvrir les commandes</button>
        </article>
        <article>
          <span className="yv-action-number" aria-hidden="true">▦</span>
          <h4>
            {role === "courier"
              ? "Disponibilité et règlement"
              : "Catalogue et visibilité"}
          </h4>
          <p>
            {role === "courier"
              ? "Confirmez votre disponibilité et les coordonnées nécessaires au règlement de vos missions."
              : "Vérifiez vos produits, leurs photos et leur visibilité."}
          </p>
          <button
            onClick={() =>
              onTab(role === "courier" ? "availability" : "products")
            }
          >
            Gérer mon activité
          </button>
        </article>
        <article><span className="yv-action-number" aria-hidden="true">◎</span><h4>{role === "admin" ? "Validation des partenaires" : "Mon accompagnement"}</h4><p>{role === "admin" ? "Contrôlez les pièces et les informations des vendeurs et livreurs avant validation." : "Échangez avec YAVIYA pour le suivi de votre activité et de vos demandes."}</p><button onClick={() => onTab(role === "admin" ? "verification" : "messages")}>{role === "admin" ? "Vérifier les dossiers" : "Contacter YAVIYA"}</button></article>
      </div>
      <div className="yv-workspace-recent"><div className="yv-heading"><h4>{role === "courier" ? "Dernières missions" : "Dernières commandes"}</h4><button onClick={() => onTab("orders")}>Tout voir</button></div>{orders.length ? <ul>{orders.slice().sort((a, b) => Number(b.createdAt) - Number(a.createdAt)).slice(0, 3).map((o) => <li key={o.id}><div><strong>{o.id}</strong><span>{o.city || ""}{o.commune ? " · " + o.commune : ""}</span></div><span className={"yv-review-status " + (o.cancelled ? "rejected" : o.buyerConfirmed ? "approved" : "pending")}>{o.cancelled ? "Annulée" : o.buyerConfirmed ? "Livrée" : "En cours"}</span><b>{amount(role === "courier" ? o.courierEarnings || 0 : o.total || 0, country)}</b></li>)}</ul> : <div className="yv-workspace-empty"><p>{role === "courier" ? "Vos missions acceptées apparaîtront ici." : "Votre prochaine commande apparaîtra ici dès sa création."}</p></div>}</div>
    </section>
  );
}
export function WorkspaceFinance({ state, role, country, onOrders }) {
  const orders = state.orders.filter((o) => !o.cancelled);
  const goods = (o) =>
    o.items
      .filter((i) => role !== "seller" || state.sellerIds.includes(i.seller))
      .reduce((n, i) => n + i.price * i.q, 0);
  return (
    <section>
      <h3>
        {role === "seller" ? "Commandes et paiements" : "Finance et règlements"}
      </h3>
      <p>
        Suivi des montants des commandes. Les confirmations d’espèces sont des
        déclarations des participants ; aucun relevé bancaire n’est importé.
      </p>
      <div className="yv-stat-grid">
        <p>
          Produits commandés
          <b>
            {amount(
              orders.reduce((n, o) => n + goods(o), 0),
              country,
            )}
          </b>
        </p>
        <p>
          Produits avec espèces confirmées
          <b>
            {amount(
              orders
                .filter((o) => o.paymentStatus === "cash_confirmed")
                .reduce((n, o) => n + goods(o), 0),
              country,
            )}
          </b>
        </p>
        {role !== "seller" && (
          <p>
            Règlements livreurs à traiter
            <b>
              {amount(
                orders
                  .filter((o) => o.courierPayout?.status === "due")
                  .reduce((n, o) => n + o.courierEarnings, 0),
                country,
              )}
            </b>
          </p>
        )}
      </div>
      <div className="yv-table">
        <table>
          <thead>
            <tr>
              <th>Commande</th>
              <th>Produits</th>
              <th>Paiement</th>
              <th>Réception</th>
              {role !== "seller" && <th>Règlement livreur</th>}
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td>{o.id}</td>
                <td>{amount(goods(o), country)}</td>
                <td>{o.paymentState}</td>
                <td>{o.buyerConfirmed ? "Confirmée" : "En attente"}</td>
                {role !== "seller" && (
                  <td>
                    {{
                      awaiting_delivery: "En attente de livraison",
                      due: "À régler",
                      paid_manual: "Règlement déclaré",
                    }[o.courierPayout?.status] || "Non applicable"}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!orders.length && <p>Aucune commande pour la période disponible.</p>}
      <button onClick={onOrders}>Ouvrir les commandes et les règlements</button>
      <p className="yv-muted">
        Commissions comptables, reversements aux vendeurs, remboursements et
        escrow nécessitent encore l’intégration du prestataire financier. Aucun
        virement n’est effectué depuis ce panneau.
      </p>
    </section>
  );
}
export function WorkspaceStores({ state }) {
  return (
    <section>
      <h3>Boutiques vérifiées</h3>
      <p>
        Liste issue de la vérification des vendeurs. Les boutiques de
        démonstration du catalogue sont distinctes.
      </p>
      <div className="yv-table">
        <table>
          <thead>
            <tr>
              <th>Identifiant</th>
              <th>Boutique</th>
              <th>Pays</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            {state.stores.map((s) => (
              <tr key={s.id}>
                <td>{s.id}</td>
                <td>{s.name}</td>
                <td>{s.country}</td>
                <td>
                  {s.reviewed ? (
                    <VerifiedSellerBadge verified demo={s.id < 10000} />
                  ) : (
                    "À contrôler"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!state.stores.length && (
        <p>Aucune boutique réelle vérifiée pour ce marché.</p>
      )}
    </section>
  );
}
export function WorkspaceSubscriptions({ country, onManage }) {
  return (
    <section>
      <SellerPlans country={country} />
      <button className="yv-primary" onClick={onManage}>
        Consulter ou mettre à jour mon dossier vendeur
      </button>
    </section>
  );
}
export function WorkspaceAdvertising() {
  return (
    <section>
      <h3>Publicités et partenariats</h3>
      <div className="yv-info-grid">
        {[
          "M-Pesa · paiement mobile",
          "Partenaire logistique",
          "YAVIYA Benefits",
          "Sélections produits",
        ].map((name) => (
          <article key={name}>
            <h4>{name}</h4>
            <p>
              Emplacement illustratif disponible sur l’accueil et la page
              publicitaire.
            </p>
          </article>
        ))}
      </div>
      <a className="yv-primary" href="/publicite.html">
        Voir les campagnes
      </a>
      <p>
        La gestion des campagnes commerciales et de leur facturation n’est pas
        encore connectée à une API.
      </p>
      <a href="mailto:partenariat@yaviya.cd">partenariat@yaviya.cd</a>
    </section>
  );
}
