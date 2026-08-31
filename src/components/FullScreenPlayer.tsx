import React, { useState } from "react";
import {
  ChevronDown,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Heart,
  Download,
  Check,
  Music2,
  Mic2,
  ListMusic,
  Share2,
  Tv,
} from "lucide-react";
import { useAudio } from "../context/AudioContext";
import { useDownload } from "../context/DownloadContext";

interface FullScreenPlayerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenDownloadModal?: () => void;
}

export const FullScreenPlayer: React.FC<FullScreenPlayerProps> = ({
  isOpen,
  onClose,
  onOpenDownloadModal,
}) => {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    isShuffle,
    repeatMode,
    isBuffering,
    togglePlay,
    seek,
    toggleShuffle,
    toggleRepeat,
    nextTrack,
    previousTrack,
  } = useAudio();

  const { isDownloaded, isFavorite, toggleFavorite, startDownload, settings } = useDownload();
  const [showLyricsPeek, setShowLyricsPeek] = useState(false);
  const [isVideoMode, setIsVideoMode] = useState(false);

  if (!isOpen || !currentTrack) return null;

  const downloaded = isDownloaded(currentTrack.id) || currentTrack.isDownloaded;
  const favorited = isFavorite(currentTrack.id);

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return "0:00";
    const mins = Math.floor(secs / 60);
    const remainder = Math.floor(secs % 60);
    return `${mins}:${remainder < 10 ? "0" : ""}${remainder}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      id="fullscreen-player-modal"
      className="fixed inset-0 z-50 bg-gradient-to-b from-[#1c1c1e] via-[#121212] to-[#000000] flex flex-col justify-between p-4 sm:p-8 pt-[calc(env(safe-area-inset-top,12px)+12px)] pb-[calc(env(safe-area-inset-bottom,16px)+16px)] animate-in fade-in slide-in-from-bottom-6 duration-300 select-none overflow-y-auto"
    >
      {/* Top Header with Drag Handle & Close */}
      <div className="flex items-center justify-between max-w-md md:max-w-xl mx-auto w-full">
        <button
          onClick={onClose}
          className="p-2 -ml-2 rounded-full text-zinc-400 hover:text-white active:scale-90 transition-transform"
          title="Fermer"
        >
          <ChevronDown className="w-6 h-6" />
        </button>

        <div className="text-center">
          <span className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase block">
            Lecture en cours
          </span>
          <span className="text-xs font-extrabold text-white">NLSmusic</span>
        </div>

        <div className="w-6" />
      </div>

      {/* Center Section: Album Art or YouTube Video & Info */}
      <div className="flex flex-col items-center justify-center my-auto max-w-md md:max-w-xl mx-auto w-full py-4 space-y-4">
        {/* Toggle Mode: Audio Art vs YouTube Video */}
        <div className="flex items-center gap-1 bg-white/5 p-1 rounded-full border border-white/10 text-xs">
          <button
            onClick={() => setIsVideoMode(false)}
            className={`px-3 py-1 rounded-full transition-all font-semibold ${
              !isVideoMode
                ? "bg-white text-black shadow"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Pochette
          </button>
          <button
            onClick={() => setIsVideoMode(true)}
            className={`px-3 py-1 rounded-full transition-all font-semibold flex items-center gap-1.5 ${
              isVideoMode
                ? "bg-[#ff0000] text-white shadow"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Tv className="w-3.5 h-3.5" />
            Vidéo YouTube
          </button>
        </div>

        {/* Album Artwork or YouTube Video Frame */}
        {isVideoMode ? (
          <div className="relative w-full aspect-video rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl shadow-black bg-black border border-white/10 flex-shrink-0">
            <iframe
              src={`https://www.youtube.com/embed/${currentTrack.id}?autoplay=1&playsinline=1&rel=0`}
              title={currentTrack.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full border-0"
            />
          </div>
        ) : (
          <div className="relative w-64 h-64 sm:w-80 sm:h-80 aspect-square rounded-3xl overflow-hidden shadow-2xl shadow-black bg-[#282828] flex-shrink-0">
            <img
              src={
                currentTrack.thumbnail ||
                "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop"
              }
              alt={currentTrack.title}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />

            {/* Equalizer indicator */}
            {isPlaying && (
              <div className="absolute bottom-3 left-3 right-3 flex items-end justify-center gap-1 h-8 bg-black/40 backdrop-blur-md rounded-xl p-1.5">
                {Array.from({ length: 16 }).map((_, i) => (
                  <span
                    key={i}
                    className="w-1 bg-[#1db954] rounded-full animate-pulse"
                    style={{
                      height: `${Math.max(20, Math.sin(i * 0.7 + Date.now() / 300) * 100)}%`,
                      animationDuration: `${0.35 + (i % 4) * 0.12}s`,
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Track Title & Artist & Quick Actions */}
        <div className="w-full flex items-center justify-between gap-3 px-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-black text-white truncate font-['Outfit']">
                {currentTrack.title}
              </h2>
              {downloaded && (
                <span className="text-[9px] bg-[#1db954]/20 text-[#1db954] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0">
                  MP3
                </span>
              )}
            </div>
            <p className="text-sm font-semibold text-zinc-400 truncate mt-0.5">
              {currentTrack.artist}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => toggleFavorite(currentTrack)}
              className={`p-2.5 rounded-full bg-white/5 active:scale-90 transition-transform ${
                favorited ? "text-[#1db954]" : "text-zinc-400 hover:text-white"
              }`}
              title={favorited ? "Favoris" : "Ajouter aux favoris"}
            >
              <Heart className={`w-5 h-5 ${favorited ? "fill-[#1db954]" : ""}`} />
            </button>

            <button
              onClick={() => {
                if (onOpenDownloadModal) onOpenDownloadModal();
                else startDownload(currentTrack, settings.defaultBitrate || 320);
              }}
              className={`p-2.5 rounded-full active:scale-90 transition-transform ${
                downloaded
                  ? "bg-[#1db954]/20 text-[#1db954] border border-[#1db954]/30"
                  : "bg-white/5 text-zinc-400 hover:text-white"
              }`}
              title={downloaded ? "Sauvegardé sur l'appareil" : "Télécharger MP3"}
            >
              {downloaded ? <Check className="w-5 h-5 stroke-[2.5]" /> : <Download className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Controls Area */}
      <div className="max-w-md md:max-w-xl mx-auto w-full space-y-5">
        {/* Scrubber */}
        <div className="space-y-1.5">
          <div className="relative flex items-center group h-4 cursor-pointer">
            <input
              type="range"
              min={0}
              max={duration || 100}
              step={0.1}
              value={currentTime}
              onChange={(e) => seek(parseFloat(e.target.value))}
              className="absolute inset-0 w-full h-full opacity-0 z-20 cursor-pointer"
            />
            <div className="w-full bg-white/20 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-white group-hover:bg-[#1db954] h-full rounded-full transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center justify-between px-2">
          <button
            onClick={toggleShuffle}
            className={`p-2 active:scale-90 transition-transform ${
              isShuffle ? "text-[#1db954]" : "text-zinc-400 hover:text-white"
            }`}
          >
            <Shuffle className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-6">
            <button
              onClick={previousTrack}
              className="p-2 text-white active:scale-90 transition-transform"
            >
              <SkipBack className="w-7 h-7 fill-current" />
            </button>

            <button
              onClick={togglePlay}
              disabled={isBuffering}
              className="w-16 h-16 rounded-full bg-white text-black flex items-center justify-center shadow-2xl active:scale-95 transition-transform"
            >
              {isBuffering ? (
                <div className="w-6 h-6 border-3 border-black border-t-transparent rounded-full animate-spin" />
              ) : isPlaying ? (
                <Pause className="w-8 h-8 fill-black" />
              ) : (
                <Play className="w-8 h-8 fill-black translate-x-0.5" />
              )}
            </button>

            <button
              onClick={nextTrack}
              className="p-2 text-white active:scale-90 transition-transform"
            >
              <SkipForward className="w-7 h-7 fill-current" />
            </button>
          </div>

          <button
            onClick={toggleRepeat}
            className={`p-2 active:scale-90 transition-transform ${
              repeatMode !== "off" ? "text-[#1db954]" : "text-zinc-400 hover:text-white"
            }`}
          >
            {repeatMode === "one" ? <Repeat1 className="w-5 h-5" /> : <Repeat className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </div>
  );
};
