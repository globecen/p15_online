#!/usr/bin/env python3
"""
Outil CLI pour rechercher la Pristar P15 en ligne de commande.
Usage :
  Sur l'hôte : python server/scan_cli.py
  Dans Docker : docker exec -it pristar-p15-studio python /app/server/scan_cli.py
"""
import asyncio
import sys

KNOWN_PREFIXES = ("P15", "P15R", "P15S", "P15Pro", "Pristar", "PRISTAR", "pristar", "P-15", "Marklife", "P7", "P12", "P11", "LP15", "M1", "S15")

async def scan():
  print("=" * 60)
  print("  Recherche Bluetooth BLE de la Pristar P15...")
  print("=" * 60)
  print("Vérifiez que l'imprimante est bien allumée (voyant actif).")
  print("Scan en cours pendant 8 secondes...\n")

  try:
    from bleak import BleakScanner
    devices = await BleakScanner.discover(timeout=8.0)
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
    info = {"name": name, "address": d.address, "rssi": rssi}
    if is_p15:
      p15_found.append(info)
    else:
      others.append(info)

  if p15_found:
    print("[+] IMPRIMANTE(S) PRISTAR / MARKLIFE TROUVÉE(S) :")
    print("-" * 60)
    for p in p15_found:
      print(f"  * Nom     : {p['name']}")
      print(f"    Adresse : {p['address']}   <--- (Copiez cette adresse MAC)")
      print(f"    Signal  : {p['rssi']} dBm")
      print()
    print("Pour que le conteneur s'y connecte automatiquement au démarrage :")
    print(f"Ajoutez dans votre docker-compose.yml :")
    print(f"    environment:")
    print(f"      - PRINTER_MAC={p15_found[0]['address']}")
  else:
    print("[?] Aucune imprimante identifiée comme Pristar P15 parmi les périphériques détectés :")
    for o in others[:15]:
      print(f"  - {o['name']} [{o['address']}] ({o['rssi']} dBm)")
    print("\nSi votre P15 a un nom inhabituel, repérez son adresse MAC dans la liste ci-dessus.")

if __name__ == "__main__":
  asyncio.run(scan())
