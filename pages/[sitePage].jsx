import MarketplacePage from '../components/MarketplacePage';
import { loadSitePage, sitePages } from '../lib/legacy-pages';
export default MarketplacePage;
export async function getStaticPaths() {
  return { paths: sitePages.filter(name => name !== 'index').map(name => ({ params: { sitePage: `${name}.html` } })), fallback: false };
}
export async function getStaticProps({ params }) {
  return { props: { page: await loadSitePage(params.sitePage.replace(/\.html$/, '')) } };
}
