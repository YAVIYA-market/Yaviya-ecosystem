import AdminPortal from '../components/market/AdminPortal';
import { marketData } from '../lib/market/data';
export default AdminPortal;
export async function getStaticProps(){return {props:{data:await marketData()}};}
