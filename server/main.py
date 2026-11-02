import base64
import io
import logging
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Optional, List, Dict, Any

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from PIL import Image

import config
from auth import (
  get_current_user,
  create_access_token,
  verify_password,
  hash_password,
)
import database
from printer_ble import printer_driver

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("p15_app")

@asynccontextmanager
async def lifespan(app: FastAPI):
  # Initialisation BDD
  await database.init_db()
  logger.info("Base de données SQLite initialisée.")

  # Auto-connexion Bluetooth au démarrage (vers PRINTER_MAC, P15 scannée ou mode prêt)
  if config.AUTO_CONNECT:
    try:
      logger.info("Auto-connexion de l'imprimante au démarrage...")
      await printer_driver.auto_connect()
    except Exception as e:
      logger.warning(f"Auto-connexion au démarrage non critique : {e}")

  yield

  # Nettoyage à l'arrêt
  await printer_driver.disconnect()

app = FastAPI(title="Pristar P15 Label Studio", lifespan=lifespan)

# CORS pour le dev et les accès distants
app.add_middleware(
  CORSMiddleware,
  allow_origins=["*"],
  allow_credentials=True,
  allow_methods=["*"],
  allow_headers=["*"],
)

# --- Schémas Pydantic ---

class SetupRequest(BaseModel):
  username: str = "admin"
  password: str
  confirm_password: Optional[str] = None

class LoginRequest(BaseModel):
  username: str
  password: str

class LoginResponse(BaseModel):
  token: str
  username: str

class ChangePasswordRequest(BaseModel):
  old_password: str
  new_password: str

class TemplateCreateRequest(BaseModel):
  name: str
  category: str
  description: Optional[str] = ""
  dimensions: Dict[str, Any]
  elements: List[Dict[str, Any]]
  preview: Optional[str] = None

class PrintRequest(BaseModel):
  title: Optional[str] = "Étiquette"
  packed_bitmap_base64: str
  bytes_per_row: int
  height: int
  density: int = 2
  paper_type: str = "gap"
  copies: int = 1
  dimensions: Optional[Dict[str, Any]] = None
  preview_base64: Optional[str] = None

class ConnectRequest(BaseModel):
  address: str

# --- Routes Authentification & Initialisation ---

@app.get("/api/auth/status")
async def get_auth_status():
  """Indique si le studio a déjà été initialisé avec un mot de passe administrateur."""
  initialized = await database.is_initialized()
  return {"initialized": initialized}

@app.post("/api/auth/setup", response_model=LoginResponse)
async def setup_admin_account(req: SetupRequest):
  """Configure le compte administrateur lors de la première connexion."""
  initialized = await database.is_initialized()
  if initialized:
    raise HTTPException(status_code=400, detail="Le studio est déjà initialisé. Veuillez vous connecter.")

  if req.confirm_password is not None and req.password != req.confirm_password:
    raise HTTPException(status_code=400, detail="Les deux mots de passe ne correspondent pas.")

  if len(req.password.strip()) < 4:
    raise HTTPException(status_code=400, detail="Le mot de passe doit comporter au moins 4 caractères.")

  clean_username = req.username.strip() or "admin"
  try:
    await database.setup_admin(clean_username, req.password.strip())
  except ValueError as e:
    raise HTTPException(status_code=400, detail=str(e))

  token = create_access_token({"sub": clean_username})
  return LoginResponse(token=token, username=clean_username)

@app.post("/api/auth/login", response_model=LoginResponse)
async def login(req: LoginRequest):
  initialized = await database.is_initialized()
  if not initialized:
    raise HTTPException(
      status_code=400,
      detail="Le studio n'a pas encore été initialisé. Veuillez définir votre mot de passe administrateur."
    )

  async with database.aiosqlite.connect(config.DB_PATH) as db:
    db.row_factory = database.aiosqlite.Row
    cursor = await db.execute("SELECT * FROM users WHERE username = ?", (req.username,))
    user = await cursor.fetchone()
    if not user:
      raise HTTPException(status_code=401, detail="Identifiant ou mot de passe incorrect.")

    if not verify_password(req.password, user["password_hash"], user["salt"]):
      raise HTTPException(status_code=401, detail="Identifiant ou mot de passe incorrect.")

  token = create_access_token({"sub": req.username})
  return LoginResponse(token=token, username=req.username)

@app.get("/api/auth/me")
async def get_me(user: dict = Depends(get_current_user)):
  return {"username": user["username"], "authenticated": True}

@app.post("/api/auth/change-password")
async def change_password(req: ChangePasswordRequest, user: dict = Depends(get_current_user)):
  async with database.aiosqlite.connect(config.DB_PATH) as db:
    db.row_factory = database.aiosqlite.Row
    cursor = await db.execute("SELECT * FROM users WHERE username = ?", (user["username"],))
    db_user = await cursor.fetchone()

    if not verify_password(req.old_password, db_user["password_hash"], db_user["salt"]):
      raise HTTPException(status_code=400, detail="Ancien mot de passe invalide.")

    new_hash, new_salt = hash_password(req.new_password)
    await db.execute(
      "UPDATE users SET password_hash = ?, salt = ?, updated_at = datetime('now') WHERE username = ?",
      (new_hash, new_salt, user["username"])
    )
    await db.commit()

  return {"status": "success", "message": "Mot de passe modifié avec succès."}

