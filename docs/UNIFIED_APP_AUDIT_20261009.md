# YAVIYA — audit et mise à jour de l’application unique

Date : 9 octobre 2026. Branche de travail : `migration/nextjs`. Le site public et `main` ne sont pas remplacés. Ce rapport décrit la version de travail, pas un lancement commercial déjà réalisé.

## Audit avant modification

Les 46 tests existants ont réussi avant modification. Le dépôt contient déjà un frontend React / Next.js, une application native Expo / React Native Android et iOS, et un backend commun compatible PostgreSQL / Supabase. Il n’a pas été recréé.

| Fonction | État initial vérifié | Traitement dans cette version |
|---|---|---|
| Comptes, e-mail / téléphone, sessions et 2FA | Implémentés. SMS dépend d’un fournisseur configuré. | Conservation ; 2FA obligatoire pour l’administration PostgreSQL / production. |
| Catalogue, photos multiples, panier, favoris, acheter maintenant | Implémentés et testés ; catalogue contient des produits illustratifs. | Conservation ; correction des favoris pour les nouveaux identifiants produits. |
| Commandes acheteur / vendeur / livreur / admin | Commandes communes, participants distincts, révisions et idempotence backend. | Conservation ; intégration des statuts de retour et de la comptabilité. |
| Vérification professionnelle | Examen admin, documents privés ; un seul dossier courant par compte. | Conservation ; les rôles approuvés sont archivés indépendamment du profil principal. Les demandes KYC restent séquentielles, un dossier en attente à la fois. |
| Cumul des rôles | Un changement du profil pouvait retirer l’accès précédent. | Corrigé : acheteur permanent, rôles vendeur et livreur validés cumulables ; révocation administrative prioritaire. |
| Revente particulière | Manquante. | Annonces distinctes de la boutique, 12 % côté serveur, consentement, état neuf / occasion, un article par annonce, plafond pilote de 10 annonces, modération et commandes communes. |
| Livraison, disponibilité, missions, prise en charge et photo | Implémentées. | Conservation ; ouverture d’un itinéraire dans Maps ajoutée, sans géolocalisation continue. |
| Avis | Évaluation après réception, rattachée au livreur affecté. | Conservation ; consultation des évaluations reçues ajoutée. |
| Retours et remboursements | Informations et politique 72 h, sans dossier métier complet. | Demande dans les 72 h suivant réception, décision admin, retour reçu, déclaration d’un remboursement externe, gel des règlements vendeurs. |
| Finance vendeur | Montants affichés, sans comptabilité des commissions / reversements. | Conditions figées à la commande ; écritures débit / crédit, séparation des espèces collectées, remises de fonds, commissions et règlements externes. |
| Paiements Mobile Money / carte / escrow | Désactivés, aucun prestataire marchand opérationnel. | Restent désactivés. Une requête monétaire non disponible échoue sans débit. Aucune simulation présentée comme transaction réelle. |
| Abonnements | Forfaits présentés ; aucun paiement activé. | Demandes persistantes explicitement non payées et non actives. |
| Coupons / YaviCoins | Récompenses de démonstration, base séparée des journaux financiers. | Conservés et clairement distingués du portefeuille monétaire. |
| Service client | Chatbot guidé, FAQ, lien support. | Conservation ; dossiers et réponses partagés avec l’administration ajoutés. Le chatbot reste guidé, sans moteur d’IA conversationnelle externe. |
| Adresses | Coordonnées du profil et adresse de commande. | Carnet d’adresses privé ajouté ; adresse professionnelle archivée avec le dossier et la boutique. |
| Promotions / publicités | Vitrines et partenaires existants, certains contenus illustratifs. | Conservation ; administration des contenus, brouillons / activation, prix promotionnels côté serveur, annonces publicitaires affichées sur web et mobile. |
| Sécurité / autorisations | Propriétés API, sessions, MFA, RLS Supabase. | Suspension de compte, révocation vendeur / livreur et journal d’actions ; portail admin web `/admin`. |

## Ce qui est opérationnel dans la version de travail

Les données des nouveaux parcours sont persistées côté backend. Les montants du panier, commissions et frais de livraison ne sont pas acceptés depuis le client comme source d’autorité. Les photographies privées et dossiers KYC restent derrière les contrôles d’accès existants. Les nouveaux espaces réutilisent les commandes, produits, photos et messages existants.

La commission particulière est calculée à 1 200 points de base, soit 12 % du montant des articles, hors livraison ; arrondi à l’unité monétaire par ensemble vendeur. Le taux professionnel doit être fixé explicitement par l’administration. Il n’est pas déduit de la politique particulière. Les conditions d’une commande existante ne changent pas quand le taux futur change.

