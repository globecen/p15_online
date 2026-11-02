# Pristar P15 Label Studio — Serveur Docker & Impression Bluetooth

Application web moderne, sécurisée et complète pour concevoir des étiquettes sur-mesure et imprimer directement sur votre imprimante thermique portable **Pristar P15** (et modèles compatibles Marklife/Deli) via **Bluetooth Low Energy (BLE)** depuis votre serveur **Docker**.

---

## ✨ Fonctionnalités Principales

- 🐳 **Exécution 100% Conteneurisée (Docker)** : L'application et le pilote Bluetooth BLE s'exécutent dans un conteneur Docker relié au Bluetooth du serveur hôte via D-Bus / BlueZ.
- 🔒 **Sécurité & Authentification** : Accès protégé par identifiant et mot de passe (tokens JWT signés, mots de passe hashés avec sel PBKDF2).
- 🎨 **Concepteur Visuel WYSIWYG en Temps Réel** :
  - Dimensions physiques exactes en millimètres (12x30, 12x40, 14x30, 14x40, 15x50 mm ou sur-mesure).
  - Déplacement, redimensionnement avec 8 poignées, rotation libre ou crantée, guides d'aimantation au centre.
  - Annuler / Rétablir (Undo / Redo), Zoom 50% à 300%, règles graduées en mm.
- 😃 **Liste Complète de Visuels Imprimables** :
  - **Sélecteur d'Emojis complet** : Recherche par mots-clés français et catégories (Smileys, Cuisine & Frais, Tech & Câbles, Maison & Rangement, Alertes & Symboles).
  - **Bibliothèque d'Icônes vectorielles thermiques** : Plus de 60 pictogrammes ultra-nets dessinés spécialement pour les étiqueteuses 12-15mm.
  - **Générateur de Codes-Barres** : Code 128, EAN-13, EAN-8, Code 39, ITF-14 avec texte sous le code.
  - **Générateur de QR Codes** : Liens URL, WiFi direct automatique, coordonnées ou texte brut.
  - **Formes & Cadres** : Cadres doubles décoratifs, rectangles arrondis, lignes de séparation, cercles.
  - **Import d'Images & Logos** : Téléversez n'importe quelle photo ou logo avec réglage en direct du contraste, de la luminosité et du tramage Floyd-Steinberg ou Seuil net.
- 💾 **Interface de Création de Ses Propres Modèles** :
  - Bouton « Sauvegarder Modèle » pour enregistrer vos créations dans la base de données persistante SQLite.
  - Galerie « Mes Modèles » avec vignettes miniatures pour recharger, dupliquer ou modifier vos étiquettes à tout moment.
- 🖨️ **Pilote Matériel Pristar P15 Haute Fidélité** :
  - Protocole binaire L11 (Marklife P15 / P15R / P7).
  - Contrôle de flux par crédits (Credit-based Flow Control) cadencé à 30 ms avec paquets de 95 octets (évite tout débordement de mémoire tampon de l'imprimante).
  - Réglage de la densité thermique (1: Clair, 2: Normal, 3: Foncé) et du type de ruban (découpe Gap ou rouleau continu).
  - Détection automatique de la batterie et des alertes de statut (capot ouvert, papier épuisé, surchauffe).

---

## 🚀 Démarrage Rapide avec Docker

### 1. Prérequis
- Un serveur Linux (Debian, Ubuntu, Raspberry Pi OS, etc.) avec Bluetooth BLE activé.
- Docker et Docker Compose installés.
- Le service Bluetooth de l'hôte actif : `sudo systemctl status bluetooth`.

### 2. Lancement en une commande
Depuis le dossier du projet :

```bash
docker compose up -d --build
```

L'application est immédiatement accessible dans votre navigateur web sur :
👉 **`http://<IP_DE_VOTRE_SERVEUR>:8080`**

### 3. Identifiants par défaut
- **Identifiant** : `admin`
- **Mot de passe** : `pristar123`

---

## ⚙️ Configuration & Variables d'Environnement

Vous pouvez personnaliser les paramètres dans le fichier `docker-compose.yml` ou dans un fichier `.env` :

| Variable | Description | Valeur par défaut |
|---|---|---|
| `PORT` | Port d'écoute du serveur web | `8080` |
| `ADMIN_USERNAME` | Identifiant de connexion | `admin` |
| `ADMIN_PASSWORD` | Mot de passe de connexion | `pristar123` |
| `SECRET_KEY` | Clé secrète de signature des tokens de session | `pristar-p15-secure-docker-secret-key-2026` |
| `PRINTER_MAC` | *(Optionnel)* Adresse MAC Bluetooth de la P15 pour connexion automatique | *(Vide)* |

---

## 📱 Utilisation

1. **Connexion au Studio** : Entrez votre identifiant et mot de passe.
2. **Jumelage Bluetooth avec la P15** :
   - Allumez votre Pristar P15 (maintenez le bouton 3 secondes jusqu'au bip).
   - Dans la barre supérieure, cliquez sur le bouton **« Bluetooth Docker »**.
   - Cliquez sur **« Lancer un Scan BLE »**.
   - Cliquez sur **« Connecter »** en face de votre imprimante `P15`.
3. **Création d'Étiquette** :
   - Ajoutez des textes, des emojis, des icônes, un QR code ou un code-barres depuis le panneau de gauche.
   - Ajustez la typographie, la taille et le centrage dans le panneau de droite.
4. **Enregistrer comme modèle personnalisé** :
   - Cliquez sur le bouton orange **« Sauvegarder Modèle »** dans la barre supérieure pour nommer votre création et la retrouver dans la galerie.
5. **Impression** :
   - Cliquez sur **« Imprimer »**.
   - Choisissez le nombre d'exemplaires et la densité désirée.
   - Validez : le conteneur Docker transmet les trames thermiques en direct à la Pristar P15 !

---

## 🛠️ Dépannage Bluetooth sous Linux / Docker

- **Le conteneur ne voit pas les périphériques Bluetooth** :
  Vérifiez que le socket D-Bus est bien partagé dans `docker-compose.yml` :
  ```yaml
  volumes:
    - /var/run/dbus/system_bus_socket:/var/run/dbus/system_bus_socket
  network_mode: host
  ```
- **L'imprimante n'apparaît pas lors du scan** :
  1. Assurez-vous que l'application mobile *Marklife* sur votre smartphone est complètement fermée (la P15 n'autorise qu'un seul client Bluetooth connecté à la fois).
  2. Vérifiez que le Bluetooth de l'hôte Linux est débloqué : `sudo rfkill unblock bluetooth`.
- **Mode Test / Simulation** :
  Si vous développez sur une machine sans Bluetooth BLE physique, activez le bouton *« Activer le mode simulation »* dans la fenêtre Bluetooth pour tester l'intégralité du workflow sans matériel.
