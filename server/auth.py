import hashlib
import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from config import SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_HOURS, ADMIN_USERNAME, ADMIN_PASSWORD

security = HTTPBearer(auto_error=False)

def hash_password(password: str, salt: Optional[str] = None) -> tuple[str, str]:
  """Génère un hash sécurisé PBKDF2 avec sel."""
  if not salt:
    salt = secrets.token_hex(16)
  key = hashlib.pbkdf2_hmac(
    'sha256',
    password.encode('utf-8'),
    salt.encode('utf-8'),
    100000
  )
  return key.hex(), salt

def verify_password(password: str, password_hash: str, salt: str) -> bool:
  """Vérifie un mot de passe contre son hash et son sel."""
  key, _ = hash_password(password, salt)
  return secrets.compare_digest(key, password_hash)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
  """Crée un JWT token signé pour la session."""
  to_encode = data.copy()
  now = datetime.now(timezone.utc)
  if expires_delta:
    expire = now + expires_delta
  else:
    expire = now + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
  to_encode.update({"exp": expire, "iat": now})
  encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
  return encoded_jwt

def decode_access_token(token: str) -> Optional[dict]:
  """Décode et valide un JWT token."""
  try:
    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    return payload
  except jwt.PyJWTError:
    return None

async def get_current_user(
  credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> dict:
  """Dépendance FastAPI pour protéger les routes."""
  if not credentials:
    raise HTTPException(
      status_code=status.HTTP_401_UNAUTHORIZED,
      detail="Non authentifié. Veuillez vous connecter.",
      headers={"WWW-Authenticate": "Bearer"},
    )
  payload = decode_access_token(credentials.credentials)
  if not payload or "sub" not in payload:
    raise HTTPException(
      status_code=status.HTTP_401_UNAUTHORIZED,
      detail="Session invalide ou expirée.",
      headers={"WWW-Authenticate": "Bearer"},
    )
  return {"username": payload["sub"]}
