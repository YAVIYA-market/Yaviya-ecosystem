import { Text } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useStore } from "../lib/store";
import { useMarket } from "../lib/useMarket";
import type { Role } from "../lib/types";
import { Button, ErrorText, Loading, Page, styles } from "../components/ui";
import { OrderCard } from "../components/OrderCard";
export default function Orders() {
  const { view } = useLocalSearchParams<{ view?: Role }>();
  const role: Role = ["seller", "courier", "admin"].includes(view || "")
    ? (view as Role)
    : "buyer";
  const { user } = useStore();
  const { data, error, loading, load } = useMarket(role);
  if (!user)
    return (
      <Page>
        <Button
          title="Me connecter pour retrouver mes commandes"
          onPress={() => router.push("/auth")}
        />
      </Page>
    );
  return (
    <Page title={role === "buyer" ? "Vos commandes" : "Commandes à traiter"}>
      <ErrorText error={error} />
      <Button outline title="Actualiser le suivi" onPress={load} />
      {loading && <Loading />}
      {data?.orders.map((o) => (
        <OrderCard
          key={o.id}
          order={o}
          role={role}
          sellerIds={data.sellerIds}
          refresh={load}
        />
      ))}
      {data && !data.orders.length && (
        <Text style={styles.text}>Aucune commande pour le moment.</Text>
      )}
    </Page>
  );
}
