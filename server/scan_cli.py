#!/usr/bin/env python3
"""
Outil CLI pour rechercher et tester la Pristar P15 en ligne de commande.
Usage :
  Sur l'hôte : python server/scan_cli.py
  Dans Docker : docker exec -it pristar-p15-studio python /app/server/scan_cli.py
"""
import asyncio
import sys

KNOWN_PREFIXES = (
  "P15", "P15_", "P15R", "P15S", "P15Pro", "Pristar", "PRISTAR", "pristar", "P-15",
  "Marklife", "P7", "P12", "P11", "LP15", "M1", "S15"
)

async def test_connect(device_or_address):
  from bleak import BleakClient, BleakScanner
  addr_str = getattr(device_or_address, "address", str(device_or_address))
  print(f"\n[+] Test de connexion BLE direct à {addr_str}...")
  try:
    if isinstance(device_or_address, str):
      dev = await BleakScanner.find_device_by_address(device_or_address, timeout=5.0)
      if dev:
        device_or_address = dev

    async with BleakClient(device_or_address, timeout=12.0) as client:
      print(f"[OK] Connecté avec succès ! is_connected={client.is_connected}")
      print("Services GATT détectés sur la P15 :")
      for s in client.services:
        print(f"  - Service : {s.uuid} ({s.description})")
      return True
  except Exception as e:
    print(f"[-] Échec du test de connexion : {e}")
    if "br-connection-profile-unavailable" in str(e):
      print("\n[!] Astuce BlueZ : vider le cache de l'appareil en exécutant :")
      print(f"    bluetoothctl remove {addr_str}")
    return False

async def scan():
  print("=" * 60)
  print("  Recherche Bluetooth BLE de la Pristar P15...")
  print("=" * 60)
  print("Vérifiez que l'imprimante est bien allumée (voyant vert actif).")
  print("Scan en cours pendant 6 secondes...\n")

  try:
    from bleak import BleakScanner
    devices = await BleakScanner.discover(timeout=6.0)
  except Exception as e:
    print(f"[-] Erreur lors du scan Bluetooth : {e}")
    print("\nAstuces pour serveur Linux :")
    print("  1. Vérifiez que Bluetooth est allumé : sudo rfkill unblock bluetooth")
    print("  2. Vérifiez le service BlueZ : sudo systemctl status bluetooth")
    print("  3. Si vous êtes dans Docker, partagez D-Bus : /var/run/dbus/system_bus_socket")
    return

  if not devices:
    print("[-] Aucun périphérique Bluetooth trouvé à portée.")
    return

  p15_found = []
  others = []

  for d in devices:
    name = d.name or "Inconnu"
    is_p15 = any(name.startswith(p) for p in KNOWN_PREFIXES)
    rssi = getattr(d, "rssi", 0)
    info = {"name": name, "address": d.address, "rssi": rssi, "device": d}
    if is_p15:
      p15_found.append(info)
    else:
      others.append(info)

  if p15_found:
    print("[+] IMPRIMANTE(S) PRISTAR / MARKLIFE TROUVÉE(S) :")
    print("-" * 60)
    for p in p15_found:
      print(f"  * Nom     : {p['name']}")
      print(f"    Adresse : {p['address']}")
      print(f"    Signal  : {p['rssi']} dBm")
      print()

    first = p15_found[0]
    await test_connect(first["device"])
  else:
    print("[?] Aucune imprimante identifiée comme Pristar P15 parmi les périphériques détectés :")
    for o in others[:15]:
      print(f"  - {o['name']} [{o['address']}] ({o['rssi']} dBm)")

if __name__ == "__main__":
  if len(sys.argv) > 1 and sys.argv[1].startswith("--test"):
    addr = sys.argv[2] if len(sys.argv) > 2 else "5E:55:09:10:33:13"
    asyncio.run(test_connect(addr))
  else:
    asyncio.run(scan())
