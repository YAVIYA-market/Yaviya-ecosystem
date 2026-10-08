import MarketplacePage from '../components/MarketplacePage';
import { loadSitePage } from '../lib/legacy-pages';
export default MarketplacePage;
export async function getStaticProps() { return { props: { page: await loadSitePage('index') } }; }
