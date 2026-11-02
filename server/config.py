import os
from pathlib import Path

# Répertoires
BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = Path(os.getenv("DATA_DIR", BASE_DIR / "data"))
DATA_DIR.mkdir(parents=True, exist_ok=True)

# Base de données SQLite
DB_PATH = DATA_DIR / "p15_studio.db"

# Sécurité & Authentification
ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "admin")
# Mot de passe admin optionnel par variable (si vide, l'application demandera de le définir à la 1ère connexion)
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "")
SECRET_KEY = os.getenv("SECRET_KEY", "pristar-p15-secure-docker-secret-key-2026")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24 * 7 # 7 jours de validité

# Bluetooth Pristar P15
PRINTER_MAC = os.getenv("PRINTER_MAC", "") # Ex: 00:11:22:33:44:55
BLE_SCAN_TIMEOUT = int(os.getenv("BLE_SCAN_TIMEOUT", "6"))
AUTO_CONNECT = os.getenv("AUTO_CONNECT", "true").lower() in ("1", "true", "yes")

# Port d'écoute
PORT = int(os.getenv("PORT", "8080"))
HOST = os.getenv("HOST", "0.0.0.0")
