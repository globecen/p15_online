import { PACKET_SIZE, PACKET_DELAY_MS, STARVATION_TIMEOUT_MS } from './constants';

export class BleFlowController {
  private credits: number = 0;
  private lastCreditTime: number = Date.now();
  private packetSize: number = PACKET_SIZE;
  private pendingCreditResolvers: Array<() => void> = [];

  constructor(
    private readonly txChar: BluetoothRemoteGATTCharacteristic,
    customPacketSize?: number,
  ) {
    if (customPacketSize && customPacketSize > 0) {
      this.packetSize = customPacketSize;
    }
  }

  public setPacketSize(size: number) {
    this.packetSize = size;
  }

  public grantCredits(count: number) {
    this.credits += count;
    this.lastCreditTime = Date.now();
    // Résoudre les attentes en attente de crédits
    while (this.credits > 0 && this.pendingCreditResolvers.length > 0) {
      const resolver = this.pendingCreditResolvers.shift();
      resolver?.();
    }
  }

  public async waitForCredits(minCredits: number = 1, timeoutMs: number = 3000): Promise<void> {
    if (this.credits >= minCredits) return;

    return new Promise<void>((resolve) => {
      let resolved = false;
      const timer = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          // Si le timeout expire, on force au moins un crédit pour éviter le blocage
          this.credits = Math.max(this.credits, minCredits);
          resolve();
        }
      }, timeoutMs);

      const check = () => {
        if (this.credits >= minCredits && !resolved) {
          resolved = true;
          clearTimeout(timer);
          resolve();
        } else if (!resolved) {
          this.pendingCreditResolvers.push(check);
        }
      };

      this.pendingCreditResolvers.push(check);
    });
  }

  /**
   * Envoi de données binaires avec cadencement et gestion des crédits BLE
   */
  public async send(
    data: Uint8Array,
    onProgress?: (bytesSent: number, totalBytes: number) => void,
  ): Promise<void> {
    let offset = 0;
    this.lastCreditTime = Date.now();

    return new Promise<void>((resolve, reject) => {
      const tick = async () => {
        try {
          if (offset >= data.length) {
            resolve();
            return;
          }

          // Récupération en cas de famine (starvation) : si l'imprimante ne renvoie pas de crédit pendant 1s
          if (this.credits <= 0 && Date.now() - this.lastCreditTime >= STARVATION_TIMEOUT_MS) {
            this.credits = 1;
            this.lastCreditTime = Date.now();
          }

          if (this.credits > 0) {
            const remaining = data.length - offset;
            const chunkSize = Math.min(remaining, this.packetSize);
            const chunk = data.subarray(offset, offset + chunkSize);

            // Écriture BLE sans réponse
            const buffer = new Uint8Array(chunk).buffer as ArrayBuffer;
            await this.txChar.writeValueWithoutResponse(buffer);

            this.credits--;
            offset += chunkSize;
            onProgress?.(offset, data.length);

            if (offset >= data.length) {
              resolve();
              return;
            }
          }

          // Prochain paquet après le délai cadencé (30ms pour Pristar P15)
          setTimeout(tick, PACKET_DELAY_MS);
        } catch (err) {
          reject(err);
        }
      };

      // Démarrage immédiat
      tick();
    });
  }

  public get availableCredits(): number {
    return this.credits;
  }
}
