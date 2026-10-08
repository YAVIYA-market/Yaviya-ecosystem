import { useEffect, useState, useRef } from "react";
import { api, imageUrl } from "../../lib/market/api";
export default function Coupons({ country, products }) {
  const [wallet, setWallet] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [selected, setSelected] = useState(null),
    [notice, setNotice] = useState("");
  const reference = useRef(null);
  useEffect(() => {
    let live = true;
    api("/api/coupons", { country })
      .then((d) => {
        if (live) setWallet(d);
      })
      .catch((e) => {
        if (live) setError(e.message);
      });
    return () => {
      live = false;
    };
  }, [country]);
  async function update(body) {
    setBusy(true);
    setError("");
    try {
      const result = await api("/api/coupons", { country, body });
      setWallet(result);
      setSelected(null);
      setNotice(
        body.kind === "redeem"
          ? "Échange de démonstration enregistré. Aucun produit réel ne sera expédié."
          : "Crédit de démonstration ajouté.",
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="yv-coupons">
      <p className="yv-eyebrow">MON PORTEFEUILLE FIDÉLITÉ</p>
      <h3>Mes coupons</h3>
      {wallet ? (
        <>
          <div className="yv-wallet-balance">
            <strong>{wallet.balance.toLocaleString("fr-FR")}</strong>
            <span>coupons de démonstration</span>
          </div>
          <p>
            Règles proposées : 1 coupon par 2 000 FC de produits reçus et
            confirmés. Coupons sans valeur monétaire réelle, non retirables en
            espèces.
          </p>
          {!wallet.events.some((e) => e.kind === "demo_credit") && (
            <button
              disabled={busy}
              onClick={() => update({ kind: "demo_credit" })}
            >
              Tester avec 5 000 coupons · une seule fois
            </button>
          )}
          <h4>Échanger contre un produit · démo</h4>
          <p>Aucun produit réel expédié dans ce parcours de test.</p>
          <div className="yv-rewards">
            {Object.entries(wallet.rewards).map(([id, reward]) => {
              const product = products.find((p) => p.id === Number(id));
              return (
                <article key={id}>
                  {product && (
                    <img src={imageUrl(product.img)} alt={reward.name} />
                  )}
                  <h4>{reward.name}</h4>
                  <b>{reward.cost.toLocaleString("fr-FR")} coupons</b>
                  <button
                    disabled={busy || wallet.balance < reward.cost}
                    onClick={() => {
                      setSelected({ id: Number(id), ...reward });
                      reference.current = crypto.randomUUID();
                    }}
                  >
                    {wallet.balance < reward.cost
                      ? "Coupons insuffisants"
                      : "Choisir cette récompense"}
                  </button>
                </article>
              );
            })}
          </div>
          {selected && (
            <div className="yv-redeem-confirm">
              <h4>Confirmer l’échange de démonstration</h4>
              <p>
                {selected.name} · {selected.cost} coupons
              </p>
              <button
                className="yv-primary"
                disabled={busy}
                onClick={() =>
                  update({
                    kind: "redeem",
                    productId: selected.id,
                    reference: reference.current,
                  })
                }
              >
                Confirmer mon échange
              </button>
              <button disabled={busy} onClick={() => setSelected(null)}>
                Annuler
              </button>
            </div>
          )}
          <h4>Historique des coupons</h4>
          {wallet.events.length ? (
            <ul>
              {wallet.events.map((e) => (
                <li key={e.kind + e.reference}>
                  <span>
                    {
                      {
                        demo_credit: "Crédit de démonstration",
                        earn: "Réception confirmée",
                        redeem: "Échange de récompense",
                      }[e.kind]
                    }{" "}
                    · {new Date(e.created_at).toLocaleDateString("fr-FR")}
                  </span>
                  <b>
                    {e.delta > 0 ? "+" : ""}
                    {e.delta}
                  </b>
                </li>
              ))}
            </ul>
          ) : (
            <p>Aucun mouvement pour le moment.</p>
          )}
        </>
      ) : (
        <p>Chargement du portefeuille…</p>
      )}
      {notice && (
        <p role="status" className="yv-notice">
          {notice}
        </p>
      )}
      {error && (
        <p role="alert" className="yv-error">
          {error}
        </p>
      )}
    </section>
  );
}
