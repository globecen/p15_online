import React, { useState, useEffect } from 'react';
import {
  Printer,
  RotateCcw,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Battery,
  HelpCircle,
  Server,
  Sparkles,
  Save,
  LogOut,
  User,
  Menu,
  X,
  Bluetooth,
} from 'lucide-react';
import { ServerPrinterStatus } from '../api/client';
import { printerManager } from '../printer/web-bluetooth';

interface HeaderProps {
  serverStatus: ServerPrinterStatus | null;
  onOpenServerBluetooth: () => void;
  onOpenPrintModal: () => void;
  onOpenHelp: () => void;
  onOpenTemplates: () => void;
  onOpenSaveTemplate: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  copiesCount: number;
  username: string;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  serverStatus,
  onOpenServerBluetooth,
  onOpenPrintModal,
  onOpenHelp,
  onOpenTemplates,
  onOpenSaveTemplate,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  zoom,
  onZoomChange,
  copiesCount,
  username,
  onLogout,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [webBleConnected, setWebBleConnected] = useState(printerManager.isConnected());

  useEffect(() => {
    printerManager.onStateChange = (st) => {
      setWebBleConnected(st === 'connected');
    };
  }, []);

  const isConnected = webBleConnected || serverStatus?.connected;
  const battery = serverStatus?.batteryLevel;

  return (
    <header className="h-14 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-3 sm:px-4 flex items-center justify-between z-30 select-none relative">
      {/* Marque & Titre */}
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white shadow-md shadow-indigo-600/30 shrink-0">
          <Printer size={18} />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="font-bold text-xs sm:text-sm tracking-tight text-white whitespace-nowrap">
              Pristar P15
            </h1>
            <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded-sm bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 hidden sm:inline">
              Docker
            </span>
          </div>
          <p className="text-[10px] text-slate-400 hidden sm:block">
            Impression Bluetooth BLE
          </p>
        </div>
      </div>

      {/* Barre d'outils centrale sur Desktop (cachée sur mobile) */}
      <div className="hidden md:flex items-center gap-1 bg-slate-950/60 p-1 rounded-lg border border-slate-800">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          title="Annuler (Ctrl+Z)"
          className="p-1.5 rounded-md hover:bg-slate-800 text-slate-300 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
        >
          <RotateCcw size={15} />
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          title="Rétablir (Ctrl+Y)"
          className="p-1.5 rounded-md hover:bg-slate-800 text-slate-300 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
        >
          <RotateCw size={15} />
        </button>

        <div className="h-4 w-px bg-slate-800 mx-1" />

        <button
          onClick={() => onZoomChange(Math.max(0.5, zoom - 0.2))}
          title="Dézoomer"
          className="p-1.5 rounded-md hover:bg-slate-800 text-slate-300 transition-all"
        >
          <ZoomOut size={15} />
        </button>
        <button
          onClick={() => onZoomChange(1.0)}
          className="px-2 py-0.5 text-xs font-mono text-slate-300 hover:text-white"
          title="Réinitialiser zoom à 100%"
        >
          {Math.round(zoom * 100)}%
        </button>
        <button
          onClick={() => onZoomChange(Math.min(3.0, zoom + 0.2))}
          title="Zoomer"
          className="p-1.5 rounded-md hover:bg-slate-800 text-slate-300 transition-all"
        >
          <ZoomIn size={15} />
        </button>

        <div className="h-4 w-px bg-slate-800 mx-1" />

        <button
          onClick={onOpenSaveTemplate}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-amber-300 hover:text-amber-200 hover:bg-amber-500/10 rounded-md transition-all border border-amber-500/20"
        >
          <Save size={13} />
          Sauvegarder Modèle
        </button>

        <button
          onClick={onOpenTemplates}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-indigo-300 hover:text-white hover:bg-indigo-600/20 rounded-md transition-all"
        >
          <Sparkles size={13} />
          Galerie Modèles
        </button>
      </div>

      {/* Actions de droite */}
      <div className="flex items-center gap-2">
        {/* Widget Bluetooth Direct / Docker */}
        <button
          onClick={onOpenServerBluetooth}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
            isConnected
              ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
              : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
          }`}
          title="Gérer la connexion Bluetooth Pristar P15"
        >
          <Bluetooth size={14} className={isConnected ? 'text-emerald-400' : 'text-slate-400'} />
          <span className="font-semibold text-[11px] sm:text-xs">
            {isConnected ? 'P15 Connectée' : 'Connecter P15'}
          </span>
          {isConnected && battery !== undefined && battery !== null && (
            <span className="hidden sm:flex items-center gap-0.5 font-mono text-emerald-300 text-[10px]">
              <Battery size={11} /> {battery}%
            </span>
          )}
        </button>

        {/* Bouton d'Impression Principal */}
        <button
          onClick={onOpenPrintModal}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md shadow-indigo-600/30 transition-all shrink-0 cursor-pointer"
        >
          <Printer size={15} />
          <span>Imprimer</span>
        </button>

        {/* Profil & Déconnexion Desktop */}
        <div className="hidden md:flex items-center gap-1 pl-2 border-l border-slate-800">
          <div className="flex items-center gap-1 text-xs text-slate-300 px-2 py-1 rounded bg-slate-800/50">
            <User size={12} className="text-indigo-400" />
            <span className="font-medium text-[11px]">{username}</span>
          </div>
          <button
            onClick={onLogout}
            title="Déconnexion"
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
          >
            <LogOut size={15} />
          </button>
        </div>

        {/* Menu Hamburger pour mobile */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
        >
          {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {/* Menu déroulant Mobile */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-14 left-0 right-0 bg-slate-900 border-b border-slate-800 p-4 space-y-3 shadow-2xl z-40">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs text-slate-300">
            <span className="flex items-center gap-1.5">
              <User size={13} className="text-indigo-400" />
              Connecté : <strong className="text-white">{username}</strong>
            </span>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onLogout();
              }}
              className="text-rose-400 hover:underline flex items-center gap-1 text-xs"
            >
              <LogOut size={13} /> Déconnexion
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onUndo();
              }}
              disabled={!canUndo}
              className="p-2 rounded-lg bg-slate-800 text-xs text-slate-300 flex items-center justify-center gap-1.5 disabled:opacity-40"
            >
              <RotateCcw size={14} /> Annuler
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onRedo();
              }}
              disabled={!canRedo}
              className="p-2 rounded-lg bg-slate-800 text-xs text-slate-300 flex items-center justify-center gap-1.5 disabled:opacity-40"
            >
              <RotateCw size={14} /> Rétablir
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenSaveTemplate();
              }}
              className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-medium flex items-center justify-center gap-1.5"
            >
              <Save size={14} /> Sauvegarder Modèle
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenTemplates();
              }}
              className="p-2 rounded-lg bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 text-xs font-medium flex items-center justify-center gap-1.5"
            >
              <Sparkles size={14} /> Galerie Modèles
            </button>
          </div>

          <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-xs">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenHelp();
              }}
              className="text-slate-400 hover:text-white flex items-center gap-1"
            >
              <HelpCircle size={14} /> Aide & Guide
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onZoomChange(Math.max(0.6, zoom - 0.2))}
                className="w-7 h-7 bg-slate-800 rounded flex items-center justify-center text-slate-300"
              >
                -
              </button>
              <span className="font-mono text-xs">{Math.round(zoom * 100)}%</span>
              <button
                onClick={() => onZoomChange(Math.min(2.5, zoom + 0.2))}
                className="w-7 h-7 bg-slate-800 rounded flex items-center justify-center text-slate-300"
              >
                +
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
