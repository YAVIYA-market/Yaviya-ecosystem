import { useState } from "react";
import { api } from "../../lib/market/api";
export default function ProfileForm({
  profile,
  country,
  config,
  role = "buyer",
  preferences = false,
  onSaved,
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function save(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const data = Object.fromEntries(new FormData(event.currentTarget));
      await api("/api/customer", {
        country,
        body: {
          ...data,
          name: (data.firstName + " " + data.lastName).trim(),
          accountType: preferences ? profile.accountType : role,
          email: profile?.email || "",
          privacyConsent: true,
          privacyVersion: "2026-10-02",
        },
      });
      const fullProfile = await api("/api/customer", { country });
      if (!fullProfile)
        throw Error(
          "Votre profil a été enregistré mais ne peut pas encore être rechargé. Réessayez.",
        );
      await onSaved(fullProfile);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="yv-form" onSubmit={save}>
      <p>
        {role === "buyer"
          ? "Préparez vos prochaines découvertes : complétez vos coordonnées pour recevoir et suivre vos achats."
          : role === "seller"
            ? "Confirmez les coordonnées et l’adresse de votre boutique. Votre dossier sera examiné par l’administration."
            : "Confirmez votre adresse et votre téléphone. Votre identité sera examinée avant de recevoir des missions."}
      </p>
      <div className="yv-fields">
        <label>
          Prénom *
          <input
            name="firstName"
            required
            maxLength={100}
            defaultValue={profile?.firstName || ""}
            autoComplete="given-name"
          />
        </label>
        <label>
          Nom *
          <input
            name="lastName"
            required
            maxLength={100}
            defaultValue={profile?.lastName || ""}
            autoComplete="family-name"
          />
        </label>
      </div>
      <label>
        Téléphone *
        <input
          name="phone"
          required
          type="tel"
          defaultValue={profile?.phone || (country === "CG" ? "+242" : "+243")}
          autoComplete="tel"
          maxLength={30}
        />
      </label>
      <label>
        {role === "seller"
          ? "Adresse complète de la boutique *"
          : "Adresse complète *"}
        <textarea
          name="address"
          required
          maxLength={250}
          defaultValue={profile?.address || ""}
          autoComplete="street-address"
        />
      </label>
      {preferences && (
        <fieldset>
          <legend>Pays et préférences</legend>
          <label>
            Pays de résidence
            <select
              name="residenceCountry"
              defaultValue={profile?.residenceCountry || country}
            >
              {config.identityCountries.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.fr}
                </option>
              ))}
            </select>
          </label>
          <label>
            Devise préférée
            <select
              name="currency"
              defaultValue={
                profile?.currency || (country === "CG" ? "XAF" : "CDF")
              }
            >
              {config.profileCurrencies.map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
          <small>
            Les prix du marché restent dans leur devise d’origine ; aucune
            conversion automatique.
          </small>
          <label>
            Langue
            <select
              name="preferredLanguage"
              defaultValue={profile?.preferredLanguage || "fr"}
            >
              <option value="fr">Français</option>
              <option value="en">English</option>
            </select>
          </label>
        </fieldset>
      )}
      <label className="yv-check">
        <input type="checkbox" required defaultChecked={!!profile} />
        <span>
          J’accepte la{" "}
          <a href="/confidentialite.html">politique de confidentialité</a>.
        </span>
      </label>
      {error && (
        <p className="yv-error" role="alert">
          {error}
        </p>
      )}
      <button className="yv-primary" disabled={busy}>
        {busy ? "Enregistrement…" : "Enregistrer et continuer"}
      </button>
    </form>
  );
}
