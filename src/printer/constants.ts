// UUIDs et constantes pour Pristar P15 / Marklife BLE
export const BLE_SERVICES = {
  PRIMARY: '0000ff00-0000-1000-8000-00805f9b34fb',
  FALLBACK: '49535343-fe7d-4ae5-8fa9-9fafd205e455',
};

export const BLE_CHARACTERISTICS = {
  RX: '0000ff01-0000-1000-8000-00805f9b34fb', // Notifications (Status / ACK / Battery)
  TX: '0000ff02-0000-1000-8000-00805f9b34fb', // Écriture données (sans réponse)
  CX: '0000ff03-0000-1000-8000-00805f9b34fb', // Contrôle de flux & crédits

  FALLBACK_RX: '49535343-1e4d-4bd9-ba61-23c647249616',
  FALLBACK_TX: '49535343-8841-43f4-a8d4-ecbe34729bb3',
};

// Préfixes de noms d'imprimantes reconnues
export const KNOWN_DEVICE_PREFIXES = [
  'P15',
  'P15R',
  'P15S',
  'P15Pro',
  'Pristar',
  'PRISTAR',
  'pristar',
  'P-15',
  'Marklife',
  'P7',
  'P7R',
  'P12',
  'P11',
  'LP15',
  'iSPACE_LP15',
  'OUT_LPC',
  'M1',
  'S15',
  'S12',
  'P1s',
  'LPC74',
  'Printer',
  'Thermal',
];

// Paramètres de paquet pour la P15 (selon décompilation de l'APK officiel)
export const PACKET_SIZE = 95;
export const PACKET_DELAY_MS = 30; // 30ms de cadencement par paquet
export const STARVATION_TIMEOUT_MS = 1000;

// Commandes L11 pour la Pristar P15
export const L11_COMMANDS = {
  // 15 octets à zéro pour réveiller le contrôleur
  wakeup: () => new Uint8Array(15),

  // Activer le moteur d'impression : 10 FF F1 02
  enable: () => Uint8Array.from([0x10, 0xff, 0xf1, 0x02]),

  // Fin de session d'impression : 10 FF F1 45
  stop: () => Uint8Array.from([0x10, 0xff, 0xf1, 0x45]),

  // Réglage de l'épaisseur / contraste : 10 FF 10 00 TT (TT = 1, 2, 3)
  setThickness: (val: number) => Uint8Array.from([0x10, 0xff, 0x10, 0x00, Math.min(3, Math.max(1, val))]),

  // Réglage de la densité : 1F 70 02 DD (DD = 1, 2, 3)
  setDensity: (val: number) => Uint8Array.from([0x1f, 0x70, 0x02, Math.min(3, Math.max(1, val))]),

  // Caler sur l'intervalle d'étiquette suivant (gap) : 1D 0C
  positionToGap: () => Uint8Array.from([0x1d, 0x0c]),

  // Avance de papier en points (pour rouleau continu) : 1B 4A NN (ex: 100 points)
  feedDots: (dots: number = 100) => Uint8Array.from([0x1b, 0x4a, dots & 0xff]),

  // Interroger le niveau de batterie : 10 FF 50 F1
  queryBattery: () => Uint8Array.from([0x10, 0xff, 0x50, 0xf1]),

  // Interroger le statut de l'imprimante : 10 FF 40
  queryStatus: () => Uint8Array.from([0x10, 0xff, 0x40]),

  // Commande d'en-tête de trame raster : 1D 76 30 00 WL WH HL HH
  buildBitmapCommand: (bytesPerRow: number, height: number, pixelBytes: Uint8Array): Uint8Array => {
    const header = Uint8Array.from([
      0x1d,
      0x76,
      0x30,
      0x00,
      bytesPerRow & 0xff,
      (bytesPerRow >> 8) & 0xff,
      height & 0xff,
      (height >> 8) & 0xff,
    ]);

    const command = new Uint8Array(header.length + pixelBytes.length);
    command.set(header, 0);
    command.set(pixelBytes, header.length);
    return command;
  },
};
