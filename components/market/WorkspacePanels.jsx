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
    <section>
      <h3>Vue d’ensemble</h3>
      <p>
        Les données ci-dessous proviennent des commandes et du catalogue
        accessibles à votre compte.
      </p>
      <div className="yv-stat-grid">
        {metrics.map(([label, value]) => (
          <p key={label}>
            {label}
            <b>{value}</b>
          </p>
        ))}
      </div>
      <div className="yv-info-grid">
        <article>
          <h4>À traiter</h4>
          <p>{pending.length} commande(s) en cours.</p>
          <button onClick={() => onTab("orders")}>Ouvrir les commandes</button>
        </article>
        <article>
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
      </div>
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
