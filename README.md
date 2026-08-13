# MuseSound - Lecteur Audio YouTube léger

MuseSound est un lecteur audio haute fidélité léger conçu pour diffuser de la musique à partir de playlists et de vidéos YouTube/YouTube Music. Il met l'accent sur la résilience grâce à un système de rotation automatique d'instances alternatives (Piped et Invidious).

## 🚀 Fonctionnalités
- **Lecture audio fluide** : Écoute sans distraction visuelle avec une interface épurée.
- **Importation de playlists** : Chargez instantanément n'importe quelle playlist ou vidéo YouTube publique.
- **Résilience Automatique** : Rotation intelligente et transparente entre plusieurs serveurs d'API Piped et Invidious en cas de panne ou de saturation.
- **Ajustement des paramètres** : Possibilité de configurer vos propres serveurs d'API personnalisés dans la barre latérale.
- **Recherche mobile optimisée** : Barre de recherche déplacée dans un overlay plein écran via le bouton loupe des onglets, avec délégation d'événements robuste et suggestions locales de secours.

---

## 📁 Structure du Projet

L'ensemble du projet a été réorganisé proprement pour isoler le code applicatif fonctionnel de la documentation et des fichiers de conception de maquettes (Stitch).

```text
musesound/
├── 📄 index.html                # Point d'entrée principal (Interface du Lecteur)
├── 📁 js/
│   └── 📄 app.js                # Logique applicative (API Piped/Invidious, Player & UI)
└── 📁 docs/                     # Documentation technique du projet
    ├── 📄 DESIGN.md             # Spécifications et jetons (tokens) de design du thème "Luminous Tech"
    ├── 📄 developer_handoff_guide.md # Guide de passation technique pour le développement
    ├── 📄 guide_d_installation_android.md # Guide d'installation en tant que PWA sur Android
    ├── 📄 IA_prompt.txt         # Notes et invites de contexte pour les assistants IA
    ├── 📄 roadmap_technique_musesound.md # Plan de développement et prochaines étapes
    └── 📁 designs/              # Fichiers de maquettes UI/UX exportés (Stitch)
        ├── 📄 manifest.json     # Configuration de base PWA (progressive web app)
        ├── 📁 login_desktop/    # Maquette de la page d'authentification (Google/Email)
        ├── 📁 accueil_desktop/  # Maquette de la page d'accueil principale
        ├── 📁 recherche_desktop/# Maquette de l'écran de recherche
        ├── 📁 lecteur_audio_vert/ # Maquette de l'écran du lecteur audio (Mobile/Vert)
        └── ...                  # Autres déclinaisons d'écrans mobiles et desktop
```

### 🔗 Liens vers les Documents Principaux
- **Application Principale** : [index.html](file:///C:/Users/Pierre/Documents/GitHub/musesound/index.html)
- **Script Applicatif** : [js/app.js](file:///C:/Users/Pierre/Documents/GitHub/musesound/js/app.js)
- **Guide d'installation Android** : [guide_d_installation_android.md](file:///C:/Users/Pierre/Documents/GitHub/musesound/docs/guide_d_installation_android.md)
- **Feuille de Route Technique** : [roadmap_technique_musesound.md](file:///C:/Users/Pierre/Documents/GitHub/musesound/docs/roadmap_technique_musesound.md)
- **Charte Graphique (Design Tokens)** : [DESIGN.md](file:///C:/Users/Pierre/Documents/GitHub/musesound/docs/DESIGN.md)
- **Guide pour Développeur** : [developer_handoff_guide.md](file:///C:/Users/Pierre/Documents/GitHub/musesound/docs/developer_handoff_guide.md)

---

## 🛠️ Stack Technique
- **Frontend** : HTML5 sémantique, Tailwind CSS (via CDN) pour le style.
- **Logique** : JavaScript natif (ES6) gérant le décodage d'URL, la rotation d'API et l'interaction avec le lecteur audio HTML5.
- **Données** : API publiques Piped & Invidious avec proxy CORS (`corsproxy.io`).

---

## 💻 Comment le lancer ?

1. Ouvrez l'URL de Vercel ou double-cliquez simplement sur le fichier [index.html](file:///C:/Users/Pierre/Documents/GitHub/musesound/index.html) pour l'ouvrir directement dans votre navigateur web préféré.
2. Saisissez ou collez l'URL d'une playlist YouTube dans le champ dédié de recherche de la barre latérale.
3. Cliquez sur **Import** et profitez de votre musique !
