# Next.js et React

## Pages et composants

Les routes `pages/index.jsx` et `pages/[sitePage].jsx` rendent `components/market/MarketApp.jsx`. Il n'y a plus de chargement des scripts classiques du frontend dans ces pages. Les fichiers historiques restent pour comparaison avec `npm run dev:legacy`.

- `AuthForm` : e-mail/téléphone, inscription, SMS selon le prestataire configuré, challenge MFA.
- `ProfileForm` : coordonnées ; pays, devise et langue seulement dans les paramètres.
- `Onboarding` : quatre étapes distinctes, identité privée et abonnement à la fin.
- `Checkout` : sélection conservée après connexion, prix et frais revérifiés par le serveur, clé d'idempotence conservée en cas de nouvelle tentative.
- `Orders` : suivi partagé, actions du vendeur/livreur, preuve, discussion et évaluations du livreur réellement affecté.
- `Dashboard` : gestion des produits et photos multiples, statistiques, disponibilité, discussions et examen des identités.
- `AccountSettings` : préférences et double authentification, codes de secours.
- `InfoContent` : contenu existant des pages d'information sous forme d'éléments React.

Le serveur reste `pages/api/[[...route]].js` → `backend/http-handler.js` → `backend/application.js`. Les prix, stocks, droits d'accès et changements de commande sont validés côté serveur. `/api/catalogue` expose uniquement les produits approuvés visibles ; aucune identité ou commande n'est publique.

## Validation

```sh
npm ci
npm test
npm run build
npm run test:next
```

Le dernier test démarre le build Next.js avec une base SQLite temporaire. Il utilise les fichiers JavaScript React compilés et les vrais endpoints HTTP pour le catalogue, l'inscription, le profil, la commande et le suivi. Les tests métier vérifient les comptes distincts acheteur/vendeur/livreur/admin, la preuve privée et les évaluations. Ce test DOM n'est pas un audit visuel sur appareils physiques.

## Configuration de production

- PostgreSQL : `POSTGRES_URL`, rôle serveur `yaviya_runtime` et schéma privé `runtime`.
- MFA : `MFA_ENCRYPTION_KEY`, 32 octets aléatoires encodés en hexadécimal, côté serveur uniquement.
- Administrateur : provisionner explicitement avec `OWNER_LOGIN` et `OWNER_PASSWORD` puis `npm run db:owner`. Aucun utilisateur inscrit n'obtient ce privilège automatiquement. Supprimer ces valeurs de l'environnement après usage ; activer le MFA dans les paramètres du compte.
- Les migrations SQLite ne sont jamais exécutées sur PostgreSQL. Les migrations Supabase sont gérées séparément.
- Les paiements électroniques, abonnements facturés, escrow et reversements automatiques restent soumis à l'activation des opérateurs et de la banque. La commande de démonstration utilise les espèces à réception.
- La base de démonstration contient 60 produits par marché. Leur identité technique n'a aucun accès administrateur. Les boutiques commerciales doivent être enregistrées et validées séparément.


## Reprise des fonctions précédentes

Voir `docs/FEATURE_PARITY.md` pour le rapprochement avec les anciens modules, les parcours contrôlés et les limites commerciales. Le haut de page conserve la nouvelle disposition ; les espaces professionnels retrouvent une navigation latérale sur ordinateur.
