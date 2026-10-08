import { useEffect, useState } from "react";
import { Image, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { api, imageUrl } from "../lib/api";
import { useCatalogue } from "../lib/catalogue";
import { useStore } from "../lib/store";
import market from "../lib/market.json";
import {
  Button,
  Card,
  ErrorText,
  Loading,
  Page,
  styles,
  money,
} from "../components/ui";
export default function ProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { products, stores, loading, error } = useCatalogue();
  const store = useStore();
  const [index, setIndex] = useState(0),
    [message, setMessage] = useState(""),
    [following, setFollowing] = useState(false),
    [buyerCount, setBuyerCount] = useState(0);
  const p = products.find((p) => p.id === Number(id));
  useEffect(() => {
    if (!p) return;
    void api<{ products: { productId: number; buyerCount: number }[] }>(
      `/api/product-insights?country=CD&ids=${p.id}`,
    )
      .then((d) => setBuyerCount(d.products[0]?.buyerCount || 0))
      .catch(() => {});
    void api("/api/product-insights/view?country=CD", {
      productId: p.id,
    }).catch(() => {});
    if (store.user)
      void api<{ follows: { sellerId: number }[] }>(
        "/api/seller-follows?country=CD",
      )
        .then((d) =>
          setFollowing(d.follows.some((f) => f.sellerId === p.seller)),
        )
        .catch(() => {});
  }, [p, store.user]);
  if (loading)
    return (
      <Page>
        <Loading />
      </Page>
    );
  if (!p)
    return (
      <Page>
        <ErrorText error={error || "Produit introuvable"} />
      </Page>
    );
  const gallery = Array.from(
    new Set([
      ...(p.images || []),
      ...((market.productGalleries as Record<string, string[]>)[p.img] || []),
      p.img,
    ]),
  ).filter(Boolean);
  const favorite = async () => {
    try {
      await store.favorite(p.id);
    } catch (e) {
      setMessage((e as Error).message);
    }
  };
  const follow = async () => {
    if (!store.user) {
      router.push("/auth");
      return;
    }
    try {
      await api("/api/seller-follows?country=CD", {
        sellerId: p.seller,
        follow: !following,
      });
      setFollowing(!following);
    } catch (e) {
      setMessage((e as Error).message);
    }
  };
  return (
    <Page>
      <Image
        accessibilityLabel={`${p.title}, photo ${index + 1}`}
        source={{ uri: imageUrl(gallery[index] || p.img) }}
        resizeMode="contain"
        style={{
          width: "100%",
          height: 300,
          backgroundColor: "white",
          borderRadius: 18,
        }}
      />
      <View style={[styles.row, { justifyContent: "space-between" }]}>
        <Button
          outline
          title="← Précédente"
          disabled={gallery.length < 2}
          onPress={() =>
            setIndex((index + gallery.length - 1) % gallery.length)
          }
        />
        <Text>
          {index + 1}/{gallery.length}
        </Text>
        <Button
          outline
          title="Suivante →"
          disabled={gallery.length < 2}
          onPress={() => setIndex((index + 1) % gallery.length)}
        />
      </View>
      <Text style={styles.title}>{p.title}</Text>
      <Text style={styles.price}>{money(p.price)}</Text>
      {!!p.regularPrice && p.regularPrice > p.price && (
        <Text style={[styles.text, { textDecorationLine: "line-through" }]}>
          {money(p.regularPrice)}
        </Text>
      )}
      <Text style={styles.text}>{p.desc}</Text>
      <Text style={styles.muted}>{buyerCount} acheteurs après réception</Text>
      {(
        market.demoBuyerCounts as Record<
          string,
          { title: string; count: number }
        >
      )[String(p.id)]?.title === p.title && (
        <Text style={styles.muted}>
          {
            (market.demoBuyerCounts as Record<string, { count: number }>)[
              String(p.id)
            ].count
          }{" "}
          acheteurs · démo
        </Text>
      )}
      <ErrorText error={message} />
      <Button
        outline
        title="Acheter maintenant"
        disabled={p.stock < 1}
        onPress={() => {
          store.add(p);
          router.push(
            store.user && store.profile
              ? "/checkout"
              : { pathname: "/auth", params: { next: "checkout" } },
          );
        }}
      />
      <Button
        title="Ajouter au panier"
        disabled={p.stock < 1}
        onPress={() => {
          store.add(p);
          setMessage("Ajouté au panier.");
        }}
      />
      <Button
        outline
        title={
          store.favorites.includes(p.id)
            ? "Retirer des favoris"
            : "Ajouter aux favoris"
        }
        onPress={favorite}
      />
      <Card>
        <View style={styles.row}>
          <Text style={styles.heading}>
            {stores.find((s) => s.id === p.seller)?.name ||
              "Boutique du vendeur"}
          </Text>
          {stores.find((s) => s.id === p.seller)?.reviewed && (
            <Image
              accessibilityLabel="Vendeur vérifié YAVIYA"
              source={require("../../assets/verified.png")}
              style={{ width: 25, height: 25 }}
            />
          )}
        </View>
        <Button
          outline
          title={
            following
              ? "Ne plus suivre cette boutique"
              : "Suivre cette boutique"
          }
          onPress={follow}
        />
        <Button
          outline
          title="Une question sur ce produit ?"
          onPress={() => router.push("/help")}
        />
      </Card>
    </Page>
  );
}
