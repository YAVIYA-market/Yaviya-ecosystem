import { useEffect, useState } from "react";
import { api } from "./api";
export default function useBuyerCounts(products, country) {
  const [counts, setCounts] = useState({});
  const ids = products
    .filter((p) => p.visible && p.approved)
    .map((p) => p.id)
    .sort((a, b) => a - b)
    .join(",");
  useEffect(() => {
    let live = true;
    setCounts({});
    if (!ids)
      return () => {
        live = false;
      };
    const list = ids.split(","),
      batches = [];
    for (let i = 0; i < list.length; i += 100)
      batches.push(list.slice(i, i + 100).join(","));
    Promise.all(
      batches.map((ids) =>
        api("/api/product-insights?ids=" + ids, { country }),
      ),
    )
      .then((results) => {
        if (live)
          setCounts(
            Object.fromEntries(
              results
                .flatMap((d) => d.products)
                .filter((p) => Number.isSafeInteger(p.buyerCount))
                .map((p) => [p.productId, p.buyerCount]),
            ),
          );
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [ids, country]);
  return counts;
}
