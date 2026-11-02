import json
import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
import aiosqlite
from config import DB_PATH, ADMIN_USERNAME, ADMIN_PASSWORD
from auth import hash_password

async def init_db():
  """Initialise les tables de la base de données SQLite."""
  async with aiosqlite.connect(DB_PATH) as db:
    # Table Utilisateurs
    await db.execute("""
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        salt TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    """)

    # Table Modèles d'étiquettes
    await db.execute("""
      CREATE TABLE IF NOT EXISTS templates (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        description TEXT,
        dimensions TEXT NOT NULL,
        elements TEXT NOT NULL,
        preview TEXT,
        is_system INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    """)

    # Table Historique d'impressions
    await db.execute("""
      CREATE TABLE IF NOT EXISTS history (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        copies INTEGER NOT NULL DEFAULT 1,
        dimensions TEXT NOT NULL,
        preview TEXT,
        status TEXT NOT NULL,
        printed_at TEXT NOT NULL
      )
    """)

    # Créer le compte admin s'il n'existe pas encore
    cursor = await db.execute("SELECT id FROM users WHERE username = ?", (ADMIN_USERNAME,))
    row = await cursor.fetchone()
    if not row:
      pwd_hash, salt = hash_password(ADMIN_PASSWORD)
      now = datetime.now(timezone.utc).isoformat()
      await db.execute(
        "INSERT INTO users (username, password_hash, salt, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
        (ADMIN_USERNAME, pwd_hash, salt, now, now)
      )

    await db.commit()

# --- Modèles d'étiquettes ---

async def get_all_templates(category: Optional[str] = None) -> List[Dict[str, Any]]:
  async with aiosqlite.connect(DB_PATH) as db:
    db.row_factory = aiosqlite.Row
    if category and category != "Tous":
      cursor = await db.execute(
        "SELECT * FROM templates WHERE category = ? ORDER BY is_system DESC, updated_at DESC",
        (category,)
      )
    else:
      cursor = await db.execute("SELECT * FROM templates ORDER BY is_system DESC, updated_at DESC")
    rows = await cursor.fetchall()
    
    result = []
    for r in rows:
      result.append({
        "id": r["id"],
        "name": r["name"],
        "category": r["category"],
        "description": r["description"] or "",
        "dimensions": json.loads(r["dimensions"]),
        "elements": json.loads(r["elements"]),
        "preview": r["preview"],
        "is_system": bool(r["is_system"]),
        "created_at": r["created_at"],
        "updated_at": r["updated_at"],
      })
    return result

async def get_template_by_id(template_id: str) -> Optional[Dict[str, Any]]:
  async with aiosqlite.connect(DB_PATH) as db:
    db.row_factory = aiosqlite.Row
    cursor = await db.execute("SELECT * FROM templates WHERE id = ?", (template_id,))
    r = await cursor.fetchone()
    if not r:
      return None
    return {
      "id": r["id"],
      "name": r["name"],
      "category": r["category"],
      "description": r["description"] or "",
      "dimensions": json.loads(r["dimensions"]),
      "elements": json.loads(r["elements"]),
      "preview": r["preview"],
      "is_system": bool(r["is_system"]),
      "created_at": r["created_at"],
      "updated_at": r["updated_at"],
    }

async def save_template(
  name: str,
  category: str,
  description: str,
  dimensions: dict,
  elements: list,
  preview: Optional[str] = None,
  template_id: Optional[str] = None,
  is_system: bool = False,
) -> Dict[str, Any]:
  async with aiosqlite.connect(DB_PATH) as db:
    now = datetime.now(timezone.utc).isoformat()
    t_id = template_id or str(uuid.uuid4())

    await db.execute("""
      INSERT OR REPLACE INTO templates
      (id, name, category, description, dimensions, elements, preview, is_system, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, COALESCE((SELECT created_at FROM templates WHERE id = ?), ?), ?)
    """, (
      t_id,
      name,
      category,
      description,
      json.dumps(dimensions),
      json.dumps(elements),
      preview,
      1 if is_system else 0,
      t_id,
      now,
      now
    ))
    await db.commit()
    return await get_template_by_id(t_id)

async def delete_template(template_id: str) -> bool:
  async with aiosqlite.connect(DB_PATH) as db:
    cursor = await db.execute("DELETE FROM templates WHERE id = ? AND is_system = 0", (template_id,))
    await db.commit()
    return cursor.rowcount > 0

# --- Historique d'impression ---

async def add_history_entry(title: str, copies: int, dimensions: dict, preview: Optional[str], status: str) -> str:
  async with aiosqlite.connect(DB_PATH) as db:
    entry_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    await db.execute("""
      INSERT INTO history (id, title, copies, dimensions, preview, status, printed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (entry_id, title, copies, json.dumps(dimensions), preview, status, now))
    await db.commit()
    return entry_id

async def get_history(limit: int = 50) -> List[Dict[str, Any]]:
  async with aiosqlite.connect(DB_PATH) as db:
    db.row_factory = aiosqlite.Row
    cursor = await db.execute("SELECT * FROM history ORDER BY printed_at DESC LIMIT ?", (limit,))
    rows = await cursor.fetchall()
    return [{
      "id": r["id"],
      "title": r["title"],
      "copies": r["copies"],
      "dimensions": json.loads(r["dimensions"]),
      "preview": r["preview"],
      "status": r["status"],
      "printed_at": r["printed_at"],
    } for r in rows]
