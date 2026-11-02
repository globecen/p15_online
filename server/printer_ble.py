import asyncio
import logging
import subprocess
import time
from typing import Optional, Callable, Dict, Any, List, Union

import config

logger = logging.getLogger("p15_ble")

# UUIDs GATT pour Pristar P15 / Marklife
SERVICE_PRIMARY = "0000ff00-0000-1000-8000-00805f9b34fb"
SERVICE_FALLBACK = "49535343-fe7d-4ae5-8fa9-9fafd205e455"

CHAR_RX = "0000ff01-0000-1000-8000-00805f9b34fb"
CHAR_TX = "0000ff02-0000-1000-8000-00805f9b34fb"
CHAR_CX = "0000ff03-0000-1000-8000-00805f9b34fb"

KNOWN_PREFIXES = (
  "P15", "P15_", "P15R", "P15S", "P15Pro", "Pristar", "PRISTAR", "pristar", "P-15",
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
    self._lock = asyncio.Lock()
    self._device_cache: Dict[str, Any] = {}
    self.tx_char = None
    self.rx_char = None
    self.cx_char = None

  async def scan(self, timeout: int = 5) -> List[Dict[str, Any]]:
    """Scanne les périphériques Bluetooth à proximité via Bleak. Retourne uniquement les vrais périphériques détectés."""
    try:
      from bleak import BleakScanner
      devices = await BleakScanner.discover(timeout=timeout)
      results = []
      for d in devices:
        self._device_cache[d.address.upper()] = d
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
      logger.warning(f"Erreur scan Bluetooth réel : {e}")
      return []

  async def auto_connect(self, preferred_address: Optional[str] = None) -> bool:
    """Tente une auto-connexion réelle : à l'adresse préférée si fournie, sinon scan pour trouver une P15 réelle."""
    if self.connected and self.client:
      return True

    target_addr = preferred_address or config.PRINTER_MAC
    if target_addr and target_addr != "auto":
      try:
        logger.info(f"Tentative de connexion à l'adresse cible {target_addr}...")
        return await self.connect(target_addr)
      except Exception as e:
        logger.warning(f"Échec de connexion à {target_addr}: {e}")

    # Scanner pour trouver une P15 réelle et capturer son objet BLEDevice natif
    try:
      logger.info("Scan automatique pour trouver une imprimante Pristar P15 réelle...")
      from bleak import BleakScanner
      devices = await BleakScanner.discover(timeout=4.0)
      for d in devices:
        self._device_cache[d.address.upper()] = d
        name = d.name or "Inconnu"
        if any(name.startswith(p) for p in KNOWN_PREFIXES):
          logger.info(f"Imprimante réelle détectée : {name} ({d.address}). Connexion via BLEDevice...")
          return await self.connect(d)
    except Exception as e:
      logger.warning(f"Scan automatique non concluant: {e}")

    logger.info("Aucune imprimante P15 réelle trouvée.")
    return False

  def _clean_bluez_stale_cache(self, address: str):
    """Supprime l'appareil du cache BlueZ pour éviter le bug br-connection-profile-unavailable."""
    try:
      logger.info(f"Nettoyage du cache BlueZ pour {address} via bluetoothctl...")
      subprocess.run(["bluetoothctl", "remove", address], capture_output=True, timeout=2.0)
    except Exception as e:
      logger.debug(f"Nettoyage bluetoothctl ignoré : {e}")

  async def connect(self, target: Any) -> bool:
    """
    Connecte le serveur Docker à la Pristar P15 réelle.
    Accepte soit une adresse MAC (str), soit directement un objet BLEDevice.
    """
    if target == "auto" or not target:
      return await self.auto_connect()

    async with self._lock:
      if self.connected:
        await self.disconnect()

      from bleak import BleakClient, BleakScanner
      from bleak.backends.device import BLEDevice

      ble_device = None
      target_address = ""

      if isinstance(target, BLEDevice):
        ble_device = target
        target_address = target.address
      elif isinstance(target, str):
        target_address = target
        # Chercher dans le cache des appareils scannés pour avoir l'objet BLEDevice
        ble_device = self._device_cache.get(target.upper())
        if not ble_device:
          logger.info(f"Recherche de l'objet BLEDevice pour l'adresse {target}...")
          try:
            ble_device = await BleakScanner.find_device_by_address(target, timeout=4.0)
            if ble_device:
              self._device_cache[target.upper()] = ble_device
          except Exception as e:
            logger.debug(f"find_device_by_address non résolu : {e}")

      # Utiliser l'objet BLEDevice en priorité pour éviter que BlueZ confonde avec Classic BR/EDR
      device_to_connect = ble_device if ble_device is not None else target_address

      logger.info(f"Connexion BLE réelle à {target_address} (mode: {'BLEDevice' if ble_device else 'MAC string'})...")

      # Tentative 1
      try:
        self.client = BleakClient(device_to_connect, timeout=14.0)
        await self.client.connect()
      except Exception as conn_err:
        err_msg = str(conn_err)
        # Si BlueZ a bloqué en mode Classic (br-connection-profile-unavailable), vider le cache et relancer
        if "br-connection-profile-unavailable" in err_msg or "NotAvailable" in err_msg:
          logger.warning(f"Erreur de profil BlueZ détectée : {err_msg}. Nettoyage et tentative en mode BLE forcé...")
          self._clean_bluez_stale_cache(target_address)
          await asyncio.sleep(1.0)

          # Redécouvrir l'appareil pour régénérer le profil BLE GATT propre
          fresh_device = await BleakScanner.find_device_by_address(target_address, timeout=6.0)
          if fresh_device:
            self._device_cache[target_address.upper()] = fresh_device
            self.client = BleakClient(fresh_device, timeout=14.0)
            await self.client.connect()
          else:
            raise conn_err
        else:
          logger.error(f"Échec de connexion Bluetooth réelle à {target_address}: {conn_err}")
          self.connected = False
          self.client = None
          raise

      self.device_address = target_address
      self.device_name = getattr(self.client, "name", "Pristar P15") or getattr(ble_device, "name", "Pristar P15") or "Pristar P15"
      self.connected = True

      # Découverte obligatoire des services GATT (résout l'erreur "Service Discovery has not been performed yet")
      logger.info("Découverte des services GATT en cours...")
      try:
        await self.client.get_services()
      except Exception as svc_err:
        logger.warning(f"get_services() exception non critique : {svc_err}")

      # Résolution dynamique des caractéristiques TX, RX et CX
      self.tx_char = None
      self.rx_char = None
      self.cx_char = None

      if self.client.services:
        for s in self.client.services:
          for c in s.characteristics:
            u = c.uuid.lower()
            if "ff02" in u or "8841-43f4" in u:
              self.tx_char = c
            elif "ff01" in u or "1e4d-4bd9" in u:
              self.rx_char = c
            elif "ff03" in u:
              self.cx_char = c

        # Fallback par propriétés si non trouvé par UUID exact
        if not self.tx_char or not self.rx_char:
          for s in self.client.services:
            for c in s.characteristics:
              props = [p.lower() for p in c.properties]
              if not self.tx_char and ("write-without-response" in props or "write" in props):
                self.tx_char = c
              if not self.rx_char and ("notify" in props or "indicate" in props):
                self.rx_char = c

      tx_str = self.tx_char.uuid if self.tx_char else CHAR_TX
      rx_str = self.rx_char.uuid if self.rx_char else CHAR_RX
      logger.info(f"Canaux configurés -> TX: {tx_str}, RX: {rx_str}")

      # Configuration notifications RX & CX
      rx_target = self.rx_char or CHAR_RX
      try:
        await self.client.start_notify(rx_target, self._handle_rx)
      except Exception as rx_err:
        logger.warning(f"Notification RX non activée : {rx_err}")

      if self.cx_char:
        try:
          await self.client.start_notify(self.cx_char, self._handle_cx)
          await asyncio.sleep(0.5)
        except Exception:
          self.credits = 4
      else:
        self.credits = 4

      # Requête de batterie
      await self.query_battery()
      logger.info(f"Connecté avec succès à {self.device_name} ({target_address})")
      return True

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
    if self.connected and self.client:
      try:
        cmd = bytearray([0x10, 0xff, 0x50, 0xf1])
        char_tx = self.tx_char or CHAR_TX
        await self.client.write_gatt_char(char_tx, cmd, response=False)
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
    """Envoie une tâche d'impression réelle à l'imprimante Bluetooth."""
    if not self.connected or not self.client:
      logger.info("Imprimante non connectée lors de l'impression, tentative d'auto-connexion...")
      await self.auto_connect()

    if not self.connected or not self.client:
      raise RuntimeError("Imprimante non connectée. Impossible d'imprimer.")

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
    if not self.client:
      raise RuntimeError("Client Bluetooth déconnecté pendant l'envoi.")

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
        char_tx = self.tx_char or CHAR_TX
        await self.client.write_gatt_char(char_tx, chunk, response=False)
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
      self.battery_level = None
      self.device_address = ""
      self.tx_char = None
      self.rx_char = None
      self.cx_char = None

printer_driver = PristarP15Driver()
