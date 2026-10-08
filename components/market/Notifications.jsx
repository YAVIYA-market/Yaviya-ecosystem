import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { api } from "../../lib/market/api";
import Modal from "./Modal";

const fingerprint = (order) => String(order.revision ?? JSON.stringify([order.events?.length, order.step, order.paymentStatus, order.courierStatus, order.buyerConfirmed, order.cancelled]));
export default function Notifications({ user, profile, country, lang, onSignIn, onOrders }) {
  const [open, setOpen] = useState(false);
  const [snapshot, setSnapshot] = useState({ key: null, orders: [] });
  const [seen, setSeen] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const role = ["seller", "courier"].includes(profile?.accountType) ? profile.accountType : "buyer";
  const storageKey = user ? `yaviya:notifications:v1:${country}:${user.id}` : null;
  const orders = snapshot.key === storageKey ? snapshot.orders : [];
  const close = useCallback(() => setOpen(false), []);
  const t = (fr, en) => lang === "en" ? en : fr;
  useEffect(() => {
    setSnapshot({ key: storageKey, orders: [] }); setSeen({}); setError("");
    if (!storageKey) return;
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || "{}");
      if (saved && typeof saved === "object" && !Array.isArray(saved)) setSeen(saved);
    } catch {}
  }, [storageKey]);
  useEffect(() => {
    if (!user) return;
    let live = true, working = false;
    const controller = new AbortController();
    async function load() {
      if (working || document.visibilityState === "hidden") return;
      working = true;
      if (live) setLoading(true);
      try {
        let data, view = role;
        try { data = await api("/api/marketplace?view=" + role, { country, signal: controller.signal }); }
        catch (e) {
          if (role === "buyer" || e.status !== 403) throw e;
          view = "buyer";
          data = await api("/api/marketplace?view=buyer", { country, signal: controller.signal });
        }
        if (live) { setSnapshot({ key: storageKey, view, orders: data.orders || [] }); setError(""); }
      } catch (e) { if (live) setError(e.message); }
      finally { working = false; if (live) setLoading(false); }
    }
    load();
    const timer = setInterval(load, 60000);
    return () => { live = false; controller.abort(); clearInterval(timer); };
  }, [user?.id, country, role, open]);
  const unread = orders.filter((o) => seen[o.id] !== fingerprint(o)).length;
  function markRead() {
    const next = Object.fromEntries(orders.map((o) => [o.id, fingerprint(o)]));
    setSeen(next);
    try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch {}
  }
  return <>
    <button className="yv-notification-button" aria-label={t("Notifications", "Notifications") + (unread ? ` · ${unread}` : "")} onClick={() => setOpen(true)}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9 M9 21h6" /></svg>
      <span>{t("Notifications", "Notifications")}</span>{unread > 0 && <b className="yv-notification-count">{unread > 99 ? "99+" : unread}</b>}
    </button>
    {open && createPortal(<Modal title={t("Mes notifications", "My notifications")} onClose={close}>
      <section className="yv-notifications">
        {!user ? <div className="yv-workspace-empty"><h3>{t("Retrouvez le suivi de vos commandes", "Keep track of your orders")}</h3><p>{t("Connectez-vous pour consulter les dernières nouvelles de votre activité YAVIYA.", "Sign in to see the latest updates about your YAVIYA activity.")}</p><button className="yv-primary" onClick={() => { close(); onSignIn(); }}>{t("Se connecter", "Sign in")}</button></div> : <>
          <div className="yv-heading"><p>{t("Les dernières mises à jour de vos commandes et livraisons.", "The latest updates on your orders and deliveries.")}</p><button disabled={!unread || loading} onClick={markRead}>{t("Tout marquer comme lu", "Mark all as read")}</button></div>
          {error && <p role="alert" className="yv-error">{error}</p>}
          {loading && !orders.length && <p role="status">{t("Chargement…", "Loading…")}</p>}
          {!loading && !error && !orders.length && <div className="yv-workspace-empty"><h3>{t("Vous êtes à jour", "You're up to date")}</h3><p>{t("Les nouvelles de vos commandes apparaîtront ici.", "Updates on your orders will appear here.")}</p></div>}
          <ul>{orders.slice().sort((a, b) => Number(b.createdAt) - Number(a.createdAt)).map((o) => <li key={o.id} className={seen[o.id] !== fingerprint(o) ? "unread" : ""}><div><strong>{o.id}</strong><p>{typeof o.events?.at(-1) === "string" ? o.events.at(-1) : o.cancelled ? t("Commande annulée", "Order cancelled") : o.buyerConfirmed ? t("Livraison confirmée", "Delivery confirmed") : t("Commande en cours de traitement", "Order in progress")}</p><small>{seen[o.id] !== fingerprint(o) ? t("Non lue", "Unread") : t("Lue", "Read")}</small></div><button onClick={() => { markRead(); close(); onOrders(snapshot.view || "buyer"); }}>{t("Voir le suivi", "Track order")}</button></li>)}</ul>
        </>}
      </section>
    </Modal>, document.body)}
  </>;
}
