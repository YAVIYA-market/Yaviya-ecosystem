import { useEffect, useState } from "react";
import { Text } from "react-native";
import { api } from "../lib/api";
import { Button, Card, ErrorText, Field, Page, styles } from "../components/ui";
export default function Security() {
  const [enabled, setEnabled] = useState(false),
    [password, setPassword] = useState(""),
    [code, setCode] = useState(""),
    [secret, setSecret] = useState(""),
    [recovery, setRecovery] = useState<string[]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    void api<{ enabled: boolean }>("/api/auth/mobile/mfa-status")
      .then((d) => setEnabled(d.enabled))
      .catch((e) => setError(e.message));
  }, []);
  const run = async (action: string) => {
    setBusy(true);
    setError("");
    try {
      if (action === "mfa-setup") {
        const data = await api<{ secret: string }>(
          "/api/auth/mobile/mfa-setup",
          { password },
        );
        setSecret(data.secret);
      } else {
        const data = await api<{ enabled: boolean; recoveryCodes?: string[] }>(
          `/api/auth/mobile/${action}`,
          { password, code },
        );
        setEnabled(data.enabled);
        setRecovery(data.recoveryCodes || []);
        setSecret("");
        setPassword("");
        setCode("");
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Page title="Protégez votre compte">
      <ErrorText error={error} />
      <Card>
        <Text style={styles.text}>
          Double authentification : {enabled ? "activée" : "non activée"}. Elle
          est obligatoire pour l’administration.
        </Text>
        <Field
          label="Mot de passe actuel"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        {!enabled && !secret && (
          <Button
            title="Configurer la double authentification"
            onPress={() => run("mfa-setup")}
            disabled={busy}
          />
        )}{" "}
        {!!secret && (
          <>
            <Text style={styles.text}>
              Ajoutez cette clé dans votre application d’authentification (TOTP,
              6 chiffres, 30 secondes).
            </Text>
            <Text selectable style={styles.heading}>
              {secret}
            </Text>
          </>
        )}
        {(enabled || secret) && (
          <Field
            label="Code de votre application ou de récupération"
            value={code}
            onChangeText={setCode}
          />
        )}{" "}
        {!!secret && (
          <Button
            title="Activer"
            onPress={() => run("mfa-enable")}
            disabled={busy}
          />
        )}{" "}
        {enabled && (
          <>
            <Button
              outline
              title="Renouveler mes codes de récupération"
              onPress={() => run("mfa-recovery")}
              disabled={busy}
            />
            <Button
              outline
              title="Désactiver la double authentification"
              onPress={() => run("mfa-disable")}
              disabled={busy}
            />
          </>
        )}
        {recovery.length > 0 && (
          <>
            <Text style={styles.heading}>
              Conservez ces codes dans un endroit sûr.
            </Text>
            {recovery.map((c) => (
              <Text key={c} selectable style={styles.text}>
                {c}
              </Text>
            ))}
            <Text style={styles.muted}>
              Chaque code fonctionne une seule fois.
            </Text>
          </>
        )}
      </Card>
    </Page>
  );
}