Lors d’une remise en main propre, le vendeur encaisse déjà les articles : YAVIYA suit sa commission à recevoir, sans créer un second paiement du net vendeur. Lors d’une livraison avec espèces, le livreur détient initialement les fonds. Leur remise effective doit être déclarée avec montant exact et référence avant tout règlement déclaré. Les commissions reçues, reversements et remboursements manuels exigent une confirmation explicite d’une opération déjà effectuée à l’extérieur. Ce sont des déclarations comptables, sans rapprochement bancaire automatique ni preuve d’un virement vérifiée par une API.

Le remboursement du dossier actuel porte sur les articles de l’ensemble de la commande. Les frais d’une livraison exécutée restent séparés. Les retours partiels, remboursements partiels, régularisations anciennes et remboursements après reversement exigent un futur parcours financier dédié ; ils ne sont pas artificiellement comptabilisés par ce MVP. Une commande ancienne sans date serveur de réception invite à contacter le support.

## Base de données et sécurité

Avant modification : 28 tables `runtime` et 26 tables `public`, toutes avec RLS activée. L’advisor Supabase sécurité ne signalait aucune anomalie.

Migration additive : `database/migrations/0019_unified_market.sql` pour la recette locale et `supabase/migrations/20261009170046_unified_market.sql` pour PostgreSQL. Elle ajoute 14 tables et conserve toutes les tables existantes. La migration PostgreSQL a été exécutée dans une transaction puis annulée ; les données de production n’ont pas été modifiées. Les accès publics au journal financier sont refusés ; le rôle API peut ajouter une écriture mais ne peut ni modifier ni supprimer le journal, l’historique ou les remises de fonds.

Le schéma `runtime` est réservé au serveur. Sa politique RLS autorise le rôle serveur de confiance ; l’isolation par utilisateur y est imposée par les handlers API, pas par un JWT client injecté dans PostgreSQL. Les politiques du schéma public Supabase sont distinctes. Il ne faut pas présenter ces deux modèles comme une authentification Supabase native unique déjà achevée.

## Recette et limites de déploiement

49 tests backend réussissent ; compilation Next.js, lint et typecheck mobile réussissent. Les parcours React web et React Native Web ont été exécutés. Les tests couvrent les parcours acheteur, particulier, vendeur professionnel, livreur et administrateur, ainsi que les refus d’accès, commissions forgées, conditions figées, doubles règlements, remboursement et confidentialité. Voir `tests/unified-market.test.mjs`, `mobile/scripts/test-web.mjs` et `scripts/test-next-workspaces.mjs`.

Le test mobile exécute la véritable interface React Native Web dans Chromium. Il ne remplace pas une recette sur appareils Android / iOS : permissions, SecureStore, caméra, itinéraire GPS et notifications push doivent être vérifiés sur appareils. Les notifications actuelles sont actualisées par polling ; aucun service push n’est activé.

Avant déploiement de cette branche : appliquer la migration PostgreSQL à l’environnement choisi, configurer le backend HTTPS et sa clé de chiffrement MFA, puis relancer la recette. Les anciennes fonctions Next.js restent dans `pages/api`. Le portail `/admin` et toutes ses données nécessitent les autorisations backend ; masquer une URL ne constitue pas son contrôle d’accès.

Pour un lancement commercial, il reste à fournir / valider : comptes marchands et API M-Pesa / Orange / Airtel / cartes, signatures et idempotence des webhooks, rapprochement bancaire, remboursements / reversements automatiques, politique financière professionnelle, contrats logistiques et tarifs autorisés, configuration SMS et Upstash, sauvegardes / PITR et test de restauration, monitoring, audit de charge et appareils, DNS et environnement Vercel. Les fichiers médias du runtime utilisent encore le stockage privé SQL servi par API ; l’adaptateur de stockage objet distribué doit être achevé avant de charger un grand catalogue.

La hiérarchie administrative actuelle reste un propriétaire explicitement provisionné, avec révocation des rôles partenaires. Les équipes admin multiples, permissions fines et séparation des tâches financières restent une amélioration nécessaire avant une exploitation à grande échelle.

La compilation Android signée nécessite `EXPO_TOKEN`, `EAS_PROJECT_ID`, `MOBILE_API_URL`, l’initialisation Expo et les clés Android. Aucun APK ou IPA signé n’est annoncé tant que sa compilation n’a pas réussi. Aucun compte de recette ou secret financier ne doit être importé en production.

## Test manuel séparé

`npm run demo:setup` prépare une base SQLite locale distincte et cinq comptes de recette. `npm run demo:web` ouvre le frontend existant sur cette base, avec une clé MFA locale générée hors Git. Voir les identifiants de recette dans README. Aucune donnée de Supabase ou de production n’est copiée ni modifiée.
