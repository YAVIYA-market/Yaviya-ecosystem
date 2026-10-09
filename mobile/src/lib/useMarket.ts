import { useCallback, useEffect, useState } from "react";
import { AppState } from "react-native";
import { api } from "./api";
import type { MarketState, Role } from "./types";
export function useMarket(role: Role) {
  const [result, setResult] = useState<{
    role: Role;
    data: MarketState | null;
    error: string;
  } | null>(null);
  const load = useCallback(
    () =>
      api<MarketState>(`/api/marketplace?country=CD&view=${role}`)
        .then((data) => setResult({ role, data, error: "" }))
        .catch((e) => setResult({ role, data: null, error: e.message })),
    [role],
  );
  useEffect(() => {
    void load();
    const timer = setInterval(() => {
      if (AppState.currentState === "active" || AppState.currentState === null)
        void load();
    }, 15000);
    return () => clearInterval(timer);
  }, [load]);
  const current = result?.role === role ? result : null;
  return {
    data: current?.data || null,
    error: current?.error || "",
    loading: !current,
    load,
  };
}
