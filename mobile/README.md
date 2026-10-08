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
