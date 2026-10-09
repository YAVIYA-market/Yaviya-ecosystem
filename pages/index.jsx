import MarketApp from "../components/market/MarketApp";
import { marketData } from "../lib/market/data";
export default MarketApp;
export async function getStaticProps() {
  return { props: { data: await marketData() } };
}
