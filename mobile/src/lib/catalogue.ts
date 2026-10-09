import { useCallback, useEffect, useState } from "react";
import { api } from "./api";
import type { Product } from "./types";
export type Storefront = { id: number; name: string; reviewed: boolean };
export function useCatalogue() {
  const [result, setResult] = useState<{
      catalogue: Product[];
      stores: Storefront[];
      campaigns?: {id:string;title:string;image:string}[];
    }>({ catalogue: [], stores: [] }),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const load = useCallback(
    () =>
      api<{ catalogue: Product[]; stores: Storefront[] }>(
        "/api/catalogue?country=CD",
      )
        .then((data) => {
          setResult(data);
          setError("");
          setLoading(false);
        })
        .catch((e) => {
          setError(e.message);
          setLoading(false);
        }),
    [],
  );
  useEffect(() => {
    void load();
  }, [load]);
  return {
    products: result.catalogue,
    stores: result.stores,
    campaigns:result.campaigns || [],
    loading,
    error,
    load,
  };
}
