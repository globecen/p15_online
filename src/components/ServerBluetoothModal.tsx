import React, { useState, useEffect } from 'react';
import {
  Bluetooth,
  X,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Battery,
  Server,
  Zap,
  HelpCircle,
  Smartphone,
  Radio,
} from 'lucide-react';
import { api, DiscoveredBleDevice, ServerPrinterStatus } from '../api/client';
import { printerManager } from '../printer/web-bluetooth';
import { ConnectionStatus } from '../types/bluetooth';

interface ServerBluetoothModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStatusUpdated: (status: ServerPrinterStatus) => void;
}

export const ServerBluetoothModal: React.FC<ServerBluetoothModalProps> = ({
  isOpen,
  onClose,
  onStatusUpdated,
}) => {
  // Onglet sélectionné : 'direct' (Web Bluetooth navigateur/téléphone) ou 'docker' (Serveur Docker)
  const [tab, setTab] = useState<'direct' | 'docker'>('direct');

  // Statut Serveur Docker
  const [serverStatus, setServerStatus] = useState<ServerPrinterStatus | null>(null);
  const [devices, setDevices] = useState<DiscoveredBleDevice[]>([]);
  const [isScanningServer, setIsScanningServer] = useState(false);
  const [isConnectingServer, setIsConnectingServer] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // Statut Bluetooth Direct (Navigateur Web BLE)
  const [directStatus, setDirectStatus] = useState<ConnectionStatus>(printerManager.getStatus());
  const [isDirectConnecting, setIsDirectConnecting] = useState(false);
  const [directError, setDirectError] = useState<string | null>(null);
  const [directBattery, setDirectBattery] = useState<number | null>(null);
  const [acceptAllDevices, setAcceptAllDevices] = useState(false);

  const isWebBleSupported = typeof navigator !== 'undefined' && 'bluetooth' in navigator;

  // Récupérer le statut serveur
  const fetchServerStatus = async () => {
    try {
      const s = await api.getPrinterStatus();
      setServerStatus(s);
      onStatusUpdated(s);
    } catch (e: any) {
      console.warn('Erreur récupération statut serveur:', e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchServerStatus();
      setDirectStatus(printerManager.getStatus());

      printerManager.onStateChange = (status) => {
        setDirectStatus(status);
        if (status === 'connected') {
          setIsDirectConnecting(false);
        }
      };

      printerManager.onBatteryChange = (level) => {
        setDirectBattery(level);
      };
    }

    return () => {
      printerManager.onStateChange = undefined;
      printerManager.onBatteryChange = undefined;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Scan BLE côté Serveur Docker
  const handleServerScan = async () => {
    setIsScanningServer(true);
    setServerError(null);
    try {
      const res = await api.scanPrinters(6);
      setDevices(res.devices);
      setIsScanningServer(false);
    } catch (err: any) {
      setIsScanningServer(false);
      setServerError(err.message || 'Erreur lors du scan BLE sur le serveur Docker.');
    }
  };

  // Connexion BLE côté Serveur Docker
  const handleServerConnect = async (address: string) => {
    setIsConnectingServer(true);
    setServerError(null);
    try {
      await api.connectPrinter(address);
      await fetchServerStatus();
      setIsConnectingServer(false);
    } catch (err: any) {
      setIsConnectingServer(false);
      setServerError(err.message || 'Impossible de se connecter à cette imprimante via le serveur.');
    }
  };

  // Déconnexion Serveur Docker
  const handleServerDisconnect = async () => {
    try {
      await api.disconnectPrinter();
      await fetchServerStatus();
    } catch (err: any) {
      setServerError(err.message);
    }
  };

  // Connexion Directe Bluetooth (Web Bluetooth natif navigateur)
  const handleDirectConnect = async () => {
    setIsDirectConnecting(true);
    setDirectError(null);
    try {
      const success = await printerManager.connect(acceptAllDevices);
      setIsDirectConnecting(false);
      if (!success) {
        // Annulé par l'utilisateur
        return;
      }
    } catch (err: any) {
      setIsDirectConnecting(false);
      setDirectError(
        err.message ||
          'Impossible de trouver ou de connecter la Pristar P15 en Bluetooth. Vérifiez qu\'elle est allumée et à proximité.',
      );
    }
  };

  // Déconnexion Directe Bluetooth
  const handleDirectDisconnect = async () => {
    try {
      await printerManager.disconnect();
      setDirectStatus('disconnected');
      setDirectBattery(null);
    } catch (err: any) {
      setDirectError(err.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* En-tête */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-600/20 text-indigo-400">
              <Bluetooth size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Connexion Bluetooth Pristar P15</h2>
              <p className="text-xs text-slate-400">
                Détecter et appairer votre imprimante thermique d'étiquettes
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Sélecteur d'onglets (Direct vs Docker) */}
        <div className="px-5 pt-3 pb-0 border-b border-slate-800 bg-slate-950/40">
          <div className="flex gap-2">
            <button
              onClick={() => setTab('direct')}
              className={`pb-2.5 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                tab === 'direct'
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Smartphone size={14} />
              <span>Bluetooth Direct (PC / Mobile)</span>
              <span className="text-[9px] uppercase px-1 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-bold">
                Recommandé
              </span>
            </button>

            <button
              onClick={() => setTab('docker')}
              className={`pb-2.5 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                tab === 'docker'
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Server size={14} />
              <span>Serveur Docker</span>
            </button>
          </div>
        </div>

        {/* Corps du modal */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* ================= ONGLET 1 : BLUETOOTH DIRECT ================= */}
          {tab === 'direct' && (
            <div className="space-y-4">
              {/* Carte État Actuel Direct */}
              <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-3.5 h-3.5 rounded-full shrink-0 ${
                      directStatus === 'connected'
                        ? 'bg-emerald-500 shadow-md shadow-emerald-500/50'
                        : directStatus === 'connecting'
                        ? 'bg-amber-400 animate-pulse'
                        : 'bg-slate-600'
                    }`}
                  />
                  <div>
                    <div className="text-sm font-bold text-white">
                      {directStatus === 'connected'
                        ? `Connecté en Direct : ${printerManager.getDeviceInfo()?.name || 'Pristar P15'}`
                        : directStatus === 'connecting'
                        ? 'Connexion en cours...'
                        : 'Aucune imprimante connectée en direct'}
                    </div>
                    <div className="text-xs text-slate-400">
                      {directStatus === 'connected'
                        ? 'Prêt à imprimer directement depuis ce navigateur/téléphone'
                        : 'Utilise le Bluetooth natif de votre ordinateur ou téléphone'}
                    </div>
                  </div>
                </div>

                {directStatus === 'connected' && (
                  <div className="flex items-center gap-2">
                    {directBattery !== null && (
                      <span className="flex items-center gap-1 font-mono text-emerald-400 text-xs px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/20">
                        <Battery size={13} /> {directBattery}%
                      </span>
                    )}
                    <button
                      onClick={handleDirectDisconnect}
                      className="px-2.5 py-1 text-xs text-rose-400 hover:bg-rose-500/10 rounded border border-rose-500/30 transition-all cursor-pointer"
                    >
                      Déconnecter
                    </button>
                  </div>
                )}
              </div>

              {directError && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0 text-rose-400" />
                  <span>{directError}</span>
                </div>
              )}

              {/* Bouton de recherche Bluetooth natif */}
              <div className="p-4 rounded-xl bg-indigo-950/30 border border-indigo-500/30 space-y-3">
                <div>
                  <h3 className="text-xs font-bold text-indigo-300 uppercase tracking-wider mb-1">
                    Détection Bluetooth native de votre appareil
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Cliquez sur le bouton ci-dessous pour ouvrir la fenêtre de sélection Bluetooth de votre
                    navigateur (Chrome, Edge ou Android) et choisir votre <strong>Pristar P15</strong>.
                  </p>
                </div>

                {/* Option élargir la recherche */}
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={acceptAllDevices}
                    onChange={(e) => setAcceptAllDevices(e.target.checked)}
                    className="rounded border-slate-700 text-indigo-600 focus:ring-0 cursor-pointer"
                  />
                  <span>
                    Afficher <strong>tous les appareils Bluetooth</strong> (si le filtre de nom ne trouve pas la P15)
                  </span>
                </label>

                <button
                  type="button"
                  onClick={handleDirectConnect}
                  disabled={isDirectConnecting}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 disabled:opacity-50 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  {isDirectConnecting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Recherche en cours...</span>
                    </>
                  ) : (
                    <>
                      <Radio size={17} />
                      <span>🔍 Rechercher et Connecter ma Pristar P15</span>
                    </>
                  )}
                </button>
              </div>

              {/* Guide de résolution : pourquoi l'imprimante n'apparaît pas */}
              <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/50 space-y-2">
                <div className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                  <HelpCircle size={14} className="text-amber-400" />
                  Vous ne trouvez pas l'imprimante dans la liste ?
                </div>
                <ul className="text-xs text-slate-400 space-y-1.5 list-disc pl-4 leading-relaxed">
                  <li>
                    <strong>Allumage :</strong> Maintenez le bouton de la P15 enfoncé 2 secondes jusqu'à ce que le voyant s'allume.
                  </li>
                  <li>
                    <strong>Déconnexion préalable :</strong> La P15 n'accepte <em>qu'une seule connexion à la fois</em>. Fermez l'application mobile Marklife ou désactivez le Bluetooth sur d'autres téléphones à proximité.
                  </li>
                  <li>
                    <strong>Nom affiché :</strong> L'imprimante peut s'appeler <code>P15</code>, <code>P15_...</code>, <code>Marklife</code> ou <code>Pristar</code>.
                  </li>
                  <li>
                    <strong>Navigateur compatible :</strong> Utilisez <strong>Google Chrome</strong> ou <strong>Microsoft Edge</strong> (sur Windows, Mac ou Android). Sur iPhone, utilisez l'application gratuite <em>Bluefy</em>.
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* ================= ONGLET 2 : BLUETOOTH SERVEUR DOCKER ================= */}
          {tab === 'docker' && (
            <div className="space-y-4">
              {/* Carte État Actuel Serveur */}
              <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-3.5 h-3.5 rounded-full shrink-0 ${
                      serverStatus?.connected
                        ? 'bg-emerald-500 shadow-md shadow-emerald-500/50'
                        : 'bg-slate-600'
                    }`}
                  />
                  <div>
                    <div className="text-sm font-bold text-white">
                      {serverStatus?.connected ? serverStatus.name : 'Aucune imprimante connectée au conteneur'}
                    </div>
                    <div className="text-xs text-slate-400">
                      {serverStatus?.connected
                        ? `Adresse : ${serverStatus.address}`
                        : 'Le conteneur Docker gère la liaison BLE via Bleak'}
                    </div>
                  </div>
                </div>

                {serverStatus?.connected && (
                  <div className="flex items-center gap-2">
                    {serverStatus.batteryLevel !== undefined && (
                      <span className="flex items-center gap-1 font-mono text-emerald-400 text-xs px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/20">
                        <Battery size={13} /> {serverStatus.batteryLevel}%
                      </span>
                    )}
                    <button
                      onClick={handleServerDisconnect}
                      className="px-2.5 py-1 text-xs text-rose-400 hover:bg-rose-500/10 rounded border border-rose-500/30 transition-all cursor-pointer"
                    >
                      Déconnecter
                    </button>
                  </div>
                )}
              </div>

              {serverError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle size={15} className="shrink-0 text-rose-400" />
                  <span>{serverError}</span>
                </div>
              )}

              {/* Notice explicative Windows Docker */}
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs space-y-1.5 leading-relaxed">
                <div className="font-bold flex items-center gap-1.5 text-amber-300">
                  <HelpCircle size={14} /> Vous exécutez Docker sur Windows ?
                </div>
                <p>
                  Par conception, <strong>Docker Desktop sous Windows (WSL2)</strong> n'expose pas la puce Bluetooth matérielle de votre PC aux conteneurs Linux.
                </p>
                <p>
                  Pour imprimer immédiatement sur votre vraie Pristar P15 sans configuration complexe, basculez sur l'onglet <strong>« Bluetooth Direct »</strong> qui utilise directement le Bluetooth de votre PC ou smartphone !
                </p>
              </div>

              {/* Bouton de scan BLE Serveur */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300">
                  Périphériques détectés par Docker :
                </span>
                <button
                  onClick={handleServerScan}
                  disabled={isScanningServer}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 shadow transition-all cursor-pointer"
                >
                  <RefreshCw size={13} className={isScanningServer ? 'animate-spin' : ''} />
                  {isScanningServer ? 'Scan en cours...' : 'Lancer un Scan BLE Serveur'}
                </button>
              </div>

              {/* Liste des périphériques */}
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {devices.map((device) => {
                  const isP15 = device.is_p15;
                  const isCurrent = serverStatus?.connected && serverStatus?.address === device.address;

                  return (
                    <div
                      key={device.address}
                      className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                        isCurrent
                          ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                          : isP15
                          ? 'bg-indigo-950/30 border-indigo-500/40 text-white'
                          : 'bg-slate-800/40 border-slate-700/50 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Bluetooth
                          size={16}
                          className={isCurrent ? 'text-emerald-400' : isP15 ? 'text-indigo-400' : 'text-slate-500'}
                        />
                        <div>
                          <div className="text-xs font-semibold flex items-center gap-1.5">
                            <span>{device.name}</span>
                            {isP15 && (
                              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                P15 Compatible
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {device.address} {device.rssi ? `• Signal: ${device.rssi} dBm` : ''}
                          </div>
                        </div>
                      </div>

                      <div>
                        {isCurrent ? (
                          <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 size={14} /> Connecté
                          </span>
                        ) : (
                          <button
                            onClick={() => handleServerConnect(device.address)}
                            disabled={isConnectingServer}
                            className="px-3 py-1 rounded-lg bg-indigo-600/80 hover:bg-indigo-600 text-white text-xs font-semibold transition-all cursor-pointer"
                          >
                            {isConnectingServer ? 'Connexion...' : 'Connecter'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {devices.length === 0 && !isScanningServer && (
                  <div className="p-4 text-center text-xs text-slate-400 border border-dashed border-slate-800 rounded-xl">
                    Aucun périphérique scanné. Cliquez sur « Lancer un Scan BLE Serveur ».
                  </div>
                )}
              </div>

              {/* Mode simulation / auto */}
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">
                  Mode de test automatique :
                </span>
                <button
                  onClick={() => handleServerConnect('SIMULATED-P15-01')}
                  className="text-xs text-indigo-400 hover:text-indigo-300 underline flex items-center gap-1 cursor-pointer"
                >
                  <Zap size={13} /> Activer le mode simulation
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};