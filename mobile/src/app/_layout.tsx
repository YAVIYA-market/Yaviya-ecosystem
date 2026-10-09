import { Stack, router } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StoreProvider, useStore } from "../lib/store";
import { colors } from "../components/ui";
function Navigation() {
  const { cart } = useStore();
  const n = cart.reduce((sum, i) => sum + i.q, 0);
  return (
    <View style={{ flexDirection: "row", gap: 20, paddingRight: 6 }}>
      {[
        { label: "Favoris", path: "/favorites" },
        { label: n ? `Panier (${n})` : "Panier", path: "/cart" },
        { label: "Profil", path: "/profile" },
      ].map((x) => (
        <Pressable
          key={x.path}
          onPress={() => router.push(x.path as "/profile")}
          accessibilityRole="button"
          accessibilityLabel={x.label}
        >
          <Text
            style={{ color: colors.orange, fontWeight: "700", fontSize: 14 }}
          >
            {x.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
export default function Layout() {
  return (
    <SafeAreaProvider>
      <StoreProvider>
        <Stack
          screenOptions={{
            headerTintColor: colors.orange,
            headerStyle: { backgroundColor: "white" },
            headerTitleStyle: { fontWeight: "800" },
            headerBackTitle: "Retour",
            contentStyle: { backgroundColor: "#faf9f7" },
          }}
        >
          <Stack.Screen
            name="index"
            options={{ title: "YAVIYA", headerRight: () => <Navigation /> }}
          />
          <Stack.Screen name="product" options={{ title: "Le produit" }} />
          <Stack.Screen name="cart" options={{ title: "Panier" }} />
          <Stack.Screen name="favorites" options={{ title: "Favoris" }} />
          <Stack.Screen name="auth" options={{ title: "Mon compte" }} />
          <Stack.Screen name="account-tools" options={{title:"Mon espace YAVIYA"}}/>
          <Stack.Screen name="profile" options={{ title: "Profil" }} />
          <Stack.Screen name="checkout" options={{ title: "Ma commande" }} />
          <Stack.Screen
            name="orders"
            options={{ title: "Suivre ma commande" }}
          />
          <Stack.Screen name="workspace" options={{ title: "Votre espace" }} />
          <Stack.Screen
            name="onboarding"
            options={{ title: "Rejoindre YAVIYA" }}
          />
          <Stack.Screen name="help" options={{ title: "Besoin d’aide" }} />
          <Stack.Screen
            name="notifications"
            options={{ title: "Notifications" }}
          />
          <Stack.Screen
            name="security"
            options={{ title: "Sécurité du compte" }}
          />
        </Stack>
      </StoreProvider>
    </SafeAreaProvider>
  );
}
