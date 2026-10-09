# Reprise de l’ancien site dans Next.js

Le nouveau haut de page est conservé. Le logo et son point restent sur une ligne. Les grands emplacements partenaires se trouvent avant le catalogue ; Promo du jour et les sélections produits précèdent les filtres. La FAQ reste accessible sur l’accueil et dans l’aide. Les panneaux professionnels retrouvent leur menu latéral sur ordinateur, adapté en grille sur mobile.

| Fonction de l’ancienne interface | Interface Next.js |
| --- | --- |
| Panier, favoris, profil, langue, catégories et recherche | Conservés en haut ; catégories et sous-catégories filtrent les produits |
| Recherche par photo | Import/appareil photo, comparaison locale approximative |
| Publicités M-Pesa, logistique, Benefits et produits | Campagnes React sur accueil et page Publicités, actions ouvrant les informations correspondantes |
| Promo du jour | Sélection des deux produits promotionnels du catalogue ; prix issus de l’API, sans remise supplémentaire inventée |
| Badge vendeur | Sceau avec coche, fondé sur le statut vérifié fourni par le serveur ; variantes démo identifiées |
| Galerie et comparaison | Plusieurs photos, changement de photo principale côté vendeur, comparaison, suggestions séparées par autres vendeurs et même boutique |
| Note des clients et popularité | Tri et notes illustratives explicitement marqués démo ; achats confirmés réels pour les autres produits |
| Boutique, province, ville, commune | Filtres liés sur les localisations connues des boutiques et les cinq villes actives ; pas de nouvelles zones de livraison activées |
| FAQ et problème résolu | Cartes pliables, Oui/Non, retour enregistré pour les comptes connectés, contact support |
| Abonnements acheteurs / Prime | Offres mensuelles et annuelles avec tarifs et conditions proposés, souscription désactivée |
| Forfaits vendeurs | Cinq formules, comparaison mensuelle/annuelle, commissions indicatives et sélection à l’inscription |
| Coupons | Portefeuille, crédit de test unique, échange confirmé et historique ; gain après réception basé sur commande et prix serveur |
| Acheteur | Inscription directe depuis l’achat, profil, paiement espèces, commandes, suivi partagé, discussion, évaluations |
| Vendeur | Vue d’ensemble, produits/photos, commandes, statistiques, paiements, forfaits et discussions |
| Livreur | Vue d’ensemble, missions, disponibilité, rémunération/frais, preuve photo et discussion admin |
| Admin | Vue d’ensemble, catalogue, commandes, statistiques, finance, identité/boutiques, messageries et espaces publicitaires |

Les anciens modules examinés comprennent promotions-dashboards, pricing-benefits, seller-plans, partner-campaigns, search-photo-ratings, product-gallery, product-insights, profile-commerce, customer, account-verification-flows, shared-commerce, shared-delivery, delivery-roles, courier-reviews, yavicoins, support, popular-faq, advertising, marketplace et les modules Auth/2FA.

## Vérifications

- Tests backend : comptes/sessions, achat, partage entre participants, isolation des rôles et marchés, justificatifs privés, identité, évaluations, mesures produits et 2FA.
- Parcours React compilé via HTTP : inscription → profil → produit sélectionné → commande → suivi/discussion ; publicités, lieux, paiements, livraison, Prime, coupons et réponse Non/contact support.
- Espaces React avec comptes distincts en base de test : vendeur (catalogue/photos, forfaits, paiements), livreur (disponibilité/discussion), admin (vérifications, boutiques, finance/publicités). Un acheteur reçoit 403 sur les trois vues privilégiées.
- Le test local des panneaux emploie SQLite ; la configuration MFA des administrateurs de production reste protégée par la règle PostgreSQL et les tests de sécurité existants.

## Limites conservées explicitement

Il s’agit d’une reprise de l’interface et du parcours partagé, pas d’une activation de services financiers. Mobile Money et cartes, escrow réel, comptabilité des commissions, reversements vendeurs automatiques, remboursements, facturation des abonnements et gestion commerciale des campagnes restent à intégrer. Aucun transfert réel n’est effectué par les panneaux. Les anciens soldes/retraits et simulations locales ne sont pas présentés comme un portefeuille bancaire opérationnel.

Le support utilise provisoirement partenariat@yaviya.cd pour orienter les demandes ; aucun ticket ni message électronique n’est envoyé automatiquement. Les localisations des boutiques réelles doivent encore être normalisées dans la base pour une couverture géographique complète. La validation de la version publique est distincte des tests locaux.
