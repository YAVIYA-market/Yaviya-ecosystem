import { useState } from "react";
import { Image, Text } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useStore } from "../lib/store";
import { api } from "../lib/api";
import { appendPhoto, choosePhotos, type Photo } from "../lib/photos";
import market from "../lib/market.json";
import {
  Button,
  Card,
  Choices,
  ErrorText,
  Field,
  Page,
  Select,
  styles,
} from "../components/ui";
export default function Onboarding() {
  const { role: requested } = useLocalSearchParams<{ role: string }>();
  const store = useStore();
  const role = requested === "courier" ? "courier" : "seller";
  const [step, setStep] = useState(1),
    [name, setName] = useState(store.profile?.name || ""),
    [phone, setPhone] = useState(store.profile?.phone || ""),
    [address, setAddress] = useState(store.profile?.address || ""),
    [company, setCompany] = useState(""),
    [rcm, setRcm] = useState(""),
    [unregistered, setUnregistered] = useState(false),
    [documentType, setDocumentType] = useState("identity"),
    [issuingCountry, setIssuingCountry] = useState("CD"),
    [photo, setPhoto] = useState<Photo | null>(null),
    [confirmed, setConfirmed] = useState(false),
    [plan, setPlan] = useState("free"),
    [method, setMethod] = useState("cash"),
    [account, setAccount] = useState(""),
    [benefits, setBenefits] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const titles =
    role === "seller"
      ? [
          "Compte et coordonnées",
          "Activité de la boutique",
          "Identité et confidentialité",
          "Choisir mon abonnement",
        ]
      : [
          "Compte et coordonnées",
          "Missions, benefits et paiement",
          "Identité et confidentialité",
          "Mon adhésion livreur",
        ];
  const next = () => {
    setError("");
    if (step === 1 && (!name.trim() || !phone.trim() || !address.trim())) {
      setError("Complétez vos coordonnées et votre adresse.");
      return;
    }
    if (
      step === 2 &&
      role === "seller" &&
      (!company.trim() || (!unregistered && !rcm.trim()))
    ) {
      setError(
        "Précisez le nom de l’entreprise et son RCCM, ou déclarez votre petite entreprise non enregistrée.",
      );
      return;
    }
    if (
      step === 2 &&
      role === "courier" &&
      (!benefits || (method !== "cash" && !account.trim()))
    ) {
      setError("Confirmez les benefits et vos coordonnées de règlement.");
      return;
    }
    if (step === 3 && (!photo || !confirmed)) {
      setError(
        "Ajoutez une photo de la pièce d’identité et confirmez vos informations.",
      );
      return;
    }
    setStep(step + 1);
  };
  const submit = async () => {
    setBusy(true);
    setError("");
    try {
      if (!photo)
        throw new Error("La photo de votre pièce d’identité est obligatoire.");
      await api("/api/customer?country=CD", {
        ...store.profile,
        name,
        phone,
        address,
        email: store.profile?.email || "",
        accountType: role,
        privacyConsent: true,
        privacyVersion: "2026-10-02",
      });
      const form = new FormData();
      for (const [k, v] of Object.entries({
        kind: role,
        activityAddress: address,
        companyName: company,
        companyRcm: rcm,
        unregistered: String(unregistered),
        documentType,
        issuingCountry,
        identityConfirmed: String(confirmed),
        sellerPlan: plan,
        courierPlan: "standard",
        courierBenefitsAccepted: String(benefits),
        courierPayoutMethod: method,
        courierPayoutAccount: account,
      }))
        form.append(k, v);
      await appendPhoto(form, "document", photo);
      await api("/api/verification?country=CD", form);
      await store.refresh();
      router.replace("/workspace");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  if (!store.user)
    return (
      <Page>
        <Button title="Créer mon compte" onPress={() => router.push("/auth")} />
      </Page>
    );
  return (
    <Page
      title={
        role === "seller"
          ? "Votre boutique sur YAVIYA"
          : "Rejoignez les livreurs YAVIYA"
      }
    >
      <Text style={styles.muted}>Étape {step} sur 4</Text>
      <Card>
        <Text style={styles.heading}>{titles[step - 1]}</Text>
        <ErrorText error={error} />
        {step === 1 && (
          <>
            <Field label="Nom complet *" value={name} onChangeText={setName} />
            <Field
              label="Téléphone *"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
            <Field
              label={
                role === "seller"
                  ? "Adresse complète de la boutique *"
                  : "Adresse et zone de départ *"
              }
              value={address}
              onChangeText={setAddress}
              multiline
            />
          </>
        )}
        {step === 2 &&
          (role === "seller" ? (
            <>
              <Field
                label="Nom de l’entreprise *"
                value={company}
                onChangeText={setCompany}
              />
              <Button
                outline
                title={`${unregistered ? "✓ " : ""}Petite entreprise non enregistrée · pas de numéro RCCM`}
                onPress={() => setUnregistered(!unregistered)}
              />
              {!unregistered && (
                <Field
                  label="Numéro d’entreprise RCM / RCCM *"
                  value={rcm}
                  onChangeText={setRcm}
                />
              )}
              <Text style={styles.text}>
                Notre équipe vérifie votre activité et vos coordonnées avant
                d’activer votre boutique.
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.text}>
                Choisissez vos missions disponibles, suivez vos colis et
                retrouvez la rémunération de chaque livraison. Le barème pilote
                affecte les frais de livraison au livreur ; le règlement reste
                manuel.
              </Text>
              <Button
                outline
                title={`${benefits ? "✓ " : ""}J’ai lu et accepté les benefits livreur`}
                onPress={() => setBenefits(!benefits)}
              />
              <Choices
                value={method}
                onChange={setMethod}
                values={[
                  { id: "cash", label: "Espèces" },
                  { id: "mobile_money", label: "Mobile Money" },
                  { id: "bank", label: "Compte bancaire" },
                ]}
              />
              {method !== "cash" && (
                <Field
                  label="Compte de règlement *"
                  value={account}
                  onChangeText={setAccount}
                />
              )}
              <Text style={styles.muted}>
                Ces coordonnées seront vérifiées avant tout règlement. Aucun
                transfert automatique n’est activé.
              </Text>
            </>
          ))}
        {step === 3 && (
          <>
            <Select
              label="Pays d’émission de la pièce *"
              options={market.identityCountries.map((c) => c.fr)}
              value={
                market.identityCountries.find((c) => c.code === issuingCountry)
                  ?.fr || ""
              }
              onChange={(v) =>
                setIssuingCountry(
                  market.identityCountries.find((c) => c.fr === v)?.code ||
                    "CD",
                )
              }
            />
            <Choices
              value={documentType}
              onChange={setDocumentType}
              values={[
                { id: "identity", label: "Pièce d’identité" },
                { id: "passport", label: "Passeport" },
                ...(role === "courier"
                  ? [{ id: "licence-c", label: "Permis C" }]
                  : []),
              ]}
            />
            <Button
              outline
              title="Ajouter la photo de la pièce *"
              onPress={async () => {
                try {
                  const photos = await choosePhotos();
                  if (photos[0]) setPhoto(photos[0]);
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            />
            {photo && (
              <Image
                source={{ uri: photo.uri }}
                accessibilityLabel="Pièce sélectionnée"
                style={{ width: "100%", height: 170 }}
                resizeMode="contain"
              />
            )}
            <Text style={styles.muted}>
              Seuls les agents habilités consultent cette pièce pour vérifier
              votre identité.
            </Text>
            <Button
              outline
              title={`${confirmed ? "✓ " : ""}Je confirme mon identité et la confidentialité`}
              onPress={() => setConfirmed(!confirmed)}
            />
          </>
        )}
        {step === 4 && (
          <>
            {role === "seller" ? (
              <>
                <Choices
                  value={plan}
                  onChange={setPlan}
                  values={[
                    { id: "free", label: "Découverte" },
                    { id: "plus", label: "Plus" },
                    { id: "premium", label: "Premium" },
                    { id: "business", label: "Business" },
                    { id: "enterprise", label: "Entreprise" },
                  ]}
                />
                <Text style={styles.text}>
                  Votre choix sera enregistré avec votre dossier. Notre équipe
                  confirmera les conditions et le tarif avant toute facturation.
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.heading}>Adhésion standard</Text>
                <Text style={styles.text}>
                  Votre dossier est prêt à être examiné. L’activation de votre
                  espace et l’accès aux missions suivent la validation de votre
                  identité.
                </Text>
              </>
            )}
            <Button
              title={busy ? "Envoi du dossier…" : "Soumettre mon dossier"}
              onPress={submit}
              disabled={busy}
            />
          </>
        )}
        {step < 4 && <Button title="Continuer" onPress={next} />}{" "}
        {step > 1 && (
          <Button
            outline
            title="Étape précédente"
            disabled={busy}
            onPress={() => setStep(step - 1)}
          />
        )}
      </Card>
    </Page>
  );
}
