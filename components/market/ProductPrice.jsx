import { amount } from "../../lib/market/api";
export default function ProductPrice({ product, country }) {
  const old = product.regularPrice;
  const discounted = Number.isFinite(old) && Number.isFinite(product.price) && old > product.price && product.price > 0;
  return <span className="yv-product-pricing">
    <strong className="yv-price"><span className="yv-sr-only">Prix actuel : </span>{amount(product.price, country)}</strong>
    {discounted && <><del><span className="yv-sr-only">Ancien prix : </span>{amount(old, country)}</del><span className="yv-discount">−{Math.round((1 - product.price / old) * 100)} %</span></>}
  </span>;
}
