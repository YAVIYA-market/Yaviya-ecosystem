import { useEffect, useState } from "react";
import { Text } from "react-native";
import { router } from "expo-router";
import { useStore } from "../lib/store";
import { useMarket } from "../lib/useMarket";
import { api } from "../lib/api";
import type { Role } from "../lib/types";
import {
  Button,
  Card,
  Choices,
  ErrorText,
  Loading,
  Page,
  styles,
  money,
} from "../components/ui";
import { OrderCard } from "../components/OrderCard";
import { SellerProducts } from "../components/SellerProducts";
import { VerificationReviews } from "../components/VerificationReview";
import { AdminChat } from "../components/AdminChat";
type Report = {
  rows: {
    productId: number;
    title: string;
    uniqueViewers: number;
    buyerCount: number;
  }[];
};
export default function Workspace() {
  const store = useStore();
  const [role, setRole] = useState<Role>("buyer"),
    [tab, setTab] = useState("overview"),
    [check, setCheck] = useState<{ status: string; note: string } | null>(null),
    [report, setReport] = useState<Report | null>(null),
    [followers, setFollowers] = useState(0),
    [error, setError] = useState("");
  const { data, error: marketError, loading, load } = useMarket(role);
  useEffect(() => {
    if (store.user)
      void api<{ check: { status: string; note: string } | null }>(
        "/api/verification?country=CD",
      )
        .then((d) => setCheck(d.check))
        .catch((e) => setError(e.message));
  }, [store.user]);
  const sellerKey = data?.sellerIds.join(",") ?? null;
  useEffect(() => {
    if ((role === "seller" || role === "admin") && sellerKey !== null) {
      void api<Report>("/api/product-insights/report?country=CD&period=30")
        .then(setReport)
        .catch((e) => setError(e.message));
      void api<{ counts: { sellerId: number; followerCount: number }[] }>(
        "/api/seller-follows?country=CD",
      )
        .then((d) =>
          setFollowers(
            d.counts
              .filter((x) =>
                sellerKey.split(",").map(Number).includes(x.sellerId),
              )
              .reduce((n, x) => n + x.followerCount, 0),
          ),
        )
        .catch((e) => setError(e.message));
    }
  }, [role, sellerKey]);
  if (!store.user)
    return (
      <Page title="Votre espace YAVIYA">
        <Button
          title="Créer un compte ou me connecter"
          onPress={() => router.push("/auth")}
        />
      </Page>
    );
  const roles = data?.roles || {
    buyer: true,
    seller: false,
    courier: false,
    admin: false,
  };
  const claim = async (id: string, revision: number) => {
    try {
      await api("/api/marketplace/orders/action?country=CD", {
        orderId: id,
        revision,
        action: "courier_claim",
      });
      await load();
    } catch (e) {
      setError((e as Error).message);
      await load();
    }
  };
  return (
    <Page
      title={
        role === "seller"
          ? "Ma boutique"
          : role === "courier"
            ? "Mes livraisons"
            : role === "admin"
              ? "Administration YAVIYA"
              : "Votre espace"
      }
    >
      <ErrorText error={error || marketError} />
      {marketError && (
        <Button
          outline
          title="Paramètres de sécurité du compte"
          onPress={() => router.push("/security")}
        />
      )}
      <Choices
        value={role}
        onChange={(v) => {
          setRole(v as Role);
          setTab("overview");
        }}
        values={[
          { id: "buyer", label: "Acheteur" },
          { id: "seller", label: "Vendeur", disabled: !roles.seller },
          { id: "courier", label: "Livreur", disabled: !roles.courier },
          { id: "admin", label: "Admin", disabled: !roles.admin },
        ]}
      />
      {loading && <Loading />}
      {role === "buyer" && (
        <>
          <Card>
            <Text style={styles.heading}>Tout pour vos prochains achats</Text>
            <Button
              title="Historique et suivi des commandes"
              onPress={() => router.push("/orders")}
            />
            <Button
              outline
              title="Mon profil"
              onPress={() => router.push("/profile")}
            />
          </Card>
          {check && (
            <Card>
              <Text style={styles.heading}>
                Votre dossier professionnel : {check.status}
              </Text>
              <Text style={styles.text}>
                {check.note ||
                  "Notre équipe vous informera après examen de votre dossier."}
              </Text>
            </Card>
          )}
          {!roles.seller && !roles.courier && (
            <Card>
              <Text style={styles.heading}>
                Votre boutique mérite une nouvelle vitrine.
              </Text>
              <Text style={styles.text}>
                Faites découvrir vos produits et préparez votre présence sur
                YAVIYA.
              </Text>
              <Button
                outline
                title="Devenir vendeur"
                onPress={() =>
                  router.push({
                    pathname: "/onboarding",
                    params: { role: "seller" },
                  })
                }
              />
              <Button
                outline
                title="Devenir livreur"
                onPress={() =>
                  router.push({
                    pathname: "/onboarding",
                    params: { role: "courier" },
                  })
                }
              />
            </Card>
          )}
        </>
      )}
      {role !== "buyer" && (
        <Choices
          value={tab}
          onChange={setTab}
          values={[
            { id: "overview", label: "Vue d’ensemble" },
            {
              id: "orders",
              label: role === "courier" ? "Missions" : "Commandes",
            },
            ...(role === "seller" || role === "admin"
              ? [
                  { id: "products", label: "Produits" },
                  { id: "stats", label: "Statistiques" },
                ]
              : []),
            ...(role === "admin"
              ? [{ id: "verification", label: "Validation des comptes" }]
              : []),
            { id: "chat", label: "Discussions" },
          ]}
        />
      )}{" "}
      {data && role !== "buyer" && tab === "overview" && (
        <Card>
          <Text style={styles.heading}>
            {data.orders.length} commandes suivies
          </Text>
          {role === "seller" && (
            <Text style={styles.text}>
              {followers} personnes suivent votre boutique.
            </Text>
          )}
          {role === "courier" && (
            <>
              <Text style={styles.text}>
                Votre disponibilité :{" "}
                {data.courierSettings?.available ? "active" : "en pause"}
              </Text>
              <Button
                title={
                  data.courierSettings?.available
                    ? "Me rendre indisponible"
                    : "Me rendre disponible"
                }
                onPress={async () => {
                  try {
                    await api("/api/marketplace/courier?country=CD", {
                      available: !data.courierSettings?.available,
                      payoutMethod:
                        data.courierSettings?.payout_method || "cash",
                      payoutAccount: data.courierSettings?.payout_account || "",
                      benefitsAccepted: true,
                    });
                    await load();
                  } catch (e) {
                    setError((e as Error).message);
                  }
                }}
              />
              <Text style={styles.muted}>
                Chaque mission affiche ses frais de livraison et votre
                rémunération. Les règlements sont confirmés manuellement.
              </Text>
            </>
          )}
        </Card>
      )}
      {data && tab === "orders" && (
        <>
          {role === "courier" &&
            data.opportunities.map((m) => (
              <Card key={m.id}>
                <Text style={styles.heading}>
                  {m.city} · {m.commune}
                </Text>
                <Text style={styles.text}>
                  Frais de livraison : {money(m.fee)} · Rémunération :{" "}
                  {money(m.earnings)}
                </Text>
                <Button
                  title="Accepter cette mission"
                  onPress={() => claim(m.id, m.revision)}
                />
              </Card>
            ))}
          {data.orders.map((o) => (
            <OrderCard
              key={o.id}
              order={o}
              role={role}
              sellerIds={data.sellerIds}
              refresh={load}
            />
          ))}
        </>
      )}
      {data && tab === "products" && (
        <SellerProducts data={data} admin={role === "admin"} refresh={load} />
      )}{" "}
      {tab === "stats" && report && (
        <>
          {role === "seller" && (
            <Text style={styles.heading}>
              {followers} abonnés à votre boutique
            </Text>
          )}
          {report.rows.map((r) => (
            <Card key={r.productId}>
              <Text style={styles.heading}>{r.title}</Text>
              <Text style={styles.text}>
                {r.uniqueViewers} personnes ont vu ce produit · {r.buyerCount}{" "}
                acheteurs après réception.
              </Text>
            </Card>
          ))}
        </>
      )}
      {role === "admin" && tab === "verification" && <VerificationReviews />}
      {tab === "chat" && role !== "buyer" && (
        <>
          {role === "seller" && <AdminChat role="seller" kind="seller" />}
          {role === "courier" && <AdminChat role="courier" kind="courier" />}
          {role === "admin" && (
            <>
              <AdminChat role="admin" kind="seller" />
              <AdminChat role="admin" kind="courier" />
            </>
          )}
        </>
      )}
    </Page>
  );
}
