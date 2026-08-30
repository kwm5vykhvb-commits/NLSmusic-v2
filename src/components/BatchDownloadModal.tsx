import React, { useState } from "react";
import {
  Archive,
  X,
  Zap,
  Music,
  CheckCircle2,
  Sparkles,
  Layers,
  FileArchive,
  Download,
  FolderTree,
  Image as ImageIcon,
  Gauge,
  Tag,
} from "lucide-react";
import { Track, BatchZipOptions } from "../types";
import { useDownload } from "../context/DownloadContext";

interface BatchDownloadModalProps {
  tracks: Track[];
  title?: string;
  isOpen: boolean;
  onClose: () => void;
}

export const BatchDownloadModal: React.FC<BatchDownloadModalProps> = ({
  tracks,
  title = "Téléchargement par lot",
  isOpen,
  onClose,
}) => {
  const { startBatchDownload, batchProgress } = useDownload();
  const [selectedFormat, setSelectedFormat] = useState<"mp3" | "m4a" | "flac" | "wav" | "original">("mp3");
  const [selectedBitrate, setSelectedBitrate] = useState<number>(320);
  const [zipName, setZipName] = useState<string>(
    `NLSmusic_Selection_${tracks.length}_titres_${new Date().toISOString().slice(0, 10)}`
  );
  const [folderStructure, setFolderStructure] = useState<"flat" | "artist_album">("flat");
  const [includeCoverArt, setIncludeCoverArt] = useState<boolean>(true);
  const [compressionLevel, setCompressionLevel] = useState<"STORE" | "DEFLATE_FAST" | "DEFLATE_MAX">("DEFLATE_FAST");

  if (!isOpen || !tracks || tracks.length === 0) return null;

  const handleStart = async () => {
    const options: BatchZipOptions = {
      direct: selectedFormat === "original",
      format: selectedFormat,
      bitrate: selectedBitrate,
      zipName: zipName.trim() || `NLSmusic_Collection_${tracks.length}_titres`,
      folderStructure,
      includeCoverArt,
      compressionLevel,
    };
    await startBatchDownload(tracks, options);
  };

  const formats = [
    {
      id: "mp3",
      label: "MP3 Studio",
      badge: "Standard Universel",
      desc: "Idéal pour tout lecteur, téléphone, voiture et autoradio.",
    },
    {
      id: "m4a",
      label: "M4A / AAC",
      badge: "Haute Efficacité",
      desc: "Format optimisé Apple / iOS et lecteurs haute performance.",
    },
    {
      id: "flac",
      label: "FLAC (Lossless)",
      badge: "Qualité Audio Pure",
      desc: "Compression sans aucune perte pour équipement audiophile.",
    },
    {
      id: "wav",
      label: "WAV (PCM)",
      badge: "Studio Master",
      desc: "Audio non compressé d'échantillonnage studio.",
    },
    {
      id: "original",
      label: "⚡ Original Direct",
      badge: "Super Rapide",
      desc: "Flux audio brut direct sans transcodage.",
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-[#181818] border border-[#282828] w-full max-w-xl rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#282828] flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-[#1db954]/20 text-[#1db954] flex items-center justify-center">
              <Archive className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm sm:text-base">{title}</h3>
              <p className="text-[10px] sm:text-xs text-zinc-400">
                Création d'archive ZIP pour {tracks.length} morceau{tracks.length > 1 ? "x" : ""}
              </p>
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
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto custom-scrollbar flex-1 text-xs sm:text-sm">
          {/* Summary Box */}
          <div className="p-3.5 rounded-xl bg-[#222] border border-[#282828] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#1db954]/30 to-blue-600/30 flex items-center justify-center text-white font-bold">
                <FileArchive className="w-5 h-5 text-[#1db954]" />
              </div>
              <div>
                <div className="font-bold text-white text-xs sm:text-sm">
                  {tracks.length} titres sélectionnés
                </div>
                <div className="text-[10px] sm:text-xs text-zinc-400 mt-0.5">
                  Taille estimée : ~{(tracks.length * (selectedFormat === "flac" ? 25 : 8)).toFixed(0)} MB
                </div>
              </div>
            </div>
            <span className="text-[10px] bg-[#1db954]/20 text-[#1db954] px-2 py-0.5 rounded-full font-bold">
              Archive .ZIP
            </span>
          </div>

          {/* Custom ZIP Filename */}
          <div className="space-y-1.5">
            <label className="block text-[10px] sm:text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-[#1db954]" /> Nom de l'archive ZIP
            </label>
            <div className="flex items-center bg-[#202020] border border-[#282828] focus-within:border-[#1db954] rounded-xl px-3 py-2 transition-colors">
              <input
                type="text"
                value={zipName}
                onChange={(e) => setZipName(e.target.value)}
                placeholder="Mon_Archive_NLSmusic"
                className="bg-transparent text-white text-xs sm:text-sm flex-1 outline-none font-mono placeholder:text-zinc-500"
              />
              <span className="text-zinc-500 text-xs font-mono">.zip</span>
            </div>
          </div>

          {/* Format selection */}
          <div className="space-y-2">
            <label className="block text-[10px] sm:text-xs font-bold text-zinc-300 uppercase tracking-wider">
              Format audio pour l'archive
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {formats.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setSelectedFormat(f.id as any)}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    selectedFormat === f.id
                      ? "bg-[#1db954]/15 border-[#1db954] text-white ring-1 ring-[#1db954]"
                      : "bg-[#202020] border-[#282828] text-zinc-400 hover:bg-[#252525]"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-white text-xs">{f.label}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-zinc-300 font-bold">
                      {f.badge}
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-400 leading-tight">{f.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Bitrate selection if MP3 */}
          {selectedFormat === "mp3" && (
            <div className="space-y-1.5 animate-in fade-in duration-150">
              <label className="block text-[10px] sm:text-xs font-bold text-zinc-300 uppercase tracking-wider">
                Débit MP3
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 320, label: "320 kbps HD", sub: "Meilleure qualité" },
                  { value: 192, label: "192 kbps", sub: "Standard" },
                  { value: 128, label: "128 kbps", sub: "Léger" },
                ].map((b) => (
                  <button
                    key={b.value}
                    type="button"
                    onClick={() => setSelectedBitrate(b.value)}
                    className={`p-2 rounded-xl border text-center transition-all ${
                      selectedBitrate === b.value
                        ? "bg-[#1db954]/20 border-[#1db954] text-white font-bold"
                        : "bg-[#202020] border-[#282828] text-zinc-400 hover:bg-[#252525]"
                    }`}
                  >
                    <div className="text-xs font-bold">{b.label}</div>
                    <div className="text-[9px] text-zinc-500">{b.sub}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ZIP Structure & Options */}
          <div className="space-y-2 pt-1 border-t border-[#282828]">
            <label className="block text-[10px] sm:text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
              <FolderTree className="w-3.5 h-3.5 text-[#1db954]" /> Organisation dans l'archive ZIP
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFolderStructure("flat")}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  folderStructure === "flat"
                    ? "bg-[#1db954]/15 border-[#1db954] text-white ring-1 ring-[#1db954]"
                    : "bg-[#202020] border-[#282828] text-zinc-400 hover:bg-[#252525]"
                }`}
              >
                <div className="font-bold text-white text-xs">À plat (Dossier racine)</div>
                <div className="text-[10px] text-zinc-400 mt-0.5">Artiste - Titre.mp3</div>
              </button>

              <button
                type="button"
                onClick={() => setFolderStructure("artist_album")}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  folderStructure === "artist_album"
                    ? "bg-[#1db954]/15 border-[#1db954] text-white ring-1 ring-[#1db954]"
                    : "bg-[#202020] border-[#282828] text-zinc-400 hover:bg-[#252525]"
                }`}
              >
                <div className="font-bold text-white text-xs">Sous-dossiers classés</div>
                <div className="text-[10px] text-zinc-400 mt-0.5">Artiste / Album / Titre.mp3</div>
              </button>
            </div>
          </div>

          {/* Extra options: Cover Art & Compression Mode */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            {/* Cover art toggle */}
            <div
              onClick={() => setIncludeCoverArt(!includeCoverArt)}
              className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                includeCoverArt
                  ? "bg-[#202020] border-[#1db954]/60 text-white"
                  : "bg-[#1c1c1c] border-[#282828] text-zinc-400"
              }`}
            >
              <div className="flex items-center gap-2">
                <ImageIcon className={`w-4 h-4 ${includeCoverArt ? "text-[#1db954]" : "text-zinc-500"}`} />
                <div>
                  <div className="text-xs font-semibold text-white">Pochettes HD (cover.jpg)</div>
                  <div className="text-[10px] text-zinc-400">Inclure les jaquettes dans le ZIP</div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={includeCoverArt}
                onChange={() => {}}
                className="w-4 h-4 accent-[#1db954] cursor-pointer"
              />
            </div>

            {/* Compression level */}
            <div className="p-3 rounded-xl bg-[#202020] border border-[#282828] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Gauge className="w-4 h-4 text-[#1db954]" />
                <div>
                  <div className="text-xs font-semibold text-white">Mode de compression</div>
                  <div className="text-[10px] text-zinc-400">Vitesse vs taille finale</div>
                </div>
              </div>
              <select
                value={compressionLevel}
                onChange={(e) => setCompressionLevel(e.target.value as any)}
                className="bg-[#181818] border border-[#333] text-white text-[11px] rounded-lg px-2 py-1 outline-none focus:border-[#1db954]"
              >
                <option value="STORE">Ultra-rapide (Store)</option>
                <option value="DEFLATE_FAST">Standard</option>
                <option value="DEFLATE_MAX">Max (Compact)</option>
              </select>
            </div>
          </div>

          {/* Active progress */}
          {batchProgress && (
            <div className="p-3.5 rounded-xl bg-[#1db954]/10 border border-[#1db954]/30 space-y-2 animate-in fade-in duration-200">
              <div className="flex items-center justify-between text-xs font-bold text-white">
                <span className="flex items-center gap-1.5 text-[#1db954] truncate max-w-[280px]">
                  <Sparkles className="w-3.5 h-3.5 animate-spin flex-shrink-0" />
                  <span className="truncate">{batchProgress.currentTitle}</span>
                </span>
                <span className="font-mono flex-shrink-0">{batchProgress.percent}%</span>
              </div>
              <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-[#1db954] h-full transition-all duration-200 rounded-full"
                  style={{ width: `${batchProgress.percent}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-zinc-400">
                <span>
                  Progression : {batchProgress.current} / {batchProgress.total} morceaux
                </span>
                <span className="flex items-center gap-2">
                  {batchProgress.eta && <span className="text-zinc-300 font-mono">{batchProgress.eta}</span>}
                  <span>
                    {batchProgress.status === "zipping"
                      ? "📦 Compression ZIP en cours..."
                      : batchProgress.status === "completed"
                      ? "✅ Téléchargement prêt"
                      : "⚡ Téléchargement des flux"}
                  </span>
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-4 border-t border-[#282828] bg-[#141414] flex items-center justify-end gap-2 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-3.5 py-2 text-xs font-semibold text-zinc-400 hover:text-white rounded-lg transition-colors"
          >
            Fermer
          </button>
          <button
            onClick={handleStart}
            disabled={batchProgress !== null && batchProgress.percent < 100}
            className="px-5 py-2 bg-[#1db954] hover:bg-[#1ed760] disabled:bg-zinc-800 disabled:text-zinc-600 text-black text-xs font-black rounded-full flex items-center gap-1.5 transition-transform active:scale-95 shadow-md shadow-[#1db954]/20"
          >
            <Download className="w-3.5 h-3.5" />
            <span>
              {batchProgress
                ? "Génération en cours..."
                : `Télécharger l'archive ZIP (${tracks.length} titres)`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
