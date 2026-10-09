import { useEffect, useState } from "react";
import { api, amount } from "../../lib/market/api";
function OrderChat({ order, country, role }) {
  const [messages, setMessages] = useState([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    let live = true;
    const load = () =>
      api("/api/marketplace/messages?orderId=" + encodeURIComponent(order.id), {
        country,
      })
        .then((v) => {
          if (live) setMessages(v);
        })
        .catch((e) => {
          if (live) setError(e.message);
        });
    load();
    const timer = setInterval(() => {
      if (document.visibilityState !== "hidden") load();
    }, 10000);
    return () => {
      live = false;
      clearInterval(timer);
    };
  }, [order.id, country]);
  async function send(e) {
    e.preventDefault();
    const form = e.currentTarget;
    setBusy(true);
    setError("");
    try {
      await api("/api/marketplace/messages", {
        country,
        body: {
          orderId: order.id,
          view: role,
          message: form.elements.message.value,
        },
      });
      setMessages(
        await api(
          "/api/marketplace/messages?orderId=" + encodeURIComponent(order.id),
          { country },
        ),
      );
      form.reset();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="yv-chat">
      <h4>Discussion de la commande</h4>
      <div aria-live="polite">
        {messages.map((m) => (
          <p key={m.id}>
            <b>{m.senderName || m.senderRole}</b> · {m.message}
          </p>
        ))}
      </div>
      <form onSubmit={send} className="yv-form">
        <label>
          Message
          <textarea name="message" required maxLength={2000} />
        </label>
        <button disabled={busy}>Envoyer</button>
      </form>
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
function ReviewForm({ order, country, onDone }) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const sellers = [...new Set(order.items.map((i) => i.seller))];
  async function save(e) {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.currentTarget));
    setBusy(true);
    try {
      await api("/api/delivery-reviews", {
        country,
        body: {
          orderId: order.id,
          sellerScores: Object.fromEntries(
            sellers.map((id) => [id, Number(d["seller-" + id])]),
          ),
          courierScore: order.courierUserId ? Number(d.courierScore) : null,
          comment: d.comment,
        },
      });
      onDone();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={save} className="yv-form">
      <h4>Évaluer votre livraison</h4>
      {sellers.map((id) => (
        <label key={id}>
          Note du vendeur {id}
          <select name={"seller-" + id}>
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>
                {n} / 5
              </option>
            ))}
          </select>
        </label>
      ))}
      {order.courierUserId && (
        <label>
          Note du livreur affecté
          <select name="courierScore">
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>
                {n} / 5
              </option>
            ))}
          </select>
        </label>
      )}
      <label>
        Votre avis
        <textarea name="comment" maxLength={1500} />
      </label>
      {error && <p role="alert">{error}</p>}
      <button disabled={busy}>Envoyer mon évaluation</button>
    </form>
  );
}
function Order({ order, country, role, sellerIds, onRefresh }) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [cashCollected, setCashCollected] = useState(false),
    [chat, setChat] = useState(false),
    [rated, setRated] = useState(false);
  async function act(action, extra = {}) {
    setBusy(true);
    setError("");
    try {
      await api("/api/marketplace/orders/action", {
        country,
        body: { orderId: order.id, revision: order.revision, action, ...extra },
      });
      await onRefresh();
      if (action === "buyer_receipt")
        await api("/api/coupons", {
          country,
          body: {
            kind: "earn",
            reference: order.id,
            amount: order.items.reduce(
              (sum, item) => sum + item.price * item.q,
              0,
            ),
          },
        });
    } catch (e) {
      setError(e.message);
      if (e.status === 409) await onRefresh();
    } finally {
      setBusy(false);
    }
  }
  async function proof(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const data = new FormData(e.currentTarget);
      data.set("orderId", order.id);
      data.set("revision", String(order.revision));
      data.set("delivered", "true");
      data.set("cashCollected", data.get("cashCollected") ? "true" : "false");
      await api("/api/marketplace/proof", { country, body: data });
      await onRefresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <article className="yv-order">
      <div className="yv-heading">
        <h3>{order.id}</h3>
        <b>{amount(order.total, country)}</b>
      </div>
      <p>
        {order.cancelled
          ? "Annulée"
          : order.buyerConfirmed
            ? "Réception confirmée"
            : ["Validation vendeur", "Préparation", "En livraison", "Livrée"][
                order.step || 0
              ]}{" "}
        · {order.city} · {order.commune}
      </p>
      <ol className="yv-steps">
        {["Commande", "Préparation", "Livraison", "Réception"].map((v, i) => (
          <li key={v} aria-current={order.step === i ? "step" : undefined}>
            {v}
          </li>
        ))}
      </ol>
      <p>{order.items.map((i) => i.title + " × " + i.q).join(" · ")}</p>
      <p>
        {order.paymentState || "Espèces à réception"} · Livraison :{" "}
        {amount(order.delivery?.fee, country)}
      </p>
      {order.returnStatus && <p>Retour : {order.returnStatus}</p>}
      {role === "courier" && <a target="_blank" rel="noopener noreferrer" href={"https://www.google.com/maps/dir/?api=1&destination="+encodeURIComponent([order.address,order.commune,order.city,country === "CG" ? "République du Congo" : "RD Congo"].join(", "))}>Ouvrir l’itinéraire GPS</a>}
      {role === "courier" && (
        <div className="yv-stat-grid">
          <p>
            Rémunération prévue<b>{amount(order.courierEarnings, country)}</b>
          </p>
          <p>
            Frais de mission<b>{amount(order.courierExpenses, country)}</b>
          </p>
          <p>
            Bénéfice net estimé<b>{amount(order.courierNet, country)}</b>
          </p>
          <p>
            Règlement<b>{order.courierPayout?.status}</b>
          </p>
        </div>
      )}
      {role === "seller" &&
        !order.cancelled &&
        !order.requestedCourier &&
        order.step === 3 &&
        sellerIds
          .filter(
            (id) =>
              Object.hasOwn(order.sellerSteps, id) &&
              !order.sellerCashConfirmed?.[id],
          )
          .map((id) => (
            <button
              key={id}
              disabled={busy}
              onClick={() =>
                act("cash_confirm", { sellerId: id, side: "seller" })
              }
            >
              Confirmer les espèces encaissées · boutique {id}
            </button>
          ))}
      {!order.cancelled && (
        <div className="yv-actions">
          {role === "buyer" && order.step === 3 && !order.buyerConfirmed && (
            <button
              disabled={busy}
              onClick={() => act("buyer_receipt", { cashPaid: true })}
            >
              Confirmer la réception et mon paiement
            </button>
          )}
          {role === "seller" &&
            sellerIds
              .filter((id) => Object.hasOwn(order.sellerSteps, id))
              .map((id) => (
                <div key={id}>
                  {!order.sellerAccepted[id] ? (
                    <>
                      <button
                        disabled={busy}
                        onClick={() => act("seller_accept", { sellerId: id })}
                      >
                        Accepter · boutique {id}
                      </button>
                      <button
                        disabled={busy}
                        onClick={() => act("seller_decline", { sellerId: id })}
                      >
                        Refuser
                      </button>
                    </>
                  ) : order.sellerSteps[id] < 1 ? (
                    <button
                      disabled={busy}
                      onClick={() => act("seller_prepare", { sellerId: id })}
                    >
                      Colis prêt
                    </button>
                  ) : !order.requestedCourier && order.sellerSteps[id] < 3 ? (
                    <div>
                      <label className="yv-check">
                        <input
                          type="checkbox"
                          checked={cashCollected}
                          onChange={(e) => setCashCollected(e.target.checked)}
                        />
                        Paiement en espèces encaissé
                      </label>
                      <button
                        disabled={busy}
                        onClick={() =>
                          act("seller_handover", {
                            sellerId: id,
                            cashCollected,
                          })
                        }
                      >
                        Confirmer la remise
                      </button>
                    </div>
                  ) : null}
                </div>
              ))}
          {role === "courier" && !order.courierUserId && (
            <button disabled={busy} onClick={() => act("courier_claim")}>
              Accepter cette mission
            </button>
          )}
          {role === "courier" && order.courierStatus === "accepted" && (
            <button disabled={busy} onClick={() => act("courier_collect")}>
              Colis récupéré
            </button>
          )}
          {role === "courier" && order.courierUserId && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                act("courier_expenses", {
                  expenses: Number(e.currentTarget.elements.expenses.value),
                });
              }}
            >
              <label>
                Frais de mission
                <input
                  type="number"
                  name="expenses"
                  min="0"
                  defaultValue={order.courierExpenses || 0}
                />
              </label>
              <button disabled={busy}>Enregistrer les frais</button>
            </form>
          )}
          {role === "admin" && order.courierPayout?.status === "due" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                act("courier_payout", {
                  reference: e.currentTarget.elements.reference.value,
                  channel: e.currentTarget.elements.channel.value,
                });
              }}
            >
              <label>
                Référence du règlement effectué
                <input name="reference" required maxLength={150} />
              </label>
              <select aria-label="Canal" name="channel">
                <option value="mobile_money">Mobile Money</option>
                <option value="bank">Banque</option>
                <option value="cash">Espèces</option>
              </select>
              <button disabled={busy}>Déclarer le règlement du livreur</button>
            </form>
          )}
        </div>
      )}
      {role === "courier" && order.courierStatus === "collected" && (
        <form onSubmit={proof} className="yv-form">
          <label>
            Preuve photo *
            <input
              type="file"
              name="photo"
              required
              accept="image/jpeg,image/png"
            />
          </label>
          <label className="yv-check">
            <input name="cashCollected" type="checkbox" />
            Paiement en espèces encaissé
          </label>
          <button disabled={busy}>Confirmer la livraison</button>
        </form>
      )}
      {role === "buyer" && order.buyerConfirmed && !rated && (
        <ReviewForm
          order={order}
          country={country}
          onDone={() => setRated(true)}
        />
      )}
      {rated && <p>Merci, votre évaluation a été enregistrée.</p>}
      {error && (
        <p className="yv-error" role="alert">
          {error}
        </p>
      )}
      <div className="yv-actions">
        <button onClick={() => setChat(!chat)}>
          {chat ? "Fermer la discussion" : "Discussion de la commande"}
        </button>
        {order.deliveryProof && (
          <a
            href={
              "/api/marketplace/proof?orderId=" +
              encodeURIComponent(order.id) +
              "&country=" +
              country
            }
            target="_blank"
            rel="noreferrer"
          >
            Voir la preuve photo
          </a>
        )}
      </div>
      {chat && <OrderChat order={order} country={country} role={role} />}
      <details>
        <summary>Historique</summary>
        <ul>
          {order.events.map((v, i) => (
            <li key={i}>{v}</li>
          ))}
        </ul>
      </details>
    </article>
  );
}
export default function Orders({ state, country, role, onRefresh }) {
  const orders = state.orders;
  const opportunities =
    role === "courier"
      ? (state.opportunities || []).filter(
          (o) => !orders.some((order) => order.id === o.id),
        )
      : [];
  return (
    <section>
      <div className="yv-heading">
        <h3>
          {role === "courier"
            ? "Mes livraisons et missions"
            : "Commandes partagées"}
        </h3>
        <button onClick={onRefresh}>Actualiser</button>
      </div>
      {!orders.length && !opportunities.length && (
        <p>Aucune commande pour cet espace.</p>
      )}
      {opportunities.map((opportunity) => (
        <CourierOpportunity
          key={opportunity.id}
          opportunity={opportunity}
          country={country}
          onRefresh={onRefresh}
        />
      ))}
      {orders.map((o) => (
        <Order
          key={o.id}
          order={o}
          country={country}
          role={role}
          sellerIds={state.sellerIds || []}
          onRefresh={onRefresh}
        />
      ))}
    </section>
  );
}

function CourierOpportunity({ opportunity, country, onRefresh }) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function claim() {
    setBusy(true);
    setError("");
    try {
      await api("/api/marketplace/orders/action", {
        country,
        body: {
          orderId: opportunity.id,
          revision: opportunity.revision,
          action: "courier_claim",
        },
      });
      await onRefresh();
    } catch (e) {
      setError(e.message);
      if (e.status === 409) await onRefresh();
    } finally {
      setBusy(false);
    }
  }
  return (
    <article className="yv-order yv-opportunity">
      <p className="yv-eyebrow">MISSION DISPONIBLE</p>
      <h3>{opportunity.id}</h3>
      <p>
        {opportunity.city} · {opportunity.commune} · {opportunity.parcels} colis
      </p>
      <p>
        Rémunération prévue : <b>{amount(opportunity.earnings, country)}</b>
      </p>
      <p>Les détails de la commande sont disponibles après affectation.</p>
      <button className="yv-primary" disabled={busy} onClick={claim}>
        {busy ? "Affectation…" : "Accepter cette mission"}
      </button>
      {error && (
        <p className="yv-error" role="alert">
          {error}
        </p>
      )}
    </article>
  );
}
