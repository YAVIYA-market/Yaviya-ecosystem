# YAVIYA Mobile — première version hybride

Application Android/iOS Expo SDK 57 + React Native. Elle conserve la première version du site et ses parcours dans une WebView, avec zones sûres, retour Android, gestes iOS et écran de reconnexion. Ce n’est pas encore une réécriture native des quatre espaces. Le backend et les règles de rôle du site restent responsables des comptes et des commandes ; aucun secret serveur n’est embarqué.

## Lancer

Node 22.13 ou supérieur :

```sh
cd mobile
npm ci
npm start
```

Ouvrir avec une version compatible d’Expo Go ou une development build. Android/iOS uniquement : pas de support navigateur dans cette application.

## Construire les applications

```sh
npx eas-cli@latest login
npx eas-cli@latest build:configure
npx eas-cli@latest build --platform android --profile preview
npx eas-cli@latest build --platform ios --profile preview
```

Le profil preview produit un APK Android. iOS requiert un compte Apple Developer et l’enregistrement des appareils pour la distribution interne. Lier le projet à votre compte Expo avant les builds ; aucun compte, certificat ou identifiant EAS n’est inventé dans le dépôt. Pour une development build, installer expo-dev-client avec `npx expo install expo-dev-client`.

## Vérifier avant distribution

```sh
npm run typecheck
npx expo lint
npx expo export --platform android --platform ios
```

Recette sur téléphone requise : inscription, connexion persistante, achat, suivi, rôles autorisés, retour, photos/KYC, clavier et coupure réseau. Les erreurs API et les paiements simulés du site ne sont pas corrigés par l’enveloppe mobile. Notifications push, mode hors ligne, paiements natifs et publication dans les boutiques ne sont pas inclus. Aucune publication automatique du site ou des stores.

## Builds depuis GitHub

Le workflow manuel `.github/workflows/mobile-build.yml` valide le code puis lance le build EAS choisi (Android, iOS ou les deux). Il ne publie rien dans les stores. Avant son premier lancement :

1. Se connecter avec `npx eas-cli@latest login` et lancer `npx eas-cli@latest init` dans `mobile/`.
2. Committer `expo.extra.eas.projectId` généré dans app.json. Ne pas inventer cet identifiant.
3. Effectuer le premier build interactif de chaque plateforme pour créer/configurer les certificats : `npx eas-cli@latest build --platform android --profile preview` (puis iOS si compte Apple Developer disponible).
4. Créer un jeton sur https://expo.dev/accounts et l’ajouter uniquement comme secret GitHub `EXPO_TOKEN` dans Settings → Secrets and variables → Actions. Ne pas le transmettre dans une conversation ni le committer.
5. Après intégration du workflow dans la branche par défaut, lancer Actions → YAVIYA Mobile build → Run workflow.

L’URL de téléchargement est fournie par EAS une fois le build terminé. Un export JavaScript réussi ne constitue pas un APK/IPA signé.
