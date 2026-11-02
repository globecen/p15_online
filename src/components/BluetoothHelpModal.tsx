import React from 'react';
import { X, HelpCircle, Bluetooth, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';

interface BluetoothHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BluetoothHelpModal: React.FC<BluetoothHelpModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* En-tête */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-600/20 text-indigo-400">
              <HelpCircle size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Guide de Connexion Bluetooth Pristar P15</h2>
              <p className="text-xs text-slate-400">
                Comment connecter et imprimer depuis votre navigateur web
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

        {/* Contenu */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-300 leading-relaxed">
          {/* Étape 1 : Navigateur */}
          <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-2">
            <div className="flex items-center gap-2 text-white font-semibold text-sm">
              <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs">
                1
              </span>
              Navigateurs Compatibles (Web Bluetooth API)
            </div>
            <p className="text-slate-300">
              Pour communiquer directement avec l'imprimante Bluetooth sans installer d'application lourde, le navigateur doit supporter le protocole Web Bluetooth :
            </p>
            <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
              <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center gap-1.5">
                <CheckCircle2 size={14} /> Google Chrome (PC, Mac, Android)
              </div>
              <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center gap-1.5">
                <CheckCircle2 size={14} /> Microsoft Edge & Opera
              </div>
            </div>
            <p className="text-[11px] text-slate-400">
              * Note : Firefox et Safari ne supportent pas encore le Web Bluetooth par décision de leurs éditeurs.
            </p>
          </div>

          {/* Étape 2 : Allumer l'imprimante */}
          <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-2">
            <div className="flex items-center gap-2 text-white font-semibold text-sm">
              <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs">
                2
              </span>
              Préparation de la Pristar P15
            </div>
            <ul className="list-disc list-inside space-y-1 text-slate-300">
              <li>
                Maintenez le bouton <strong className="text-white">Marche/Arrêt</strong> de la P15 enfoncé pendant 3 secondes jusqu'à entendre un bip et voir le voyant s'allumer.
              </li>
              <li>
                Vérifiez que le ruban thermique est bien inséré face sensible vers la tête d'impression.
              </li>
              <li>
                <strong className="text-amber-300">Important :</strong> Ne jumelez pas l'imprimante dans les paramètres Bluetooth de Windows au préalable ! La liaison se fait directement depuis cette application web.
              </li>
              <li>
                Assurez-vous que l'application mobile (Marklife) sur votre smartphone est fermée (la P15 n'accepte qu'une seule connexion Bluetooth active à la fois).
              </li>
            </ul>
          </div>

          {/* Étape 3 : Connexion */}
          <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-2">
            <div className="flex items-center gap-2 text-white font-semibold text-sm">
              <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs">
                3
              </span>
              Lancer la connexion
            </div>
            <p>
              Cliquez sur le bouton <strong className="text-indigo-400">« Connecter P15 (Bluetooth) »</strong> dans la barre supérieure. Une fenêtre pop-up de votre navigateur s'ouvrira pour lister les appareils Bluetooth proches.
            </p>
            <div className="p-2.5 rounded bg-indigo-950/30 border border-indigo-500/30 text-indigo-300 flex items-center gap-2">
              <Bluetooth size={16} />
              <span>Sélectionnez votre appareil portant le nom <strong>« P15 »</strong>, <strong>« P15R »</strong> ou <strong>« Marklife »</strong> puis cliquez sur <strong>« Associer »</strong>.</span>
            </div>
          </div>

          {/* Dépannage */}
          <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-2">
            <div className="flex items-center gap-2 text-white font-semibold text-sm">
              <AlertCircle size={16} className="text-amber-400" />
              Résolution des problèmes courants
            </div>
            <div className="space-y-2">
              <div>
                <strong className="text-slate-200">L'impression est trop claire :</strong>
                <p className="text-slate-400">
                  Réglez la densité thermique sur <strong className="text-white">« 3 - Foncé »</strong> dans le panneau de droite ou dans la fenêtre d'impression.
                </p>
              </div>
              <div>
                <strong className="text-slate-200">Le texte ou le code-barres est tronqué :</strong>
                <p className="text-slate-400">
                  Vérifiez que la largeur de ruban choisie correspond bien à votre rouleau (la P15 accepte des rubans de 12 à 15 mm).
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Pied */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950/60 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition-all"
          >
            J'ai compris
          </button>
        </div>
      </div>
    </div>
  );
};
