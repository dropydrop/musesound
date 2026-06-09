# Roadmap Technique : Faire fonctionner MuseSound

Pour passer du design à une application réelle qui lit YouTube, voici les trois piliers nécessaires :

## 1. Authentification (OAuth 2.0)
Pour vous connecter à votre compte, l'application doit utiliser le protocole **Google OAuth 2.0**.
- **Comment ça marche :** L'utilisateur clique sur "Connexion", est redirigé vers une page sécurisée de Google, valide l'accès, et Google renvoie un "Token" (jeton) à MuseSound.
- **Sécurité :** Vos identifiants ne transitent jamais par MuseSound, tout se passe chez Google.

## 2. Accès aux données (YouTube Data API v3)
Une fois connecté, le "Token" permet d'appeler l'API YouTube pour :
- Récupérer vos **Playlists**.
- Lister vos **Vidéos Likées**.
- Rechercher de nouveaux morceaux.

## 3. Lecture Audio (YouTube IFrame Player API)
C'est la partie la plus délicate sur mobile (car YouTube interdit la lecture en arrière-plan sans Premium via son API standard).
- **Option A (Web) :** Utiliser le lecteur invisible de YouTube.
- **Option B (Desktop/VLC) :** Utiliser des outils comme `yt-dlp` pour extraire uniquement le flux audio et le lire dans un lecteur léger comme VLC (nécessite un petit serveur local).

## Prochaine étape concrète
Je vous ai dessiné les écrans de connexion. Pour la suite, il faudrait un développeur (ou utiliser un outil "no-code" comme FlutterFlow ou Bubble) pour coller ces designs sur les fonctions réelles de l'API Google.