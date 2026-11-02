# Pristar P15 Label Studio — Studio d'Impression & Design Bluetooth

Application web moderne, réactive et sécurisée pour concevoir des étiquettes personnalisées et lancer des impressions sur votre imprimante thermique portable **Pristar P15** (et modèles compatibles Marklife/Deli/LP15).

L'application prend en charge le **Bluetooth Direct (Web BLE)** depuis votre navigateur ou smartphone, ainsi que la liaison **Bluetooth Serveur Docker (Linux/BlueZ)**.

---

## ✨ Fonctionnalités Principales

- 🔐 **Sécurité & Première Connexion Personnalisée** :
  - **Aucun mot de passe par défaut imposé** : lors de la première connexion, un assistant de configuration vous permet de définir votre propre identifiant et mot de passe administrateur sécurisé.
  - Sessions sécurisées par tokens JWT signés et mots de passe protégés par hachage cryptographique PBKDF2-HMAC-SHA256 avec sel unique.
- 📱 **Interface 100% Adaptée aux Smartphones & Tablettes** :
  - Conception entièrement responsive : fonctionne aussi bien sur grand écran d'ordinateur que sur smartphone (Android / iPhone).
  - Barre d'actions tactile en bas d'écran (`Ajouter`, `Format & Options`, `Modèles`, `Imprimer`).
  - Volets coulissants et manipulation tactile directe sur le canevas (déplacement, redimensionnement avec poignées tactiles, rotation).
- 🖨️ **Double Mode Bluetooth (Web BLE & Serveur Docker)** :
  - **Bluetooth Direct (Recommandé sur PC Windows & Mobile)** : connecte directement votre navigateur (Google Chrome, Microsoft Edge ou Opera) à la Pristar P15 sans barrière de virtualisation Docker.
  - **Bluetooth Serveur Docker** : pour les serveurs Linux hôtes ou Raspberry Pi utilisant BlueZ / D-Bus.
  - **Auto-connexion & Reconnexion automatique** : le bouton d'impression ne se bloque jamais ; la liaison s'établit automatiquement à la volée.
- 🎨 **Éditeur Visuel WYSIWYG en Temps Réel** :
  - Formats standards Pristar P15 : 40×12 mm, 30×12 mm, 22×12 mm, 40×14 mm, 30×14 mm, 50×15 mm, 60×15 mm ou dimensions libres.
  - Rendu haute fidélité à 203 DPI (8 points par millimètre).
  - Annuler / Rétablir (Undo / Redo), Zoom adaptatif de 50% à 300%, règles graduées en millimètres.
- 😃 **Bibliothèque Complète de Visuels Imprimables** :
  - **Sélecteur d'Emojis Universel** : catalogue complet classé par catégories (Smileys, Mains & Cœurs, Cuisine, Objets, Symboles, etc.) + barre de recherche en français + champ libre pour coller n'importe quel emoji.
  - **60+ Icônes Vectorielles Thermiques** : pictogrammes nets optimisés pour la gravure 1-bit sans perte de définition.
  - **Générateur de Codes-Barres** : Code 128, EAN-13, EAN-8, Code 39, ITF-14.
  - **Générateur de QR Codes** : Liens URL, configuration WiFi direct, cartes de visite, texte brut.
  - **Formes & Cadres** : Cadres doubles décoratifs, rectangles arrondis, cercles, séparateurs horizontaux et verticaux.
  - **Import d'Images & Logos** : Tramage Floyd-Steinberg ou seuil net avec réglage de contraste et de luminosité en temps réel.
- 💾 **Créateur & Galerie de Modèles (« Mes Modèles »)** :
  - Enregistrez vos designs sur la base de données persistante SQLite en un clic.
  - Retrouvez vos modèles avec aperçus visuels, rechargez-les ou modifiez-les à tout moment.

---

## 🚀 Démarrage Rapide avec Docker

### 1. Lancement du conteneur
Depuis la racine du projet :

```bash
docker compose up -d --build
```

L'application démarre immédiatement sur le port `9999` :
👉 **`http://localhost:9999`** (ou `http://<IP_DE_VOTRE_SERVEUR>:9999`)

