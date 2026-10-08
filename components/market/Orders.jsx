import { useEffect, useState } from "react";
import { api, amount } from "../../lib/market/api";
function OrderChat({ order, country, role }) {
  const [messages, setMessages] = useState([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    let live = true;
    api("/api/marketplace/messages?orderId=" + encodeURIComponent(order.id), {
      country,
    })
      .then((v) => {
        if (live) setMessages(v);
      })
      .catch((e) => {
        if (live) setError(e.message);
      });
    return () => {
      live = false;
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
                    <button
                      disabled={busy}
                      onClick={() => act("seller_handover", { sellerId: id })}
                    >
                      Confirmer la remise
                    </button>
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
  const orders =
    role === "courier"
      ? [
          ...state.orders,
          ...(state.opportunities || []).filter(
            (o) => !state.orders.some((v) => v.id === o.id),
          ),
        ]
      : state.orders;
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
      {!orders.length && <p>Aucune commande pour cet espace.</p>}
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
