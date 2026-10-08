# Correctifs du parcours acheteur et du catalogue

- Un visiteur qui clique sur Acheter maintenant ouvre immédiatement la création de compte acheteur, sans dépendre de GET /api/auth/session. La sélection reste conservée jusqu’au profil et au paiement. La connexion reste proposée aux clients existants.
- L’authentification, le profil et la création de commande continuent à exiger des réponses serveur valides ; aucune commande ni session ne sont fabriquées en cas d’indisponibilité.
- Trois emplacements publicitaires de démonstration, compacts sur mobile, et un accès à l’offre publicitaire sont restaurés.
- Recherche par photo : import ou appareil photo, comparaison locale des couleurs/formes des images accessibles du catalogue. Aucune reconnaissance de marque, aucun envoi de la photo utilisateur.
- Neuf tris : sélection, prix croissant/décroissant, vendeurs vérifiés, derniers/premiers ajouts (identifiant produit), nom A–Z/Z–A, achats de démonstration.

## Vérification et limite du déploiement

Le test React compilé simule une réponse 503 sur la session d’un visiteur, puis vérifie l’ouverture de l’inscription et le parcours réel inscription → profil → commande → suivi sur une base de test locale. Il vérifie aussi les emplacements publicitaires, le bouton photo et les options de tri.

L’accès aux métadonnées des variables Vercel du projet yaviyaecosystem, équipe yaviya, est refusé par le connecteur (403). La présence et la validité de POSTGRES_URL/DATABASE_URL dans l’environnement Preview ne peuvent donc pas être confirmées. Le message d’indisponibilité provient du catch global api/handler.js et peut couvrir une erreur de configuration ou d’exécution ; il ne prouve pas à lui seul que les identifiants PostgreSQL manquent. Aucun secret ni accès n’a été modifié. Une validation serveur du déploiement reste nécessaire.
