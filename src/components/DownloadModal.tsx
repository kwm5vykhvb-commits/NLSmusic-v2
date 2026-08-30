import React, { useState } from "react";
import {
  Download,
  X,
  Zap,
  Music,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  FileAudio,
  FolderDown,
  Gauge,
  Tag,
  Disc,
  Calendar,
  Radio,
  Sliders,
} from "lucide-react";
import { Track } from "../types";
import { useDownload, DownloadOptions } from "../context/DownloadContext";

interface DownloadModalProps {
  track: Track | null;
  onClose: () => void;
}

export const DownloadModal: React.FC<DownloadModalProps> = ({ track, onClose }) => {
  const { startDownload, tasks, settings, updateSettings, isDownloaded } = useDownload();
  const [downloadFormat, setDownloadFormat] = useState<"mp3" | "m4a" | "flac" | "wav" | "original">(
    settings.defaultDownloadMode === "direct" ? "original" : settings.defaultFormat || "mp3"
  );
  const [selectedBitrate, setSelectedBitrate] = useState<number>(settings.defaultBitrate || 320);
  const [autoSaveToDevice, setAutoSaveToDevice] = useState(settings.autoSaveToDevice);
  
  // Custom Tag fields
  const [showTagCustomizer, setShowTagCustomizer] = useState(false);
  const [customTitle, setCustomTitle] = useState(track?.title || "");
  const [customArtist, setCustomArtist] = useState(track?.artist || "");
  const [customAlbum, setCustomAlbum] = useState(track?.album || "NLSmusic Studio");
  const [customGenre, setCustomGenre] = useState(track?.customGenre || "Musique");
  const [customYear, setCustomYear] = useState(track?.year || new Date().getFullYear().toString());

  if (!track) return null;

  const currentTask = tasks.find((t) => t.track.id === track.id);
  const isAlreadyDownloaded = isDownloaded(track.id);

  const handleStart = async () => {
    if (autoSaveToDevice !== settings.autoSaveToDevice) {
      updateSettings({ autoSaveToDevice });
    }
    const isDirect = downloadFormat === "original";
    const downloadOpts: DownloadOptions = {
      direct: isDirect,
      format: downloadFormat,
      bitrate: selectedBitrate,
      album: customAlbum.trim() || undefined,
      genre: customGenre.trim() || undefined,
      year: customYear.trim() || undefined,
    };

    const customizedTrack: Track = {
      ...track,
      title: customTitle.trim() || track.title,
      artist: customArtist.trim() || track.artist,
      album: customAlbum.trim() || track.album,
      customGenre: customGenre.trim() || track.customGenre,
      year: customYear.trim() || track.year,
    };

    await startDownload(customizedTrack, downloadOpts);
  };

  const formatList = [
    {
      id: "mp3",
      label: "MP3 Studio",
      badge: "Standard Universel",
      desc: "Idéal pour téléphone, autoradio et tout lecteur MP3.",
      icon: Music,
    },
    {
      id: "m4a",
      label: "M4A / AAC",
      badge: "Haute Fidélité",
      desc: "Qualité optimisée iOS/Apple avec compression AAC.",
      icon: FileAudio,
    },
    {
      id: "flac",
      label: "FLAC Lossless",
      badge: "Audiophile",
      desc: "Audio sans perte de qualité studio intégrale.",
      icon: Disc,
    },
    {
      id: "wav",
      label: "WAV Master",
      badge: "Non-Compressé",
      desc: "Échantillonnage brut studio non compressé.",
      icon: Sliders,
    },
    {
      id: "original",
      label: "⚡ Original Direct",
      badge: "Super Rapide",
      desc: "Téléchargement direct sans réencodage.",
      icon: Zap,
    },
  ];

  const bitrates = [
    {
      value: 320,
      label: "320 kbps HD (Qualité Max)",
      badge: "Recommandé",
      desc: "Qualité studio idéale pour casque & enceintes (~8-12 MB)",
    },
    {
      value: 192,
      label: "192 kbps (Standard)",
      badge: "Équilibré",
      desc: "Bonne fidélité avec taille réduite (~5-7 MB)",
    },
    {
      value: 128,
      label: "128 kbps (Économie)",
      badge: "Léger",
      desc: "Économise le stockage (~3-4 MB)",
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div
        id="modal-download-mp3"
        className="bg-[#181818] border border-[#282828] w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl max-h-[92vh] flex flex-col"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#282828] flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-[#1db954]/20 text-[#1db954] flex items-center justify-center">
              <Download className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm sm:text-base">Téléchargement & Transcodage</h3>
              <p className="text-[10px] sm:text-xs text-zinc-400">MP3, M4A, FLAC, WAV, tags ID3 & hors-ligne</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto custom-scrollbar flex-1">
          {/* Track Preview */}
          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-[#222] border border-[#282828]">
            <img
              src={
                track.thumbnail ||
                "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop"
              }
              alt={track.title}
              referrerPolicy="no-referrer"
              className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
            />
            <div className="min-w-0 flex-1">
              <h4 className="font-bold text-white text-xs sm:text-sm truncate">{track.title}</h4>
              <p className="text-[11px] text-zinc-400 truncate">{track.artist}</p>
              <div className="flex items-center gap-2 mt-0.5 text-[10px] text-zinc-500">
                <span>{track.durationFormatted || "3:20"}</span>
                <span>•</span>
                <span className="text-[#1db954] font-medium">Transcodage FFmpeg Studio</span>
              </div>
            </div>
          </div>

          {/* Audio Format Selector */}
          <div>
            <label className="block text-[10px] sm:text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">
              Format de sortie
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {formatList.map((f) => {
                const IconComponent = f.icon;
                const isSelected = downloadFormat === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setDownloadFormat(f.id as any)}
                    className={`p-2.5 rounded-xl border text-left transition-all relative ${
                      isSelected
                        ? "bg-[#1db954]/15 border-[#1db954] text-white ring-1 ring-[#1db954]"
                        : "bg-[#202020] border-[#282828] text-zinc-400 hover:bg-[#252525]"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                        <IconComponent className={`w-3.5 h-3.5 ${f.id === "original" ? "text-amber-400 fill-amber-400" : "text-[#1db954]"}`} />
                        <span>{f.label}</span>
                      </div>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                        f.id === "original" ? "bg-amber-400/20 text-amber-300" : "bg-[#1db954]/20 text-[#1db954]"
                      }`}>
                        {f.badge}
                      </span>
                    </div>
                    <p className="text-[10px] text-zinc-400 leading-tight">
                      {f.desc}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bitrate Selector (if MP3 or M4A) */}
          {(downloadFormat === "mp3" || downloadFormat === "m4a") && (
            <div className="animate-in fade-in duration-150 space-y-1.5">
              <label className="block text-[10px] sm:text-xs font-bold text-zinc-300 uppercase tracking-wider">
                Débit Audio (Bitrate)
              </label>
              <div className="space-y-1.5">
                {bitrates.map((b) => (
                  <label
                    key={b.value}
                    className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                      selectedBitrate === b.value
                        ? "bg-[#1db954]/10 border-[#1db954] text-white"
                        : "bg-[#202020] border-[#282828] text-zinc-300 hover:bg-[#252525]"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="radio"
                        name="bitrate"
                        checked={selectedBitrate === b.value}
                        onChange={() => setSelectedBitrate(b.value)}
                        className="accent-[#1db954]"
                      />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-white">{b.label}</span>
                          <span
                            className={`text-[9px] px-1 py-0.2 rounded font-bold ${
                              selectedBitrate === b.value
                                ? "bg-[#1db954] text-black"
                                : "bg-[#333] text-zinc-300"
                            }`}
                          >
                            {b.badge}
                          </span>
                        </div>
                        <p className="text-[10px] text-zinc-400">{b.desc}</p>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* ID3 Tags Customizer Accordion */}
          <div className="rounded-xl bg-[#202020] border border-[#282828] overflow-hidden">
            <button
              type="button"
              onClick={() => setShowTagCustomizer(!showTagCustomizer)}
              className="w-full p-3 flex items-center justify-between text-left hover:bg-[#252525] transition-colors"
            >
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <Tag className="w-3.5 h-3.5 text-[#1db954]" />
                <span>Personnaliser les métadonnées & Tags ID3</span>
              </div>
              <span className="text-[10px] text-[#1db954] font-semibold">
                {showTagCustomizer ? "Masquer" : "Modifier"}
              </span>
            </button>

            {showTagCustomizer && (
              <div className="p-3 pt-0 border-t border-[#282828] space-y-2.5 mt-2 animate-in fade-in duration-150">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-400 font-medium">Titre</label>
                    <input
                      type="text"
                      value={customTitle}
                      onChange={(e) => setCustomTitle(e.target.value)}
                      className="w-full bg-[#181818] border border-[#333] rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-[#1db954]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-400 font-medium">Artiste</label>
                    <input
                      type="text"
                      value={customArtist}
                      onChange={(e) => setCustomArtist(e.target.value)}
                      className="w-full bg-[#181818] border border-[#333] rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-[#1db954]"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-400 font-medium">Album</label>
                    <input
                      type="text"
                      value={customAlbum}
                      onChange={(e) => setCustomAlbum(e.target.value)}
                      className="w-full bg-[#181818] border border-[#333] rounded-lg px-2 py-1.5 text-xs text-white outline-none focus:border-[#1db954]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-400 font-medium">Genre</label>
                    <input
                      type="text"
                      value={customGenre}
                      onChange={(e) => setCustomGenre(e.target.value)}
                      className="w-full bg-[#181818] border border-[#333] rounded-lg px-2 py-1.5 text-xs text-white outline-none focus:border-[#1db954]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-400 font-medium">Année</label>
                    <input
                      type="text"
                      value={customYear}
                      onChange={(e) => setCustomYear(e.target.value)}
                      className="w-full bg-[#181818] border border-[#333] rounded-lg px-2 py-1.5 text-xs text-white outline-none focus:border-[#1db954]"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Auto-Save option */}
          <div className="p-3 rounded-xl bg-[#202020] border border-[#282828] flex items-center justify-between">
            <div className="flex items-start gap-2.5">
              <FolderDown className="w-4 h-4 text-[#1db954] flex-shrink-0 mt-0.5" />
              <div>
                <span className="text-xs font-bold text-white block">
                  Sauvegarder dans les fichiers de l'appareil
                </span>
                <p className="text-[10px] text-zinc-400">
                  Enregistre automatiquement le fichier audio dans votre dossier Téléchargements.
                </p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={autoSaveToDevice}
              onChange={(e) => setAutoSaveToDevice(e.target.checked)}
              className="w-4 h-4 accent-[#1db954] cursor-pointer ml-2"
            />
          </div>

          {/* Download progress info if downloading */}
          {currentTask && (
            <div className="p-3 rounded-xl bg-[#1db954]/10 border border-[#1db954]/30 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-white">
                <span className="flex items-center gap-1.5 text-[#1db954]">
                  <Sparkles className="w-3.5 h-3.5 animate-spin" />
                  {currentTask.status === "downloading"
                    ? "Téléchargement du flux..."
                    : currentTask.status === "converting"
                    ? `Transcodage FFmpeg ${downloadFormat.toUpperCase()} & Tags ID3...`
                    : "Terminé !"}
                </span>
                <span className="font-mono">{currentTask.progress}%</span>
              </div>
              <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-[#1db954] h-full transition-all duration-200 rounded-full"
                  style={{ width: `${currentTask.progress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-3.5 sm:p-4 border-t border-[#282828] bg-[#141414] flex items-center justify-end gap-2 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-3.5 py-2 text-xs font-semibold text-zinc-400 hover:text-white rounded-lg transition-colors"
          >
            Fermer
          </button>
          <button
            onClick={handleStart}
            disabled={currentTask?.status === "downloading" || currentTask?.status === "converting"}
            className="px-5 py-2 bg-[#1db954] hover:bg-[#1ed760] disabled:bg-zinc-800 disabled:text-zinc-600 text-black text-xs font-black rounded-full flex items-center gap-1.5 transition-transform active:scale-95 shadow-md shadow-[#1db954]/20"
          >
            {downloadFormat === "original" ? (
              <Zap className="w-3.5 h-3.5 fill-black" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            <span>
              {downloadFormat === "original"
                ? "Télécharger Directement (Instantané)"
                : isAlreadyDownloaded
                ? `Re-télécharger ${downloadFormat.toUpperCase()}`
                : `Convertir & Télécharger ${downloadFormat.toUpperCase()}`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};


