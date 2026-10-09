import { useState } from "react";
import { Share, Text } from "react-native";
import { router } from "expo-router";
import { useStore } from "../lib/store";
import { api, apiBase } from "../lib/api";
import market from "../lib/market.json";
import {
  Button,
  Card,
  ErrorText,
  Field,
  Loading,
  Page,
  Select,
  styles,
} from "../components/ui";
export default function ProfileScreen() {
  const store = useStore();
  const [section, setSection] = useState(""),
    [name, setName] = useState(store.profile?.name || ""),
    [phone, setPhone] = useState(store.profile?.phone || ""),
    [address, setAddress] = useState(store.profile?.address || ""),
    [country, setCountry] = useState(store.profile?.residenceCountry || "CD"),
    [currency, setCurrency] = useState(store.profile?.currency || "CDF"),
    [language, setLanguage] = useState(
      store.profile?.preferredLanguage || "fr",
    ),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [follows, setFollows] = useState<{ sellerId: number }[]>([]);
  const openSection = (value: string) => {
    const p = store.profile;
    if (p) {
      setName(p.name);
      setPhone(p.phone);
      setAddress(p.address);
      setCountry(p.residenceCountry || "CD");
      setCurrency(p.currency || "CDF");
      setLanguage(p.preferredLanguage || "fr");
    }
    setSection(value);
  };
  const save = async () => {
    setBusy(true);
    setError("");
    try {
      await api("/api/customer?country=CD", {
        ...store.profile,
        name,
        phone,
        address,
        residenceCountry: country,
        currency,
        preferredLanguage: language,
        privacyConsent: true,
        privacyVersion: "2026-10-02",
      });
      await store.refresh();
      setMessage("Vos informations ont été mises à jour.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const openFollows = async () => {
    try {
      const d = await api<{ follows: { sellerId: number }[] }>(
        "/api/seller-follows?country=CD",
      );
      setFollows(d.follows);
      setSection("shops");
    } catch (e) {
      setError((e as Error).message);
    }
  };
  if (!store.ready)
    return (
      <Page>
        <Loading />
      </Page>
    );
  if (!store.user)
    return (
      <Page title="Votre espace personnel">
        <Button
          title="Créer mon compte ou me connecter"
          onPress={() => router.push("/auth")}
        />
        <ErrorText error={store.error} />
      </Page>
    );
  if (!store.profile)
    return (
      <Page title="Complétez votre profil">
        <Button
          title="Ajouter mes coordonnées"
          onPress={() => router.push("/auth")}
        />
      </Page>
    );
  return (
    <Page title={`Bonjour ${store.profile.name}`}>
      <ErrorText error={error} />
      {Object.entries({listings:'Revendre comme particulier · commission 12 %',finance:'Portefeuille et commissions',addresses:'Mes adresses enregistrées',returns:'Mes demandes de retour et remboursement',support:'Mes dossiers service client',subscriptions:'Abonnement livraison et vendeur'}).map(([resource,title])=><Button key={resource} outline title={title} onPress={()=>router.push({pathname:'/account-tools',params:{resource}})}/>)}

      {message && <Text style={styles.text}>{message}</Text>}
      <Card>
        <Text style={styles.muted}>
          Compte{" "}
          {store.profile.accountType === "buyer"
            ? "acheteur"
            : store.profile.accountType === "seller"
              ? "vendeur"
              : "livreur"}
        </Text>
        <Button
          outline
          title="Historique des commandes"
          onPress={() => router.push("/orders")}
        />
        <Button
          outline
          title="Service client"
          onPress={() => router.push("/help")}
        />
        <Button
          outline
          title="Adresse et coordonnées"
          onPress={() => openSection("address")}
        />
        <Button
          outline
          title="Coupon"
          onPress={async () => {
            try {
              const d = await api<{ balance?: number }>(
                "/api/coupons?country=CD",
              );
              setMessage(
                `Vos coupons : ${d.balance || 0} · avantages disponibles selon les conditions en vigueur.`,
              );
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        />
        <Button outline title="Magasins suivis" onPress={openFollows} />
        <Button
          outline
          title="Code d’invitation · inviter un ami"
          onPress={() => {
            setMessage(`Votre code : ${store.profile?.customerNumber || ""}`);
            void Share.share({
              message: `Rejoignez-moi sur YAVIYA : ${apiBase}/?invite=${encodeURIComponent(store.profile?.customerNumber || "")}`,
            }).catch((e) => setError(e.message));
          }}
        />
        <Button
          outline
          title="Retours et remboursements · 72 h"
          onPress={() =>
            router.push({
              pathname: "/help",
              params: { topic: "Remboursement" },
            })
          }
        />
        <Button
          outline
          title="Paramètres du compte"
          onPress={() => openSection("settings")}
        />
        <Button
          outline
          title="Votre espace professionnel"
          onPress={() => router.push("/workspace")}
        />
      </Card>
      {section === "address" && (
        <Card>
          <Field label="Nom complet" value={name} onChangeText={setName} />
          <Field
            label="Téléphone"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
          <Field
            label="Adresse"
            value={address}
            onChangeText={setAddress}
            multiline
          />
          <Button title="Enregistrer" disabled={busy} onPress={save} />
        </Card>
      )}
      {section === "settings" && (
        <Card>
          <Text style={styles.heading}>Pays et préférences</Text>
          <Select
            label="Pays"
            options={market.identityCountries.map((c) => c.fr)}
            value={
              market.identityCountries.find((c) => c.code === country)?.fr ||
              country
            }
            onChange={(v) =>
              setCountry(
                market.identityCountries.find((c) => c.fr === v)?.code || "CD",
              )
            }
          />
          <Select
            label="Devise"
            options={["CDF", "USD", "EUR", "XAF"]}
            value={currency}
            onChange={setCurrency}
          />
          <Select
            label="Langue"
            options={market.profileLanguages}
            value={language}
            onChange={setLanguage}
          />
          <Text style={styles.muted}>
            Les prix du catalogue restent en francs congolais jusqu’à
            l’activation des conversions. La traduction de l’application sera
            proposée progressivement.
          </Text>
          <Button
            title="Enregistrer mes préférences"
            disabled={busy}
            onPress={save}
          />
          <Button
            outline
            title="Sécurité du compte"
            onPress={() => router.push("/security")}
          />
        </Card>
      )}
      {section === "shops" && (
        <Card>
          <Text style={styles.heading}>Vos boutiques suivies</Text>
          {follows.length ? (
            follows.map((f) => (
              <Text key={f.sellerId} style={styles.text}>
                Boutique {f.sellerId}
              </Text>
            ))
          ) : (
            <Text style={styles.text}>
              Suivez une boutique depuis un produit pour la retrouver ici.
            </Text>
          )}
        </Card>
      )}
      <Button
        outline
        title="Me déconnecter"
        onPress={async () => {
          try {
            await store.logout();
            router.replace("/");
          } catch (e) {
            setError((e as Error).message);
          }
        }}
      />
    </Page>
  );
}
