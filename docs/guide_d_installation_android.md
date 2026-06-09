# Guide d'installation rapide sur Android (PWA)

Pour transformer ce prototype en une application sur votre téléphone Android sans passer par le Play Store, la méthode la plus simple est d'utiliser la technologie **PWA (Progressive Web App)**.

## 1. Préparation du code
Pour que l'application soit installable, j'ai ajouté les éléments suivants dans le code :
- Un fichier `manifest.json` qui définit le nom, les icônes et les couleurs de l'application.
- Un "Service Worker" pour permettre le fonctionnement hors ligne (basique) et une vitesse de chargement accrue.
- Des balises meta spécifiques pour mobile.

## 2. Hébergement
Vous devez mettre ce code en ligne. Voici deux options gratuites et ultra-rapides :
- **Netlify / Vercel :** Faites glisser le dossier contenant les fichiers HTML que je vous fournis.
- **GitHub Pages :** Idéal si vous gérez le code via Git.

## 3. Installation sur Android
Une fois l'URL de votre application obtenue (ex: `https://mon-sound-sync.netlify.app`) :
1. Ouvrez **Google Chrome** sur votre Android.
2. Allez sur l'URL de votre application.
3. Appuyez sur les **trois petits points** (menu) en haut à droite.
4. Sélectionnez **"Installer l'application"** ou **"Ajouter à l'écran d'accueil"**.
5. L'icône **MuseSound** apparaîtra sur votre écran d'accueil comme une application native.

## Note sur YouTube
Pour lire réellement le contenu de YouTube, cette interface devra être reliée à un script (backend) utilisant l'API YouTube ou un outil comme `yt-dlp` sur un serveur, car les navigateurs bloquent certaines lectures directes pour des raisons de droits.

---
*Prochaine étape : Une fois que vous êtes prêt, nous passerons à la conception de la version PC !*