import React, { useState, useEffect } from 'react';
import { X, Sparkles, Check, Trash2, Bookmark } from 'lucide-react';
import { TEMPLATE_PRESETS } from '../data/presets';
import { TemplatePreset } from '../types/label';
import { api } from '../api/client';

interface PresetTemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPreset: (preset: TemplatePreset) => void;
}

export const PresetTemplatesModal: React.FC<PresetTemplatesModalProps> = ({
  isOpen,
  onClose,
  onSelectPreset,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('Tous');
  const [customTemplates, setCustomTemplates] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Charger les modèles depuis le serveur
  const fetchCustomTemplates = async () => {
    try {
      setIsLoading(true);
      const data = await api.getTemplates();
      setCustomTemplates(data);
      setIsLoading(false);
    } catch {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchCustomTemplates();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Supprimer un modèle personnalisé
  const handleDeleteTemplate = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Voulez-vous vraiment supprimer ce modèle personnalisé ?')) {
      try {
        await api.deleteTemplate(id);
        fetchCustomTemplates();
      } catch (err: any) {
        alert(err.message || 'Erreur lors de la suppression.');
      }
    }
  };

  const categories = [
    'Tous',
    'Mes Modèles',
    'Câbles',
    'Maison & Cuisine',
    'Atelier & Rangement',
    'Boutique & Prix',
    'Bureau',
  ];

  // Fusionner les modèles système et personnalisés
  const allTemplates: (TemplatePreset & { isCustom?: boolean; previewUrl?: string })[] = [
    ...customTemplates.map((ct) => ({
      id: ct.id,
      title: ct.name,
      category: ct.category as any,
      description: ct.description || 'Modèle personnalisé créé par vous',
      dimensions: ct.dimensions,
      elements: ct.elements,
      isCustom: true,
      previewUrl: ct.preview,
    })),
    ...TEMPLATE_PRESETS.map((p) => ({ ...p, isCustom: false })),
  ];

  const filtered =
    selectedCategory === 'Tous'
      ? allTemplates
      : selectedCategory === 'Mes Modèles'
      ? allTemplates.filter((t) => t.isCustom)
      : allTemplates.filter((t) => t.category === selectedCategory);

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        {/* En-tête */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-600/20 text-indigo-400">
              <Sparkles size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Galerie des Modèles d'Étiquettes</h2>
              <p className="text-xs text-slate-400">
                Vos créations personnalisées et modèles prédéfinis pour Pristar P15
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
          >
            <X size={18} />
          </button>
        </div>

        {/* Filtres par catégorie */}
        <div className="px-6 py-2.5 border-b border-slate-800 flex items-center gap-2 overflow-x-auto bg-slate-950/40">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${
                selectedCategory === cat
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {cat === 'Mes Modèles' && <Bookmark size={13} />}
              {cat}
            </button>
          ))}
        </div>

        {/* Grille des modèles */}
        <div className="p-6 overflow-y-auto grid grid-cols-2 md:grid-cols-3 gap-4 flex-1">
          {filtered.map((preset) => (
            <div
              key={preset.id}
              className="group p-4 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-700/60 hover:border-indigo-500/50 transition-all flex flex-col justify-between relative"
            >
              <div>
                <div className="flex items-start justify-between mb-2">
                  <span
                    className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                      preset.isCustom
                        ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                        : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                    }`}
                  >
                    {preset.isCustom ? '★ Mon Modèle' : preset.category}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {preset.dimensions.widthMm} × {preset.dimensions.heightMm} mm
                  </span>
                </div>

                {/* Prévisualisation miniature si disponible */}
                {preset.previewUrl && (
                  <div className="my-2 p-1 bg-white rounded border border-slate-700 flex items-center justify-center max-h-16 overflow-hidden">
                    <img
                      src={preset.previewUrl}
                      alt={preset.title}
                      className="max-h-14 object-contain"
                    />
                  </div>
                )}

                <h3 className="font-bold text-sm text-white group-hover:text-indigo-300 transition-colors">
                  {preset.title}
                </h3>
                <p className="text-xs text-slate-400 mt-1 mb-3 line-clamp-2">
                  {preset.description}
                </p>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-slate-700/50">
                <button
                  onClick={() => {
                    onSelectPreset(preset);
                    onClose();
                  }}
                  className="flex-1 py-1.5 px-3 rounded-lg bg-indigo-600/80 hover:bg-indigo-600 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-sm"
                >
                  <Check size={14} /> Charger
                </button>
                {preset.isCustom && (
                  <button
                    onClick={(e) => handleDeleteTemplate(preset.id, e)}
                    title="Supprimer ce modèle"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/20 transition-all"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="col-span-3 py-12 text-center text-slate-500 text-xs">
              Aucun modèle dans cette catégorie. Vous pouvez enregistrer le vôtre à tout moment avec le bouton « Sauvegarder comme Modèle » !
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
