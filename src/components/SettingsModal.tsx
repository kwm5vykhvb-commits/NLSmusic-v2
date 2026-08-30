import React, { useState, useEffect } from "react";
import {
  SlidersHorizontal,
  X,
  FolderDown,
  Bell,
  WifiOff,
  Palette,
  Smartphone,
  Check,
  Music,
  Trash2,
  HardDrive,
  Download,
  Share2,
} from "lucide-react";
import { useDownload } from "../context/DownloadContext";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { settings, updateSettings, downloadedTracks, exportAllTracksAsBackup, refreshOfflineLibrary } = useDownload();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showPwaGuide, setShowPwaGuide] = useState(false);

  useEffect(() => {
    // Catch beforeinstallprompt event for PWA
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);

    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!isOpen) return null;

  const totalBytes = downloadedTracks.reduce((acc, t) => acc + (t.fileSize || 0), 0);
  const totalMB = (totalBytes / (1024 * 1024)).toFixed(1);

  const handleInstallPwa = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      setShowPwaGuide(!showPwaGuide);
    }
  };

  const themes = [
    {
      id: "spotify-dark",
      name: "Spotify Sombre",
      accent: "#1db954",
      bg: "#121212",
      badge: "Standard",
    },
    {
      id: "oled-black",
      name: "Noir Pur OLED",
      accent: "#1ed760",
      bg: "#000000",
      badge: "Éco Batterie",
    },
    {
      id: "cyberpunk",
      name: "Cyberpunk Néon",
      accent: "#f355da",
      bg: "#0b0716",
      badge: "Violet / Cyan",
    },
    {
      id: "midnight",
      name: "Bleu Nuit",
      accent: "#3b82f6",
      bg: "#080d1a",
      badge: "Saphir",
    },
    {
      id: "minimal-light",
      name: "Clair Épuré",
      accent: "#059669",
      bg: "#f4f5f7",
      badge: "Jour",
    },
  ];

  const formatOptions = [
    { id: "mp3", label: "MP3 Studio", sub: "Standard universel" },
    { id: "m4a", label: "M4A AAC", sub: "Optimisé Apple" },
    { id: "flac", label: "FLAC", sub: "Lossless sans perte" },
    { id: "wav", label: "WAV Master", sub: "Audio brut studio" },
    { id: "original", label: "⚡ Original", sub: "Direct ultra-rapide" },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-[#181818] border border-[#282828] w-full max-w-xl max-h-[90vh] rounded-2xl overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#282828] flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-[#1db954]/20 text-[#1db954] flex items-center justify-center">
              <SlidersHorizontal className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm sm:text-base">Paramètres & Personnalisation</h3>
              <p className="text-[10px] sm:text-xs text-zinc-400">Thèmes, formats de téléchargement & application mobile PWA</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 sm:space-y-5 custom-scrollbar text-xs sm:text-sm">
          {/* 1. Visual Themes */}
          <div className="space-y-2.5">
            <h4 className="text-[10px] sm:text-xs font-bold text-[#1db954] uppercase tracking-wider flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5" /> Thèmes Visuels
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {themes.map((t) => {
                const isSelected = (settings.theme || "spotify-dark") === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => updateSettings({ theme: t.id as any })}
                    className={`p-2.5 rounded-xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                      isSelected
                        ? "border-[#1db954] bg-[#222] ring-2 ring-[#1db954]/50 shadow-lg"
                        : "bg-[#202020] border-[#282828] hover:bg-[#252525]"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <div
                          className="w-3.5 h-3.5 rounded-full border border-white/20 shadow-sm"
                          style={{ backgroundColor: t.accent }}
                        />
                        <span className="font-bold text-white text-xs">{t.name}</span>
                      </div>
                      {isSelected && (
                        <div className="w-4 h-4 rounded-full bg-[#1db954] text-black flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-zinc-400">
                      <span>{t.badge}</span>
                      <div
                        className="w-4 h-2 rounded border border-white/20"
                        style={{ backgroundColor: t.bg }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Mobile PWA Support */}
          <div className="space-y-2.5">
            <h4 className="text-[10px] sm:text-xs font-bold text-[#1db954] uppercase tracking-wider flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5" /> Confort Mobile & Application PWA
            </h4>
            <div className="p-3 sm:p-4 rounded-xl bg-[#202020] border border-[#282828] space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs sm:text-sm font-bold text-white block">
                    Installer NLSmusic sur votre téléphone / PC
                  </span>
                  <p className="text-[10px] sm:text-xs text-zinc-400 mt-0.5">
                    Accédez à votre musique en plein écran sans barre d'adresse navigateur, avec contrôle sur écran verrouillé.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleInstallPwa}
                  className="px-3 py-1.5 bg-[#1db954] hover:bg-[#1ed760] text-black font-bold text-xs rounded-full flex-shrink-0 ml-2 transition-transform active:scale-95 flex items-center gap-1.5"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>{isInstalled ? "Installée ✅" : "Installer"}</span>
                </button>
              </div>

              {showPwaGuide && (
                <div className="p-3 rounded-lg bg-[#181818] border border-[#333] space-y-2 text-[11px] text-zinc-300 animate-in fade-in">
                  <div className="font-bold text-[#1db954]">📱 Guide d'installation rapide :</div>
                  <ul className="list-disc list-inside space-y-1 text-zinc-400">
                    <li><strong className="text-white">Sur iPhone (Safari) :</strong> Appuyez sur le bouton Partager <Share2 className="w-3 h-3 inline text-blue-400" /> puis "Sur l'écran d'accueil".</li>
                    <li><strong className="text-white">Sur Android (Chrome) :</strong> Cliquez sur les 3 points en haut à droite puis "Installer l'application".</li>
                    <li><strong className="text-white">Sur PC/Mac :</strong> Cliquez sur l'icône d'installation dans la barre d'adresse Chrome/Edge.</li>
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* 3. Audio & Format Defaults */}
          <div className="space-y-2.5">
            <h4 className="text-[10px] sm:text-xs font-bold text-[#1db954] uppercase tracking-wider flex items-center gap-1.5">
              <FolderDown className="w-3.5 h-3.5" /> Formats & Transcodage
            </h4>

            {/* Default Format */}
            <div className="p-3 sm:p-4 rounded-xl bg-[#202020] border border-[#282828] space-y-2">
              <span className="text-xs sm:text-sm font-bold text-white block">Format de téléchargement par défaut</span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                {formatOptions.map((fmt) => {
                  const isSelected = (settings.defaultFormat || "mp3") === fmt.id;
                  return (
                    <button
                      key={fmt.id}
                      type="button"
                      onClick={() =>
                        updateSettings({
                          defaultFormat: fmt.id as any,
                          defaultDownloadMode: fmt.id === "original" ? "direct" : "converted",
                        })
                      }
                      className={`p-2 rounded-xl border text-left transition-all ${
                        isSelected
                          ? "bg-[#1db954]/20 border-[#1db954] text-white font-bold"
                          : "bg-[#242424] border-[#333] text-zinc-400 hover:bg-[#282828]"
                      }`}
                    >
                      <div className="text-xs font-bold text-white">{fmt.label}</div>
                      <div className="text-[9px] text-zinc-500">{fmt.sub}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Auto save toggle */}
            <div className="p-3 sm:p-4 rounded-xl bg-[#202020] border border-[#282828] flex items-center justify-between">
              <div>
                <span className="text-xs sm:text-sm font-bold text-white block">
                  Sauvegarde automatique dans les fichiers de l'appareil
                </span>
                <p className="text-[10px] sm:text-xs text-zinc-400 mt-0.5">
                  Télécharge directement le fichier dans votre dossier Téléchargements.
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.autoSaveToDevice}
                onChange={(e) => updateSettings({ autoSaveToDevice: e.target.checked })}
                className="w-4 h-4 accent-[#1db954] rounded cursor-pointer ml-2"
              />
            </div>

            {/* Default Bitrate */}
            <div className="p-3 sm:p-4 rounded-xl bg-[#202020] border border-[#282828] space-y-2">
              <span className="text-xs sm:text-sm font-bold text-white block">Débit MP3</span>
              <div className="grid grid-cols-3 gap-2 pt-1">
                {[
                  { value: 320, label: "320 kbps", sub: "HD Studio" },
                  { value: 192, label: "192 kbps", sub: "Standard" },
                  { value: 128, label: "128 kbps", sub: "Économique" },
                ].map((bitrate) => (
                  <button
                    key={bitrate.value}
                    onClick={() => updateSettings({ defaultBitrate: bitrate.value })}
                    className={`p-2 rounded-xl border text-center transition-all ${
                      settings.defaultBitrate === bitrate.value
                        ? "bg-[#1db954]/20 border-[#1db954] text-white font-bold"
                        : "bg-[#242424] border-[#333] text-zinc-300 hover:bg-[#282828]"
                    }`}
                  >
                    <div className="text-xs font-bold">{bitrate.label}</div>
                    <div className="text-[9px] text-zinc-400 mt-0.5">{bitrate.sub}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 4. Offline & Storage Info */}
          <div className="space-y-2.5">
            <h4 className="text-[10px] sm:text-xs font-bold text-[#1db954] uppercase tracking-wider flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5" /> Stockage & Bibliothèque ({downloadedTracks.length} titres • {totalMB} MB)
            </h4>

            <div className="p-3 sm:p-4 rounded-xl bg-[#202020] border border-[#282828] flex items-center justify-between">
              <div>
                <span className="text-xs sm:text-sm font-bold text-white block">Mode 100% Hors-Ligne</span>
                <p className="text-[10px] sm:text-xs text-zinc-400 mt-0.5">
                  Ne lit que vos morceaux stockés localement sans utiliser vos données mobiles.
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.offlineModeOnly}
                onChange={(e) => updateSettings({ offlineModeOnly: e.target.checked })}
                className="w-4 h-4 accent-[#1db954] rounded cursor-pointer ml-2"
              />
            </div>

            <div className="p-3 sm:p-4 rounded-xl bg-[#202020] border border-[#282828] flex items-center justify-between">
              <div>
                <span className="text-xs sm:text-sm font-bold text-white block">
                  Sauvegarde d'export JSON
                </span>
                <p className="text-[10px] sm:text-xs text-zinc-400 mt-0.5">
                  Exportez la liste de tous vos morceaux et playlists sous forme de fichier de sauvegarde.
                </p>
              </div>
              <button
                type="button"
                onClick={exportAllTracksAsBackup}
                className="px-3 py-1.5 bg-[#252525] hover:bg-[#333] text-zinc-200 font-semibold text-xs rounded-lg flex items-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Exporter</span>
              </button>
            </div>
          </div>

          {/* 5. Notifications */}
          <div className="space-y-2.5">
            <h4 className="text-[10px] sm:text-xs font-bold text-[#1db954] uppercase tracking-wider flex items-center gap-1.5">
              <Bell className="w-3.5 h-3.5" /> Notifications Système
            </h4>

            <div className="p-3 sm:p-4 rounded-xl bg-[#202020] border border-[#282828] flex items-center justify-between">
              <div>
                <span className="text-xs sm:text-sm font-bold text-white block">
                  Alertes nouveaux morceaux & fin de téléchargement
                </span>
                <p className="text-[10px] sm:text-xs text-zinc-400 mt-0.5">
                  Recevez des notifications desktop pour les conversions audio terminées.
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.enableDesktopNotifications}
                onChange={(e) => {
                  const enabled = e.target.checked;
                  updateSettings({ enableDesktopNotifications: enabled });
                  if (enabled && typeof window !== "undefined" && "Notification" in window) {
                    if (Notification.permission === "default") {
                      Notification.requestPermission();
                    }
                  }
                }}
                className="w-4 h-4 accent-[#1db954] rounded cursor-pointer ml-2"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-4 border-t border-[#282828] bg-[#141414] flex justify-end flex-shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-[#1db954] hover:bg-[#1ed760] text-black text-xs font-bold rounded-full transition-transform active:scale-95"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

