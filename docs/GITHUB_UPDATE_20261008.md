# Mise à jour du 8 octobre 2026

Ces changements concernent la branche de prévisualisation `migration/nextjs` (PR #5). Ils ne sont pas fusionnés dans `main` et ne constituent pas une mise en production vérifiée.

## Interface et parcours

- Sources originales conservées : le compteur HTML est vide et masqué au chargement pour les deux pays ; l’ajout le montre et le dernier retrait le masque. Les carrousels classiques utilisent aussi une icône sans texte Pause. Ces correctifs sont versionnés dans la branche de prévisualisation ; ils ne sont pas encore déployés sur le site public.
- Panier : aucun nombre affiché lorsqu’il est vide ; compteur de quantité visible après ajout et masqué après retrait du dernier article.
- Carrousel : commande de défilement par icône, sans mot Pause visible.
- En-tête : Accueil, Favoris, Panier, Notifications, Profil. La cloche présente les mises à jour des commandes accessibles au compte connecté. Les marqueurs de lecture sont conservés dans ce navigateur, séparés par compte et marché.
- Navigation : Pourquoi YAVIYA ouvre un contenu marketing détaillé sur les avantages publics, avec liens vers le catalogue, l’inscription vendeur et l’aide ; aucune information interne n’y figure.
- Chatbot : huit sujets courts sélectionnables (Livraison, Remboursement, Problème de compte, Coupon, Commander, Suivi de commande, Paiement, Service client), affichant directement la réponse correspondante.
- Chatbot : bouton flottant avec icône, compact sur mobile, qui ouvre l’assistant FAQ et le centre d’aide existants.
- Pied de page : À propos remplace les forfaits vendeurs ; Revendre un produit ouvre la création du compte vendeur puis son dossier. Les frais de livraison détaillés restent dans la commande après choix de l’adresse.
- Inscription vendeur : Compte et coordonnées → Activité → Identité et confidentialité → Choisir mon abonnement. RCCM obligatoire sauf déclaration de petite entreprise non enregistrée ; pièce d’identité obligatoire, conservée entre les étapes.
- Inscription livreur : quatre étapes, dont avantages et rémunération, puis abonnement et modalités de règlement. Les règlements automatiques ne sont pas activés.
- Fenêtres : plein écran sur ordinateur et mobile, flèche Retour en haut à gauche, fermeture clavier conservée et arrière-plan bloqué pendant l’ouverture.
- Photos des produits : flèches précédente/suivante, navigation cyclique, compteur et raccourcis clavier, en complément des miniatures sur mobile et ordinateur.
- Acheter maintenant : fond blanc, texte et contour orange.
- Retours et remboursements dans le profil et le pied de page : demande à signaler sous 72 heures après réception ; lien vers les commandes et le service client. Ce délai concerne le signalement et ne promet pas un remboursement sous 72 heures. Aucun remboursement financier automatique n’est ajouté.
- Profil : Magasins suivis, code d’invitation et lien partageable. Une invitation ouvre l’inscription ; aucune récompense ni attribution comptable de parrainage n’est implémentée.
- Boutiques : suivi depuis la fiche produit, persistance en base, consultation et désabonnement depuis le profil. Compteurs réels dans les espaces vendeur et admin, sans divulguer les identités des abonnés.

## Backend et données

`GET /api/seller-follows?country=CD|CG` renvoie les boutiques suivies du compte authentifié et les comptes agrégés par boutique. `POST` accepte `{ sellerId, follow }`. L’identité vient de la session côté serveur ; aucun identifiant d’acheteur fourni dans le corps n’est utilisé. Origine contrôlée, boutique publique vérifiée à l’inscription, contraintes uniques pour éviter les doublons, isolation par marché.

Migration SQLite : `database/migrations/0018_seller_following.sql`.
Migration Supabase : `supabase/migrations/20261008103825_seller_following.sql`.

La table Supabase est dans le schéma privé `runtime`, avec RLS activé et forcé, accès réservé au rôle serveur `yaviya_runtime`, aucun accès direct pour `anon` ou `authenticated`. L’autorisation par acheteur reste assurée par les handlers authentifiés du backend existant. Les index couvrent la liste personnelle, les compteurs par boutique et la clé étrangère acheteur.

## Validation

- Build Next.js réussi.
- 42 tests backend/interface réussis, dont persistance, idempotence, isolation entre comptes/marchés, rejet d’origine étrangère et rejet des en-têtes d’identité falsifiés.
- Parcours HTTP et React : achat, suivi, notifications, vendeur, livreur et admin avec comptes distincts.
- Chromium : en-tête sans débordement à 1440, 390 et 320 px ; inscription livreur complète, chatbot, bouton blanc/orange, suivi puis rechargement et désabonnement, invitation, demande de retour et lien Revendre un produit.
- Supabase : RLS et privilèges relus après création ; audit de sécurité sans alerte.

La prévisualisation Vercel reste protégée. Les transferts Mobile Money/bancaires, les abonnements payants et les remboursements financiers ne sont pas activés par cette mise à jour.
