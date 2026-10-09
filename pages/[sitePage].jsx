import MarketApp from "../components/market/MarketApp";
import { marketData, staticContent } from "../lib/market/data";
export default MarketApp;
export async function getStaticPaths() {
  return {
    paths: ["congo", "aide", "confidentialite", "publicite"].map((name) => ({
      params: { sitePage: name + ".html" },
    })),
    fallback: false,
  };
}
export async function getStaticProps({ params }) {
  const pageName = params.sitePage.replace(/\.html$/, "");
  return {
    props: {
      pageName,
      data: await marketData(pageName === "congo" ? "CG" : "CD"),
      content: ["confidentialite", "publicite"].includes(pageName)
        ? await staticContent(pageName)
        : [],
    },
  };
}
