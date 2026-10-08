# Reprise de la migration — 8 octobre 2026

La migration reste sur migration/nextjs (PR 5 en brouillon). Le site initial sur main reste la production ; aucune fusion ou publication de remplacement n’est effectuée.

Le parcours local compilé est vérifié avec une base isolée : Acheter maintenant, inscription acheteur, profil, commande, suivi/discussion et espaces distincts vendeur/livreur/admin. Ce contrôle SQLite ne prouve pas le fonctionnement de la connexion PostgreSQL du déploiement Preview.

## Point bloquant

Le connecteur Vercel `web_fetch_vercel_url` répond success=false, stage=lookup_deployment, status=404 pour la session de la préversion. Il indique que le déploiement est introuvable ou hors du périmètre autorisé. Les lectures antérieures de configuration du projet étaient refusées (403). Il faut autoriser le projet yaviyaecosystem de l’équipe yaviya avant de vérifier ses journaux et ses variables Preview.

Aucune cause de la réponse serveur 503 n’est confirmée. Ne pas recopier les secrets Production vers Preview à l’aveugle. Prévoir une base de test isolée avec le schéma runtime et les migrations, le rôle serveur et les règles d’accès adaptés.

## Contrôle du déploiement

```sh
node scripts/check-next-deployment.mjs https://yaviyaecosystem-git-migration-nextjs-yaviya.vercel.app
```

Ce contrôle lecture seule s’arrête au premier échec : rendu Next.js, service de session, catalogue. Il ne crée ni compte ni commande. Pour une préversion protégée, le secret de bypass peut être fourni uniquement par l’environnement VERCEL_AUTOMATION_BYPASS_SECRET ; ne pas le committer ni le mettre dans une URL ou une conversation.

Après accès rétabli : consulter les logs du premier appel en échec, corriger la configuration constatée, vérifier inscription/profil/commande sur PostgreSQL Preview avec données de test et nettoyage, puis réaliser la recette visuelle mobile/desktop. Une compilation ou une CI réussie ne constitue pas une validation commerciale.
