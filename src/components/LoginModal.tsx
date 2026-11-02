import React, { useState, useEffect } from 'react';
import { User, KeyRound, Printer, AlertCircle, ShieldCheck, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { api } from '../api/client';

interface LoginModalProps {
  onLoginSuccess: (username: string) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ onLoginSuccess }) => {
  const [isInitialized, setIsInitialized] = useState<boolean | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState<boolean>(true);

  // Champs de formulaire
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Vérifier si le système est déjà initialisé
  useEffect(() => {
    const checkInit = async () => {
      try {
        setIsCheckingStatus(true);
        const status = await api.getAuthStatus();
        setIsInitialized(status.initialized);
        if (status.initialized) {
          setUsername('');
        }
      } catch (e: any) {
        // En cas d'erreur de contact, assumer initialisé pour sécurité
        setIsInitialized(true);
      } finally {
        setIsCheckingStatus(false);
      }
    };
    checkInit();
  }, []);

  // Soumission Première Connexion (Initialisation)
  const handleSetupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 4) {
      setError('Le mot de passe doit comporter au moins 4 caractères.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Les deux mots de passe ne correspondent pas.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.setupAdmin({
        username: username.trim() || 'admin',
        password: password.trim(),
        confirm_password: confirmPassword.trim(),
      });
      setIsLoading(false);
      onLoginSuccess(res.username);
    } catch (err: any) {
      setIsLoading(false);
      setError(err.message || 'Impossible d\'initialiser le mot de passe.');
    }
  };

  // Soumission Connexion Standard
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await api.login(username.trim(), password);
      setIsLoading(false);
      onLoginSuccess(res.username);
    } catch (err: any) {
      setIsLoading(false);
      setError(err.message || 'Identifiant ou mot de passe incorrect.');
    }
  };

  if (isCheckingStatus) {
    return (
      <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
        <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // --- ÉCRAN 1 : PREMIÈRE CONNEXION (INITIALISATION DU MOT DE PASSE) ---
  if (!isInitialized) {
    return (
      <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 relative overflow-hidden">
          {/* Décoration d'arrière plan */}
          <div className="absolute -top-16 -right-16 w-36 h-36 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-violet-600/20 rounded-full blur-3xl pointer-events-none" />

          <div className="text-center mb-6 relative">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 mx-auto flex items-center justify-center text-white shadow-xl shadow-indigo-600/30 mb-3">
              <ShieldCheck size={28} />
            </div>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              Première Connexion
            </span>
            <h1 className="text-xl font-bold text-white tracking-tight mt-2">
              Initialisation du Studio
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
              Bienvenue ! Veuillez choisir vos identifiants administrateur pour sécuriser l'accès à vos impressions et modèles.
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSetupSubmit} className="space-y-3.5">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Identifiant administrateur
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <User size={15} />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-sm text-white focus:outline-hidden focus:border-indigo-500 transition-all font-medium"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Définir votre mot de passe
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <KeyRound size={15} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoFocus
                  minLength={4}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Choisissez un mot de passe fort"
                  className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-sm text-white focus:outline-hidden focus:border-indigo-500 transition-all font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white cursor-pointer"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Confirmer le mot de passe
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <KeyRound size={15} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={4}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Répétez le mot de passe"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-sm text-white focus:outline-hidden focus:border-indigo-500 transition-all font-medium"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-3 py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Initialisation en cours...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  <span>Initialiser et Ouvrir le Studio</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --- ÉCRAN 2 : CONNEXION STANDARD (SYSTÈME DÉJÀ INITIALISÉ) ---
  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 relative overflow-hidden">
        {/* Décoration d'arrière plan */}
        <div className="absolute -top-16 -right-16 w-36 h-36 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-violet-600/20 rounded-full blur-3xl pointer-events-none" />

        <div className="text-center mb-6 relative">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 mx-auto flex items-center justify-center text-white shadow-xl shadow-indigo-600/30 mb-3">
            <Printer size={28} />
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">
            Pristar P15 Label Studio
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Connexion au studio sécurisé
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle size={15} className="shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLoginSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              Identifiant
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <User size={15} />
              </div>
              <input
                type="text"
                required
                autoFocus
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Votre identifiant"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-sm text-white focus:outline-hidden focus:border-indigo-500 transition-all font-medium"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              Mot de passe
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <KeyRound size={15} />
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-sm text-white focus:outline-hidden focus:border-indigo-500 transition-all font-medium"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-sm shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Connexion en cours...</span>
              </>
            ) : (
              <span>Se connecter au Studio</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};