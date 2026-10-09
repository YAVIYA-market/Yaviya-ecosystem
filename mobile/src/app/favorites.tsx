import { Text } from "react-native";
import { useCatalogue } from "../lib/catalogue";
import { useStore } from "../lib/store";
import { ProductCard } from "../components/ProductCard";
import { ErrorText, Loading, Page, styles } from "../components/ui";
export default function Favorites() {
  const { products, loading, error } = useCatalogue();
  const { favorites } = useStore();
  return (
    <Page title="Vos favoris">
      <ErrorText error={error} />
      {loading ? (
        <Loading />
      ) : (
        products
          .filter((p) => favorites.includes(p.id))
          .map((p) => <ProductCard key={p.id} product={p} />)
      )}
      {!favorites.length && (
        <Text style={styles.text}>
          Gardez ici les produits qui vous plaisent.
        </Text>
      )}
    </Page>
  );
}
