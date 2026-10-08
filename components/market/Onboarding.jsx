import { useState } from "react";
import ProfileForm from "./ProfileForm";
import { SellerPlans } from "./ServiceInfo";
import { sellerPlans } from "../../lib/market/plans";
import { amount } from "../../lib/market/api";
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
      identityConfirmed: false,
      identityPrivacyConsent: false,
    });
  const [file, setFile] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const seller = role === "seller";
  const steps = seller
    ? ["Compte et coordonnées", "Activité", "Identité et confidentialité", "Choisir mon abonnement"]
    : ["Compte et coordonnées", "Identité et confidentialité", "Avantages et rémunération", "Abonnement et règlements"];
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
    <section className="yv-onboarding">
      <p className="yv-eyebrow">{seller ? "DEVENIR VENDEUR YAVIYA" : "DEVENIR LIVREUR YAVIYA"}</p>
      <div className="yv-onboarding-heading"><h3>{steps[step]}</h3><span>Étape {step + 1} sur {steps.length}</span></div>
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
          submitLabel="Continuer"
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
                Nom de l’entreprise *
                <input
                  name="companyName"
                  required
                  value={values.companyName}
                  onChange={(e) => field("companyName", e.target.value)}
                  maxLength={150}
                />
              </label>
              <label className="yv-check">
                <input
                  type="checkbox"
                  name="unregistered"
                  checked={values.unregistered}
                  onChange={(e) => field("unregistered", e.target.checked)}
                />
                Petite entreprise non enregistrée · pas de numéro RCCM
              </label>
              {!values.unregistered && (
                <label>
                  Numéro d’entreprise RCM / RCCM *
                  <input
                    name="companyRcm"
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
                  name="document"
                  accept="image/jpeg,image/png"
                  required={!file}
                  onChange={(e) => setFile(e.target.files[0] || null)}
                />
              </label>
              {file && <p>{file.name}</p>}
              <label className="yv-check">
                <input required type="checkbox" checked={values.identityConfirmed} onChange={(e) => field("identityConfirmed", e.target.checked)} />
                Je confirme que le document et les informations m’appartiennent.
              </label>
              <label className="yv-check"><input required type="checkbox" checked={values.identityPrivacyConsent} onChange={(e) => field("identityPrivacyConsent", e.target.checked)} /><span>J’accepte le traitement de ma pièce pour la vérification du dossier conformément à la <a href="/confidentialite.html" target="_blank" rel="noreferrer">politique de confidentialité</a>.</span></label>
            </>
          )}
          {!seller && step === 2 && (
            <>
              <h3>Vos avantages et votre rémunération</h3>
              <ul className="yv-onboarding-benefits"><li>Choisissez vos disponibilités et acceptez les missions proposées.</li><li>Consultez le montant de chaque mission avant de l’accepter.</li><li>Suivez vos frais, votre bénéfice net et vos règlements par livraison.</li><li>Discutez avec les participants de la commande et avec YAVIYA.</li><li>Retrouvez les évaluations des clients sur votre compte livreur.</li></ul>
              <p>
                Recevez des missions, suivez vos revenus et discutez avec
                YAVIYA. Le montant prévu et les frais de mission apparaissent
                sur chaque livraison. Les règlements sont déclarés manuellement
                ; aucun virement automatique.
              </p>
              <label className="yv-check">
                <input
                  type="checkbox"
                  required
                  name="courierBenefitsAccepted"
                  checked={values.courierBenefitsAccepted}
                  onChange={(e) =>
                    field("courierBenefitsAccepted", e.target.checked)
                  }
                />
                J’ai lu les modalités du pilote et du règlement par livraison, et confirmé mes tâches.
              </label>
            </>
          )}
          {step === 3 && (
            <>
              <h3>{seller ? "Choisir mon abonnement" : "Abonnement et règlements"}</h3>
              {seller && (
                <SellerPlans
                  country={country}
                  onChoose={(id) => field("sellerPlan", id)}
                />
              )}
              {seller ? (
                <label>
                  Abonnement vendeur *
                  <select
                    name="sellerPlan"
                    value={values.sellerPlan}
                    onChange={(e) => field("sellerPlan", e.target.value)}
                  >
                    {sellerPlans.map((plan) => (
                      <option key={plan.id} value={plan.id}>
                        {plan.name} —{" "}
                        {plan.monthly === null
                          ? "sur accord"
                          : amount(plan.monthly, country) + " / mois"}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <><label>Abonnement livreur *<select name="courierPlan" required defaultValue="standard"><option value="standard">Standard · 0 FC / mois pendant le MVP</option></select></label><p>Accès aux missions, au suivi, aux évaluations et à la discussion avec YAVIYA après validation de votre identité.</p><h4>Recevoir mes règlements</h4><label>Mode de règlement préféré<select name="courierPayoutMethod" value={values.courierPayoutMethod} onChange={(e) => field("courierPayoutMethod", e.target.value)}><option value="mobile_money">Mobile Money</option><option value="bank">Virement bancaire</option><option value="cash">Espèces</option></select></label>{values.courierPayoutMethod !== "cash" && <label>Numéro Mobile Money ou référence de compte *<input name="courierPayoutAccount" required value={values.courierPayoutAccount} onChange={(e) => field("courierPayoutAccount", e.target.value)} maxLength={150} /></label>}<p>Le montant et le statut sont visibles pour chaque livraison. Un règlement manuel doit comporter une référence ; les transferts automatiques ne sont pas activés. Ne saisissez pas de PIN ou de mot de passe.</p></>
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
