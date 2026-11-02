import asyncio
import logging
import math
import time
from typing import Optional, Callable, Dict, Any, List

import config

logger = logging.getLogger("p15_ble")

# UUIDs
SERVICE_PRIMARY = "0000ff00-0000-1000-8000-00805f9b34fb"
SERVICE_FALLBACK = "49535343-fe7d-4ae5-8fa9-9fafd205e455"

CHAR_RX = "0000ff01-0000-1000-8000-00805f9b34fb"
CHAR_TX = "0000ff02-0000-1000-8000-00805f9b34fb"
CHAR_CX = "0000ff03-0000-1000-8000-00805f9b34fb"

KNOWN_PREFIXES = (
  "P15", "P15R", "P15S", "P15Pro", "Pristar", "PRISTAR", "pristar", "P-15",
  "Marklife", "P7", "P7R", "P12", "P11", "LP15", "M1", "S15", "S12", "P1s", "LPC74", "Printer"
)

PACKET_SIZE = 95
PACKET_DELAY_S = 0.030  # 30 ms
STARVATION_TIMEOUT_S = 1.0

class PristarP15Driver:
  def __init__(self):
    self.client = None
    self.connected = False
    self.device_name = "Pristar P15"
    self.device_address = ""
    self.battery_level: Optional[int] = None
    self.credits = 0
    self.last_credit_time = time.time()
    self.print_ack_event = asyncio.Event()
    self.is_simulation = False
    self._lock = asyncio.Lock()

  async def scan(self, timeout: int = 5) -> List[Dict[str, Any]]:
    """Scanne les périphériques Bluetooth à proximité via Bleak."""
    try:
      from bleak import BleakScanner
      devices = await BleakScanner.discover(timeout=timeout)
      results = []
      for d in devices:
        name = d.name or "Inconnu"
        is_p15 = any(name.startswith(p) for p in KNOWN_PREFIXES)
        results.append({
          "address": d.address,
          "name": name,
          "rssi": getattr(d, "rssi", 0),
          "is_p15": is_p15,
        })
      # Trier avec les P15 en tête
      results.sort(key=lambda x: (not x["is_p15"], x["name"]))
      return results
    except Exception as e:
      logger.warning(f"Erreur scan Bluetooth (mode simulation possible): {e}")
      return [
        {"address": "SIMULATED-P15-01", "name": "Pristar P15 (Simulation)", "rssi": -55, "is_p15": True}
      ]

  async def auto_connect(self, preferred_address: Optional[str] = None) -> bool:
    """Tente une auto-connexion : à l'adresse préférée si fournie, sinon scan pour trouver une P15, sinon mode simulation."""
    if self.connected:
      return True

    target_addr = preferred_address or config.PRINTER_MAC
    if target_addr and target_addr != "auto":
      try:
        logger.info(f"Tentative de connexion à l'adresse cible {target_addr}...")
        return await self.connect(target_addr)
      except Exception as e:
        logger.warning(f"Échec de connexion à {target_addr}: {e}")

    # Essayer de scanner si Bleak / Bluetooth est disponible sur l'hôte
    try:
      logger.info("Scan automatique pour trouver une imprimante Pristar P15...")
      devices = await self.scan(timeout=3)
      p15_devices = [d for d in devices if d.get("is_p15") and not d["address"].startswith("SIMULATED")]
      if p15_devices:
        best = p15_devices[0]
        logger.info(f"Imprimante détectée : {best['name']} ({best['address']}). Connexion...")
        return await self.connect(best["address"])
    except Exception as e:
      logger.warning(f"Scan automatique non concluant: {e}")

    # Fallback automatique en mode simulation/prêt si pas de Bluetooth hôte disponible
    logger.info("Activation du mode connecté automatique (Simulation/Prêt)...")
    return await self.connect("SIMULATED-P15-01")

  async def connect(self, address: str) -> bool:
    """Connecte le serveur Docker à la Pristar P15."""
    if address == "auto" or not address:
      return await self.auto_connect()

    async with self._lock:
      if self.connected:
        await self.disconnect()

      if address.startswith("SIMULATED"):
        self.is_simulation = True
        self.connected = True
        self.device_name = "Pristar P15 (Simulé)"
        self.device_address = address
        self.battery_level = 88
        logger.info("Connecté en mode simulation.")
        return True

      try:
        from bleak import BleakClient

        logger.info(f"Connexion BLE à {address}...")
        self.client = BleakClient(address, timeout=12.0)
        await self.client.connect()

        self.device_address = address
        self.device_name = getattr(self.client, "name", "Pristar P15") or "Pristar P15"
        self.connected = True
        self.is_simulation = False

        # Configuration notifications RX & CX
        await self.client.start_notify(CHAR_RX, self._handle_rx)
        try:
          await self.client.start_notify(CHAR_CX, self._handle_cx)
          # Attente crédits initiaux
          await asyncio.sleep(0.5)
        except Exception:
          # Pas de CX distinct -> crédits par défaut
          self.credits = 4

        # Requête de batterie
        await self.query_battery()
        logger.info(f"Connecté avec succès à {self.device_name} ({address})")
        return True

      except Exception as e:
        logger.error(f"Échec de connexion Bluetooth à {address}: {e}")
        self.connected = False
        self.client = None
        raise

  def _handle_rx(self, sender, data: bytearray):
    if not data:
      return
    first = data[0]

    # Confirmation impression : 0xAA, 'O', 'K'
    if first in (0xaa, 0x4f, 0x4b):
      self.print_ack_event.set()
      return

    # Batterie : 10 FF 50 F1 -> dernier octet = pourcentage
    if first == 0x10 and len(data) >= 2:
      bat = data[-1]
      if 0 <= bat <= 100:
        self.battery_level = bat

  def _handle_cx(self, sender, data: bytearray):
    if len(data) >= 2 and data[0] == 0x01:
      self.credits += data[1]
      self.last_credit_time = time.time()

  async def query_battery(self):
    if self.connected and self.client and not self.is_simulation:
      try:
        cmd = bytearray([0x10, 0xff, 0x50, 0xf1])
        await self.client.write_gatt_char(CHAR_TX, cmd, response=False)
      except Exception:
        pass

  async def print_label(
    self,
    packed_bitmap: bytes,
    bytes_per_row: int,
    height: int,
    density: int = 2,
    paper_type: str = "gap",
    copies: int = 1,
    progress_callback: Optional[Callable[[int, int, str], None]] = None,
  ) -> bool:
    """Envoie une tâche d'impression complète à l'imprimante."""
    if not self.connected:
      logger.info("Imprimante non connectée lors de l'impression, tentative d'auto-connexion...")
      await self.auto_connect()

    if not self.connected:
      raise RuntimeError("Impossible d'établir la connexion avec la Pristar P15.")

    if self.is_simulation:
      logger.info(f"[SIMULATION] Impression de {copies} copie(s)...")
      for c in range(1, copies + 1):
        for pct in range(0, 101, 20):
          if progress_callback:
            progress_callback(c, copies, f"Copie {c}/{copies} ({pct}%)")
          await asyncio.sleep(0.08)
      return True

    # 1. Construction du préambule
    # Wakeup (15 zéros), SetThickness (10 FF 10 00 TT), SetDensity (1F 70 02 DD), Enable (10 FF F1 02)
    preamble = bytearray(15)  # Wakeup
    preamble.extend([0x10, 0xff, 0x10, 0x00, min(3, max(1, density))])
    preamble.extend([0x1f, 0x70, 0x02, min(3, max(1, density))])
    preamble.extend([0x10, 0xff, 0xf1, 0x02])

    # 2. Données principales : En-tête raster 1D 76 30 00 WL WH HL HH + pixels + fin
    wl = bytes_per_row & 0xff
    wh = (bytes_per_row >> 8) & 0xff
    hl = height & 0xff
    hh = (height >> 8) & 0xff

    bitmap_header = bytearray([0x1d, 0x76, 0x30, 0x00, wl, wh, hl, hh])
    bulk = bitmap_header + packed_bitmap

    # Avance (Gap 1D 0C ou FeedDots 1B 4A 64)
    if paper_type == "gap":
      bulk.extend([0x1d, 0x0c])
    else:
      bulk.extend([0x1b, 0x4a, 0x64])

    # Fin de tâche : 10 FF F1 45
    bulk.extend([0x10, 0xff, 0xf1, 0x45])

    total_bulk_len = len(bulk)

    for copy_idx in range(1, copies + 1):
      if progress_callback:
        progress_callback(copy_idx, copies, f"Copie {copy_idx}/{copies} : Préparation...")

      # Envoyer le préambule
      await self._send_chunked(preamble)
      await asyncio.sleep(0.08)

      # Envoyer les données
      self.print_ack_event.clear()
      await self._send_chunked(
        bulk,
        lambda sent, total: progress_callback(
          copy_idx, copies, f"Copie {copy_idx}/{copies} : Envoi ({int(sent / total * 100)}%)"
        ) if progress_callback else None
      )

      # Attente confirmation
      try:
        await asyncio.wait_for(self.print_ack_event.wait(), timeout=6.0)
      except asyncio.TimeoutError:
        pass

      if copy_idx < copies:
        await asyncio.sleep(0.4)

    return True

  async def _send_chunked(self, data: bytes, progress: Optional[Callable[[int, int], None]] = None):
    """Envoi avec contrôle de flux par crédits (Flow Control)."""
    offset = 0
    total = len(data)
    self.last_credit_time = time.time()

    while offset < total:
      # Starvation recovery
      if self.credits <= 0 and (time.time() - self.last_credit_time) >= STARVATION_TIMEOUT_S:
        self.credits = 1
        self.last_credit_time = time.time()

      if self.credits > 0:
        chunk = data[offset : offset + PACKET_SIZE]
        await self.client.write_gatt_char(CHAR_TX, chunk, response=False)
        self.credits -= 1
        offset += len(chunk)
        if progress:
          progress(offset, total)

      await asyncio.sleep(PACKET_DELAY_S)

  async def disconnect(self):
    async with self._lock:
      if self.client:
        try:
          await self.client.disconnect()
        except Exception:
          pass
      self.client = None
      self.connected = False
      self.is_simulation = False
      self.battery_level = None

printer_driver = PristarP15Driver()
