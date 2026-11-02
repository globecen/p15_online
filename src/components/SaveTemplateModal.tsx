import React, { useState } from 'react';
import { X, Save, BookmarkPlus, Sparkles } from 'lucide-react';
import { LabelDimensions, LabelElement } from '../types/label';
import { renderLabelToFullCanvas } from '../utils/canvas-renderer';
import { api } from '../api/client';

interface SaveTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  dimensions: LabelDimensions;
  elements: LabelElement[];
  onTemplateSaved: (newTemplate: any) => void;
}

export const SaveTemplateModal: React.FC<SaveTemplateModalProps> = ({
  isOpen,
  onClose,
  dimensions,
  elements,
  onTemplateSaved,
}) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Personnel');
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const categories = [
    'Personnel',
    'Câbles',
    'Maison & Cuisine',
    'Atelier & Rangement',
    'Boutique & Prix',
    'Bureau',
  ];

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Veuillez entrer un nom pour ce modèle.');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      // Générer l'image miniature en base64
      const fullCanvas = await renderLabelToFullCanvas(elements, dimensions);
      const previewDataUrl = fullCanvas.toDataURL('image/png');

      const saved = await api.createTemplate({
        name: name.trim(),
        category,
        description: description.trim(),
        dimensions,
        elements,
        preview: previewDataUrl,
      });

      setIsSaving(false);
      onTemplateSaved(saved);
      onClose();
    } catch (err: any) {
      setIsSaving(false);
      setError(err.message || 'Erreur lors de la sauvegarde du modèle.');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
        {/* En-tête */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-600/20 text-indigo-400">
              <BookmarkPlus size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Sauvegarder comme Modèle</h2>
              <p className="text-xs text-slate-400">
                Enregistrez votre design personnalisé pour le réutiliser
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

        {/* Formulaire */}
        <form onSubmit={handleSave} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
              {error}
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              Nom de votre modèle *
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Câble Chargeur MacBook, Pot Épice Thym..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-white focus:outline-hidden focus:border-indigo-500 transition-all"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              Catégorie
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-white focus:outline-hidden focus:border-indigo-500"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              Description / Notes (Optionnel)
            </label>
            <textarea
              rows={2}
              placeholder="Détails d'utilisation, dimensions recommandées..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-white focus:outline-hidden focus:border-indigo-500 transition-all"
            />
          </div>

          <div className="p-3 bg-slate-800/40 rounded-lg border border-slate-700/50 text-xs text-slate-400">
            Dimensions actuelles : <strong className="text-slate-200">{dimensions.widthMm} × {dimensions.heightMm} mm</strong> ({elements.length} élément(s)).
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white transition-all"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md shadow-indigo-600/30 transition-all flex items-center gap-1.5"
            >
              <Save size={14} />
              {isSaving ? 'Enregistrement...' : 'Enregistrer le Modèle'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
