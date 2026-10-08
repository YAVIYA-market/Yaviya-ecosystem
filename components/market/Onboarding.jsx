import { useState } from "react";
import ProfileForm from "./ProfileForm";
import { api } from "../../lib/market/api";
export default function Onboarding({
  role,
  profile,
  country,
  config,
  onSaved,
}) {
  const [step, setStep] = useState(0),
    [saved, setSaved] = useState(profile),
    [values, setValues] = useState({
      issuingCountry: country,
      documentType: "identity",
      unregistered: false,
      sellerPlan: "free",
      courierPayoutMethod: "mobile_money",
      courierPayoutAccount: "",
      companyName: "",
      companyRcm: "",
      courierBenefitsAccepted: false,
    });
  const [file, setFile] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const seller = role === "seller";
  const steps = seller
    ? ["Coordonnées", "Boutique", "Identité", "Abonnement"]
    : ["Coordonnées", "Identité", "Benefits & règlement", "Abonnement"];
  const field = (name, value) => setValues((v) => ({ ...v, [name]: value }));
  async function submit(e) {
    e.preventDefault();
    if (!e.currentTarget.reportValidity()) return;
    setError("");
    if (step < 3) {
      setStep(step + 1);
      return;
    }
    setBusy(true);
    try {
      if (!file) throw Error("Ajoutez la photo de votre pièce d’identité.");
      const body = new FormData();
      Object.entries(values).forEach(([k, v]) => body.set(k, String(v)));
      body.set("document", file);
      body.set("identityConfirmed", "true");
      body.set("courierPlan", "standard");
      await api("/api/verification", { country, body });
      await onSaved(saved);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section>
      <ol className="yv-steps">
        {steps.map((v, i) => (
          <li key={v} aria-current={i === step ? "step" : undefined}>
            {i + 1}. {v}
          </li>
        ))}
      </ol>
      {step === 0 ? (
        <ProfileForm
          role={role}
          profile={profile}
          country={country}
          config={config}
          onSaved={(p) => {
            setSaved(p);
            setStep(1);
          }}
        />
      ) : (
        <form className="yv-form" onSubmit={submit}>
          {seller && step === 1 && (
            <>
              <p>
                Votre boutique peut être une petite entreprise non enregistrée.
                Précisez son statut pour préparer la vérification.
              </p>
              <label>
                Nom de la boutique *
                <input
                  required
                  value={values.companyName}
                  onChange={(e) => field("companyName", e.target.value)}
                  maxLength={150}
                />
              </label>
              <label className="yv-check">
                <input
                  type="checkbox"
                  checked={values.unregistered}
                  onChange={(e) => field("unregistered", e.target.checked)}
                />
                Je n’ai pas de numéro RCCM
              </label>
              {!values.unregistered && (
                <label>
                  Numéro RCCM *
                  <input
                    required
                    value={values.companyRcm}
                    onChange={(e) => field("companyRcm", e.target.value)}
                    maxLength={100}
                  />
                </label>
              )}
              <p>Adresse confirmée : {saved?.address}</p>
            </>
          )}
          {step === (seller ? 2 : 1) && (
            <>
              <p>
                Votre pièce d’identité sera conservée en privé et vérifiée
                manuellement par l’administration.
              </p>
              <label>
                Pays d’émission *
                <select
                  required
                  value={values.issuingCountry}
                  onChange={(e) => field("issuingCountry", e.target.value)}
                >
                  {config.identityCountries.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.fr}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Type de document *
                <select
                  value={values.documentType}
                  onChange={(e) => field("documentType", e.target.value)}
                >
                  <option value="identity">Carte d’identité</option>
                  <option value="passport">Passeport</option>
                  <option value="voter">Carte d’électeur</option>
                  {!seller && (
                    <>
                      <option value="licence-b">Permis B</option>
                      <option value="licence-c">Permis C</option>
                    </>
                  )}
                </select>
              </label>
              <label>
                Photo de la pièce d’identité *
                <input
                  type="file"
                  accept="image/jpeg,image/png"
                  required={!file}
                  onChange={(e) => setFile(e.target.files[0] || null)}
                />
              </label>
              {file && <p>{file.name}</p>}
              <label className="yv-check">
                <input required type="checkbox" />
                Je confirme que le document et les informations m’appartiennent.
              </label>
            </>
          )}
          {!seller && step === 2 && (
            <>
              <h3>Benefits et paiement par livraison</h3>
              <p>
                Recevez des missions, suivez vos revenus et discutez avec
                YAVIYA. Le montant prévu et les frais de mission apparaissent
                sur chaque livraison. Les règlements sont déclarés manuellement
                ; aucun virement automatique.
              </p>
              <label>
                Méthode de règlement
                <select
                  value={values.courierPayoutMethod}
                  onChange={(e) => field("courierPayoutMethod", e.target.value)}
                >
                  <option value="mobile_money">Mobile Money</option>
                  <option value="bank">Banque</option>
                  <option value="cash">Espèces</option>
                </select>
              </label>
              {values.courierPayoutMethod !== "cash" && (
                <label>
                  Compte de règlement *
                  <input
                    required
                    value={values.courierPayoutAccount}
                    onChange={(e) =>
                      field("courierPayoutAccount", e.target.value)
                    }
                    maxLength={150}
                  />
                </label>
              )}
              <label className="yv-check">
                <input
                  type="checkbox"
                  required
                  checked={values.courierBenefitsAccepted}
                  onChange={(e) =>
                    field("courierBenefitsAccepted", e.target.checked)
                  }
                />
                J’ai lu les conditions et confirmé mes tâches.
              </label>
            </>
          )}
          {step === 3 && (
            <>
              <h3>Choisir votre abonnement</h3>
              {seller ? (
                <label>
                  Forfait
                  <select
                    value={values.sellerPlan}
                    onChange={(e) => field("sellerPlan", e.target.value)}
                  >
                    <option value="free">Free — 0 FC</option>
                    <option value="plus">Plus — 35 000 FC / mois</option>
                    <option value="premium">Premium — 75 000 FC / mois</option>
                    <option value="business">
                      Business — 250 000 FC / mois
                    </option>
                    <option value="enterprise">Enterprise — sur accord</option>
                  </select>
                </label>
              ) : (
                <p>
                  Standard : accès aux missions après validation du dossier.
                </p>
              )}
              <p>
                Le choix est enregistré sans facturation. Les paiements
                d’abonnement nécessitent l’activation du prestataire.
              </p>
              <label className="yv-check">
                <input required type="checkbox" />
                Je confirme mon dossier et mon choix d’abonnement.
              </label>
            </>
          )}
          {error && (
            <p className="yv-error" role="alert">
              {error}
            </p>
          )}
          <div className="yv-actions">
            <button
              type="button"
              disabled={busy}
              onClick={() => setStep(step - 1)}
            >
              Étape précédente
            </button>
            <button className="yv-primary" disabled={busy}>
              {busy
                ? "Envoi…"
                : step === 3
                  ? "Envoyer mon dossier"
                  : "Continuer"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
