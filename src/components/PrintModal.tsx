import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  Printer,
  X,
  CheckCircle2,
  AlertTriangle,
  Minus,
  Plus,
  Server,
  Zap,
  Bluetooth,
  RefreshCw,
} from 'lucide-react';
import { LabelDimensions, LabelElement, PrintSettings } from '../types/label';
import { processLabelForPrint, ProcessedBitmap } from '../printer/image-processor';
import { renderLabelToFullCanvas } from '../utils/canvas-renderer';
import { api, ServerPrinterStatus } from '../api/client';
import { printerManager } from '../printer/web-bluetooth';
import { ConnectionStatus } from '../types/bluetooth';

interface PrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  elements: LabelElement[];
  dimensions: LabelDimensions;
  printSettings: PrintSettings;
  onChangePrintSettings: (settings: PrintSettings) => void;
  serverStatus: ServerPrinterStatus | null;
  onOpenServerBluetooth: () => void;
}

export const PrintModal: React.FC<PrintModalProps> = ({
  isOpen,
  onClose,
  elements,
  dimensions,
  printSettings,
  onChangePrintSettings,
  serverStatus,
  onOpenServerBluetooth,
}) => {
  const [printChannel, setPrintChannel] = useState<'docker' | 'web-ble'>('docker');
  const [processedBitmap, setProcessedBitmap] = useState<ProcessedBitmap | null>(null);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [progressMsg, setProgressMsg] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  // Statut Web Bluetooth (navigateur)
  const [webBleStatus, setWebBleStatus] = useState<ConnectionStatus>(printerManager.getStatus());
  const isWebBleSupported = typeof navigator !== 'undefined' && 'bluetooth' in navigator;

  // Écouter les changements Web Bluetooth
  useEffect(() => {
    printerManager.onStateChange = (status) => {
      setWebBleStatus(status);
    };
    return () => {
      printerManager.onStateChange = undefined;
    };
  }, []);

  // À l'ouverture : générer le bitmap et tenter l'auto-connexion Docker si déconnecté
  useEffect(() => {
    if (!isOpen) {
      setProgressMsg(null);
      setErrorMessage(null);
      setIsSuccess(false);
      setIsPrinting(false);
      return;
    }

    let isMounted = true;
    setIsGeneratingPreview(true);

    // Auto-connexion en tâche de fond si non connecté sur Docker
    if (!serverStatus?.connected) {
      api.connectPrinter('auto').catch(() => {});
    }

    const generate = async () => {
      try {
        const fullCanvas = await renderLabelToFullCanvas(elements, dimensions);
        if (!isMounted) return;

        const bitmap = processLabelForPrint(fullCanvas, {
          ditherMode: printSettings.ditherMode,
          threshold: printSettings.threshold,
          rotate90: true,
        });

        if (isMounted) {
          setProcessedBitmap(bitmap);
          setIsGeneratingPreview(false);
        }
      } catch (err: any) {
        if (isMounted) {
          setIsGeneratingPreview(false);
          setErrorMessage('Erreur lors du traitement du rendu thermique: ' + (err.message || String(err)));
        }
      }
    };

    generate();

    return () => {
      isMounted = false;
    };
  }, [isOpen, elements, dimensions, printSettings.ditherMode, printSettings.threshold]);

  if (!isOpen) return null;

  // Lancer l'impression via le serveur Docker Bluetooth
  const handlePrintDocker = async () => {
    if (!processedBitmap) return;

    try {
      setIsPrinting(true);
      setErrorMessage(null);
      setIsSuccess(false);

      // Si le serveur n'est pas encore connecté, auto-connecter avant d'imprimer
      if (!serverStatus?.connected) {
        setProgressMsg('Connexion automatique à l\'imprimante Pristar P15...');
        try {
          await api.connectPrinter('auto');
        } catch (e: any) {
          logger_warn: console.warn('Tentative auto-connexion:', e);
        }
      }

      setProgressMsg('Envoi des données au serveur Docker Bluetooth...');

      // Conversion Uint8Array en base64 robuste
      let binary = '';
      const len = processedBitmap.data.byteLength;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(processedBitmap.data[i]);
      }
      const base64Data = window.btoa(binary);

      await api.printJob({
        title: `Étiquette ${dimensions.widthMm}x${dimensions.heightMm}`,
        packed_bitmap_base64: base64Data,
        bytes_per_row: processedBitmap.bytesPerRow,
        height: processedBitmap.height,
        density: printSettings.density,
        paper_type: printSettings.paperType,
        copies: printSettings.copies || 1,
        dimensions,
        preview_base64: processedBitmap.previewUrl,
      });

      setIsSuccess(true);
      setIsPrinting(false);
      setProgressMsg(null);

      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch {}
    } catch (err: any) {
      setIsPrinting(false);
      setProgressMsg(null);
      setErrorMessage(err.message || 'Échec de l\'impression via le serveur Docker.');
    }
  };

  // Lancer l'impression directe via le Bluetooth du navigateur (Web BLE)
  const handlePrintWebBle = async () => {
    if (!processedBitmap) return;

    try {
      setIsPrinting(true);
      setErrorMessage(null);
      setIsSuccess(false);

      // Si non connecté en Web BLE, lancer l'appairage Bluetooth navigateur
      if (!printerManager.isConnected()) {
        setProgressMsg('Sélection de l\'imprimante Pristar P15 via le navigateur...');
        const connected = await printerManager.connect(false);
        if (!connected) {
          setIsPrinting(false);
          setProgressMsg(null);
          return;
        }
      }

      setProgressMsg('Impression directe Web Bluetooth en cours...');
      await printerManager.printJob(processedBitmap, printSettings, (prog) => {
        setProgressMsg(prog.message || null);
      });

      setIsSuccess(true);
      setIsPrinting(false);
      setProgressMsg(null);

      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch {}
    } catch (err: any) {
      setIsPrinting(false);
      setProgressMsg(null);
      setErrorMessage(err.message || 'Erreur lors de l\'impression directe Web Bluetooth.');
    }
  };

  const handleLaunch = () => {
    if (printChannel === 'docker') {
      handlePrintDocker();
    } else {
      handlePrintWebBle();
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* En-tête de la modale */}
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-600/20 text-indigo-400">
              <Printer size={18} />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white">Lancer l'Impression</h2>
              <p className="text-[11px] sm:text-xs text-slate-400">
                Pristar P15 • Format {dimensions.widthMm} × {dimensions.heightMm} mm
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isPrinting}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-40 transition-all cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Corps de la modale */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* Choix du canal d'impression */}
          <div>
            <div className="text-xs font-semibold text-slate-300 mb-2">Canal d'impression Bluetooth :</div>
            <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setPrintChannel('docker')}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  printChannel === 'docker'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Server size={14} />
                <span>Serveur Docker</span>
                <span className="text-[9px] uppercase px-1 py-0.2 rounded bg-indigo-400/20 font-bold">Défaut</span>
              </button>

              <button
                type="button"
                onClick={() => setPrintChannel('web-ble')}
                disabled={!isWebBleSupported}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  printChannel === 'web-ble'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900 disabled:opacity-40'
                }`}
                title={!isWebBleSupported ? 'Nécessite Chrome, Edge ou Opera avec Bluetooth' : ''}
              >
                <Bluetooth size={14} />
                <span>Direct Navigateur</span>
              </button>
            </div>
          </div>

          {/* Aperçu des points thermiques 1-bit */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-slate-300">
                Aperçu de la gravure thermique (1:1) :
              </span>
              <span className="text-[11px] text-slate-500 font-mono">
                {processedBitmap ? `${processedBitmap.height} lignes × ${processedBitmap.width} pts` : ''}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center min-h-24">
              {isGeneratingPreview ? (
                <div className="text-xs text-slate-400 flex items-center gap-2">
                  <div className="w-3.5 h-3.5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  Calcul de la trame thermique...
                </div>
              ) : processedBitmap?.previewUrl ? (
                <div className="relative inline-block border border-slate-700 bg-white shadow-md p-1 rounded-xs">
                  <img
                    src={processedBitmap.previewUrl}
                    alt="Aperçu thermique"
                    className="max-h-24 object-contain"
                    style={{ imageRendering: 'pixelated' }}
                  />
                </div>
              ) : null}
            </div>
          </div>

          {/* Messages de statut & alertes (placés au centre pour être immédiatement visibles) */}
          {progressMsg && (
            <div className="p-3 rounded-xl bg-indigo-950/60 border border-indigo-500/50 text-xs text-indigo-300 flex items-center gap-2.5 animate-pulse">
              <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin shrink-0" />
              <span className="font-medium">{progressMsg}</span>
            </div>
          )}

          {isSuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 text-xs flex items-center gap-2.5 shadow-lg shadow-emerald-500/10">
              <CheckCircle2 size={18} className="shrink-0 text-emerald-400" />
              <span className="font-semibold">Impression envoyée et exécutée avec succès sur la Pristar P15 !</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-500/20 border border-rose-500/50 text-rose-300 text-xs flex items-center gap-2.5">
              <AlertTriangle size={18} className="shrink-0 text-rose-400" />
              <span className="font-medium">{errorMessage}</span>
            </div>
          )}

          {/* Configuration des exemplaires et densité */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {/* Nombre de copies */}
            <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
              <label className="text-xs font-semibold text-slate-300 block mb-2">
                Nombre d'exemplaires
              </label>
              <div className="flex items-center rounded-lg bg-slate-900 border border-slate-700 overflow-hidden">
                <button
                  type="button"
                  onClick={() =>
                    onChangePrintSettings({
                      ...printSettings,
                      copies: Math.max(1, printSettings.copies - 1),
                    })
                  }
                  className="w-9 h-8 flex items-center justify-center text-slate-300 hover:bg-slate-800 hover:text-white cursor-pointer"
                >
                  <Minus size={14} />
                </button>
                <input
                  type="number"
                  min={1}
                  max={99}
                  value={printSettings.copies}
                  onChange={(e) =>
                    onChangePrintSettings({
                      ...printSettings,
                      copies: Math.max(1, parseInt(e.target.value || '1', 10)),
                    })
                  }
                  className="w-full text-center bg-transparent text-sm font-bold text-white font-mono focus:outline-hidden"
                />
                <button
                  type="button"
                  onClick={() =>
                    onChangePrintSettings({
                      ...printSettings,
                      copies: Math.min(99, printSettings.copies + 1),
                    })
                  }
                  className="w-9 h-8 flex items-center justify-center text-slate-300 hover:bg-slate-800 hover:text-white cursor-pointer"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>

            {/* Densité thermique */}
            <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
              <label className="text-xs font-semibold text-slate-300 block mb-2">
                Densité d'impression
              </label>
              <div className="grid grid-cols-3 gap-1 bg-slate-900 p-1 rounded-lg border border-slate-700 text-xs">
                {[1, 2, 3].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() =>
                      onChangePrintSettings({
                        ...printSettings,
                        density: d as any,
                      })
                    }
                    className={`py-1 rounded font-medium transition-all cursor-pointer ${
                      printSettings.density === d
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {d === 1 ? 'Clair' : d === 2 ? 'Normal' : 'Foncé'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* État de connexion selon le canal choisi */}
          {printChannel === 'docker' ? (
            <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/60 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-3 h-3 rounded-full shrink-0 ${
                    serverStatus?.connected ? 'bg-emerald-500 shadow-md shadow-emerald-500/50' : 'bg-rose-500'
                  }`}
                />
                <div>
                  <div className="text-xs font-semibold text-white">
                    {serverStatus?.connected
                      ? `Connecté sur Serveur : ${serverStatus.name}`
                      : 'Serveur Docker : Déconnecté'}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {serverStatus?.connected
                      ? `Adresse : ${serverStatus.address}`
                      : 'Aucune imprimante connectée au serveur'}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={onOpenServerBluetooth}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Server size={13} /> Gérer BLE
              </button>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/60 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-3 h-3 rounded-full shrink-0 ${
                    webBleStatus === 'connected' ? 'bg-emerald-500 shadow-md shadow-emerald-500/50' : 'bg-amber-500'
                  }`}
                />
                <div>
                  <div className="text-xs font-semibold text-white">
                    {webBleStatus === 'connected'
                      ? `Connecté en direct : ${printerManager.getDeviceInfo()?.name || 'Pristar P15'}`
                      : 'Non connecté en direct (cliquez pour appairer)'}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Connexion Bluetooth directe entre ce téléphone/ordinateur et la P15
                  </div>
                </div>
              </div>

              {webBleStatus !== 'connected' && (
                <button
                  type="button"
                  onClick={() => printerManager.connect(false)}
                  className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Bluetooth size={13} /> Appairer
                </button>
              )}
            </div>
          )}




        </div>

        {/* Pied de la modale */}
        <div className="px-5 py-3.5 border-t border-slate-800 bg-slate-950/60 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isPrinting}
            className="px-4 py-2 rounded-lg text-xs font-medium text-slate-300 hover:bg-slate-800 transition-all cursor-pointer"
          >
            Fermer
          </button>
          <button
            type="button"
            onClick={handleLaunch}
            disabled={isPrinting || isGeneratingPreview || !processedBitmap}
            className="flex items-center gap-2 px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-xs shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
          >
            {isPrinting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Impression en cours...</span>
              </>
            ) : (
              <>
                <Printer size={15} />
                <span>
                  {printChannel === 'docker'
                    ? (serverStatus?.connected ? 'Imprimer via Docker' : 'Connecter & Imprimer')
                    : (webBleStatus === 'connected' ? 'Imprimer en direct Web BLE' : 'Connecter & Imprimer')}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};