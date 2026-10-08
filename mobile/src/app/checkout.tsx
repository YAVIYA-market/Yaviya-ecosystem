import { useRef, useState } from "react";
import { Text } from "react-native";
import { router } from "expo-router";
import { randomUUID } from "expo-crypto";
import { useStore } from "../lib/store";
import { api } from "../lib/api";
import market from "../lib/market.json";
import type { Order } from "../lib/types";
import {
  Button,
  Card,
  Choices,
  ErrorText,
  Field,
  Page,
  Select,
  styles,
  money,
} from "../components/ui";
export default function Checkout() {
  const store = useStore();
  const [city, setCity] = useState(""),
    [commune, setCommune] = useState(""),
    [address, setAddress] = useState(store.profile?.address || ""),
    [mode, setMode] = useState("home"),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const key = useRef<string | null>(null);
  const payload = useRef<string>("");
  const covered = market.deliverableCities.includes(city);
  const rates = market.deliveryRates as Record<string, Record<string, number>>;
  const count = new Set(store.cart.map((i) => i.product.seller)).size;
  const fee =
    mode === "hand"
      ? 0
      : mode === "relay"
        ? 3500 * count
        : ((rates[city]?.[commune] || 7500) + (mode === "express" ? 7500 : 0)) *
          count;
  const subtotal = store.cart.reduce((s, i) => s + i.q * i.product.price, 0);
  const submit = async () => {
    setBusy(true);
    setError("");
    try {
      if (!store.user || !store.profile) {
        router.push({ pathname: "/auth", params: { next: "checkout" } });
        return;
      }
      if (!covered || !address.trim() || (mode !== "hand" && !commune))
        throw new Error(
          "Choisissez une ville desservie, sa commune et votre adresse complète.",
        );
      const body = {
        items: store.cart.map((i) => ({ id: i.product.id, q: i.q })),
        city,
        commune,
        address,
        recipient: { name: store.profile.name, phone: store.profile.phone },
        paymentId: "cod",
        delivery: { mode },
      };
      const next = JSON.stringify(body);
      if (payload.current !== next) {
        key.current = randomUUID();
        payload.current = next;
      }
      await api<{ order: Order }>(
        "/api/marketplace/orders?country=CD&view=buyer",
        { ...body, requestKey: key.current },
      );
      store.clearCart();
      router.replace("/orders");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Page title="Où livrer votre commande ?">
      <ErrorText error={error} />
      {!store.cart.length ? (
        <Card>
          <Text style={styles.text}>Votre panier est vide.</Text>
          <Button
            title="Retour au catalogue"
            onPress={() => router.replace("/")}
          />
        </Card>
      ) : (
        <>
          <Card>
            <Select
              label="Ville"
              options={market.cities}
              value={city}
              onChange={(v) => {
                setCity(v);
                setCommune("");
              }}
            />
            {city && !covered && (
              <Text style={styles.error}>
                Livraison bientôt disponible dans cette ville. Les commandes
                sont ouvertes à Kinshasa, Lubumbashi, Kolwezi, Matadi et Boma.
              </Text>
            )}
            {covered && (
              <Select
                label="Commune"
                options={Object.keys(rates[city] || {})}
                value={commune}
                onChange={setCommune}
              />
            )}
            <Field
              label="Adresse de livraison *"
              value={address}
              onChangeText={setAddress}
              multiline
            />
            <Choices
              value={mode}
              onChange={setMode}
              values={[
                { id: "home", label: "À domicile" },
                { id: "express", label: "Express" },
                { id: "relay", label: "Point relais" },
                { id: "hand", label: "Retrait en boutique" },
              ]}
            />
          </Card>
          <Card>
            <Text style={styles.heading}>Récapitulatif</Text>
            {store.cart.map((i) => (
              <Text key={i.product.id} style={styles.text}>
                {i.q} × {i.product.title} · {money(i.q * i.product.price)}
              </Text>
            ))}
            <Text style={styles.text}>Produits : {money(subtotal)}</Text>
            {covered && address.trim() && (commune || mode === "hand") ? (
              <>
                <Text style={styles.text}>Livraison : {money(fee)}</Text>
                <Text style={styles.price}>
                  Total estimé : {money(subtotal + fee)}
                </Text>
              </>
            ) : (
              <Text style={styles.muted}>
                Choisissez votre adresse pour connaître les frais de livraison.
              </Text>
            )}
            <Text style={styles.text}>Paiement en espèces à la livraison.</Text>
            <Text style={styles.muted}>
              Le serveur confirme les prix et les frais au moment de la
              commande.
            </Text>
            <Button
              title={busy ? "Enregistrement…" : "Confirmer ma commande"}
              disabled={busy || !covered}
              onPress={submit}
            />
          </Card>
        </>
      )}
    </Page>
  );
}
