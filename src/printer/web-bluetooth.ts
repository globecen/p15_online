import {
  BLE_SERVICES,
  BLE_CHARACTERISTICS,
  KNOWN_DEVICE_PREFIXES,
  PACKET_SIZE,
} from './constants';
import { BleFlowController } from './flow-controller';
import { ProcessedBitmap, buildL11PrintJob } from './image-processor';
import {
  ConnectionStatus,
  PrinterDeviceInfo,
  PrintProgressInfo,
  PrinterStatusCode,
} from '../types/bluetooth';
import { PrintSettings } from '../types/label';

export class WebBluetoothPrinterManager {
  private device: BluetoothDevice | null = null;
  private server: BluetoothRemoteGATTServer | null = null;
  private txChar: BluetoothRemoteGATTCharacteristic | null = null;
  private rxChar: BluetoothRemoteGATTCharacteristic | null = null;
  private cxChar: BluetoothRemoteGATTCharacteristic | null = null;

  private flowController: BleFlowController | null = null;
  private status: ConnectionStatus = 'disconnected';
  private deviceInfo: PrinterDeviceInfo | null = null;

  private rxListener: ((event: Event) => void) | null = null;
  private cxListener: ((event: Event) => void) | null = null;

  // Promesses d'attente d'acquittement
  private printSuccessResolver: ((success: boolean) => void) | null = null;

  // Callbacks
  public onStateChange?: (status: ConnectionStatus, info?: PrinterDeviceInfo) => void;
  public onBatteryChange?: (batteryLevel: number) => void;
  public onStatusAlert?: (code: PrinterStatusCode, message: string) => void;

