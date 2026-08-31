import React, { useState } from "react";
import {
  X,
  Minimize2,
  Maximize2,
  Tv,
  Download,
  Heart,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Track } from "../types";
import { useAudio } from "../context/AudioContext";
import { useDownload } from "../context/DownloadContext";

interface YouTubeMiniPlayerProps {
  onOpenDownloadModal?: (track: Track) => void;
}

export const YouTubeMiniPlayer: React.FC<YouTubeMiniPlayerProps> = ({
  onOpenDownloadModal,
}) => {
  const {
    currentTrack,
    isYouTubeOpen,
    setIsYouTubeOpen,
    isYouTubeMinimized,
    setIsYouTubeMinimized,
  } = useAudio();
  const { isDownloaded, isFavorite, toggleFavorite, startDownload, settings } =
    useDownload();

  const [isExpanded, setIsExpanded] = useState(false);

  if (!isYouTubeOpen || !currentTrack) {
    return null;
  }

  const downloaded = isDownloaded(currentTrack.id) || currentTrack.isDownloaded;
  const favorited = isFavorite(currentTrack.id);

  // Extract clean videoId for YouTube embed
  let videoId = currentTrack.id;
  if (videoId.includes("youtube.com") || videoId.includes("youtu.be")) {
    const match =
      videoId.match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/) ||
      currentTrack.url?.match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/);
    if (match && match[1]) {
      videoId = match[1];
    }
  }

  // Minimized Pill view
  if (isYouTubeMinimized) {
    return (
      <div
        id="youtube-mini-pill"
        className="fixed bottom-24 md:bottom-24 right-4 z-50 flex items-center gap-2 bg-[#1f1f1f]/95 backdrop-blur-md border border-[#ff0000]/40 text-white px-3 py-2 rounded-full shadow-2xl animate-in fade-in slide-in-from-bottom-2 select-none group hover:border-[#ff0000] transition-all cursor-pointer"
        onClick={() => setIsYouTubeMinimized(false)}
      >
        <div className="relative w-7 h-7 rounded-full overflow-hidden bg-black flex-shrink-0 flex items-center justify-center border border-white/20">
          <img
            src={currentTrack.thumbnail}
            alt={currentTrack.title}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <Tv className="w-3.5 h-3.5 text-[#ff0000]" />
          </div>
        </div>

        <div className="max-w-[130px] sm:max-w-[180px] truncate">
          <p className="text-[11px] font-bold text-white truncate leading-tight">
            {currentTrack.title}
          </p>
          <span className="text-[9px] text-[#ff4e4e] flex items-center gap-1 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-[#ff0000] animate-pulse" />
            Vidéo YouTube
          </span>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsYouTubeMinimized(false);
          }}
          className="p-1 rounded-full text-zinc-400 hover:text-white transition-colors"
          title="Agrandir la fenêtre vidéo"
        >
          <ChevronUp className="w-4 h-4" />
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsYouTubeOpen(false);
          }}
          className="p-1 rounded-full text-zinc-400 hover:text-red-400 transition-colors"
          title="Fermer la vidéo"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div
      id="youtube-floating-player"
      className={`fixed z-50 transition-all duration-300 ease-out shadow-2xl rounded-2xl overflow-hidden border border-zinc-700/80 bg-[#121212] backdrop-blur-xl ${
        isExpanded
          ? "bottom-24 right-2 sm:right-6 w-[calc(100vw-16px)] sm:w-[540px] md:w-[640px] max-h-[85vh]"
          : "bottom-24 right-2 sm:right-6 w-[310px] sm:w-[360px] md:w-[400px]"
      }`}
    >
      {/* Top Header Bar */}
      <div className="bg-[#181818] px-3.5 py-2 flex items-center justify-between border-b border-white/10 select-none">
        <div className="flex items-center gap-2 min-w-0 flex-1 pr-2">
          <div className="w-5 h-5 rounded-md bg-[#ff0000] flex items-center justify-center text-white flex-shrink-0 shadow-sm">
            <Tv className="w-3 h-3 fill-current" />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-xs font-bold text-white truncate leading-tight">
              {currentTrack.title}
            </h4>
            <p className="text-[10px] text-zinc-400 truncate">
              {currentTrack.artist}
            </p>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Expand / Minimize Size */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
            title={isExpanded ? "Taille normale" : "Agrandir le lecteur"}
          >
            {isExpanded ? (
              <Minimize2 className="w-3.5 h-3.5" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5" />
            )}
          </button>

          {/* Minimize to Pill */}
          <button
            onClick={() => setIsYouTubeMinimized(true)}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Réduire en coin"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>

          {/* Close Video Window */}
          <button
            onClick={() => setIsYouTubeOpen(false)}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            title="Fermer la vidéo"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* YouTube Video iFrame Container */}
      <div className="relative aspect-video w-full bg-black">
        <iframe
          id="youtube-embed-frame"
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1&playsinline=1&rel=0&modestbranding=1`}
          title={currentTrack.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="absolute inset-0 w-full h-full border-0"
        />
      </div>

      {/* Bottom Controls & Download/Fav Actions */}
      <div className="px-3.5 py-2.5 bg-[#181818] flex items-center justify-between text-xs text-zinc-300 border-t border-white/5">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#ff0000]/15 text-[#ff4e4e] text-[10px] font-bold border border-[#ff0000]/30">
            <span className="w-1.5 h-1.5 rounded-full bg-[#ff0000] animate-ping" />
            YouTube Direct
          </span>

          <button
            onClick={() => toggleFavorite(currentTrack)}
            className={`p-1 rounded-full hover:text-white transition-colors ${
              favorited ? "text-[#1db954]" : "text-zinc-400"
            }`}
            title="Favoris"
          >
            <Heart className={`w-3.5 h-3.5 ${favorited ? "fill-[#1db954]" : ""}`} />
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Direct link to original YouTube */}
          <a
            href={`https://www.youtube.com/watch?v=${videoId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1 rounded-lg text-zinc-400 hover:text-white transition-colors"
            title="Ouvrir sur YouTube"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          {/* Télécharger MP3 (Triggers exact same existing modal) */}
          <button
            onClick={() => {
              if (onOpenDownloadModal) {
                onOpenDownloadModal(currentTrack);
              } else {
                startDownload(currentTrack, settings.defaultBitrate || 320);
              }
            }}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#1db954] hover:bg-[#1ed760] text-black font-bold text-[11px] shadow transition-all active:scale-95"
            title="Télécharger le fichier MP3"
          >
            <Download className="w-3 h-3 stroke-[2.5]" />
            <span>Télécharger</span>
          </button>
        </div>
      </div>
    </div>
  );
};
