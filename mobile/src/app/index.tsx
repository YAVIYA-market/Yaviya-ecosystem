import { useMemo, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Button,
  Card,
  ErrorText,
  Field,
  Loading,
  Select,
  styles,
} from "../components/ui";
import { ProductCard } from "../components/ProductCard";
import { useCatalogue } from "../lib/catalogue";
import market from "../lib/market.json";
export default function Catalogue() {
  const { products, loading, error, load } = useCatalogue();
  const [query, setQuery] = useState(""),
    [category, setCategory] = useState("Toutes"),
    [sort, setSort] = useState("Recommandés");
  const filtered = useMemo(() => {
    const p = products.filter(
      (p) =>
        (category === "Toutes" || p.category === category) &&
        `${p.title} ${p.desc}`.toLowerCase().includes(query.toLowerCase()),
    );
    if (sort === "Prix croissant") p.sort((a, b) => a.price - b.price);
    if (sort === "Prix décroissant") p.sort((a, b) => b.price - a.price);
    if (sort === "Nom A–Z") p.sort((a, b) => a.title.localeCompare(b.title));
    if (sort === "Promotions")
      p.sort((a, b) => (b.regularPrice ? 1 : 0) - (a.regularPrice ? 1 : 0));
    return p;
  }, [products, category, query, sort]);
  return (
    <SafeAreaView edges={["bottom"]} style={styles.page}>
      <FlatList
        data={filtered}
        keyExtractor={(p) => String(p.id)}
        contentContainerStyle={styles.content}
        refreshing={loading}
        onRefresh={load}
        renderItem={({ item }) => <ProductCard product={item} />}
        ListHeaderComponent={
          <View style={{ gap: 16, paddingBottom: 16 }}>
            <View style={styles.row}>
              <Button
                outline
                title="Suivre ma commande"
                onPress={() => router.push("/orders")}
              />
              <Button
                outline
                title="Notifications"
                onPress={() => router.push("/notifications")}
              />
              <Button
                outline
                title="Besoin d’aide"
                onPress={() => router.push("/help")}
              />
            </View>
            <Card>
              <Text style={styles.title}>Vos envies prennent vie.</Text>
              <Text style={styles.text}>
                Des boutiques à découvrir, des produits pour chaque jour et un
                suivi à chaque étape.
              </Text>
              <Button
                title="Votre espace"
                outline
                onPress={() => router.push("/workspace")}
              />
            </Card>
            <Field
              label="Rechercher un produit"
              value={query}
              onChangeText={setQuery}
            />
            <Select
              label="Catégories"
              options={[
                "Toutes",
                ...market.categorySections.map((s) => String(s[0])),
              ]}
              value={category}
              onChange={setCategory}
            />
            <Select
              label="Trier"
              options={[
                "Recommandés",
                "Prix croissant",
                "Prix décroissant",
                "Nom A–Z",
                "Promotions",
              ]}
              value={sort}
              onChange={setSort}
            />
            <Text style={styles.heading}>
              {category === "Toutes" ? "À découvrir" : category}
            </Text>
            <ErrorText error={error} />
            {error && <Button title="Réessayer" onPress={load} />}
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <Loading />
          ) : (
            <Text style={styles.text}>Aucun produit trouvé.</Text>
          )
        }
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Ouvrir le chatbot"
        onPress={() => router.push("/help")}
        style={{
          position: "absolute",
          right: 20,
          bottom: 24,
          padding: 17,
          borderRadius: 30,
          backgroundColor: "#c2410c",
        }}
      >
        <Text style={{ color: "white", fontWeight: "700" }}>Discuter</Text>
      </Pressable>
    </SafeAreaView>
  );
}
