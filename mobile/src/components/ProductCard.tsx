import { Image, Text, View } from "react-native";
import { router } from "expo-router";
import { Button, Card, money, styles } from "./ui";
import { imageUrl } from "../lib/api";
import type { Product } from "../lib/types";
import market from "../lib/market.json";
export function ProductCard({ product: p }: { product: Product }) {
  const demo = (market.demoBuyerCounts as Record<string, { count: number }>)[
    String(p.id)
  ]?.count;
  return (
    <Card>
      <Image
        accessibilityLabel={p.title}
        source={{ uri: imageUrl(p.img) }}
        resizeMode="contain"
        style={{
          width: "100%",
          height: 155,
          backgroundColor: "#f7f7f6",
          borderRadius: 12,
        }}
      />
      <Text style={styles.heading} numberOfLines={2}>
        {p.title}
      </Text>
      <View style={styles.row}>
        <Text style={styles.price}>{money(p.price)}</Text>
        {!!p.regularPrice && p.regularPrice > p.price && (
          <Text style={[styles.muted, { textDecorationLine: "line-through" }]}>
            {money(p.regularPrice)}
          </Text>
        )}
      </View>
      {!!demo && <Text style={styles.muted}>{demo} acheteurs · démo</Text>}
      <Button
        outline
        title="Voir le produit"
        onPress={() =>
          router.push({ pathname: "/product", params: { id: p.id } })
        }
      />
    </Card>
  );
}
