import React, { useState, useEffect } from "react";
import {
  X,
  Lock,
  Mail,
  User as UserIcon,
  ShieldCheck,
  Sparkles,
  LogOut,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Music2,
  KeyRound,
  Compass,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: "login" | "register";
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialTab = "login",
}) => {
  const { user, isAuthenticated, login, loginWithGoogle, register, checkUsername, logout, updateProfile } = useAuth();

  const [activeTab, setActiveTab] = useState<"login" | "register">(initialTab);
  const [identifier, setIdentifier] = useState("");
  const [username, setUsername] = useState("");
  const [optionalEmail, setOptionalEmail] = useState("");
  const [password, setPassword] = useState("");
  const [favoriteGenre, setFavoriteGenre] = useState("Rap Français");
  const [showPassword, setShowPassword] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Profile edit state
  const [editName, setEditName] = useState("");
  const [editGenre, setEditGenre] = useState("");
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  useEffect(() => {
    setActiveTab(initialTab);
    setErrorMessage(null);
    setSuccessMessage(null);
    setUsernameStatus("idle");
  }, [initialTab, isOpen]);

  useEffect(() => {
    if (user) {
      setEditName(user.name);
      setEditGenre(user.favoriteGenre || "Rap Français");
    }
  }, [user]);

  // Live username availability check on debounced change
  useEffect(() => {
    const clean = username.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
    if (clean.length < 3) {
      setUsernameStatus("idle");
      return;
    }
    setUsernameStatus("checking");
    const timeout = setTimeout(async () => {
      try {
        const isAvail = await checkUsername(clean);
        setUsernameStatus(isAvail ? "available" : "taken");
      } catch {
        setUsernameStatus("idle");
      }
    }, 400);

    return () => clearTimeout(timeout);
  }, [username, checkUsername]);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);
    try {
      const res = await loginWithGoogle();
      if (res.success) {
        setSuccessMessage("Connecté avec Google avec succès !");
      } else if (res.error) {
        setErrorMessage(res.error);
      }
    } catch {
      setErrorMessage("Une erreur est survenue lors de la connexion Google.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!identifier.trim() || !password) {
      setErrorMessage("Veuillez saisir votre nom d'utilisateur et mot de passe.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await login(identifier.trim(), password);
      if (!res.success) {
        setErrorMessage(res.error || "Identifiants invalides.");
      } else {
        setSuccessMessage("Connexion réussie !");
      }
    } catch {
      setErrorMessage("Une erreur est survenue.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
    if (!cleanUsername || cleanUsername.length < 3) {
      setErrorMessage("Le nom d'utilisateur doit comporter au moins 3 caractères (lettres, chiffres, _ ou -).");
      return;
    }

    if (usernameStatus === "taken") {
      setErrorMessage("Ce nom d'utilisateur est déjà pris. Veuillez en choisir un autre.");
      return;
    }

    if (!password || password.length < 6) {
      setErrorMessage("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await register(
        username.trim(),
        password,
        favoriteGenre,
        optionalEmail.trim() || undefined
      );
      if (!res.success) {
        setErrorMessage(res.error || "Échec de l'inscription.");
      } else {
        setSuccessMessage("Compte créé avec succès !");
      }
    } catch {
      setErrorMessage("Une erreur est survenue lors de l'inscription.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await login("ismanls961@gmail.com", "demo1234");
      if (!res.success) {
        setErrorMessage(res.error || "Compte démo introuvable.");
      }
    } catch {
      setErrorMessage("Erreur connexion démo.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingProfile(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const ok = await updateProfile({ name: editName.trim(), favoriteGenre: editGenre });
    if (ok) {
      setSuccessMessage("Profil mis à jour !");
      setTimeout(() => setSuccessMessage(null), 3000);
    } else {
      setErrorMessage("Erreur lors de la mise à jour.");
    }
    setIsUpdatingProfile(false);
  };

  return (
    <div
      id="auth-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="auth-modal-content"
        className="w-full max-w-md bg-[#181818] border border-[#2e2e2e] rounded-3xl p-6 shadow-2xl relative flex flex-col space-y-4 max-h-[85vh] sm:max-h-[90vh] overflow-y-auto pb-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Glow Accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#1db954] via-[#1ed760] to-[#10331d]" />

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#1db954]/20 border border-[#1db954]/40 flex items-center justify-center text-[#1db954] shadow-sm">
              <Music2 className="w-5 h-5 text-[#1db954]" strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white font-['Outfit']">
                {isAuthenticated
                  ? "Mon Compte NLS"
                  : activeTab === "login"
                  ? "Connexion NLSmusic"
                  : "Créer un Compte NLS"}
              </h2>
              <p className="text-[11px] text-zinc-400">
                {isAuthenticated
                  ? "Gestion du profil et synchronisation Firebase"
                  : "Accédez à vos favoris, MP3 et synchronisation Cloud"}
              </p>
            </div>
          </div>

          <button
            id="btn-close-auth-modal"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#242424] hover:bg-[#333] text-zinc-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Security badge notice */}
        <div className="bg-[#121212] border border-[#282828] rounded-xl px-3 py-2 flex items-center justify-between text-[10px] text-zinc-400">
          <span className="flex items-center gap-1.5 text-zinc-300 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-[#1db954]" />
            Firebase Auth & Firestore Cloud Sync
          </span>
          <span className="text-[9px] bg-[#1db954]/10 text-[#1db954] font-bold px-1.5 py-0.5 rounded">
            Sécurisé
          </span>
        </div>

        {/* Error / Success Notifications */}
        {errorMessage && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs flex items-center gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
        {successMessage && (
          <div className="p-3 bg-[#1db954]/10 border border-[#1db954]/30 rounded-xl text-[#1db954] text-xs flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Authenticated User View */}
        {isAuthenticated && user ? (
          <div className="space-y-4 pt-1">
            {/* User Card */}
            <div className="p-4 rounded-2xl bg-[#202020] border border-[#303030] flex items-center gap-3.5">
              <div className="w-14 h-14 rounded-full overflow-hidden bg-zinc-800 border-2 border-[#1db954] shadow-md flex-shrink-0">
                <img
                  src={
                    user.avatar ||
                    "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80"
                  }
                  alt={user.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-bold text-white truncate">{user.name}</h3>
                  <span className="text-[9px] bg-[#1db954] text-black font-extrabold px-1.5 py-0.2 rounded-full uppercase">
                    {user.role || "Membre"}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 truncate">{user.email}</p>
                <p className="text-[10px] text-zinc-500 mt-0.5">
                  Genre favori : <span className="text-zinc-300 font-medium">{user.favoriteGenre || "Tous genres"}</span>
                </p>
              </div>
            </div>

            {/* Edit Profile Form */}
            <form onSubmit={handleSaveProfile} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Nom d'affichage
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-[#242424] border border-[#383838] focus:border-[#1db954] rounded-xl py-2 pl-9 pr-3 text-xs text-white outline-none"
                    placeholder="Votre nom"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Genre musical préféré
                </label>
                <div className="relative">
                  <Compass className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
                  <select
                    value={editGenre}
                    onChange={(e) => setEditGenre(e.target.value)}
                    className="w-full bg-[#242424] border border-[#383838] focus:border-[#1db954] rounded-xl py-2 pl-9 pr-3 text-xs text-white outline-none"
                  >
                    <option value="Rap Français">Rap Français</option>
                    <option value="Afrobeats">Afrobeats</option>
                    <option value="Pop & Hits">Pop & Hits</option>
                    <option value="R&B & Soul">R&B & Soul</option>
                    <option value="Electro / Dance">Electro / Dance</option>
                    <option value="Lofi Chill">Lofi Chill</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  disabled={isUpdatingProfile}
                  className="flex-1 py-2 bg-[#1db954] hover:bg-[#1ed760] text-black font-bold text-xs rounded-xl transition-all shadow active:scale-95 disabled:opacity-50"
                >
                  {isUpdatingProfile ? "Enregistrement..." : "Mettre à jour le profil"}
                </button>

                <button
                  type="button"
                  onClick={logout}
                  className="px-3.5 py-2 bg-[#2a2a2a] hover:bg-red-500/20 text-zinc-300 hover:text-red-400 font-semibold text-xs rounded-xl flex items-center gap-1.5 transition-colors border border-[#383838]"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Déconnexion</span>
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* Non-Authenticated View: Login & Register Tabs */
          <div className="space-y-4">
            {/* Google Sign-in Button */}
            <button
              id="btn-google-signin-modal"
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-white hover:bg-zinc-100 text-zinc-900 font-bold text-xs rounded-xl transition-all shadow flex items-center justify-center gap-2.5 active:scale-95 disabled:opacity-50"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.03 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              <span>Continuer avec Google (Firebase)</span>
            </button>

            {/* Divider */}
            <div className="flex items-center gap-2">
              <div className="flex-1 h-px bg-[#2a2a2a]" />
              <span className="text-[10px] text-zinc-500 font-medium">OU COMPTE NLS</span>
              <div className="flex-1 h-px bg-[#2a2a2a]" />
            </div>

            {/* Tabs Selector */}
            <div className="flex items-center p-1 bg-[#121212] rounded-xl border border-[#282828]">
              <button
                id="tab-login"
                type="button"
                onClick={() => {
                  setActiveTab("login");
                  setErrorMessage(null);
                }}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === "login"
                    ? "bg-[#282828] text-white shadow"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                Connexion
              </button>
              <button
                id="tab-register"
                type="button"
                onClick={() => {
                  setActiveTab("register");
                  setErrorMessage(null);
                }}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === "register"
                    ? "bg-[#282828] text-white shadow"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                Inscription (Pseudo)
              </button>
            </div>

            {/* TAB: LOGIN */}
            {activeTab === "login" && (
              <form onSubmit={handleLoginSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Nom d'utilisateur ou Email
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
                    <input
                      id="input-login-identifier"
                      type="text"
                      required
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="Ex: alex_nls ou email@exemple.com"
                      className="w-full bg-[#242424] border border-[#383838] focus:border-[#1db954] rounded-xl py-2 pl-9 pr-3 text-xs text-white placeholder:text-zinc-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Mot de passe
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
                    <input
                      id="input-login-password"
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-[#242424] border border-[#383838] focus:border-[#1db954] rounded-xl py-2 pl-9 pr-10 text-xs text-white placeholder:text-zinc-500 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-zinc-400 hover:text-white"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <button
                  id="btn-submit-login"
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 bg-[#1db954] hover:bg-[#1ed760] text-black font-extrabold text-xs rounded-xl transition-transform active:scale-95 shadow shadow-[#1db954]/20 flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>{isLoading ? "Connexion en cours..." : "SE CONNECTER"}</span>
                </button>

                {/* Demo login helper */}
                <div className="pt-1">
                  <button
                    id="btn-demo-login"
                    type="button"
                    onClick={handleDemoLogin}
                    disabled={isLoading}
                    className="w-full py-2 bg-[#222222] hover:bg-[#2a2a2a] text-zinc-300 hover:text-white text-xs font-semibold rounded-xl border border-[#383838] flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#1db954]" />
                    <span>Connexion rapide (Compte Démo test)</span>
                  </button>
                </div>
              </form>
            )}

            {/* TAB: REGISTER */}
            {activeTab === "register" && (
              <form onSubmit={handleRegisterSubmit} className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-zinc-300">
                      Nom d'utilisateur (Username unique)
                    </label>
                    {usernameStatus === "checking" && (
                      <span className="text-[10px] text-zinc-400 animate-pulse">Vérification...</span>
                    )}
                    {usernameStatus === "available" && (
                      <span className="text-[10px] text-[#1db954] font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Disponible
                      </span>
                    )}
                    {usernameStatus === "taken" && (
                      <span className="text-[10px] text-red-400 font-medium flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Déjà pris
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
                    <input
                      id="input-register-username"
                      type="text"
                      required
                      minLength={3}
                      maxLength={30}
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Ex: alex_nls"
                      className={`w-full bg-[#242424] border rounded-xl py-2 pl-9 pr-3 text-xs text-white placeholder:text-zinc-500 outline-none transition-colors ${
                        usernameStatus === "taken"
                          ? "border-red-500/80 focus:border-red-500"
                          : usernameStatus === "available"
                          ? "border-[#1db954]/80 focus:border-[#1db954]"
                          : "border-[#383838] focus:border-[#1db954]"
                      }`}
                    />
                  </div>
                  <p className="text-[10px] text-zinc-500 mt-1">
                    3 à 30 caractères (lettres, chiffres, tirets). Unique sur NLS.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Mot de passe (min 6 caractères)
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
                    <input
                      id="input-register-password"
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-[#242424] border border-[#383838] focus:border-[#1db954] rounded-xl py-2 pl-9 pr-10 text-xs text-white placeholder:text-zinc-500 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-zinc-400 hover:text-white"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Email <span className="text-zinc-500 font-normal">(Facultatif)</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
                    <input
                      id="input-register-email"
                      type="email"
                      value={optionalEmail}
                      onChange={(e) => setOptionalEmail(e.target.value)}
                      placeholder="email@exemple.com (optionnel)"
                      className="w-full bg-[#242424] border border-[#383838] focus:border-[#1db954] rounded-xl py-2 pl-9 pr-3 text-xs text-white placeholder:text-zinc-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Genre musical de prédilection
                  </label>
                  <select
                    value={favoriteGenre}
                    onChange={(e) => setFavoriteGenre(e.target.value)}
                    className="w-full bg-[#242424] border border-[#383838] focus:border-[#1db954] rounded-xl py-2 px-3 text-xs text-white outline-none"
                  >
                    <option value="Rap Français">Rap Français</option>
                    <option value="Afrobeats">Afrobeats</option>
                    <option value="Pop & Hits">Pop & Hits</option>
                    <option value="R&B & Soul">R&B & Soul</option>
                    <option value="Electro / Dance">Electro / Dance</option>
                    <option value="Lofi Chill">Lofi Chill</option>
                  </select>
                </div>

                <button
                  id="btn-submit-register"
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 bg-[#1db954] hover:bg-[#1ed760] text-black font-extrabold text-xs rounded-xl transition-transform active:scale-95 shadow shadow-[#1db954]/20 flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{isLoading ? "Création du compte..." : "CRÉER MON COMPTE"}</span>
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
