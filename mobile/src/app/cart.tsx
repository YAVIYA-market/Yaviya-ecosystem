import { Text, View } from "react-native";
import { router } from "expo-router";
import { Button, Card, Page, styles, money } from "../components/ui";
import { useStore } from "../lib/store";
export default function Cart() {
  const store = useStore();
  return (
    <Page title="Votre panier">
      {store.cart.length === 0 ? (
        <Card>
          <Text style={styles.text}>Votre panier attend vos envies.</Text>
          <Button
            title="Découvrir les produits"
            onPress={() => router.push("/")}
          />
        </Card>
      ) : (
        <>
          {store.cart.map((i) => (
            <Card key={i.product.id}>
              <Text style={styles.heading}>{i.product.title}</Text>
              <Text style={styles.price}>{money(i.product.price * i.q)}</Text>
              <View style={styles.row}>
                <Button
                  outline
                  title="−"
                  onPress={() => store.quantity(i.product.id, i.q - 1)}
                />
                <Text accessibilityLabel="Quantité">{i.q}</Text>
                <Button
                  outline
                  title="+"
                  onPress={() => store.quantity(i.product.id, i.q + 1)}
                />
                <Button
                  outline
                  title="Retirer"
                  onPress={() => store.quantity(i.product.id, 0)}
                />
              </View>
            </Card>
          ))}
          <Text style={styles.price}>
            Sous-total :{" "}
            {money(store.cart.reduce((s, i) => s + i.product.price * i.q, 0))}
          </Text>
          <Text style={styles.muted}>
            Les frais de livraison apparaîtront après le choix de votre adresse.
          </Text>
          <Button
            title="Commander"
            onPress={() =>
              router.push(
                store.user && store.profile
                  ? "/checkout"
                  : { pathname: "/auth", params: { next: "checkout" } },
              )
            }
          />
        </>
      )}
    </Page>
  );
}
