import { ProtectedPhoto } from "./ProtectedPhoto";
import { useState } from "react";
import { Image, Text, View } from "react-native";
import { api, imageUrl } from "../lib/api";
import { appendPhoto, choosePhotos } from "../lib/photos";
import market from "../lib/market.json";
import type { Product, MarketState } from "../lib/types";
import { Button, Card, ErrorText, Field, Select, styles, money } from "./ui";
export function SellerProducts({
  data,
  admin = false,
  refresh,
}: {
  data: MarketState;
  admin?: boolean;
  refresh: () => Promise<void>;
}) {
  const [editing, setEditing] = useState<Product | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const change = (patch: Partial<Product>) =>
    setEditing((p) => (p ? { ...p, ...patch } : null));
  const save = async () => {
    if (!editing) return;
    setBusy(true);
    setError("");
    try {
      await api("/api/marketplace/catalogue?country=CD", editing);
      setEditing(null);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const upload = async () => {
    if (!editing) return;
    setBusy(true);
    setError("");
    try {
      const photos = await choosePhotos(true);
      const images = [...(editing.images || [])];
      if (images.length + photos.length > 8)
        throw new Error("Une galerie peut contenir jusqu’à 8 photos.");
      for (const photo of photos) {
        const f = new FormData();
        f.append("productId", String(editing.id));
        f.append("sellerId", String(editing.seller));
        await appendPhoto(f, "photo", photo);
        const result = await api<{ url: string }>(
          "/api/product-photos?country=CD",
          f,
        );
        images.push(result.url);
      }
      change({ images, img: images[0] || "" });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <ErrorText error={error} />
      {!admin && data.sellerIds[0] && (
        <Button
          title="Ajouter un produit"
          onPress={() =>
            setEditing({
              id:
                Math.floor(Date.now() / 1000) +
                Math.floor(Math.random() * 10000),
              seller: data.sellerIds[0],
              title: "",
              category: String(market.categorySections[0][0]),
              price: 1,
              stock: 1,
              visible: true,
              approved: false,
              img: "",
              images: [],
              desc: "",
            })
          }
        />
      )}{" "}
      {editing && (
        <Card>
          <Text style={styles.heading}>Fiche produit</Text>
          <Field
            label="Nom du produit *"
            value={editing.title}
            onChangeText={(title) => change({ title })}
          />
          <Select
            label="Catégorie"
            options={market.categorySections.map((s) => String(s[0]))}
            value={editing.category}
            onChange={(category) => change({ category, subcategory: "" })}
          />
          <Field
            label="Prix (FC) *"
            keyboardType="numeric"
            value={String(editing.price)}
            onChangeText={(v) => change({ price: Number(v) })}
          />
          <Field
            label="Quantité en stock · privée"
            keyboardType="numeric"
            value={String(editing.stock)}
            onChangeText={(v) => change({ stock: Number(v) })}
          />
          <Field
            label="Description"
            value={editing.desc}
            onChangeText={(desc) => change({ desc })}
            multiline
          />
          <Text style={styles.muted}>
            Jusqu’à 8 photos pour présenter votre produit sous plusieurs angles.
          </Text>
          {editing.images?.map((src, index) => (
            <View key={src} style={styles.row}>
              {src.startsWith("/api/") ? (
                <ProtectedPhoto
                  path={src}
                  label="Photo de votre produit"
                  height={100}
                />
              ) : (
                <Image
                  source={{ uri: imageUrl(src) }}
                  style={{ width: 80, height: 80 }}
                />
              )}
              <Button
                outline
                title={`Retirer la photo ${index + 1}`}
                disabled={busy}
                onPress={() => {
                  const images = editing.images!.filter((s) => s !== src);
                  change({ images, img: images[0] || "" });
                }}
              />
            </View>
          ))}
          <Button
            outline
            title="Ajouter plusieurs photos"
            disabled={busy}
            onPress={upload}
          />
          <Button
            outline
            title={editing.visible ? "✓ Produit visible" : "Produit masqué"}
            onPress={() => change({ visible: !editing.visible })}
          />
          {admin && (
            <Button
              outline
              title={
                editing.approved
                  ? "✓ Publication approuvée"
                  : "Approuver la publication"
              }
              onPress={() => change({ approved: !editing.approved })}
            />
          )}
          <Button
            title="Enregistrer le produit"
            disabled={busy || !editing.images?.length}
            onPress={save}
          />
          <Button
            outline
            title="Annuler"
            disabled={busy}
            onPress={() => setEditing(null)}
          />
        </Card>
      )}
      {data.catalogue
        .filter((p) => admin || data.sellerIds.includes(p.seller))
        .map((p) => (
          <Card key={p.id}>
            <Text style={styles.heading}>{p.title}</Text>
            <Text style={styles.text}>
              {money(p.price)} ·{" "}
              {p.approved ? "Approuvé" : "En attente de validation"}
            </Text>
            <Button
              outline
              title="Gérer ce produit"
              onPress={() => setEditing({ ...p, images: p.images || [p.img] })}
            />
          </Card>
        ))}
    </>
  );
}
