import { useState } from "react";
import { Text } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { api } from "../lib/api";
import { useStore } from "../lib/store";
import type { AuthResult, Profile, Role } from "../lib/types";
import {
  Button,
  Card,
  Choices,
  ErrorText,
  Field,
  Page,
  styles,
} from "../components/ui";
export default function Auth() {
  const { next } = useLocalSearchParams<{ next?: string }>();
  const store = useStore();
  const [mode, setMode] = useState("signup"),
    [channel, setChannel] = useState("email"),
    [country, setCountry] = useState("CD"),
    [role, setRole] = useState<Exclude<Role, "admin">>("buyer"),
    [login, setLogin] = useState(""),
    [password, setPassword] = useState(""),
    [step, setStep] = useState(
      store.user && !store.profile ? "profile" : "account",
    ),
    [code, setCode] = useState(""),
    [name, setName] = useState(""),
    [phone, setPhone] = useState(""),
    [address, setAddress] = useState(""),
    [consent, setConsent] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const prefix = country === "CD" ? "+243" : "+242";
  const buyerFlow = next === "checkout";
  const finish = () =>
    router.replace(
      buyerFlow
        ? "/checkout"
        : role === "buyer"
          ? "/profile"
          : { pathname: "/onboarding", params: { role } },
    );
  const afterLogin = async () => {
    await store.refresh();
    const p = await api<Profile | null>("/api/customer?country=CD");
    if (!p) {
      setStep("profile");
      return;
    }
    router.replace(buyerFlow ? "/checkout" : "/profile");
  };
  const sendSms = async () => {
    setBusy(true);
    setError("");
    try {
      const phone = login.startsWith("+")
        ? login
        : prefix + login.replace(/^0/, "");
      await api("/api/auth/mobile/phone-send", { phone });
      setPhone(phone);
      setCode("");
      setStep("sms");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const submit = async () => {
    setBusy(true);
    setError("");
    try {
      if (step === "profile") {
        if (!consent)
          throw new Error(
            "Acceptez la politique de confidentialité pour créer votre profil.",
          );
        await api("/api/customer?country=CD", {
          name,
          firstName: name.split(" ")[0],
          lastName: name.split(" ").slice(1).join(" "),
          phone: phone.startsWith("+")
            ? phone
            : prefix + phone.replace(/^0/, ""),
          email: channel === "email" ? login : "",
          address,
          accountType: buyerFlow ? "buyer" : role,
          privacyConsent: true,
          privacyVersion: "2026-10-02",
          wishlist: store.favorites,
        });
        await store.refresh();
        finish();
      } else if (step === "sms") {
        const result = await api<AuthResult>("/api/auth/mobile/phone-verify", {
          phone,
          code,
        });
        if (result.requiresTwoFactor) {
          setStep("mfa");
          return;
        }
        await afterLogin();
      } else if (step === "mfa") {
        await api<AuthResult>("/api/auth/mobile/mfa-verify", { code });
        await afterLogin();
      } else {
        const identifier =
          channel === "phone"
            ? login.startsWith("+")
              ? login
              : prefix + login.replace(/^0/, "")
            : login;
        const result = await api<AuthResult>(`/api/auth/mobile/${mode}`, {
          login: identifier,
          password,
        });
        setPassword("");
        if (result.requiresTwoFactor) {
          setStep("mfa");
          return;
        }
        if (mode === "signup") {
          setPhone(channel === "phone" ? identifier : "");
          setStep("profile");
          await store.refresh();
        } else await afterLogin();
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Page
      title={
        step === "profile"
          ? "Bienvenue chez YAVIYA"
          : step === "mfa"
            ? "Confirmez votre identité"
            : "Votre compte YAVIYA"
      }
    >
      <ErrorText error={error} />
      <Card>
        {step === "account" ? (
          <>
            <Choices
              value={mode}
              onChange={setMode}
              values={[
                { id: "signup", label: "Créer mon compte" },
                { id: "login", label: "Me connecter" },
              ]}
            />
            {mode === "signup" && (
              <>
                <Text style={styles.heading}>Quel compte souhaitez-vous ?</Text>
                <Choices
                  value={buyerFlow ? "buyer" : role}
                  onChange={(v) => setRole(v as typeof role)}
                  values={[
                    { id: "buyer", label: "Acheteur" },
                    { id: "seller", label: "Vendeur", disabled: buyerFlow },
                    { id: "courier", label: "Livreur", disabled: buyerFlow },
                  ]}
                />
                {role === "seller" && !buyerFlow && (
                  <Text style={styles.text}>
                    Votre boutique et votre identité seront examinées par notre
                    équipe avant l’ouverture de votre espace vendeur.
                  </Text>
                )}
                {role === "courier" && !buyerFlow && (
                  <Text style={styles.text}>
                    Confirmez votre identité, votre adresse et vos informations
                    de règlement pour rejoindre les livreurs YAVIYA.
                  </Text>
                )}
              </>
            )}
            <Choices
              value={channel}
              onChange={(v) => {
                setChannel(v);
                setLogin("");
              }}
              values={[
                { id: "email", label: "E-mail" },
                { id: "phone", label: "Téléphone" },
              ]}
            />
            {channel === "phone" && (
              <Choices
                value={country}
                onChange={setCountry}
                values={[
                  { id: "CD", label: "RD Congo +243" },
                  { id: "CG", label: "Congo +242" },
                ]}
              />
            )}
            <Field
              label={
                channel === "email" ? "Adresse e-mail" : `Téléphone ${prefix}`
              }
              value={login}
              onChangeText={setLogin}
              autoCapitalize="none"
              keyboardType={channel === "email" ? "email-address" : "phone-pad"}
            />
            <Field
              label="Mot de passe"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
            />
            {mode === "signup" && (
              <Text style={styles.muted}>
                Au moins 8 caractères, avec majuscule, minuscule, chiffre et
                caractère spécial.
              </Text>
            )}
          </>
        ) : step === "sms" ? (
          <>
            <Text style={styles.text}>
              Saisissez le code reçu par SMS sur {phone}.
            </Text>
            <Field
              label="Code SMS"
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
              autoComplete="one-time-code"
            />
          </>
        ) : step === "mfa" ? (
          <>
            <Text style={styles.text}>
              Saisissez le code de votre application d’authentification ou un
              code de récupération.
            </Text>
            <Field
              label="Code de vérification"
              value={code}
              onChangeText={setCode}
              autoCapitalize="none"
              autoComplete="one-time-code"
            />
          </>
        ) : (
          <>
            <Text style={styles.text}>
              Préparez vos prochains achats : complétez vos coordonnées pour
              recevoir vos commandes et retrouver leur suivi dans votre espace.
            </Text>
            <Field label="Nom complet *" value={name} onChangeText={setName} />
            <Field
              label="Téléphone *"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
            <Field
              label={
                role === "seller" ? "Adresse de la boutique *" : "Adresse *"
              }
              value={address}
              onChangeText={setAddress}
              multiline
            />
            <Button
              outline
              title={`${consent ? "✓ " : ""}J’accepte la politique de confidentialité`}
              onPress={() => setConsent(!consent)}
            />
            <Text style={styles.muted}>
              Vos coordonnées servent au traitement des commandes. Les pièces
              d’identité restent réservées à la vérification de votre compte.
            </Text>
          </>
        )}
        {step === "account" && channel === "phone" && (
          <Button
            outline
            title="Recevoir un code SMS"
            disabled={busy}
            onPress={sendSms}
          />
        )}
        <Button
          title={
            busy
              ? "Veuillez patienter…"
              : step === "profile"
                ? "Enregistrer et continuer"
                : step === "mfa" || step === "sms"
                  ? "Vérifier"
                  : mode === "signup"
                    ? "Créer mon compte"
                    : "Me connecter"
          }
          onPress={submit}
          disabled={busy}
        />
      </Card>
    </Page>
  );
}
