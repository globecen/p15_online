import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { SidebarToolbox } from './components/SidebarToolbox';
import { CanvasEditor } from './components/CanvasEditor';
import { PropertyInspector } from './components/PropertyInspector';
import { PrintModal } from './components/PrintModal';
import { PresetTemplatesModal } from './components/PresetTemplatesModal';
import { SaveTemplateModal } from './components/SaveTemplateModal';
import { ServerBluetoothModal } from './components/ServerBluetoothModal';
import { BluetoothHelpModal } from './components/BluetoothHelpModal';
import { LoginModal } from './components/LoginModal';
import {
  LabelDimensions,
  LabelElement,
  PRESET_LABEL_SIZES,
  PrintSettings,
  TemplatePreset,
} from './types/label';
import { TEMPLATE_PRESETS } from './data/presets';
import { api, ServerPrinterStatus } from './api/client';
import { PlusCircle, Sliders, Sparkles, Printer } from 'lucide-react';

export default function App() {
  // État d'authentification
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(api.isAuthenticated());
  const [username, setUsername] = useState<string>('admin');

  // Dimensions par défaut (40x12 mm pour Pristar P15)
  const [dimensions, setDimensions] = useState<LabelDimensions>(PRESET_LABEL_SIZES[0]);

  // Éléments du canevas
  const [elements, setElements] = useState<LabelElement[]>(() => {
    try {
      const saved = localStorage.getItem('pristar_p15_elements');
      if (saved) return JSON.parse(saved);
    } catch {}
    return TEMPLATE_PRESETS[0].elements;
  });

  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Volets mobiles (drawer) : 'none' | 'tools' | 'props'
  const [mobileDrawer, setMobileDrawer] = useState<'none' | 'tools' | 'props'>('none');

  // Historique pour Annuler / Rétablir (Undo/Redo)
  const [history, setHistory] = useState<LabelElement[][]>([TEMPLATE_PRESETS[0].elements]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);

  // Paramètres d'impression
  const [printSettings, setPrintSettings] = useState<PrintSettings>({
    copies: 1,
    density: 2, // Normal
    ditherMode: 'floyd-steinberg',
    threshold: 128,
    paperType: 'gap',
  });

  // Zoom de prévisualisation (auto-adaptatif mobile)
  const [zoom, setZoom] = useState<number>(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      return 1.0;
    }
    return 1.4;
  });

  // Statut de l'imprimante sur le serveur Docker
  const [serverStatus, setServerStatus] = useState<ServerPrinterStatus | null>(null);

  // Modales
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isTemplatesModalOpen, setIsTemplatesModalOpen] = useState(false);
  const [isSaveTemplateModalOpen, setIsSaveTemplateModalOpen] = useState(false);
  const [isServerBluetoothOpen, setIsServerBluetoothOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);

  // Vérifier la session existante
  useEffect(() => {
    const checkAuth = async () => {
      if (api.isAuthenticated()) {
        try {
          const me = await api.getMe();
          setUsername(me.username);
          setIsAuthenticated(true);
        } catch {
          setIsAuthenticated(false);
        }
      } else {
        setIsAuthenticated(false);
      }
    };
    checkAuth();

    const handleUnauthorized = () => {
      setIsAuthenticated(false);
    };
    window.addEventListener('pristar:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('pristar:unauthorized', handleUnauthorized);
  }, []);

  // Polling du statut imprimante sur le serveur Docker
  useEffect(() => {
    if (!isAuthenticated) return;

    const pollStatus = async () => {
      try {
        const s = await api.getPrinterStatus();
        setServerStatus(s);
      } catch {}
    };

    pollStatus();
    const interval = setInterval(pollStatus, 5000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  // Sauvegarder dans le localStorage
  useEffect(() => {
    try {
      localStorage.setItem('pristar_p15_elements', JSON.stringify(elements));
    } catch {}
  }, [elements]);

  // Enregistrer l'état dans l'historique
  const pushHistory = useCallback((newElements: LabelElement[]) => {
    setHistory((prev) => {
      const updated = prev.slice(0, historyIndex + 1);
      return [...updated, newElements];
    });
    setHistoryIndex((prev) => prev + 1);
  }, [historyIndex]);

  // Ajouter un élément
  const handleAddElement = (newEl: LabelElement) => {
    const updated = [...elements, newEl];
    setElements(updated);
    setSelectedId(newEl.id);
    pushHistory(updated);
  };

  // Mettre à jour un élément existant
  const handleUpdateElement = (updatedEl: LabelElement) => {
    const updated = elements.map((el) => (el.id === updatedEl.id ? updatedEl : el));
    setElements(updated);
  };

  // Supprimer l'élément sélectionné
  const handleDeleteSelected = () => {
    if (!selectedId) return;
    const updated = elements.filter((el) => el.id !== selectedId);
    setElements(updated);
    setSelectedId(null);
    pushHistory(updated);
  };

  // Dupliquer l'élément sélectionné
  const handleDuplicateSelected = () => {
    const target = elements.find((el) => el.id === selectedId);
    if (!target) return;

    const duplicated: LabelElement = {
      ...target,
      id: `${target.type}-${Date.now()}`,
      x: target.x + 12,
      y: target.y + 12,
    };

    const updated = [...elements, duplicated];
    setElements(updated);
    setSelectedId(duplicated.id);
    pushHistory(updated);
  };

  // Premier plan
  const handleBringToFront = () => {
    if (!selectedId) return;
    const target = elements.find((el) => el.id === selectedId);
    if (!target) return;
    const filtered = elements.filter((el) => el.id !== selectedId);
    const updated = [...filtered, target];
    setElements(updated);
    pushHistory(updated);
  };

  // Arrière plan
  const handleSendToBack = () => {
    if (!selectedId) return;
    const target = elements.find((el) => el.id === selectedId);
    if (!target) return;
    const filtered = elements.filter((el) => el.id !== selectedId);
    const updated = [target, ...filtered];
    setElements(updated);
    pushHistory(updated);
  };

  // Annuler (Undo)
  const handleUndo = () => {
    if (historyIndex > 0) {
      const prevIndex = historyIndex - 1;
      setHistoryIndex(prevIndex);
      setElements(history[prevIndex]);
      setSelectedId(null);
    }
  };

  // Rétablir (Redo)
  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      setHistoryIndex(nextIndex);
      setElements(history[nextIndex]);
      setSelectedId(null);
    }
  };

  // Charger un modèle prédéfini ou personnalisé
  const handleSelectPreset = (preset: TemplatePreset) => {
    setDimensions(preset.dimensions);
    const regenerated = preset.elements.map((el) => ({
      ...el,
      id: `${el.type}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    }));
    setElements(regenerated);
    setSelectedId(null);
    pushHistory(regenerated);
  };

  // Effacer tout
  const handleClearCanvas = () => {
    if (window.confirm('Voulez-vous vraiment effacer tous les éléments de l\'étiquette ?')) {
      setElements([]);
      setSelectedId(null);
      pushHistory([]);
    }
  };

  // Déconnexion
  const handleLogout = () => {
    api.logout();
    setIsAuthenticated(false);
  };

  const selectedElement = elements.find((el) => el.id === selectedId) || null;

  // Si non connecté, afficher l'écran de Login
  if (!isAuthenticated) {
    return (
      <LoginModal
        onLoginSuccess={(u) => {
          setUsername(u);
          setIsAuthenticated(true);
        }}
      />
    );
  }

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-950 text-slate-100">
      {/* Barre supérieure */}
      <Header
        serverStatus={serverStatus}
        onOpenServerBluetooth={() => setIsServerBluetoothOpen(true)}
        onOpenPrintModal={() => setIsPrintModalOpen(true)}
        onOpenHelp={() => setIsHelpModalOpen(true)}
        onOpenTemplates={() => setIsTemplatesModalOpen(true)}
        onOpenSaveTemplate={() => setIsSaveTemplateModalOpen(true)}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        onUndo={handleUndo}
        onRedo={handleRedo}
        zoom={zoom}
        onZoomChange={setZoom}
        copiesCount={printSettings.copies}
        username={username}
        onLogout={handleLogout}
      />

      {/* Zone de travail centrale */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Volet Boîte à outils : Desktop fixe (md:block) ou Drawer mobile */}
        <div
          className={`${
            mobileDrawer === 'tools'
              ? 'fixed inset-y-0 left-0 z-40 w-80 shadow-2xl transition-transform duration-200'
              : 'hidden md:block'
          }`}
        >
          <SidebarToolbox
            dimensions={dimensions}
            onAddElement={handleAddElement}
            onOpenTemplates={() => {
              setMobileDrawer('none');
              setIsTemplatesModalOpen(true);
            }}
            onCloseMobile={() => setMobileDrawer('none')}
          />
        </div>

        {/* Canevas interactif central */}
        <CanvasEditor
          dimensions={dimensions}
          elements={elements}
          selectedId={selectedId}
          onSelect={(id) => {
            setSelectedId(id);
            // Sur mobile, si on sélectionne un élément, on peut ouvrir directement les propriétés
            if (id && window.innerWidth < 768) {
              setMobileDrawer('props');
            }
          }}
          onUpdateElement={handleUpdateElement}
          onDeleteSelected={handleDeleteSelected}
          onDuplicateSelected={handleDuplicateSelected}
          zoom={zoom}
        />

        {/* Volet Propriétés & Format : Desktop fixe (md:block) ou Drawer mobile */}
        <div
          className={`${
            mobileDrawer === 'props'
              ? 'fixed inset-y-0 right-0 z-40 w-80 shadow-2xl transition-transform duration-200'
              : 'hidden md:block'
          }`}
        >
          <PropertyInspector
            dimensions={dimensions}
            onChangeDimensions={setDimensions}
            selectedElement={selectedElement}
            onUpdateElement={handleUpdateElement}
            onDeleteElement={handleDeleteSelected}
            onDuplicateElement={handleDuplicateSelected}
            onBringToFront={handleBringToFront}
            onSendToBack={handleSendToBack}
            printSettings={printSettings}
            onChangePrintSettings={setPrintSettings}
            onClearCanvas={handleClearCanvas}
            onCloseMobile={() => setMobileDrawer('none')}
          />
        </div>

        {/* Backdrop sombre sur mobile quand un tiroir est ouvert */}
        {mobileDrawer !== 'none' && (
          <div
            onClick={() => setMobileDrawer('none')}
            className="md:hidden fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-30"
          />
        )}
      </div>

      {/* Barre de navigation inférieure Mobile (Bottom Navigation Bar) */}
      <div className="md:hidden h-14 bg-slate-900 border-t border-slate-800 flex items-center justify-around px-2 z-20 shrink-0">
        <button
          onClick={() => setMobileDrawer(mobileDrawer === 'tools' ? 'none' : 'tools')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-lg text-xs font-medium transition-all ${
            mobileDrawer === 'tools' ? 'text-indigo-400 font-bold' : 'text-slate-400 hover:text-white'
          }`}
        >
          <PlusCircle size={18} className="mb-0.5" />
          <span className="text-[10px]">Ajouter</span>
        </button>

        <button
          onClick={() => setMobileDrawer(mobileDrawer === 'props' ? 'none' : 'props')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-lg text-xs font-medium transition-all ${
            mobileDrawer === 'props' ? 'text-indigo-400 font-bold' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Sliders size={18} className="mb-0.5" />
          <span className="text-[10px]">Format & Options</span>
        </button>

        <button
          onClick={() => setIsTemplatesModalOpen(true)}
          className="flex flex-col items-center justify-center py-1 px-3 rounded-lg text-xs font-medium text-slate-400 hover:text-white transition-all"
        >
          <Sparkles size={18} className="mb-0.5" />
          <span className="text-[10px]">Modèles</span>
        </button>

        <button
          onClick={() => setIsPrintModalOpen(true)}
          className="flex flex-col items-center justify-center py-1 px-3 rounded-lg text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-all"
        >
          <Printer size={18} className="mb-0.5" />
          <span className="text-[10px]">Imprimer</span>
        </button>
      </div>

      {/* Modale d'impression Docker */}
      <PrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        elements={elements}
        dimensions={dimensions}
        printSettings={printSettings}
        onChangePrintSettings={setPrintSettings}
        serverStatus={serverStatus}
        onOpenServerBluetooth={() => {
          setIsPrintModalOpen(false);
          setIsServerBluetoothOpen(true);
        }}
      />

      {/* Modale des modèles prêts à l'emploi et personnalisés */}
      <PresetTemplatesModal
        isOpen={isTemplatesModalOpen}
        onClose={() => setIsTemplatesModalOpen(false)}
        onSelectPreset={handleSelectPreset}
      />

      {/* Modale d'enregistrement de nouveau modèle personnalisé */}
      <SaveTemplateModal
        isOpen={isSaveTemplateModalOpen}
        onClose={() => setIsSaveTemplateModalOpen(false)}
        dimensions={dimensions}
        elements={elements}
        onTemplateSaved={() => {
          alert('Modèle enregistré avec succès dans votre galerie !');
        }}
      />

      {/* Modale de gestion Bluetooth du serveur Docker */}
      <ServerBluetoothModal
        isOpen={isServerBluetoothOpen}
        onClose={() => setIsServerBluetoothOpen(false)}
        onStatusUpdated={setServerStatus}
      />

      {/* Modale d'aide */}
      <BluetoothHelpModal
        isOpen={isHelpModalOpen}
        onClose={() => setIsHelpModalOpen(false)}
      />
    </div>
  );
}
