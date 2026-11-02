import React from 'react';
import {
  LabelDimensions,
  LabelElement,
  PRESET_LABEL_SIZES,
  PrintSettings,
  PX_PER_MM,
} from '../types/label';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Italic,
  Underline,
  Copy,
  Trash2,
  Layers,
  Sliders,
  Maximize2,
  X,
} from 'lucide-react';

interface PropertyInspectorProps {
  dimensions: LabelDimensions;
  onChangeDimensions: (dim: LabelDimensions) => void;
  selectedElement: LabelElement | null;
  onUpdateElement: (updated: LabelElement) => void;
  onDeleteElement: () => void;
  onDuplicateElement: () => void;
  onBringToFront: () => void;
  onSendToBack: () => void;
  printSettings: PrintSettings;
  onChangePrintSettings: (settings: PrintSettings) => void;
  onClearCanvas: () => void;
  onCloseMobile?: () => void;
}

export const PropertyInspector: React.FC<PropertyInspectorProps> = ({
  dimensions,
  onChangeDimensions,
  selectedElement,
  onUpdateElement,
  onDeleteElement,
  onDuplicateElement,
  onBringToFront,
  onSendToBack,
  printSettings,
  onChangePrintSettings,
  onClearCanvas,
  onCloseMobile,
}) => {
  const widthPx = Math.round(dimensions.widthMm * PX_PER_MM);
  const heightPx = Math.round(dimensions.heightMm * PX_PER_MM);

  const centerHorizontal = () => {
    if (!selectedElement) return;
    onUpdateElement({
      ...selectedElement,
      x: Math.round((widthPx - selectedElement.width) / 2),
    });
  };

  const centerVertical = () => {
    if (!selectedElement) return;
    onUpdateElement({
      ...selectedElement,
      y: Math.round((heightPx - selectedElement.height) / 2),
    });
  };

  return (
    <aside className="w-full md:w-80 bg-slate-900 border-l border-slate-800 flex flex-col h-full z-10 select-none overflow-y-auto">
      {/* Bouton fermeture sur mobile */}
      {onCloseMobile && (
        <div className="md:hidden p-3 border-b border-slate-800 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-300">
            {selectedElement ? `Propriétés : ${selectedElement.type.toUpperCase()}` : 'Format & Réglages'}
          </span>
          <button
            onClick={onCloseMobile}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>
      )}

      {selectedElement ? (
        // Propriétés de l'élément sélectionné
        <div className="p-4 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
              Propriétés • {selectedElement.type.toUpperCase()}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={onDuplicateElement}
                title="Dupliquer (Ctrl+D)"
                className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-all"
              >
                <Copy size={15} />
              </button>
              <button
                onClick={onDeleteElement}
                title="Supprimer (Suppr)"
                className="p-1.5 rounded hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-all"
              >
                <Trash2 size={15} />
              </button>
            </div>
          </div>

          {/* Éditeur de Texte */}
          {selectedElement.type === 'text' && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 mb-1 block">
                  Contenu du texte
                </label>
                <textarea
                  value={selectedElement.text}
                  onChange={(e) => onUpdateElement({ ...selectedElement, text: e.target.value })}
                  rows={2}
                  className="w-full px-2.5 py-1.5 rounded-md bg-slate-800 border border-slate-700 text-sm text-white focus:outline-hidden focus:border-indigo-500 transition-all"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 mb-1 block">
                  Police de caractères
                </label>
                <select
                  value={selectedElement.fontFamily}
                  onChange={(e) => onUpdateElement({ ...selectedElement, fontFamily: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded-md bg-slate-800 border border-slate-700 text-sm text-white focus:outline-hidden focus:border-indigo-500"
                >
                  <option value="Inter">Inter (Sans-serif moderne)</option>
                  <option value="Montserrat">Montserrat (Impact & Titre)</option>
                  <option value="JetBrains Mono">JetBrains Mono (Monospace / Code)</option>
                  <option value="Oswald">Oswald (Condensé & Étroit)</option>
                  <option value="Playfair Display">Playfair (Sérif Élégant)</option>
                  <option value="Caveat">Caveat (Écriture manuscrite)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-300 mb-1 block">
                    Taille (px)
                  </label>
                  <input
                    type="number"
                    min={8}
                    max={64}
                    value={selectedElement.fontSize}
                    onChange={(e) =>
                      onUpdateElement({
                        ...selectedElement,
                        fontSize: parseInt(e.target.value || '12', 10),
                        height: Math.round(parseInt(e.target.value || '12', 10) * 1.3),
                      })
                    }
                    className="w-full px-2.5 py-1.5 rounded-md bg-slate-800 border border-slate-700 text-sm text-white focus:outline-hidden focus:border-indigo-500 font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 mb-1 block">
                    Style
                  </label>
                  <div className="flex rounded-md border border-slate-700 bg-slate-800 overflow-hidden">
                    <button
                      onClick={() =>
                        onUpdateElement({
                          ...selectedElement,
                          fontWeight: selectedElement.fontWeight === 'bold' ? 'normal' : 'bold',
                        })
                      }
                      className={`flex-1 py-1.5 flex items-center justify-center ${
                        selectedElement.fontWeight === 'bold' ? 'bg-indigo-600 text-white' : 'text-slate-400'
                      }`}
                    >
                      <Bold size={14} />
                    </button>
                    <button
                      onClick={() =>
                        onUpdateElement({
                          ...selectedElement,
                          fontStyle: selectedElement.fontStyle === 'italic' ? 'normal' : 'italic',
                        })
                      }
                      className={`flex-1 py-1.5 flex items-center justify-center border-l border-slate-700 ${
                        selectedElement.fontStyle === 'italic' ? 'bg-indigo-600 text-white' : 'text-slate-400'
                      }`}
                    >
                      <Italic size={14} />
                    </button>
                    <button
                      onClick={() =>
                        onUpdateElement({
                          ...selectedElement,
                          underline: !selectedElement.underline,
                        })
                      }
                      className={`flex-1 py-1.5 flex items-center justify-center border-l border-slate-700 ${
                        selectedElement.underline ? 'bg-indigo-600 text-white' : 'text-slate-400'
                      }`}
                    >
                      <Underline size={14} />
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 mb-1 block">
                  Alignement
                </label>
                <div className="flex rounded-md border border-slate-700 bg-slate-800 overflow-hidden">
                  {(['left', 'center', 'right'] as const).map((align) => {
                    const Icon = align === 'left' ? AlignLeft : align === 'center' ? AlignCenter : AlignRight;
                    return (
                      <button
                        key={align}
                        onClick={() => onUpdateElement({ ...selectedElement, align })}
                        className={`flex-1 py-1.5 flex items-center justify-center ${
                          selectedElement.align === align ? 'bg-indigo-600 text-white' : 'text-slate-400'
                        }`}
                      >
                        <Icon size={14} />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Éditeur de Code-Barres */}
          {selectedElement.type === 'barcode' && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 mb-1 block">
                  Format de code
                </label>
                <select
                  value={selectedElement.format}
                  onChange={(e) =>
                    onUpdateElement({
                      ...selectedElement,
                      format: e.target.value as any,
                    })
                  }
                  className="w-full px-2.5 py-1.5 rounded-md bg-slate-800 border border-slate-700 text-sm text-white focus:outline-hidden focus:border-indigo-500"
                >
                  <option value="CODE128">Code 128 (Universel chiffres et lettres)</option>
                  <option value="EAN13">EAN-13 (Standard articles 13 chiffres)</option>
                  <option value="EAN8">EAN-8 (Format court 8 chiffres)</option>
                  <option value="CODE39">Code 39 (Alphanumérique majuscules)</option>
                  <option value="ITF">ITF-14 (Cartons & Stock)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 mb-1 block">
                  Valeur / Données du code
                </label>
                <input
                  type="text"
                  value={selectedElement.content}
                  onChange={(e) => onUpdateElement({ ...selectedElement, content: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded-md bg-slate-800 border border-slate-700 text-sm text-white font-mono focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="showBarcodeText"
                  checked={selectedElement.displayValue}
                  onChange={(e) =>
                    onUpdateElement({ ...selectedElement, displayValue: e.target.checked })
                  }
                  className="rounded bg-slate-800 border-slate-700 text-indigo-600 focus:ring-0"
                />
                <label htmlFor="showBarcodeText" className="text-xs text-slate-300">
                  Afficher les chiffres en dessous
                </label>
              </div>
            </div>
          )}

          {/* Éditeur de QR Code */}
          {selectedElement.type === 'qrcode' && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 mb-1 block">
                  Contenu du QR Code (URL ou texte)
                </label>
                <textarea
                  value={selectedElement.content}
                  onChange={(e) => onUpdateElement({ ...selectedElement, content: e.target.value })}
                  rows={3}
                  className="w-full px-2.5 py-1.5 rounded-md bg-slate-800 border border-slate-700 text-sm text-white font-mono focus:outline-hidden focus:border-indigo-500"
                />
              </div>
            </div>
          )}

          {/* Éditeur d'Image */}
          {selectedElement.type === 'image' && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 mb-1 block">
                  Méthode de rendu thermique
                </label>
                <div className="flex rounded-md border border-slate-700 bg-slate-800 overflow-hidden text-xs">
                  <button
                    onClick={() =>
                      onUpdateElement({ ...selectedElement, ditherMode: 'floyd-steinberg' })
                    }
                    className={`flex-1 py-1.5 text-center ${
                      selectedElement.ditherMode === 'floyd-steinberg'
                        ? 'bg-indigo-600 text-white font-semibold'
                        : 'text-slate-400'
                    }`}
                  >
                    Tramage (Photos)
                  </button>
                  <button
                    onClick={() => onUpdateElement({ ...selectedElement, ditherMode: 'threshold' })}
                    className={`flex-1 py-1.5 text-center border-l border-slate-700 ${
                      selectedElement.ditherMode === 'threshold'
                        ? 'bg-indigo-600 text-white font-semibold'
                        : 'text-slate-400'
                    }`}
                  >
                    Seuil Net (Logos)
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Position & Alignement général */}
          <div className="space-y-3 pt-3 border-t border-slate-800">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
              Position & Alignement
            </label>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={centerHorizontal}
                className="py-1.5 px-2 bg-slate-800 hover:bg-slate-700 rounded text-xs text-slate-300 flex items-center justify-center gap-1.5 border border-slate-700/60"
              >
                <AlignCenter size={13} /> Centrer Horiz.
              </button>
              <button
                onClick={centerVertical}
                className="py-1.5 px-2 bg-slate-800 hover:bg-slate-700 rounded text-xs text-slate-300 flex items-center justify-center gap-1.5 border border-slate-700/60"
              >
                <Maximize2 size={13} /> Centrer Vert.
              </button>
            </div>

            {/* Ordre des calques */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={onBringToFront}
                className="py-1.5 px-2 bg-slate-800 hover:bg-slate-700 rounded text-xs text-slate-300 flex items-center justify-center gap-1.5 border border-slate-700/60"
              >
                <Layers size={13} /> Premier plan
              </button>
              <button
                onClick={onSendToBack}
                className="py-1.5 px-2 bg-slate-800 hover:bg-slate-700 rounded text-xs text-slate-300 flex items-center justify-center gap-1.5 border border-slate-700/60"
              >
                <Layers size={13} /> Arrière plan
              </button>
            </div>
          </div>
        </div>
      ) : (
        // Configuration générale de l'étiquette & de l'imprimante
        <div className="p-4 space-y-6">
          <div className="pb-3 border-b border-slate-800">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Sliders size={14} className="text-indigo-400" />
              Format du Ruban & Étiquette
            </span>
          </div>

          {/* Sélecteur de format prédéfini */}
          <div className="space-y-3">
            <label className="text-xs font-semibold text-slate-300 block">
              Dimensions du rouleau (P15)
            </label>
            <div className="space-y-1.5">
              {PRESET_LABEL_SIZES.map((preset) => {
                const isSelected =
                  dimensions.widthMm === preset.widthMm &&
                  dimensions.heightMm === preset.heightMm;
                return (
                  <button
                    key={`${preset.widthMm}-${preset.heightMm}`}
                    onClick={() => {
                      onChangeDimensions(preset);
                      onCloseMobile?.();
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium border transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                        : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span>{preset.name}</span>
                    <span className="font-mono text-slate-400">
                      {preset.widthMm * PX_PER_MM}×{preset.heightMm * PX_PER_MM} px
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Paramètres d'impression */}
          <div className="space-y-3 pt-3 border-t border-slate-800">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
              Paramètres d'Impression
            </span>

            {/* Densité thermique */}
            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1">
                <span>Densité thermique</span>
                <span className="font-semibold text-indigo-400">
                  {printSettings.density === 1
                    ? '1 - Léger'
                    : printSettings.density === 2
                    ? '2 - Normal'
                    : '3 - Foncé'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1 bg-slate-800 p-1 rounded-md border border-slate-700 text-xs text-center">
                {[1, 2, 3].map((val) => (
                  <button
                    key={val}
                    onClick={() =>
                      onChangePrintSettings({
                        ...printSettings,
                        density: val as 1 | 2 | 3,
                      })
                    }
                    className={`py-1 rounded font-medium transition-all ${
                      printSettings.density === val
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {val === 1 ? 'Clair' : val === 2 ? 'Normal' : 'Foncé'}
                  </button>
                ))}
              </div>
            </div>

            {/* Type de papier */}
            <div>
              <label className="text-xs font-semibold text-slate-300 mb-1 block">
                Type de ruban installé
              </label>
              <div className="grid grid-cols-2 gap-1 bg-slate-800 p-1 rounded-md border border-slate-700 text-xs text-center">
                <button
                  onClick={() =>
                    onChangePrintSettings({ ...printSettings, paperType: 'gap' })
                  }
                  className={`py-1.5 rounded font-medium transition-all ${
                    printSettings.paperType === 'gap'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Avec découpe (Gap)
                </button>
                <button
                  onClick={() =>
                    onChangePrintSettings({ ...printSettings, paperType: 'continuous' })
                  }
                  className={`py-1.5 rounded font-medium transition-all ${
                    printSettings.paperType === 'continuous'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Rouleau continu
                </button>
              </div>
            </div>
          </div>

          {/* Nettoyer le canevas */}
          <div className="pt-3 border-t border-slate-800">
            <button
              onClick={() => {
                onClearCanvas();
                onCloseMobile?.();
              }}
              className="w-full py-2 px-3 rounded-lg border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 text-xs font-medium transition-all"
            >
              Effacer toute l'étiquette
            </button>
          </div>
        </div>
      )}
    </aside>
  );
};