# --- Routes Modèles (Templates) ---

@app.get("/api/templates")
async def list_templates(category: Optional[str] = None, user: dict = Depends(get_current_user)):
  return await database.get_all_templates(category)

@app.post("/api/templates")
async def create_template(req: TemplateCreateRequest, user: dict = Depends(get_current_user)):
  created = await database.save_template(
    name=req.name,
    category=req.category,
    description=req.description or "",
    dimensions=req.dimensions,
    elements=req.elements,
    preview=req.preview,
  )
  return created

@app.put("/api/templates/{template_id}")
async def update_template(template_id: str, req: TemplateCreateRequest, user: dict = Depends(get_current_user)):
  existing = await database.get_template_by_id(template_id)
  if not existing:
    raise HTTPException(status_code=404, detail="Modèle introuvable.")

  updated = await database.save_template(
    name=req.name,
    category=req.category,
    description=req.description or "",
    dimensions=req.dimensions,
    elements=req.elements,
    preview=req.preview,
    template_id=template_id,
  )
  return updated

@app.delete("/api/templates/{template_id}")
async def delete_template(template_id: str, user: dict = Depends(get_current_user)):
  deleted = await database.delete_template(template_id)
  if not deleted:
    raise HTTPException(status_code=404, detail="Modèle introuvable ou modèle système non supprimable.")
  return {"status": "deleted"}

# --- Routes Imprimante Bluetooth (Docker Host BLE) ---

@app.get("/api/printer/status")
async def get_printer_status(user: dict = Depends(get_current_user)):
  return {
    "connected": printer_driver.connected,
    "name": printer_driver.device_name,
    "address": printer_driver.device_address,
    "batteryLevel": printer_driver.battery_level,
    "isSimulation": printer_driver.is_simulation,
  }

@app.post("/api/printer/scan")
async def scan_printers(timeout: int = 5, user: dict = Depends(get_current_user)):
  devices = await printer_driver.scan(timeout=timeout)
  return {"devices": devices}

@app.post("/api/printer/connect")
async def connect_printer(req: ConnectRequest, user: dict = Depends(get_current_user)):
  if req.address in ("auto", "", None):
    success = await printer_driver.auto_connect()
  else:
    success = await printer_driver.connect(req.address)
  return {
    "success": success,
    "name": printer_driver.device_name,
    "address": printer_driver.device_address,
    "batteryLevel": printer_driver.battery_level,
    "isSimulation": printer_driver.is_simulation,
  }

@app.post("/api/printer/disconnect")
async def disconnect_printer(user: dict = Depends(get_current_user)):
  await printer_driver.disconnect()
  return {"status": "disconnected"}

@app.post("/api/printer/print")
async def print_label(req: PrintRequest, user: dict = Depends(get_current_user)):
  if not printer_driver.connected:
    logger.info("Imprimante non connectée lors de la requête /print, tentative d'auto-connexion...")
    try:
      await printer_driver.auto_connect()
    except Exception as e:
      logger.warning(f"Échec auto-connexion : {e}")

  if not printer_driver.connected:
    raise HTTPException(status_code=400, detail="L'imprimante n'est pas connectée au serveur Docker.")

  try:
    packed_bytes = base64.b64decode(req.packed_bitmap_base64)
  except Exception:
    raise HTTPException(status_code=400, detail="Format de données bitmap invalide.")

  try:
    await printer_driver.print_label(
      packed_bitmap=packed_bytes,
      bytes_per_row=req.bytes_per_row,
      height=req.height,
      density=req.density,
      paper_type=req.paper_type,
      copies=req.copies,
    )

    # Enregistrer dans l'historique
    await database.add_history_entry(
      title=req.title or "Étiquette",
      copies=req.copies,
      dimensions=req.dimensions or {},
      preview=req.preview_base64,
      status="success",
    )

    return {"status": "success", "message": f"{req.copies} étiquette(s) imprimée(s) avec succès."}
  except Exception as e:
    logger.error(f"Erreur d'impression : {e}")
    raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/history")
async def get_history(limit: int = 50, user: dict = Depends(get_current_user)):
  return await database.get_history(limit=limit)

# --- Service des fichiers statiques frontend ---

frontend_dist = Path(__file__).resolve().parent.parent / "dist"
if frontend_dist.exists() and (frontend_dist / "index.html").exists():
  app.mount("/assets", StaticFiles(directory=str(frontend_dist / "assets")), name="assets")

  @app.get("/{full_path:path}")
  async def serve_frontend(full_path: str):
    file_path = frontend_dist / full_path
    if full_path and file_path.exists() and file_path.is_file():
      return FileResponse(file_path)
    return FileResponse(frontend_dist / "index.html")

if __name__ == "__main__":
  import uvicorn
  uvicorn.run("main:app", host=config.HOST, port=config.PORT, reload=False)
