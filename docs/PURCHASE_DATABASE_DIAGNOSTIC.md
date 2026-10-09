# Diagnostic du parcours d'achat — 8 octobre 2026

Le site pouvait afficher les produits de démonstration du frontend, alors que `runtime.market_products` était vide. Après connexion, `/api/marketplace?view=buyer` renvoyait un catalogue vide et remplaçait les produits locaux. Le produit sélectionné ne pouvait donc pas être commandé.

Le remplissage automatique `ensureSeeds` dépend de `admin_access.owner`. Aucun propriétaire administrateur n'était configuré dans cette installation. L'inscription et l'enregistrement du profil fonctionnaient pourtant dans PostgreSQL : leurs réponses HTTP 200 ne prouvaient pas que le catalogue était prêt.

Les 60 références de chaque marché ont été enregistrées explicitement, sans changer les droits administrateur ou les règles RLS. L'identité technique `demo:catalogue` n'a aucun compte de connexion. Ces références restent des produits de démonstration ; les véritables boutiques et produits doivent être intégrés séparément avant lancement commercial.

Pour initialiser une autre base de démonstration préparée :

```sh
node --env-file-if-exists=.env scripts/seed-demo-catalogue.mjs --confirm-demo
```

Cette commande est explicite, conserve les produits existants et ne fait pas partie du build ou du démarrage de production. Ne pas l'utiliser pour remplir un catalogue commercial.

Les fenêtres Next.js ont également reçu un correctif CSS : le conteneur `#__next` doit rester visible lorsque le dialogue d'achat s'ouvre. Le test `tests/next-modal.test.mjs` protège ce comportement.
