import { useRef, useState } from "react";
import { api, amount, imageUrl } from "../../lib/market/api";
export default function Checkout({
  selection,
  products,
  profile,
  country,
  config,
  onSuccess,
}) {
  const [city, setCity] = useState(
      country === "CG" ? "Brazzaville" : "Kinshasa",
    ),
    [commune, setCommune] = useState(country === "CG" ? "Makélékélé" : "Gombe"),
    [mode, setMode] = useState("home");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const requestKey = useRef(null);
  const municipalities =
    country === "CG"
      ? {
          Brazzaville: [
            "Makélékélé",
            "Bacongo",
            "Poto-Poto",
            "Moungali",
            "Ouenzé",
            "Talangaï",
            "Mfilou",
            "Madibou",
            "Djiri",
          ],
          "Pointe-Noire": [
            "Lumumba",
            "Mvoumvou",
            "Tié-Tié",
            "Loandjili",
            "Mongo-Mpoukou",
            "Ngoyo",
          ],
        }
      : Object.fromEntries(
          Object.entries(config.deliveryRates).map(([k, v]) => [
            k,
            Object.keys(v),
          ]),
        );
  const cities = country === "CG" ? Object.keys(municipalities) : config.cities;
  const items = selection.map((i) => ({
    ...products.find((p) => p.id === i.id),
    q: i.q,
  }));
  const sellers = new Set(items.map((p) => p.seller)).size;
  const fee =
    mode === "relay"
      ? 3500 * sellers
      : ["home", "express"].includes(mode)
        ? ((country === "CG"
            ? 7500
            : config.deliveryRates[city]?.[commune] || 7500) +
            (mode === "express" ? 7500 : 0)) *
          sellers
        : 0;
  const total = items.reduce((v, p) => v + p.price * p.q, 0) + fee;
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    if (!requestKey.current) requestKey.current = crypto.randomUUID();
    const d = Object.fromEntries(new FormData(e.currentTarget));
    try {
      const value = await api("/api/marketplace/orders?view=buyer", {
        country,
        body: {
          requestKey: requestKey.current,
          items: selection,
          city,
          commune,
          address: d.address,
          recipient: { name: d.recipientName, phone: d.recipientPhone },
          paymentId: "cod",
          delivery: { mode },
        },
      });
      await onSuccess(value.order);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="yv-form" onSubmit={submit} data-testid="checkout-form">
      <div className="yv-order-items">
        {items.map((p) => (
          <div key={p.id}>
            <img src={imageUrl(p.img)} alt="" />
            <span>
              {p.title}
              <small>Quantité : {p.q}</small>
            </span>
            <b>{amount(p.price * p.q, country)}</b>
          </div>
        ))}
      </div>
      <div className="yv-fields">
        <label>
          Destinataire *
          <input
            name="recipientName"
            required
            defaultValue={profile.name}
            maxLength={100}
          />
        </label>
        <label>
          Téléphone *
          <input
            name="recipientPhone"
            required
            type="tel"
            defaultValue={profile.phone}
            maxLength={30}
          />
        </label>
      </div>
      <label>
        Ville *
        <select
          value={city}
          onChange={(e) => {
            setCity(e.target.value);
            setCommune(municipalities[e.target.value]?.[0] || "");
          }}
        >
          {cities.map((v) => (
            <option key={v} disabled={!municipalities[v]}>
              {v}
              {!municipalities[v] ? " — bientôt disponible" : ""}
            </option>
          ))}
        </select>
      </label>
      <label>
        Commune *
        <select value={commune} onChange={(e) => setCommune(e.target.value)}>
          {(municipalities[city] || []).map((v) => (
            <option key={v}>{v}</option>
          ))}
        </select>
      </label>
      <label>
        Livraison
        <select value={mode} onChange={(e) => setMode(e.target.value)}>
          <option value="home">À domicile</option>
          <option value="express">Express</option>
          <option value="hand">Remise en main propre</option>
          <option value="relay">Point relais — à confirmer</option>
        </select>
      </label>
      <label>
        Adresse de livraison *
        <textarea
          name="address"
          required={mode !== "hand"}
          defaultValue={profile.address}
          maxLength={150}
        />
      </label>
      <fieldset>
        <legend>Paiement</legend>
        <label className="yv-check">
          <input type="radio" checked readOnly />
          Espèces à réception
        </label>
        <p>
          Mobile Money et cartes : activation du prestataire en attente. Aucun
          débit électronique ; escrow non activé.
        </p>
      </fieldset>
      <div className="yv-total">
        <span>Produits</span>
        <b>{amount(total - fee, country)}</b>
        <span>Livraison</span>
        <b>{amount(fee, country)}</b>
        <span>Total indicatif</span>
        <b>{amount(total, country)}</b>
      </div>
      <small>
        Le serveur recalcule et valide les prix et les frais lors de la
        confirmation.
      </small>
      {error && (
        <p className="yv-error" role="alert">
          {error}
        </p>
      )}
      <button className="yv-primary" disabled={busy}>
        {busy ? "Enregistrement de votre commande…" : "Confirmer ma commande"}
      </button>
    </form>
  );
}