### 2. Première Connexion (Initialisation)
À la première ouverture :
1. L'écran **« Initialisation du Studio — Première Connexion »** s'affiche automatiquement.
2. Choisissez votre **identifiant administrateur** (ex: `admin`).
3. Définissez et confirmez votre **mot de passe personnel**.
4. Cliquez sur **« Initialiser et Ouvrir le Studio »** : votre compte est créé et vous accédez directement au studio.

---

## ⚙️ Configuration & Variables d'Environnement

Le fichier `docker-compose.yml` (ou un fichier `.env`) permet d'ajuster les réglages :

| Variable | Description | Valeur par défaut |
|---|---|---|
| `PORT` | Port d'écoute du serveur web | `9999` |
| `ADMIN_USERNAME` | Identifiant administrateur par défaut | `admin` |
| `ADMIN_PASSWORD` | *(Optionnel)* Mot de passe prédéfini (si non renseigné, l'initialisation se fait via l'interface web) | *(Vide)* |
| `SECRET_KEY` | Clé secrète de signature des tokens JWT | `pristar-p15-secure-docker-secret-key-2026` |
| `PRINTER_MAC` | *(Optionnel)* Adresse MAC Bluetooth pour auto-connexion serveur | *(Vide)* |

---

## 📡 Connexion Bluetooth avec la Pristar P15

### Cas 1 : Vous utilisez un PC (Windows, Mac) ou un Smartphone Android/iOS (Recommandé)
1. Allumez votre **Pristar P15** (maintenez le bouton 2 secondes jusqu'au voyant allumé).
2. Dans la barre supérieure, cliquez sur **« Connecter P15 »** (ou ouvrez le menu Bluetooth).
3. Dans l'onglet **« Bluetooth Direct (PC / Mobile) »**, cliquez sur **`🔍 Rechercher et Connecter ma Pristar P15`**.
4. La fenêtre native de sélection Bluetooth de votre navigateur s'ouvre : sélectionnez votre imprimante (**`P15`**, **`Marklife`** ou **`Pristar`**) et cliquez sur **Associer**.
5. Votre imprimante est connectée et affiche son niveau de batterie !

*(Note pour iPhone/iPad : utilisez l'application gratuite **Bluefy** qui supporte le Web Bluetooth).*

### Cas 3 : Recherche en ligne de commande (CLI / Console)
Si vous travaillez sur un serveur headless sans interface graphique, vous pouvez lancer le scan Bluetooth directement depuis le terminal :

```bash
# Directement via le conteneur Docker :
docker exec -it pristar-p15-studio python /app/server/scan_cli.py

# Ou avec bluetoothctl sur l'hôte Linux :
bluetoothctl --timeout 8 scan on && bluetoothctl devices | grep -iE "P15|Marklife"
```

Copiez l'adresse MAC affichée (ex: `AA:BB:CC:DD:EE:FF`) et ajoutez-la dans `docker-compose.yml` (`PRINTER_MAC`) pour une connexion automatique à chaque démarrage.

---

## ❓ Dépannage & Bonnes Pratiques

- **L'imprimante n'apparaît pas lors de la recherche Bluetooth :**
  1. **Déconnexion de l'application officielle :** La Pristar P15 n'accepte **qu'une seule connexion active à la fois**. Si l'application officielle *Marklife* est ouverte sur votre téléphone à proximité, fermez-la complètement.
  2. **Option "Tous les appareils" :** Dans la fenêtre Bluetooth du Studio, cochez *« Afficher tous les appareils Bluetooth »* si le filtre de nom masque votre imprimante.
  3. **Navigateurs recommandés :** Utilisez **Google Chrome** ou **Microsoft Edge** sur ordinateur et Android.
- **Docker sous Windows :**
  Docker Desktop sous Windows ne partage pas le Bluetooth de l'ordinateur avec les conteneurs Linux. Utilisez simplement le mode **Bluetooth Direct** dans l'application web pour imprimer en direct depuis votre navigateur !

---

## 📄 Licence & Crédits

Studio conçu pour l'imprimante d'étiquettes **Pristar P15** (protocole binaire L11 / Marklife).
Développé avec React, TypeScript, Tailwind CSS, FastAPI et Python Bleak.
