import { useEffect, useState } from "react";
import { api } from "../../lib/market/api";
export default function AuthForm({ country, onSuccess, initialAction = "login", initialRole = "buyer" }) {
  const [action, setAction] = useState(initialAction);
  const [registrationRole, setRegistrationRole] = useState(
    ["seller", "courier"].includes(initialRole) ? initialRole : "buyer",
  );
  const [mode, setMode] = useState("email"),
    [phoneCountry, setPhoneCountry] = useState(country);
  const [login, setLogin] = useState(""),
    [factor, setFactor] = useState(false),
    [sms, setSms] = useState(false);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    api("/api/auth/mfa-challenge")
      .then((v) => {
        if (live && v.pending) setFactor(true);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);
  async function submit(event, action) {
    event.preventDefault();
    const form = event.currentTarget.closest("form");
    if (!form.reportValidity()) return;
    setBusy(true);
    setError("");
    try {
      const data = Object.fromEntries(new FormData(form));
      const value = await api("/api/auth/" + (factor ? "mfa-verify" : action), {
        body: data,
      });
      if (value.requiresTwoFactor) {
        setFactor(true);
        return;
      }
      if (!value.user) throw Error("Connexion incomplète.");
      await onSuccess(value.user, action === "signup" ? registrationRole : undefined);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function smsAction(endpoint, form) {
    setBusy(true);
    setError("");
    try {
      const value = await api("/api/auth/" + endpoint, {
        body: { phone: login, code: form.elements.smsCode?.value },
      });
      if (endpoint === "phone-send") {
        setSms(true);
        return;
      }
      if (value.requiresTwoFactor) {
        setFactor(true);
        return;
      }
      await onSuccess(value.user, action === "signup" ? registrationRole : undefined);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="yv-form" onSubmit={(e) => submit(e, action)}>
      <p>
        Votre accès personnel pour retrouver vos achats et suivre vos
        livraisons.
      </p>
      {factor ? (
        <label>
          Code de votre application ou code de secours
          <input
            name="code"
            required
            autoComplete="one-time-code"
            maxLength={32}
          />
        </label>
      ) : (
        <>
          {action === "signup" && (
            <>
              <fieldset className="yv-account-choices">
                <legend>Type de compte</legend>
                {[["buyer", "Acheteur", "Acheter et suivre mes commandes"], ["seller", "Vendeur", "Ouvrir et gérer ma boutique"], ["courier", "Livreur", "Livrer et suivre mes missions"]].map(([value, label, description]) => (
                  <label key={value} className={registrationRole === value ? "selected" : ""}>
                    <input type="radio" name="registrationRole" value={value} checked={registrationRole === value} onChange={() => setRegistrationRole(value)} />
                    <span><strong>{label}</strong><small>{description}</small></span>
                  </label>
                ))}
              </fieldset>
              {registrationRole === "seller" && (
                <p>Créez votre boutique en quatre étapes. Votre identité et votre adresse seront vérifiées par YAVIYA avant l’activation. Vous pouvez déclarer une activité sans numéro RCCM.</p>
              )}
              {registrationRole === "courier" && (
                <p>Préparez votre dossier de livreur en quatre étapes : coordonnées, identité, avantages et rémunération, puis abonnement. L’administration vérifiera votre dossier avant l’attribution de livraisons.</p>
              )}
            </>
          )}
          <label>
            Connexion par
            <select
              value={mode}
              onChange={(e) => {
                setMode(e.target.value);
                setLogin(
                  e.target.value === "phone"
                    ? phoneCountry === "CG"
                      ? "+242"
                      : "+243"
                    : "",
                );
              }}
            >
              <option value="email">E-mail</option>
              <option value="phone">Téléphone</option>
            </select>
          </label>
          {mode === "phone" && (
            <label>
              Pays du numéro
              <select
                value={phoneCountry}
                onChange={(e) => {
                  setPhoneCountry(e.target.value);
                  setLogin(e.target.value === "CG" ? "+242" : "+243");
                }}
              >
                <option value="CD">RD Congo (+243)</option>
                <option value="CG">République du Congo (+242)</option>
              </select>
            </label>
          )}
          <label>
            {mode === "phone" ? "Téléphone" : "E-mail"}
            <input
              name="login"
              type={mode === "phone" ? "tel" : "email"}
              required
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              autoComplete="username"
            />
          </label>
          <label>
            Mot de passe
            <input
              name="password"
              type="password"
              required
              minLength={8}
              maxLength={128}
              autoComplete={action === "signup" ? "new-password" : "current-password"}
            />
          </label>
          <small>
            Création : 8 caractères minimum, avec majuscule, minuscule, chiffre
            et caractère spécial.
          </small>
          {mode === "phone" && (
            <div className="yv-actions">
              <button
                type="button"
                disabled={busy}
                onClick={(e) => smsAction("phone-send", e.currentTarget.form)}
              >
                Recevoir un code SMS
              </button>
              {sms && (
                <>
                  <input
                    aria-label="Code SMS"
                    name="smsCode"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                  />
                  <button
                    type="button"
                    disabled={busy}
                    onClick={(e) =>
                      smsAction("phone-verify", e.currentTarget.form)
                    }
                  >
                    Vérifier le code
                  </button>
                </>
              )}
            </div>
          )}
        </>
      )}
      {error && (
        <p role="alert" className="yv-error">
          {error}
        </p>
      )}
      <button className="yv-primary" disabled={busy}>
        {busy
          ? "Connexion…"
          : factor
            ? "Vérifier et continuer"
            : action === "signup" ? "Créer mon compte" : "Se connecter"}
      </button>
      {!factor && (
        <button
          type="button"
          disabled={busy}
          onClick={() => setAction(action === "signup" ? "login" : "signup")}
        >
          {action === "signup" ? "J’ai déjà un compte" : "Créer un compte"}
        </button>
      )}
    </form>
  );
}
