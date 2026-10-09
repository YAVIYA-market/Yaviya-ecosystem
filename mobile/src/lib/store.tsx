import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { api, restoreSession } from "./api";
import type { AuthResult, Product, Profile } from "./types";
type Store = {
  user: AuthResult["user"];
  profile: Profile | null;
  ready: boolean;
  error: string;
  cart: { product: Product; q: number }[];
  favorites: number[];
  refresh: () => Promise<void>;
  add: (p: Product) => void;
  quantity: (id: number, q: number) => void;
  clearCart: () => void;
  favorite: (id: number) => Promise<void>;
  logout: () => Promise<void>;
};
const Context = createContext<Store | null>(null);
export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthResult["user"]>(null),
    [profile, setProfile] = useState<Profile | null>(null),
    [ready, setReady] = useState(false),
    [error, setError] = useState(""),
    [cart, setCart] = useState<Store["cart"]>([]),
    [favorites, setFavorites] = useState<number[]>([]);
  const refresh = useCallback(async () => {
    const auth = await api<AuthResult>("/api/auth/mobile/session");
    setUser(auth.user);
    if (auth.user) {
      const p = await api<Profile | null>("/api/customer?country=CD");
      setProfile(p);
      setFavorites(p?.wishlist || []);
    } else {
      setProfile(null);
      setFavorites([]);
    }
  }, []);
  useEffect(() => {
    let active = true;
    restoreSession()
      .then(refresh)
      .catch((e) => active && setError(e.message))
      .finally(() => active && setReady(true));
    return () => {
      active = false;
    };
  }, [refresh]);
  const add = (p: Product) =>
    setCart((previous) => {
      const old = previous.find((i) => i.product.id === p.id);
      return old
        ? previous.map((i) =>
            i.product.id === p.id ? { ...i, q: Math.min(99, i.q + 1) } : i,
          )
        : [...previous, { product: p, q: 1 }];
    });
  const quantity = (id: number, q: number) =>
    setCart((previous) =>
      previous
        .map((i) =>
          i.product.id === id ? { ...i, q: Math.max(0, Math.min(99, q)) } : i,
        )
        .filter((i) => i.q > 0),
    );
  const favorite = async (id: number) => {
    const next = favorites.includes(id)
      ? favorites.filter((x) => x !== id)
      : [...favorites, id];
    if (user && profile)
      await api("/api/customer?country=CD", {
        wishlistOnly: true,
        wishlist: next,
      });
    setFavorites(next);
  };
  const logout = async () => {
    await api("/api/auth/mobile/logout", {});
    setUser(null);
    setProfile(null);
    setFavorites([]);
    setCart([]);
  };
  return (
    <Context.Provider
      value={{
        user,
        profile,
        ready,
        error,
        cart,
        favorites,
        refresh,
        add,
        quantity,
        clearCart: () => setCart([]),
        favorite,
        logout,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useStore() {
  const ctx = useContext(Context);
  if (!ctx) throw new Error("Store absent");
  return ctx;
}
