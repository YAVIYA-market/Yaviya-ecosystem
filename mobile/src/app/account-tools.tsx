import { useLocalSearchParams, router } from 'expo-router';
import { useStore } from '../lib/store';
import { AccountHub } from '../components/AccountHub';
import { Button, Page } from '../components/ui';
export default function AccountTools() {
 const {resource='listings'}=useLocalSearchParams<{resource:string}>();
 const store=useStore();
 const titles:Record<string,string>={listings:'Revente occasionnelle',finance:'Portefeuille et règlements',returns:'Retours et remboursements',addresses:'Mes adresses',support:'Service client',subscriptions:'Mes abonnements'};
 return <Page title={titles[resource] || 'Mon compte'}><Button outline title="Mon profil" onPress={()=>router.push("/profile")}/>{store.user?<AccountHub resource={resource}/>:<Button title="Me connecter" onPress={()=>router.push('/auth')}/>}</Page>;
}
