import { useEffect, useState } from "react";
import { api } from "../../lib/market/api";

const statuses = { pending: "À vérifier", approved: "Validé", rejected: "Refusé" };
function ReviewCard({ row, country, config, busy, onDecide }) {
  const [decision, setDecision] = useState("approve");
  const [identity, setIdentity] = useState(false);
  const [company, setCompany] = useState(false);
  const seller = row.kind === "seller";
  const issuingCountry = config.identityCountries?.find((c) => c.code === row.issuingCountry)?.fr || row.issuingCountry;
  return (
    <article className="yv-review-card">
      <header>
        <div><small>{seller ? "DOSSIER VENDEUR" : "DOSSIER LIVREUR"} · {row.publicId}</small><h4>{row.companyName || row.name}</h4><p>{row.name}</p></div>
        <span className={"yv-review-status " + row.status}>{statuses[row.status] || row.status}</span>
      </header>
      <div className="yv-review-content">
        <div className="yv-review-evidence">
          <h5>Informations du dossier</h5>
          <dl>
            <div><dt>Téléphone</dt><dd>{row.phone || "Non renseigné"}</dd></div>
            <div><dt>Pays de la pièce</dt><dd>{issuingCountry}</dd></div>
            <div><dt>Document</dt><dd>{row.documentType === "licence-c" ? "Permis de conduire C" : "Pièce d’identité"}</dd></div>
            {seller && <div><dt>Statut de l’activité</dt><dd>{row.unregistered ? "Activité sans RCCM déclaré" : row.companyRcm || "RCCM à contrôler"}</dd></div>}
            <div><dt>Abonnement choisi</dt><dd>{seller ? ({ free: "Gratuit", plus: "Plus", premium: "Premium", business: "Business", enterprise: "Entreprise" }[row.sellerPlan] || row.sellerPlan || "Non renseigné") : row.courierPlan === "standard" ? "Standard" : row.courierPlan || "Non renseigné"}</dd></div>
            <div><dt>Soumis le</dt><dd>{row.submittedAt ? new Date(Number(row.submittedAt)).toLocaleDateString("fr-FR") : "Non renseigné"}</dd></div>
          </dl>
          <a className="yv-review-document" target="_blank" rel="noreferrer" href={"/api/verification/document?userId=" + encodeURIComponent(row.userId) + "&kind=" + row.kind + "&country=" + country}>
            Consulter la pièce privée <span aria-hidden="true">↗</span>
          </a>
          <small>Accès réservé au contrôle du dossier. Ouverture dans un nouvel onglet.</small>
        </div>
        {row.status === "pending" ? (
          <form className="yv-form yv-review-decision" onSubmit={(e) => onDecide(e, row.userId)}>
            <h5>Contrôle et décision</h5>
            <p>Examinez la pièce et les informations avant de valider le compte.</p>
            <label className="yv-check"><input name="identityChecked" type="checkbox" checked={identity} onChange={(e) => setIdentity(e.target.checked)} />Document vérifié manuellement</label>
            {seller && <label className="yv-check"><input name="companyChecked" type="checkbox" checked={company} onChange={(e) => setCompany(e.target.checked)} />Informations de boutique vérifiées</label>}
            <label>Décision<select name="decision" value={decision} onChange={(e) => setDecision(e.target.value)}><option value="approve">Valider le dossier</option><option value="reject">Refuser le dossier</option></select></label>
            <label>{decision === "reject" ? "Motif du refus *" : "Note de contrôle"}<textarea name="note" required={decision === "reject"} maxLength={500} placeholder={decision === "reject" ? "Précisez les éléments à corriger…" : "Ajouter une observation…"} /></label>
            <button className="yv-primary" disabled={busy || (decision === "approve" && (!identity || (seller && !company)))}>{busy ? "Enregistrement…" : "Enregistrer la décision"}</button>
          </form>
        ) : <div className="yv-review-result"><h5>Décision enregistrée</h5><p>{statuses[row.status]}</p><p>{row.note || "Aucune observation complémentaire."}</p></div>}
      </div>
    </article>
  );
}

export default function VerificationReview({ country, config, onRefresh }) {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("pending");
  const [kind, setKind] = useState("all");
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState("");
  useEffect(() => {
    let live = true;
    setLoading(true);
    api("/api/verification/reviews", { country }).then((data) => { if (live) setRows(data); }).catch((e) => { if (live) setError(e.message); }).finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [country]);
  async function decide(e, userId) {
    e.preventDefault();
    if (!e.currentTarget.reportValidity()) return;
    const data = Object.fromEntries(new FormData(e.currentTarget));
    setBusy(true); setError(""); setNotice("");
    try {
      await api("/api/verification/reviews", { country, body: { userId, decision: data.decision, note: data.note, identityChecked: data.identityChecked === "on", companyChecked: data.companyChecked === "on" } });
      setRows(await api("/api/verification/reviews", { country }));
      setNotice(data.decision === "approve" ? "Dossier validé. Le statut du compte a été mis à jour." : "Refus enregistré avec son motif.");
      await onRefresh();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  const search = query.trim().toLocaleLowerCase("fr");
  const filtered = rows.filter((r) => (status === "all" || r.status === status) && (kind === "all" || r.kind === kind) && [r.name, r.companyName, r.publicId, r.phone].join(" ").toLocaleLowerCase("fr").includes(search));
  return (
    <section className="yv-review-center" aria-busy={loading || busy}>
      <div className="yv-section-heading"><div><p className="yv-eyebrow">CONFIANCE & CONTRÔLE</p><h3>Validation des vendeurs et livreurs</h3><p>Une décision documentée pour chaque partenaire YAVIYA.</p></div></div>
      <div className="yv-review-summary">{Object.entries(statuses).map(([key, label]) => <button key={key} aria-pressed={status === key} onClick={() => setStatus(key)}><span>{label}</span><strong>{rows.filter((r) => r.status === key).length}</strong></button>)}</div>
      <div className="yv-review-filters">
        <label>Rechercher un dossier<input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Nom, boutique, identifiant ou téléphone" /></label>
        <label>Type de compte<select value={kind} onChange={(e) => setKind(e.target.value)}><option value="all">Tous les partenaires</option><option value="seller">Vendeurs</option><option value="courier">Livreurs</option></select></label>
        <label>Statut<select value={status} onChange={(e) => setStatus(e.target.value)}><option value="all">Tous les dossiers</option>{Object.entries(statuses).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      </div>
      {notice && <p className="yv-review-notice" role="status">{notice}</p>}
      {error && <p className="yv-error" role="alert">{error}</p>}
      {loading ? <p role="status">Chargement des dossiers…</p> : <>
        <p className="yv-muted">{filtered.length} dossier(s) affiché(s)</p>
        {filtered.map((row) => <ReviewCard key={row.userId + row.kind + row.status} row={row} country={country} config={config} busy={busy} onDecide={decide} />)}
        {!filtered.length && <div className="yv-workspace-empty"><h4>Aucun dossier dans cette sélection</h4><p>Les nouvelles demandes apparaîtront ici dès leur soumission.</p><button onClick={() => { setStatus("all"); setKind("all"); setQuery(""); }}>Voir tous les dossiers</button></div>}
      </>}
    </section>
  );
}
