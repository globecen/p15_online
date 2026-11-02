import React, { useRef, useState } from 'react';
import {
  Type,
  Smile,
  Barcode,
  QrCode,
  Shapes,
  Image as ImageIcon,
  Calendar,
  Sparkles,
  Search,
  Plus,
  X,
} from 'lucide-react';
import {
  BarcodeFormat,
  LabelDimensions,
  LabelElement,
  PX_PER_MM,
} from '../types/label';
import { LABEL_ICONS } from '../data/icons';
import { EMOJI_CATEGORIES } from '../data/emojis';

interface SidebarToolboxProps {
  dimensions: LabelDimensions;
  onAddElement: (element: LabelElement) => void;
  onOpenTemplates: () => void;
  onCloseMobile?: () => void;
}

export const SidebarToolbox: React.FC<SidebarToolboxProps> = ({
  dimensions,
  onAddElement,
  onOpenTemplates,
  onCloseMobile,
}) => {
  const [activeTab, setActiveTab] = useState<
    'text' | 'emoji' | 'barcode' | 'qr' | 'icons' | 'shapes' | 'image'
  >('text');

  const [emojiSearch, setEmojiSearch] = useState('');
  const [selectedEmojiCategory, setSelectedEmojiCategory] = useState<string>('smileys');
  const [customEmojiInput, setCustomEmojiInput] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const canvasCenter = {
    x: Math.max(10, Math.round((dimensions.widthMm * PX_PER_MM) / 2 - 50)),
    y: Math.max(10, Math.round((dimensions.heightMm * PX_PER_MM) / 2 - 15)),
  };

  // Ajout de texte
  const handleAddText = (
    text: string,
    fontSize: number = 18,
    fontWeight: 'normal' | 'bold' = 'normal',
    fontFamily: string = 'Inter',
  ) => {
    const newEl: LabelElement = {
      id: `text-${Date.now()}`,
      type: 'text',
      text,
      fontFamily,
      fontSize,
      fontWeight,
      fontStyle: 'normal',
      underline: false,
      align: 'left',
      x: canvasCenter.x,
      y: canvasCenter.y,
      width: Math.min(220, Math.round(dimensions.widthMm * PX_PER_MM - 20)),
      height: Math.round(fontSize * 1.4),
      rotation: 0,
    };
    onAddElement(newEl);
    onCloseMobile?.();
  };

  // Ajout d'emoji
  const handleAddEmoji = (emoji: string) => {
    const size = Math.min(48, Math.round(dimensions.heightMm * PX_PER_MM - 12));
    const newEl: LabelElement = {
      id: `emoji-${Date.now()}`,
      type: 'text',
      text: emoji,
      fontFamily: `'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', sans-serif`,
      fontSize: size,
      fontWeight: 'normal',
      fontStyle: 'normal',
      underline: false,
      align: 'center',
      x: canvasCenter.x,
      y: Math.max(4, Math.round(canvasCenter.y - size / 2)),
      width: Math.round(size * 1.3),
      height: Math.round(size * 1.3),
      rotation: 0,
    };
    onAddElement(newEl);
    onCloseMobile?.();
  };

  // Ajout d'emoji libre saisi
  const handleAddCustomEmoji = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customEmojiInput.trim()) return;
    handleAddEmoji(customEmojiInput.trim());
    setCustomEmojiInput('');
  };

  // Ajout de code-barres
  const handleAddBarcode = (format: BarcodeFormat, sampleValue: string) => {
    const newEl: LabelElement = {
      id: `barcode-${Date.now()}`,
      type: 'barcode',
      format,
      content: sampleValue,
      displayValue: true,
      fontSize: 12,
      x: Math.max(8, Math.round(canvasCenter.x - 60)),
      y: Math.max(4, Math.round(canvasCenter.y - 25)),
      width: 160,
      height: Math.min(80, Math.round(dimensions.heightMm * PX_PER_MM - 12)),
      rotation: 0,
    };
    onAddElement(newEl);
    onCloseMobile?.();
  };

  // Ajout de QR code
  const handleAddQr = (content: string) => {
    const size = Math.min(80, Math.round(dimensions.heightMm * PX_PER_MM - 12));
    const newEl: LabelElement = {
      id: `qr-${Date.now()}`,
      type: 'qrcode',
      content,
      errorCorrectionLevel: 'M',
      x: Math.max(8, Math.round(canvasCenter.x - size / 2)),
      y: Math.max(4, Math.round(canvasCenter.y - size / 2)),
      width: size,
      height: size,
      rotation: 0,
    };
    onAddElement(newEl);
    onCloseMobile?.();
  };

  // Ajout d'icône vectorielle
  const handleAddIcon = (iconName: string) => {
    const size = Math.min(48, Math.round(dimensions.heightMm * PX_PER_MM - 16));
    const newEl: LabelElement = {
      id: `icon-${Date.now()}`,
      type: 'icon',
      iconName,
      x: Math.max(8, Math.round(canvasCenter.x - size / 2)),
      y: Math.max(4, Math.round(canvasCenter.y - size / 2)),
      width: size,
      height: size,
      rotation: 0,
    };
    onAddElement(newEl);
    onCloseMobile?.();
  };

  // Ajout de forme
  const handleAddShape = (
    shapeType: 'rect' | 'rounded-rect' | 'circle' | 'line-h' | 'line-v' | 'border-frame',
  ) => {
    let width = 60;
    let height = 40;

    if (shapeType === 'border-frame') {
      width = Math.round(dimensions.widthMm * PX_PER_MM - 8);
      height = Math.round(dimensions.heightMm * PX_PER_MM - 8);
    } else if (shapeType === 'line-h') {
      width = Math.round(dimensions.widthMm * PX_PER_MM - 20);
      height = 2;
    } else if (shapeType === 'line-v') {
      width = 2;
      height = Math.round(dimensions.heightMm * PX_PER_MM - 10);
    }

    const newEl: LabelElement = {
      id: `shape-${Date.now()}`,
      type: 'shape',
      shapeType,
      strokeWidth: 2,
      filled: false,
      x: shapeType === 'border-frame' ? 4 : canvasCenter.x,
      y: shapeType === 'border-frame' ? 4 : canvasCenter.y,
      width,
      height,
      rotation: 0,
    };
    onAddElement(newEl);
    onCloseMobile?.();
  };

  // Import d'image
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const maxHeight = Math.round(dimensions.heightMm * PX_PER_MM - 10);
        const aspect = img.width / img.height;
        const targetHeight = Math.min(maxHeight, img.height);
        const targetWidth = Math.round(targetHeight * aspect);

        const newEl: LabelElement = {
          id: `img-${Date.now()}`,
          type: 'image',
          dataUrl,
          ditherMode: 'floyd-steinberg',
          threshold: 128,
          invert: false,
          brightness: 0,
          contrast: 15,
          x: canvasCenter.x,
          y: Math.max(4, Math.round(canvasCenter.y - targetHeight / 2)),
          width: targetWidth,
          height: targetHeight,
          rotation: 0,
        };
        onAddElement(newEl);
        onCloseMobile?.();
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Filtrage des emojis
  const currentCategory = EMOJI_CATEGORIES.find((c) => c.id === selectedEmojiCategory);
  const filteredEmojis = emojiSearch.trim()
    ? EMOJI_CATEGORIES.flatMap((c) => c.emojis).filter(
        (e) =>
          e.name.toLowerCase().includes(emojiSearch.toLowerCase()) ||
          e.keywords.some((k) => k.toLowerCase().includes(emojiSearch.toLowerCase())),
      )
    : currentCategory?.emojis || [];

  return (
    <aside className="w-full md:w-80 bg-slate-900 border-r border-slate-800 flex flex-col h-full z-10 select-none">
      {/* En-tête sur mobile avec bouton fermer */}
      <div className="p-3 border-b border-slate-800 flex items-center justify-between gap-2">
        <button
          onClick={onOpenTemplates}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-medium text-xs shadow-md shadow-indigo-600/20 active:scale-[0.98] transition-all"
        >
          <Sparkles size={15} />
          Galerie de Modèles
        </button>
        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="md:hidden p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Onglets des outils */}
      <div className="grid grid-cols-7 border-b border-slate-800 p-1 gap-0.5 bg-slate-950/40">
        {[
          { id: 'text', label: 'Texte', icon: Type },
          { id: 'emoji', label: 'Emoji', icon: Smile },
          { id: 'barcode', label: 'Code', icon: Barcode },
          { id: 'qr', label: 'QR', icon: QrCode },
          { id: 'icons', label: 'Icônes', icon: Sparkles },
          { id: 'shapes', label: 'Formes', icon: Shapes },
          { id: 'image', label: 'Image', icon: ImageIcon },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex flex-col items-center justify-center py-2 px-0.5 rounded-md text-xs font-medium transition-all ${
                isActive
                  ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Icon size={15} className="mb-1" />
              <span className="text-[9px]">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Contenu de l'onglet actif */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Onglet Texte */}
        {activeTab === 'text' && (
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Ajouter du Texte
            </h3>

            <button
              onClick={() => handleAddText('TITRE PRINCIPAL', 22, 'bold', 'Montserrat')}
              className="w-full text-left p-3 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 transition-all group"
            >
              <div className="text-base font-bold text-white group-hover:text-indigo-300">
                Grand Titre
              </div>
              <div className="text-xs text-slate-400">Gras • 22 px • Montserrat</div>
            </button>

            <button
              onClick={() => handleAddText('Texte descriptif', 16, 'normal', 'Inter')}
              className="w-full text-left p-3 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 transition-all group"
            >
              <div className="text-sm font-medium text-white group-hover:text-indigo-300">
                Texte Moyen
              </div>
              <div className="text-xs text-slate-400">Normal • 16 px • Inter</div>
            </button>

            <button
              onClick={() => handleAddText('Sous-titre ou détails', 12, 'normal', 'JetBrains Mono')}
              className="w-full text-left p-3 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 transition-all group"
            >
              <div className="text-xs font-mono text-white group-hover:text-indigo-300">
                Petit Texte / Réf.
              </div>
              <div className="text-xs text-slate-400">Monospace • 12 px</div>
            </button>

            <button
              onClick={() => {
                const today = new Date().toLocaleDateString('fr-FR');
                handleAddText(`Date : ${today}`, 13, 'bold', 'JetBrains Mono');
              }}
              className="w-full flex items-center gap-2 p-2.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-xs text-indigo-300 font-medium transition-all"
            >
              <Calendar size={14} />
              Insérer la date du jour ({new Date().toLocaleDateString('fr-FR')})
            </button>
          </div>
        )}

        {/* Onglet Emoji (Complet avec toutes catégories + saisie libre) */}
        {activeTab === 'emoji' && (
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Sélecteur d'Emojis Universel
            </h3>

            {/* Saisie ou collage libre d'emoji (très utile sur mobile avec le clavier tactile) */}
            <form onSubmit={handleAddCustomEmoji} className="flex gap-1.5">
              <input
                type="text"
                placeholder="Collez ou tapez un emoji..."
                value={customEmojiInput}
                onChange={(e) => setCustomEmojiInput(e.target.value)}
                className="flex-1 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-sm text-white focus:outline-hidden focus:border-indigo-500"
              />
              <button
                type="submit"
                disabled={!customEmojiInput.trim()}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow"
              >
                <Plus size={14} /> Ajouter
              </button>
            </form>

            {/* Barre de recherche d'emoji */}
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher par mot-clé (ex: café, pizza, usb, vis, coeur)..."
                value={emojiSearch}
                onChange={(e) => setEmojiSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white focus:outline-hidden focus:border-indigo-500"
              />
            </div>

            {/* Catégories d'emojis */}
            {!emojiSearch && (
              <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
                {EMOJI_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedEmojiCategory(cat.id)}
                    title={cat.name}
                    className={`px-2.5 py-1 rounded-md text-xs whitespace-nowrap transition-all flex items-center gap-1 ${
                      selectedEmojiCategory === cat.id
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>{cat.icon}</span>
                    <span className="text-[10px] hidden sm:inline">{cat.name}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Grille d'emojis cliquables */}
            <div className="grid grid-cols-6 sm:grid-cols-5 gap-1.5 p-1 bg-slate-950/40 rounded-xl border border-slate-800/60 max-h-72 overflow-y-auto">
              {filteredEmojis.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => handleAddEmoji(item.emoji)}
                  title={item.name}
                  className="w-10 h-10 rounded-lg bg-slate-800 hover:bg-indigo-600/30 hover:border-indigo-500/50 border border-slate-700/50 flex items-center justify-center text-xl transition-all active:scale-90"
                >
                  {item.emoji}
                </button>
              ))}
              {filteredEmojis.length === 0 && (
                <div className="col-span-6 py-6 text-center text-xs text-slate-500">
                  Aucun emoji trouvé pour « {emojiSearch} ».
                </div>
              )}
            </div>
          </div>
        )}

        {/* Onglet Code-barres */}
        {activeTab === 'barcode' && (
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Insérer un Code-Barres
            </h3>

            <button
              onClick={() => handleAddBarcode('CODE128', 'ART-2026-X')}
              className="w-full text-left p-3 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 transition-all"
            >
              <div className="font-semibold text-sm text-white">Code 128 (Universel)</div>
              <div className="text-xs text-slate-400 mt-1">Accepte lettres et chiffres (ex: ART-2026)</div>
            </button>

            <button
              onClick={() => handleAddBarcode('EAN13', '3760123456789')}
              className="w-full text-left p-3 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 transition-all"
            >
              <div className="font-semibold text-sm text-white">EAN-13 (Articles / Commerce)</div>
              <div className="text-xs text-slate-400 mt-1">13 chiffres avec clé de contrôle</div>
            </button>

            <button
              onClick={() => handleAddBarcode('EAN8', '96385074')}
              className="w-full text-left p-3 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 transition-all"
            >
              <div className="font-semibold text-sm text-white">EAN-8 (Court)</div>
              <div className="text-xs text-slate-400 mt-1">8 chiffres pour petites étiquettes</div>
            </button>

            <button
              onClick={() => handleAddBarcode('CODE39', 'BOX-01')}
              className="w-full text-left p-3 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 transition-all"
            >
              <div className="font-semibold text-sm text-white">Code 39 (Logistique)</div>
              <div className="text-xs text-slate-400 mt-1">Alphanumérique majuscule</div>
            </button>
          </div>
        )}

        {/* Onglet QR Code */}
        {activeTab === 'qr' && (
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Générer un QR Code
            </h3>

            <button
              onClick={() => handleAddQr('https://')}
              className="w-full text-left p-3 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 transition-all"
            >
              <div className="font-semibold text-sm text-white">Lien Web / URL</div>
              <div className="text-xs text-slate-400 mt-1">Ouvre un site web lors du scan</div>
            </button>

            <button
              onClick={() => handleAddQr('WIFI:S:MonReseau;T:WPA;P:MonMotDePasse;;')}
              className="w-full text-left p-3 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 transition-all"
            >
              <div className="font-semibold text-sm text-white">Connexion WiFi Direct</div>
              <div className="text-xs text-slate-400 mt-1">Se connecte automatiquement au WiFi</div>
            </button>

            <button
              onClick={() => handleAddQr('Texte ou informations')}
              className="w-full text-left p-3 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 transition-all"
            >
              <div className="font-semibold text-sm text-white">Texte brut libre</div>
              <div className="text-xs text-slate-400 mt-1">Numéro, note ou référence longue</div>
            </button>
          </div>
        )}

        {/* Onglet Icônes */}
        {activeTab === 'icons' && (
          <div className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Bibliothèque d'Icônes Thermiques
            </h3>

            <div className="grid grid-cols-4 gap-2">
              {LABEL_ICONS.map((icon) => (
                <button
                  key={icon.id}
                  onClick={() => handleAddIcon(icon.id)}
                  title={icon.name}
                  className="flex flex-col items-center justify-center p-2 rounded-lg bg-slate-800 hover:bg-indigo-600/30 hover:border-indigo-500/50 border border-slate-700/60 transition-all text-slate-200 hover:text-white"
                >
                  <svg
                    viewBox={icon.viewBox}
                    className="w-6 h-6 fill-current mb-1"
                  >
                    {icon.paths.map((p, idx) => (
                      <path key={idx} d={p} />
                    ))}
                  </svg>
                  <span className="text-[9px] truncate w-full text-center text-slate-400">
                    {icon.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Onglet Formes */}
        {activeTab === 'shapes' && (
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Lignes & Cadres
            </h3>

            <button
              onClick={() => handleAddShape('border-frame')}
              className="w-full text-left p-3 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 transition-all"
            >
              <div className="font-semibold text-sm text-white">Cadre Décoratif</div>
              <div className="text-xs text-slate-400 mt-1">Entoure toute l'étiquette avec élégance</div>
            </button>

            <button
              onClick={() => handleAddShape('line-h')}
              className="w-full text-left p-3 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 transition-all"
            >
              <div className="font-semibold text-sm text-white">Ligne Horizontale</div>
              <div className="text-xs text-slate-400 mt-1">Pour séparer deux zones de texte</div>
            </button>

            <button
              onClick={() => handleAddShape('line-v')}
              className="w-full text-left p-3 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 transition-all"
            >
              <div className="font-semibold text-sm text-white">Ligne Verticale</div>
              <div className="text-xs text-slate-400 mt-1">Séparation texte / icône / code</div>
            </button>

            <button
              onClick={() => handleAddShape('rounded-rect')}
              className="w-full text-left p-3 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 transition-all"
            >
              <div className="font-semibold text-sm text-white">Rectangle Arrondi</div>
              <div className="text-xs text-slate-400 mt-1">Encadrer un prix ou une référence</div>
            </button>

            <button
              onClick={() => handleAddShape('circle')}
              className="w-full text-left p-3 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 transition-all"
            >
              <div className="font-semibold text-sm text-white">Cercle / Ovale</div>
              <div className="text-xs text-slate-400 mt-1">Badge ou pastille</div>
            </button>
          </div>
        )}

        {/* Onglet Image */}
        {activeTab === 'image' && (
          <div className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Importer un Logo ou une Image
            </h3>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              onChange={handleImageUpload}
              className="hidden"
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-8 border-2 border-dashed border-indigo-500/40 hover:border-indigo-500 rounded-xl bg-indigo-950/20 hover:bg-indigo-950/30 flex flex-col items-center justify-center gap-2 transition-all group"
            >
              <div className="w-10 h-10 rounded-full bg-indigo-600/20 text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <ImageIcon size={20} />
              </div>
              <span className="text-sm font-medium text-slate-200">
                Choisir une image
              </span>
              <span className="text-xs text-slate-400">PNG, JPG, SVG ou WebP</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};
