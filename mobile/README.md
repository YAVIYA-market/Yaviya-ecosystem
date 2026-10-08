# YAVIYA Mobile — React Native / Expo

Application native Android et iOS, avec aperçu web pour la recette. Elle utilise **le même backend et les mêmes identifiants** que le site ; les commandes sont partagées entre leurs participants.

## Installation

Prérequis : Node.js 24, npm, et un backend de cette branche accessible depuis le téléphone.

```sh
# À la racine du dépôt
npm ci
npm run db:migrate
npm run dev

# Dans un autre terminal
cd mobile
npm ci
cp .env.example .env
# Renseigner EXPO_PUBLIC_API_URL avec l’URL du backend correspondant.
npm start
```

Sur un téléphone, `localhost` désigne le téléphone : utiliser l’adresse LAN de l’ordinateur pour le développement, ou une URL HTTPS accessible. En production, HTTPS est obligatoire. Le backend de l’ancienne version ne possède pas `/api/auth/mobile/*` : il faut déployer le backend de cette branche avant de relier l’application à une URL de production. Ne placer aucune clé privée Supabase, Redis, SMS ou de paiement dans `EXPO_PUBLIC_*`.

## Organisation

| Répertoire                      | Contenu                                                         |
| ------------------------------- | --------------------------------------------------------------- |
| `src/app/`                      | Écrans et navigation Expo Router                                |
| `src/components/`               | Composants visuels, commandes, produits et validation           |
| `src/lib/`                      | Client API, stockage de session, types, configuration et photos |
| `assets/`                       | Icône YAVIYA                                                    |
| `scripts/test-web.mjs`          | Recette de l’interface avec backend SQLite isolé                |
| `../backend/mobile-auth.js`     | Transport natif des sessions existantes                         |
| `../tests/mobile-auth.test.mjs` | Isolation, expiration, révocation, MFA et commande partagée     |

## Parcours disponibles

- Catalogue, recherche, catégories, tri, promotions, galerie précédente/suivante, favoris et panier. Aucun nombre de stock dans le catalogue public.
- Acheter maintenant → inscription acheteur ou connexion → coordonnées → ville/commune → paiement en espèces → commande partagée et suivi.
- Connexion par e-mail ou téléphone (+243 / +242), mot de passe, SMS OTP si le fournisseur Supabase est activé, et double authentification TOTP avec récupération.
- Dossiers vendeur et livreur en quatre étapes, pièce privée obligatoire, pays d’émission et permis C réservé aux livreurs. Abonnement/adhésion à la dernière étape ; choix enregistré, aucune facturation automatique.
- Espace vendeur : produits, jusqu’à huit photos, commandes, vues uniques, acheteurs après réception, abonnés et discussion admin.
- Espace livreur : disponibilité, missions, collecte, preuve photo, rémunération/frais par livraison et discussion admin.
- Espace admin : dossiers, accès privé aux pièces, approbation/refus, produits, commandes, statistiques et discussions. Le rôle admin est provisionné côté serveur ; aucune inscription ne le donne. La MFA est obligatoire sur le backend PostgreSQL de production.
- Profil : coordonnées, historique, coupons de démonstration, boutiques suivies, invitation, préférences et sécurité. Aide guidée, sujets populaires et contact support, demande de retour sous 72 h.

Les frais sont estimés à partir de `src/lib/market.json` puis recalculés côté serveur. Les cinq villes desservies sont Kinshasa, Lubumbashi, Kolwezi, Matadi et Boma ; les autres villes sont listées mais la commande y est bloquée. Le pilote mobile utilise le marché RDC ; l’indicatif +242 permet un compte téléphonique congolais, sans activer automatiquement un catalogue Congo distinct.

## Sécurité

Les sessions mobiles opaques sont stockées dans Expo SecureStore sur Android/iOS, jamais dans AsyncStorage. Le serveur garde uniquement leur empreinte et vérifie expiration et génération MFA. Le transport mobile ignore les cookies du navigateur, refuse les origines étrangères et n’accorde aucun rôle d’après des en-têtes client. La connexion HTTP locale n’est autorisée que pour le développement.

Dans l’aperçu web, la session reste en mémoire : un rechargement demande une nouvelle connexion. Servir cet aperçu sur la même origine que l’API ; aucun CORS permissif n’est ajouté. La photo d’identité reste privée ; les produits publiés utilisent leur accès public séparé.

## Vérification

```sh
# Racine : tests du backend, dont la connexion native et les commandes partagées
npm test

# mobile/
npm run typecheck
npm run lint
npm run export

# Recette web locale, sans toucher les comptes de production
npx playwright install chromium
npm run test:web
```

`npm run export` génère les bundles JavaScript/Hermes Android et iOS et l’aperçu web. **Cela ne produit pas un APK ni une application iOS signée.** La recette web vérifie le rendu React Native Web et les appels réels à une base SQLite de test ; les permissions et le stockage sécurisé doivent également être validés sur des téléphones physiques.

## APK de test et distribution iOS

`eas.json` fournit les profils development, preview (APK Android interne) et production. Le compte Expo/EAS, les identifiants définitifs et les comptes des stores doivent appartenir à YAVIYA. Après configuration du backend HTTPS et connexion au compte Expo :

```sh
npx eas-cli@latest build --platform android --profile preview
npx eas-cli@latest build --platform ios --profile preview
# Après recette sur appareils et configuration des stores :
npx eas-cli@latest build --platform all --profile production
```

## Limites commerciales

M-Pesa, Orange Money, Airtel, cartes, escrow, facturation des abonnements, remboursements et reversements automatiques restent désactivés tant que les contrats, clés et webhooks ne sont pas intégrés. Un règlement manuel peut être enregistré par l’admin après livraison : cet enregistrement n’effectue aucun transfert bancaire. Les coupons et certains compteurs d’acheteurs sont explicitement signalés comme démo. Les préférences de langue/devise sont enregistrées ; la traduction complète et la conversion des prix ne sont pas encore activées. Les notifications affichent les événements de commande actualisés ; les notifications push ne sont pas intégrées.

Le chatbot est une aide guidée sur les questions fréquentes, avec relais vers `support@yaviya.cd`. Confirmer cette boîte mail avant lancement. Partenariats : `partenariat@yaviya.cd`.
