import { Text } from "react-native";
import { router } from "expo-router";
import { useStore } from "../lib/store";
import { useMarket } from "../lib/useMarket";
import { Button, Card, ErrorText, Page, styles } from "../components/ui";
export default function Notifications() {
  const { user } = useStore();
  const { data, error, load } = useMarket("buyer");
  return (
    <Page title="Vos notifications">
      {!user ? (
        <Button title="Me connecter" onPress={() => router.push("/auth")} />
      ) : (
        <>
          <ErrorText error={error} />
          <Button outline title="Actualiser" onPress={load} />
          {data?.orders.map((o) => (
            <Card key={o.id}>
              <Text style={styles.heading}>{o.id}</Text>
              {o.events.slice(-3).map((event, index) => (
                <Text key={index} style={styles.text}>
                  {event}
                </Text>
              ))}
              <Button
                outline
                title="Voir le suivi"
                onPress={() => router.push("/orders")}
              />
            </Card>
          ))}
          {!data?.orders.length && (
            <Text style={styles.text}>
              Les nouvelles étapes de vos commandes apparaîtront ici.
            </Text>
          )}
        </>
      )}
    </Page>
  );
}
