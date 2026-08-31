import React, { useState } from "react";
import {
  Lock,
  Mail,
  User as UserIcon,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Music2,
  KeyRound,
  Compass,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

export const AuthScreen: React.FC = () => {
  const { login, loginWithGoogle, register, checkUsername } = useAuth();

  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
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

  // Live username availability check on debounced change
  React.useEffect(() => {
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
        setSuccessMessage("Connexion réussie ! Bienvenue sur NLSmusic.");
      }
    } catch {
      setErrorMessage("Une erreur réseau est survenue.");
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
        setSuccessMessage("Compte créé avec succès ! Bienvenue sur NLSmusic.");
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
      setErrorMessage("Erreur lors de la connexion avec le compte démo.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      id="auth-mandatory-screen"
      className="min-h-screen min-h-[100dvh] w-full bg-[#0a0a0a] text-white flex flex-col items-center justify-start sm:justify-center p-4 sm:p-6 py-6 sm:py-10 overflow-y-auto relative font-['Plus_Jakarta_Sans',sans-serif]"
      style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-y" }}
    >
      {/* Subtle Background Glows */}
      <div className="fixed top-[-15%] left-[-10%] w-[450px] h-[450px] bg-[#1db954]/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-[-15%] right-[-10%] w-[500px] h-[500px] bg-[#10331d]/30 rounded-full blur-[140px] pointer-events-none" />

      {/* Container Box */}
      <div className="w-full max-w-md bg-[#161616] border border-[#2a2a2a] rounded-3xl p-6 sm:p-8 shadow-2xl relative z-10 my-auto flex flex-col space-y-4 pb-8 sm:pb-8">
        {/* Top Green Accent Bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#1db954] via-[#1ed760] to-[#0d5c2a]" />

        {/* Brand Header */}
        <div className="text-center space-y-1.5 pt-1">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#1db954] to-[#1ed760] flex items-center justify-center shadow-lg shadow-[#1db954]/25">
            <Music2 className="w-7 h-7 text-black" strokeWidth={2.5} />
          </div>

          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white font-['Outfit'] tracking-tight">
              NLSmusic
            </h1>
            <p className="text-xs text-zinc-400 font-medium mt-0.5">
              Connexion Firebase requise pour synchroniser vos musiques et MP3
            </p>
          </div>
        </div>

        {/* Security badge notice */}
        <div className="bg-[#101010] border border-[#252525] rounded-xl px-3.5 py-1.5 flex items-center justify-between text-[11px] text-zinc-400">
          <span className="flex items-center gap-1.5 text-zinc-300 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-[#1db954]" />
            Firebase Authentication & Firestore Cloud
          </span>
          <span className="text-[10px] bg-[#1db954]/15 text-[#1db954] font-bold px-2 py-0.5 rounded">
            Sécurisé
          </span>
        </div>

        {/* Google Sign-in Button */}
        <button
          id="btn-google-signin-screen"
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          className="w-full py-2.5 px-4 bg-white hover:bg-zinc-100 text-zinc-900 font-bold text-xs sm:text-sm rounded-xl transition-all shadow flex items-center justify-center gap-2.5 active:scale-95 disabled:opacity-50 cursor-pointer"
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
          <span>Continuer avec Google</span>
        </button>

        {/* Divider */}
        <div className="flex items-center gap-2">
          <div className="flex-1 h-px bg-[#252525]" />
          <span className="text-[10px] text-zinc-500 font-medium">OU IDENTIFIANTS</span>
          <div className="flex-1 h-px bg-[#252525]" />
        </div>

        {/* Tabs Selector */}
        <div className="flex items-center p-1 bg-[#101010] rounded-xl border border-[#252525]">
          <button
            id="tab-login-btn"
            type="button"
            onClick={() => {
              setActiveTab("login");
              setErrorMessage(null);
              setSuccessMessage(null);
            }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === "login"
                ? "bg-[#252525] text-white shadow-sm"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Connexion
          </button>
          <button
            id="tab-register-btn"
            type="button"
            onClick={() => {
              setActiveTab("register");
              setErrorMessage(null);
              setSuccessMessage(null);
            }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === "register"
                ? "bg-[#252525] text-white shadow-sm"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Inscription (Pseudo)
          </button>
        </div>

        {/* Error / Success Notifications */}
        {errorMessage && (
          <div className="p-2.5 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs flex items-center gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
        {successMessage && (
          <div className="p-2.5 bg-[#1db954]/10 border border-[#1db954]/30 rounded-xl text-[#1db954] text-xs flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* FORM: CONNEXION */}
        {activeTab === "login" && (
          <form onSubmit={handleLoginSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Nom d'utilisateur ou Email
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-zinc-400 absolute left-3.5 top-2.5" />
                <input
                  id="auth-input-identifier"
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Ex: alex_nls ou email@exemple.com"
                  className="w-full bg-[#202020] border border-[#303030] focus:border-[#1db954] rounded-xl py-2 pl-10 pr-3 text-xs text-white placeholder:text-zinc-500 outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Mot de passe
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 top-2.5" />
                <input
                  id="auth-input-password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#202020] border border-[#303030] focus:border-[#1db954] rounded-xl py-2 pl-10 pr-10 text-xs text-white placeholder:text-zinc-500 outline-none transition-colors"
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
              id="btn-login-submit"
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-[#1db954] hover:bg-[#1ed760] text-black font-extrabold text-xs rounded-xl transition-transform active:scale-95 shadow-md shadow-[#1db954]/25 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <KeyRound className="w-4 h-4" />
              <span>{isLoading ? "Connexion en cours..." : "SE CONNECTER"}</span>
            </button>

            {/* Quick Demo Access */}
            <div className="pt-1">
              <button
                id="btn-demo-quick-login"
                type="button"
                onClick={handleDemoLogin}
                disabled={isLoading}
                className="w-full py-2 bg-[#202020] hover:bg-[#282828] text-zinc-300 hover:text-white text-xs font-semibold rounded-xl border border-[#333] flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-[#1db954]" />
                <span>Connexion rapide (Compte Démo test)</span>
              </button>
            </div>
          </form>
        )}

        {/* FORM: INSCRIPTION */}
        {activeTab === "register" && (
          <form onSubmit={handleRegisterSubmit} className="space-y-2.5">
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
                <UserIcon className="w-4 h-4 text-zinc-400 absolute left-3.5 top-2.5" />
                <input
                  id="auth-input-register-username"
                  type="text"
                  required
                  minLength={3}
                  maxLength={30}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Ex: alex_nls"
                  className={`w-full bg-[#202020] border rounded-xl py-2 pl-10 pr-3 text-xs text-white placeholder:text-zinc-500 outline-none transition-colors ${
                    usernameStatus === "taken"
                      ? "border-red-500/80 focus:border-red-500"
                      : usernameStatus === "available"
                      ? "border-[#1db954]/80 focus:border-[#1db954]"
                      : "border-[#303030] focus:border-[#1db954]"
                  }`}
                />
              </div>
              <p className="text-[10px] text-zinc-500 mt-0.5">
                3 à 30 caractères (lettres, chiffres, tirets). Unique sur NLS.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Mot de passe (min 6 caractères)
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 top-2.5" />
                <input
                  id="auth-input-register-password"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#202020] border border-[#303030] focus:border-[#1db954] rounded-xl py-2 pl-10 pr-10 text-xs text-white placeholder:text-zinc-500 outline-none transition-colors"
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
                <Mail className="w-4 h-4 text-zinc-400 absolute left-3.5 top-2.5" />
                <input
                  id="auth-input-register-email"
                  type="email"
                  value={optionalEmail}
                  onChange={(e) => setOptionalEmail(e.target.value)}
                  placeholder="email@exemple.com (optionnel)"
                  className="w-full bg-[#202020] border border-[#303030] focus:border-[#1db954] rounded-xl py-2 pl-10 pr-3 text-xs text-white placeholder:text-zinc-500 outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Genre musical favori
              </label>
              <div className="relative">
                <Compass className="w-4 h-4 text-zinc-400 absolute left-3.5 top-2.5" />
                <select
                  value={favoriteGenre}
                  onChange={(e) => setFavoriteGenre(e.target.value)}
                  className="w-full bg-[#202020] border border-[#303030] focus:border-[#1db954] rounded-xl py-2 pl-10 pr-3 text-xs text-white outline-none transition-colors"
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

            <button
              id="btn-register-submit"
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-[#1db954] hover:bg-[#1ed760] text-black font-extrabold text-xs rounded-xl transition-transform active:scale-95 shadow-md shadow-[#1db954]/25 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isLoading ? "Création du compte..." : "CRÉER MON COMPTE"}</span>
            </button>
          </form>
        )}

        {/* Footer info */}
        <div className="text-center pt-1">
          <p className="text-[10px] text-zinc-500">
            Synchronisation Cloud Firestore & Authentification Firebase sécurisée.
          </p>
        </div>
      </div>
    </div>
  );
};
