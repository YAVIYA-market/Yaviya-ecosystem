import { useEffect, useState } from "react";
import ProfileForm from "./ProfileForm";
import { api } from "../../lib/market/api";
export default function AccountSettings({ profile, country, config, onSaved }) {
  const [status, setStatus] = useState(null),
    [setup, setSetup] = useState(null),
    [codes, setCodes] = useState([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    api("/api/auth/mfa-status")
      .then(setStatus)
      .catch((e) => setError(e.message));
  }, []);
  async function action(e, name) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const d = Object.fromEntries(new FormData(e.currentTarget));
      const v = await api("/api/auth/" + name, { body: d });
      if (name === "mfa-setup") setSetup(v);
      if (v.recoveryCodes) setCodes(v.recoveryCodes);
      if (name !== "mfa-setup") {
        setStatus(await api("/api/auth/mfa-status"));
        setSetup(null);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section>
      <ProfileForm
        profile={profile}
        country={country}
        config={config}
        role={profile.accountType}
        preferences
        onSaved={onSaved}
      />
      <hr />
      <h3>Sécurité du compte</h3>
      <p>
        Double authentification : {status?.enabled ? "activée" : "non activée"}.{" "}
        {status && !status.available
          ? "Configuration de l’hébergeur nécessaire."
          : ""}
      </p>
      {!status?.enabled && !setup && (
        <form className="yv-form" onSubmit={(e) => action(e, "mfa-setup")}>
          <label>
            Mot de passe actuel
            <input
              required
              type="password"
              name="password"
              autoComplete="current-password"
            />
          </label>
          <button disabled={busy || !status?.available}>
            Activer la double authentification
          </button>
        </form>
      )}
      {setup && (
        <form className="yv-form" onSubmit={(e) => action(e, "mfa-enable")}>
          <img
            src={setup.qrCode}
            alt="Code QR à scanner avec votre application d’authentification"
            width="240"
            height="240"
          />
          <p>
            Clé : <code>{setup.secret}</code>
          </p>
          <label>
            Mot de passe actuel
            <input
              type="password"
              name="password"
              required
              autoComplete="current-password"
            />
          </label>
          <label>
            Code de l’application
            <input required name="code" autoComplete="one-time-code" />
          </label>
          <button disabled={busy}>Confirmer l’activation</button>
        </form>
      )}
      {status?.enabled && (
        <form className="yv-form" onSubmit={(e) => action(e, "mfa-recovery")}>
          <label>
            Mot de passe actuel
            <input
              type="password"
              name="password"
              required
              autoComplete="current-password"
            />
          </label>
          <label>
            Code d’authentification
            <input name="code" required autoComplete="one-time-code" />
          </label>
          <div className="yv-actions">
            <button disabled={busy}>Renouveler les codes de secours</button>
            <button
              type="button"
              disabled={busy}
              onClick={(e) => {
                if (window.confirm("Désactiver la double authentification ?"))
                  action(
                    {
                      preventDefault() {},
                      currentTarget: e.currentTarget.form,
                    },
                    "mfa-disable",
                  );
              }}
            >
              Désactiver
            </button>
          </div>
        </form>
      )}
      {codes.length > 0 && (
        <section role="status">
          <h4>Conservez ces codes de secours en lieu sûr</h4>
          <pre>{codes.join("\n")}</pre>
        </section>
      )}
      {error && (
        <p role="alert" className="yv-error">
          {error}
        </p>
      )}
    </section>
  );
}
