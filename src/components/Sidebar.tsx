import React from "react";
import {
  Home,
  Compass,
  FolderHeart,
  Download,
  Heart,
  ListMusic,
  WifiOff,
  HardDrive,
  Sparkles,
  Music2,
  CheckCircle2,
  SlidersHorizontal,
  User as UserIcon,
  LogIn,
} from "lucide-react";
import { ViewMode } from "../types";
import { useDownload } from "../context/DownloadContext";
import { useAuth } from "../context/AuthContext";

interface SidebarProps {
  currentView: ViewMode;
  onNavigate: (view: ViewMode) => void;
  onOpenSettings: () => void;
  onOpenDownloadQueue?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onNavigate,
  onOpenSettings,
  onOpenDownloadQueue,
}) => {
  const { downloadedTracks, favoriteIds, tasks, settings, updateSettings, isOfflineOnly, activeDownloadsCount, pendingDownloadsCount } = useDownload();
  const { user, isAuthenticated, openAuthModal } = useAuth();

  // Calculate used space
  const totalBytes = downloadedTracks.reduce((acc, t) => acc + (t.fileSize || 0), 0);
  const totalMB = (totalBytes / (1024 * 1024)).toFixed(1);

  const activeTasks = tasks.filter((t) => t.status !== "completed" && t.status !== "error");

  return (
    <aside
      id="nls-sidebar"
      className="hidden md:flex md:w-60 lg:w-64 bg-black text-[#b3b3b3] flex-col h-full select-none border-r border-[#282828]/50 flex-shrink-0"
    >
      {/* Brand Logo */}
      <div className="p-6 pb-4 flex items-center justify-between">
        <div
          onClick={() => onNavigate("home")}
          className="flex items-center gap-3 cursor-pointer group"
          id="nls-brand-logo"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#1db954] to-[#1ed760] flex items-center justify-center shadow-lg shadow-[#1db954]/20 group-hover:scale-105 transition-transform">
            <Music2 className="w-6 h-6 text-black" strokeWidth={2.5} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-xl text-white tracking-tight font-['Outfit']">
                NLS<span className="text-[#1db954]">music</span>
              </span>
            </div>
            <span className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider block -mt-1">
              MP3 & Offline Player
            </span>
          </div>
        </div>
      </div>

      {/* Main Navigation */}
      <div className="px-3 py-2 space-y-1">
        <button
          id="nav-home"
          onClick={() => onNavigate("home")}
          className={`w-full flex items-center gap-4 px-4 py-3 rounded-lg text-sm font-semibold transition-all ${
            currentView === "home"
              ? "bg-[#282828] text-white"
              : "hover:text-white hover:bg-[#181818]"
          }`}
        >
          <Home className="w-5 h-5" />
          <span>Accueil</span>
        </button>

        <button
          id="nav-trending"
          onClick={() => onNavigate("genre")}
          className={`w-full flex items-center gap-4 px-4 py-3 rounded-lg text-sm font-semibold transition-all ${
            currentView === "genre"
              ? "bg-[#282828] text-white"
              : "hover:text-white hover:bg-[#181818]"
          }`}
        >
          <Compass className="w-5 h-5" />
          <span>Explorer & Genres</span>
        </button>

        <button
          id="nav-library"
          onClick={() => onNavigate("library")}
          className={`w-full flex items-center gap-4 px-4 py-3 rounded-lg text-sm font-semibold transition-all ${
            currentView === "library"
              ? "bg-[#282828] text-white"
              : "hover:text-white hover:bg-[#181818]"
          }`}
        >
          <FolderHeart className="w-5 h-5" />
          <div className="flex-1 text-left flex items-center justify-between">
            <span>Bibliothèque locale</span>
            {downloadedTracks.length > 0 && (
              <span className="text-xs bg-[#242424] text-[#1db954] font-bold px-2 py-0.5 rounded-full">
                {downloadedTracks.length}
              </span>
            )}
          </div>
        </button>
      </div>

      {/* Divider */}
      <div className="px-6 py-2">
        <div className="h-px bg-[#282828]" />
      </div>

      {/* Sub Collections */}
      <div className="px-3 space-y-1 flex-1 overflow-y-auto custom-scrollbar">
        <div className="px-4 pt-2 pb-1 text-xs font-bold text-zinc-400 uppercase tracking-wider">
          Collections
        </div>

        <button
          id="nav-favorites"
          onClick={() => onNavigate("favorites")}
          className={`w-full flex items-center gap-4 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
            currentView === "favorites"
              ? "bg-[#282828] text-white"
              : "hover:text-white hover:bg-[#181818]"
          }`}
        >
          <div className="w-7 h-7 rounded bg-gradient-to-br from-[#450af5] to-[#8e8ee5] flex items-center justify-center text-white">
            <Heart className="w-3.5 h-3.5 fill-white" />
          </div>
          <div className="flex-1 text-left flex items-center justify-between">
            <span>Titres likés</span>
            <span className="text-xs text-zinc-400">{favoriteIds.length}</span>
          </div>
        </button>

        <button
          id="nav-downloads"
          onClick={() => onNavigate("downloads")}
          className={`w-full flex items-center gap-4 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
            currentView === "downloads"
              ? "bg-[#282828] text-white"
              : "hover:text-white hover:bg-[#181818]"
          }`}
        >
          <div className="w-7 h-7 rounded bg-[#006450] flex items-center justify-center text-[#1ed760]">
            <Download className="w-3.5 h-3.5" />
          </div>
          <div className="flex-1 text-left flex items-center justify-between">
            <span>Téléchargements</span>
            {activeDownloadsCount > 0 ? (
              <span className="text-[10px] bg-[#1db954] text-black font-bold px-1.5 py-0.5 rounded-full animate-pulse">
                {activeDownloadsCount}
              </span>
            ) : (
              <span className="text-xs text-zinc-400">{downloadedTracks.length}</span>
            )}
          </div>
        </button>

        {/* Download Queue Drawer trigger */}
        {onOpenDownloadQueue && (
          <button
            id="nav-download-queue"
            onClick={onOpenDownloadQueue}
            className="w-full flex items-center gap-4 px-4 py-2 rounded-lg text-xs font-semibold text-zinc-400 hover:text-white hover:bg-[#181818] transition-all group"
          >
            <div className="w-7 h-7 rounded bg-[#1db954]/10 border border-[#1db954]/30 group-hover:bg-[#1db954]/20 flex items-center justify-center text-[#1db954]">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div className="flex-1 text-left flex items-center justify-between">
              <span>Gestionnaire de file</span>
              {activeDownloadsCount + pendingDownloadsCount > 0 && (
                <span className="text-[10px] bg-[#1db954] text-black font-extrabold px-1.5 py-0.2 rounded-full">
                  {activeDownloadsCount + pendingDownloadsCount}
                </span>
              )}
            </div>
          </button>
        )}

        {/* Offline Mode Switch */}
        <div className="mt-4 px-3 py-3 rounded-xl bg-[#181818]/90 border border-[#282828] space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <WifiOff className={`w-4 h-4 ${isOfflineOnly ? "text-[#1db954]" : "text-zinc-400"}`} />
              <span className="text-xs font-semibold text-zinc-200">Mode Hors-Ligne</span>
            </div>
            <button
              id="btn-toggle-offline-mode"
              onClick={() => updateSettings({ offlineModeOnly: !isOfflineOnly })}
              className={`w-9 h-5 rounded-full transition-colors relative p-0.5 ${
                isOfflineOnly ? "bg-[#1db954]" : "bg-zinc-700"
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform ${
                  isOfflineOnly ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </button>
          </div>
          <p className="text-[11px] text-zinc-400 leading-tight">
            {isOfflineOnly
              ? "Lecture uniquement des MP3 enregistrés localement."
              : "Accès à tout YouTube et à vos MP3 locaux."}
          </p>
        </div>

        {/* Device Storage Status */}
        <div className="mt-3 px-3 py-3 rounded-xl bg-[#181818]/50 border border-[#282828]/60 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-zinc-400 font-medium">
              <HardDrive className="w-3.5 h-3.5 text-[#1db954]" /> Stockage appareil
            </span>
            <span className="text-zinc-200 font-bold">{totalMB} MB</span>
          </div>
          <div className="w-full bg-[#282828] h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-[#1db954] h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(5, (totalBytes / (500 * 1024 * 1024)) * 100))}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] text-zinc-400">
            <span>{downloadedTracks.length} titres sauvés</span>
            {settings.autoSaveToDevice && (
              <span className="flex items-center gap-1 text-[#1db954]">
                <CheckCircle2 className="w-2.5 h-2.5" /> Auto-save actif
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Footer User Account & Settings */}
      <div className="p-3 border-t border-[#282828] space-y-2">
        {isAuthenticated && user ? (
          <button
            id="sidebar-btn-user-profile"
            onClick={() => openAuthModal("login")}
            className="w-full flex items-center gap-2.5 p-2 rounded-xl bg-[#181818] hover:bg-[#222] border border-[#282828] transition-colors text-left group"
          >
            <div className="w-8 h-8 rounded-full overflow-hidden bg-zinc-800 border border-[#1db954] flex-shrink-0">
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
              <p className="text-xs font-bold text-white truncate">{user.name}</p>
              <p className="text-[10px] text-zinc-400 truncate">{user.email}</p>
            </div>
          </button>
        ) : (
          <button
            id="sidebar-btn-login"
            onClick={() => openAuthModal("login")}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-[#1db954]/10 hover:bg-[#1db954]/20 border border-[#1db954]/30 text-[#1db954] text-xs font-bold transition-all"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Se connecter / S'inscrire</span>
          </button>
        )}

        <button
          id="btn-open-settings"
          onClick={onOpenSettings}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-zinc-400 hover:text-white hover:bg-[#181818] transition-colors"
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-[#1db954]" />
          <span>Paramètres & MP3</span>
        </button>
      </div>
    </aside>
  );
};