  public static isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
  }

  public getStatus(): ConnectionStatus {
    return this.status;
  }

  public getDeviceInfo(): PrinterDeviceInfo | null {
    return this.deviceInfo;
  }

  public isConnected(): boolean {
    return this.status === 'connected' && this.server?.connected === true;
  }

  /**
   * Lance la boîte de dialogue de sélection Bluetooth native du navigateur.
   * Accepte soit les préfixes connus (P15, Marklife...), soit tous les appareils si élargi.
   */
  public async connect(acceptAllDevices: boolean = false): Promise<boolean> {
    if (!WebBluetoothPrinterManager.isSupported()) {
      throw new Error(
        'Le Web Bluetooth n\'est pas supporté par ce navigateur. Veuillez utiliser Google Chrome, Microsoft Edge ou Opera sur ordinateur ou Android.',
      );
    }

    try {
      this.updateStatus('connecting');

      const options: RequestDeviceOptions = acceptAllDevices
        ? {
            acceptAllDevices: true,
            optionalServices: [BLE_SERVICES.PRIMARY, BLE_SERVICES.FALLBACK],
          }
        : {
            filters: KNOWN_DEVICE_PREFIXES.map((prefix) => ({ namePrefix: prefix })),
            optionalServices: [BLE_SERVICES.PRIMARY, BLE_SERVICES.FALLBACK],
          };

      this.device = await navigator.bluetooth.requestDevice(options);

      // Écouter la déconnexion inattendue
      this.device.addEventListener('gattserverdisconnected', () => {
        this.cleanup();
        this.updateStatus('disconnected');
      });

      // Connexion au serveur GATT
      this.server = await this.device.gatt?.connect() || null;
      if (!this.server) {
        throw new Error('Impossible d\'ouvrir la session GATT avec l\'imprimante');
      }

      // Recherche du service primaire ou fallback
      let service: BluetoothRemoteGATTService | null = null;
      try {
        service = await this.server.getPrimaryService(BLE_SERVICES.PRIMARY);
      } catch {
        // Essai du service alternatif
        try {
          service = await this.server.getPrimaryService(BLE_SERVICES.FALLBACK);
        } catch {
          throw new Error('Service BLE d\'impression Marklife/P15 introuvable.');
        }
      }

      // Récupération des caractéristiques TX, RX et CX
      this.txChar = await service.getCharacteristic(BLE_CHARACTERISTICS.TX);
      this.rxChar = await service.getCharacteristic(BLE_CHARACTERISTICS.RX);

      try {
        this.cxChar = await service.getCharacteristic(BLE_CHARACTERISTICS.CX);
      } catch {
        this.cxChar = null;
      }

      // Initialiser le contrôleur de flux
      this.flowController = new BleFlowController(this.txChar, PACKET_SIZE);

      // S'abonner aux notifications RX (Status & ACK)
      await this.setupRxNotifications();

      // S'abonner aux notifications CX (Crédits de flux & MTU)
      if (this.cxChar) {
        await this.setupCxNotifications();
        // Attendre les crédits initiaux envoyés par la P15 après la connexion
        await this.flowController.waitForCredits(1, 2000);
      } else {
        // Si pas de canal CX spécifique, démarrer avec 4 crédits par défaut
        this.flowController.grantCredits(4);
      }

      this.deviceInfo = {
        id: this.device.id,
        name: this.device.name || 'Pristar P15',
      };

      this.updateStatus('connected', this.deviceInfo);

      // Interroger la batterie en tâche de fond
      this.refreshBattery();

      return true;
    } catch (err: any) {
      this.cleanup();
      this.updateStatus('error');
      if (err.name === 'NotFoundError') {
        // Annulation par l'utilisateur
        this.updateStatus('disconnected');
        return false;
      }
      throw err;
    }
  }

  private async setupRxNotifications() {
    if (!this.rxChar) return;

    this.rxListener = (event: Event) => {
      const target = event.target as BluetoothRemoteGATTCharacteristic;
      if (!target.value) return;

      const bytes = new Uint8Array(target.value.buffer);
      this.handleRxData(bytes);
    };

    this.rxChar.addEventListener('characteristicvaluechanged', this.rxListener);
    await this.rxChar.startNotifications();
  }

  private async setupCxNotifications() {
    if (!this.cxChar) return;

    this.cxListener = (event: Event) => {
      const target = event.target as BluetoothRemoteGATTCharacteristic;
      if (!target.value) return;

      const bytes = new Uint8Array(target.value.buffer);
      this.handleCxData(bytes);
    };

    this.cxChar.addEventListener('characteristicvaluechanged', this.cxListener);
    await this.cxChar.startNotifications();
  }

  private handleRxData(data: Uint8Array) {
    if (data.length === 0) return;
    const firstByte = data[0];

    // Confirmation de succès d'impression : 0xAA, 0x4F ('O'), 0x4B ('K')
    if (firstByte === 0xaa || firstByte === 0x4f || firstByte === 0x4b) {
      if (this.printSuccessResolver) {
        this.printSuccessResolver(true);
        this.printSuccessResolver = null;
      }
      return;
    }

    // Réception du statut imprimante : 0xFF, code
    if (firstByte === 0xff && data.length >= 2) {
      const code = data[1];
      const statusMap: Record<number, { code: PrinterStatusCode; msg: string }> = {
        0x01: { code: 'out_of_paper', msg: 'Plus de papier ou étiquettes épuisées' },
        0x02: { code: 'cover_open', msg: 'Capot ouvert' },
        0x03: { code: 'overheating', msg: 'Surchauffe de la tête d\'impression' },
        0x04: { code: 'low_battery', msg: 'Batterie très faible' },
        0x05: { code: 'cover_closed', msg: 'Capot refermé' },
      };

      const mapped = statusMap[code];
      if (mapped) {
        this.onStatusAlert?.(mapped.code, mapped.msg);
      }
      return;
    }

    // Réponse niveau de batterie : 10 FF 50 F1 -> data[1] ou data[2]
    if (data.length >= 2 && firstByte === 0x10) {
      const battery = data[data.length - 1];
      if (battery >= 0 && battery <= 100) {
        if (this.deviceInfo) {
          this.deviceInfo.batteryLevel = battery;
        }
        this.onBatteryChange?.(battery);
      }
    }
  }

  private handleCxData(data: Uint8Array) {
    if (data.length < 2) return;
    const type = data[0];

    // [0x01, count] -> Attribution de crédits de flux
    if (type === 0x01) {
      const count = data[1];
      this.flowController?.grantCredits(count);
    }
    // [0x02, mtu_lo, mtu_hi] -> MTU annoncée
    else if (type === 0x02 && data.length >= 3) {
      const mtu = (data[2] << 8) | data[1];
      const effectivePayload = Math.min(237, Math.max(64, mtu - 3));
      this.flowController?.setPacketSize(effectivePayload);
    }
  }

  /**
   * Envoie une requête pour rafraîchir le niveau de batterie
   */
  public async refreshBattery() {
    if (!this.txChar || !this.flowController) return;
    try {
      const batteryCmd = Uint8Array.from([0x10, 0xff, 0x50, 0xf1]);
      await this.flowController.send(batteryCmd);
    } catch {
      // Pas bloquant si l'imprimante ne répond pas au test batterie
    }
  }

  /**
   * Exécute un travail d'impression complet sur la Pristar P15
   */
  public async printJob(
    bitmap: ProcessedBitmap,
    settings: PrintSettings,
    onProgress?: (progress: PrintProgressInfo) => void,
  ): Promise<boolean> {
    if (!this.isConnected() || !this.flowController) {
      throw new Error('L\'imprimante Pristar P15 n\'est pas connectée en Bluetooth.');
    }

    this.updateStatus('printing', this.deviceInfo || undefined);

    const copies = Math.max(1, settings.copies || 1);
    const { preamble, bulk } = buildL11PrintJob(bitmap, {
      density: settings.density,
      paperType: settings.paperType,
    });

    const singleCopyBytes = preamble.length + bulk.length;
    const totalBytes = singleCopyBytes * copies;
    let globalSent = 0;

    try {
      for (let copy = 1; copy <= copies; copy++) {
        onProgress?.({
          status: 'sending',
          currentCopy: copy,
          totalCopies: copies,
          bytesSent: globalSent,
          totalBytes,
          percentage: Math.round((globalSent / totalBytes) * 100),
          message: `Impression copie ${copy}/${copies}...`,
        });

        // 1. Envoyer le préambule (réveil + configuration tête)
        await this.flowController.send(preamble, (sent) => {
          onProgress?.({
            status: 'sending',
            currentCopy: copy,
            totalCopies: copies,
            bytesSent: globalSent + sent,
            totalBytes,
            percentage: Math.round(((globalSent + sent) / totalBytes) * 100),
            message: `Copie ${copy}/${copies} : Initialisation...`,
          });
        });
        globalSent += preamble.length;

        // Attendre un instant que la tête chauffe et que les crédits soient rechargés
        await new Promise((r) => setTimeout(r, 80));
        await this.flowController.waitForCredits(2, 1500);

        // 2. Envoyer le flux d'image raster et les commandes de fin
        const ackPromise = new Promise<boolean>((resolve) => {
          this.printSuccessResolver = resolve;
          // Timeout de sécurité au cas où l'ACK se perd
          setTimeout(() => {
            if (this.printSuccessResolver) {
              this.printSuccessResolver = null;
              resolve(true); // On assume le succès si pas d'erreur signalée
            }
          }, 6000);
        });

        await this.flowController.send(bulk, (sent) => {
          onProgress?.({
            status: 'sending',
            currentCopy: copy,
            totalCopies: copies,
            bytesSent: globalSent + sent,
            totalBytes,
            percentage: Math.round(((globalSent + sent) / totalBytes) * 100),
            message: `Copie ${copy}/${copies} : Envoi des données (${Math.round((sent / bulk.length) * 100)}%)...`,
          });
        });
        globalSent += bulk.length;

        // 3. Attendre la confirmation ACK de la P15
        onProgress?.({
          status: 'completing',
          currentCopy: copy,
          totalCopies: copies,
          bytesSent: globalSent,
          totalBytes,
          percentage: Math.round((globalSent / totalBytes) * 100),
          message: `Copie ${copy}/${copies} : Découpe & finalisation...`,
        });

        await ackPromise;

        // Pause entre deux étiquettes si plusieurs copies
        if (copy < copies) {
          await new Promise((r) => setTimeout(r, 400));
        }
      }

      onProgress?.({
        status: 'done',
        currentCopy: copies,
        totalCopies: copies,
        bytesSent: totalBytes,
        totalBytes,
        percentage: 100,
        message: 'Impression terminée avec succès !',
      });

      this.updateStatus('connected', this.deviceInfo || undefined);
      return true;
    } catch (err) {
      this.updateStatus('connected', this.deviceInfo || undefined);
      throw err;
    }
  }

  public async disconnect(): Promise<void> {
    this.cleanup();
    if (this.server?.connected) {
      this.server.disconnect();
    }
    this.updateStatus('disconnected');
  }

  private cleanup() {
    if (this.rxChar && this.rxListener) {
      try {
        this.rxChar.removeEventListener('characteristicvaluechanged', this.rxListener);
        this.rxChar.stopNotifications().catch(() => {});
      } catch {}
    }
    if (this.cxChar && this.cxListener) {
      try {
        this.cxChar.removeEventListener('characteristicvaluechanged', this.cxListener);
        this.cxChar.stopNotifications().catch(() => {});
      } catch {}
    }

    this.rxListener = null;
    this.cxListener = null;
    this.txChar = null;
    this.rxChar = null;
    this.cxChar = null;
    this.server = null;
    this.flowController = null;
    this.deviceInfo = null;
    this.printSuccessResolver = null;
  }

  private updateStatus(status: ConnectionStatus, info?: PrinterDeviceInfo) {
    this.status = status;
    if (info) this.deviceInfo = info;
    this.onStateChange?.(this.status, this.deviceInfo || undefined);
  }
}

// Instance singleton
export const printerManager = new WebBluetoothPrinterManager();
