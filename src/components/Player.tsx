import React, { useState } from "react";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Volume2,
  VolumeX,
  Volume1,
  Maximize2,
  ListMusic,
  Mic2,
  Heart,
  Download,
  Check,
  Radio,
  ChevronUp,
} from "lucide-react";
import { useAudio } from "../context/AudioContext";
import { useDownload } from "../context/DownloadContext";

interface PlayerProps {
  onToggleQueue: () => void;
  onToggleLyrics: () => void;
  onToggleFullScreen: () => void;
  onOpenDownloadModal?: () => void;
}

export const Player: React.FC<PlayerProps> = ({
  onToggleQueue,
  onToggleLyrics,
  onToggleFullScreen,
  onOpenDownloadModal,
}) => {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    isShuffle,
    repeatMode,
    isBuffering,
    togglePlay,
    seek,
    setVolume,
    toggleMute,
    toggleShuffle,
    toggleRepeat,
    nextTrack,
    previousTrack,
  } = useAudio();

  const { isDownloaded, isFavorite, toggleFavorite, startDownload, settings } = useDownload();
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekValue, setSeekValue] = useState(0);

  if (!currentTrack) {
    return null;
  }

  const downloaded = isDownloaded(currentTrack.id) || currentTrack.isDownloaded;
  const favorited = isFavorite(currentTrack.id);

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return "0:00";
    const mins = Math.floor(secs / 60);
    const remainder = Math.floor(secs % 60);
    return `${mins}:${remainder < 10 ? "0" : ""}${remainder}`;
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSeekValue(parseFloat(e.target.value));
  };

  const handleSeekStart = () => {
    setIsSeeking(true);
  };

  const handleSeekEnd = () => {
    seek(seekValue);
    setIsSeeking(false);
  };

  const progressPercent = duration > 0 ? ((isSeeking ? seekValue : currentTime) / duration) * 100 : 0;

  return (
    <>
      {/* ========================================================================= */}
      {/* MOBILE MINI PLAYER (Phone View: iPhone & Android)                         */}
      {/* Docked right above the mobile bottom navigation bar                       */}
      {/* ========================================================================= */}
      <div
        id="mobile-mini-player"
        className="md:hidden fixed bottom-[calc(env(safe-area-inset-bottom,8px)+60px)] left-2 right-2 z-30 bg-[#1c1c1e]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden cursor-pointer select-none transition-all active:scale-[0.99]"
        onClick={onToggleFullScreen}
      >
        <div className="p-2 flex items-center justify-between gap-2.5">
          {/* Artwork & Info */}
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-[#282828] flex-shrink-0 shadow">
              <img
                src={
                  currentTrack.thumbnail ||
                  "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop"
                }
                alt={currentTrack.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              {isPlaying && (
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                  <span className="w-2 h-2 bg-[#1db954] rounded-full animate-ping" />
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1">
                <h4 className="text-xs font-bold text-white truncate">{currentTrack.title}</h4>
                {downloaded && (
                  <span className="text-[8px] bg-[#1db954]/20 text-[#1db954] font-bold px-1 rounded flex-shrink-0">
                    MP3
                  </span>
                )}
              </div>
              <p className="text-[10px] text-zinc-400 truncate">{currentTrack.artist}</p>
            </div>
          </div>

          {/* Quick Mini Controls */}
          <div
            className="flex items-center gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => toggleFavorite(currentTrack)}
              className={`p-1.5 rounded-full ${favorited ? "text-[#1db954]" : "text-zinc-400"}`}
              title="Favoris"
            >
              <Heart className={`w-4 h-4 ${favorited ? "fill-[#1db954]" : ""}`} />
            </button>

            <button
              onClick={togglePlay}
              disabled={isBuffering}
              className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center shadow transition-transform active:scale-90"
              title={isPlaying ? "Pause" : "Lecture"}
            >
              {isBuffering ? (
                <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : isPlaying ? (
                <Pause className="w-4 h-4 fill-black" />
              ) : (
                <Play className="w-4 h-4 fill-black translate-x-0.5" />
              )}
            </button>

            <button
              onClick={nextTrack}
              className="p-1.5 text-zinc-300 active:scale-90 transition-transform"
              title="Suivant"
            >
              <SkipForward className="w-4 h-4 fill-current" />
            </button>
          </div>
        </div>

        {/* Mini progress line at bottom */}
        <div className="w-full bg-white/10 h-0.5">
          <div
            className="bg-[#1db954] h-full transition-all duration-200"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* DESKTOP PLAYER BAR (Screen width >= 768px)                                */}
      {/* ========================================================================= */}
      <footer
        id="nls-player-bar"
        className="hidden md:flex h-20 bg-[#181818] border-t border-[#282828] px-6 items-center justify-between select-none z-40 relative flex-shrink-0"
      >
        {/* Left: Track Metadata */}
        <div className="flex items-center gap-3.5 w-1/4 min-w-[180px] max-w-[300px]">
          <div className="relative group/cover w-13 h-13 rounded-lg overflow-hidden bg-[#242424] flex-shrink-0 shadow-md">
            <img
              src={
                currentTrack.thumbnail ||
                "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop"
              }
              alt={currentTrack.title}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
            <button
              onClick={onToggleFullScreen}
              className="absolute inset-0 bg-black/60 opacity-0 group-hover/cover:opacity-100 flex items-center justify-center text-white transition-opacity"
              title="Agrandir le lecteur"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h4
                className="text-xs lg:text-sm font-bold text-white truncate cursor-pointer hover:underline"
                onClick={onToggleFullScreen}
                title={currentTrack.title}
              >
                {currentTrack.title}
              </h4>
              {downloaded && (
                <span className="text-[9px] bg-[#1db954]/20 text-[#1db954] font-bold px-1 rounded flex-shrink-0">
                  MP3
                </span>
              )}
            </div>
            <p className="text-[11px] text-zinc-400 truncate hover:underline hover:text-zinc-200">
              {currentTrack.artist}
            </p>
          </div>

          {/* Favorite Heart */}
          <button
            id="btn-player-fav"
            onClick={() => toggleFavorite(currentTrack)}
            className={`p-1 rounded-full hover:text-white transition-colors ${
              favorited ? "text-[#1db954]" : "text-zinc-400"
            }`}
            title={favorited ? "Retirer des favoris" : "Ajouter aux favoris"}
          >
            <Heart className={`w-4 h-4 ${favorited ? "fill-[#1db954]" : ""}`} />
          </button>

          {/* Download Trigger */}
          <button
            id="btn-player-download"
            onClick={() => {
              if (onOpenDownloadModal) onOpenDownloadModal();
              else startDownload(currentTrack, settings.defaultBitrate || 320);
            }}
            className={`p-1 rounded-full transition-colors ${
              downloaded ? "text-[#1db954]" : "text-zinc-400 hover:text-white"
            }`}
            title={downloaded ? "Sauvegardé sur l'appareil" : "Télécharger en MP3"}
          >
            {downloaded ? <Check className="w-4 h-4" /> : <Download className="w-4 h-4" />}
          </button>
        </div>

        {/* Center: Controls & Scrubber */}
        <div className="flex flex-col items-center gap-1 flex-1 max-w-xl px-4">
          {/* Playback Buttons */}
          <div className="flex items-center gap-5">
            <button
              id="btn-player-shuffle"
              onClick={toggleShuffle}
              className={`p-1 text-xs transition-colors ${
                isShuffle ? "text-[#1db954]" : "text-zinc-400 hover:text-white"
              }`}
              title={isShuffle ? "Lecture aléatoire activée" : "Activer la lecture aléatoire"}
            >
              <Shuffle className="w-3.5 h-3.5" />
            </button>

            <button
              id="btn-player-prev"
              onClick={previousTrack}
              className="p-1 text-zinc-300 hover:text-white transition-transform active:scale-95"
              title="Précédent"
            >
              <SkipBack className="w-4 h-4 fill-current" />
            </button>

            <button
              id="btn-player-play-pause"
              onClick={togglePlay}
              disabled={isBuffering}
              className="w-8 h-8 rounded-full bg-white hover:bg-zinc-200 text-black flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-lg"
              title={isPlaying ? "Pause" : "Lecture"}
            >
              {isBuffering ? (
                <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : isPlaying ? (
                <Pause className="w-4 h-4 fill-black" />
              ) : (
                <Play className="w-4 h-4 fill-black translate-x-0.5" />
              )}
            </button>

            <button
              id="btn-player-next"
              onClick={nextTrack}
              className="p-1 text-zinc-300 hover:text-white transition-transform active:scale-95"
              title="Suivant"
            >
              <SkipForward className="w-4 h-4 fill-current" />
            </button>

            <button
              id="btn-player-repeat"
              onClick={toggleRepeat}
              className={`p-1 text-xs transition-colors ${
                repeatMode !== "off" ? "text-[#1db954]" : "text-zinc-400 hover:text-white"
              }`}
              title={`Répétition : ${repeatMode}`}
            >
              {repeatMode === "one" ? <Repeat1 className="w-3.5 h-3.5" /> : <Repeat className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Scrubber Bar */}
          <div className="w-full flex items-center gap-2 text-[10px] text-zinc-400 font-mono">
            <span className="w-8 text-right">{formatTime(isSeeking ? seekValue : currentTime)}</span>

            <div className="relative flex-1 flex items-center group h-3 cursor-pointer">
              <input
                id="player-seek-slider"
                type="range"
                min={0}
                max={duration || 100}
                step={0.1}
                value={isSeeking ? seekValue : currentTime}
                onChange={handleSeekChange}
                onMouseDown={handleSeekStart}
                onMouseUp={handleSeekEnd}
                onTouchStart={handleSeekStart}
                onTouchEnd={handleSeekEnd}
                className="absolute inset-0 w-full h-full opacity-0 z-20 cursor-pointer"
              />
              <div className="w-full bg-[#4d4d4d] h-1 group-hover:h-1.5 rounded-full overflow-hidden transition-all">
                <div
                  className="bg-white group-hover:bg-[#1db954] h-full rounded-full transition-all"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            <span className="w-8">{formatTime(duration)}</span>
          </div>
        </div>

        {/* Right: Extra Controls & Volume */}
        <div className="flex items-center justify-end gap-2.5 w-1/4 min-w-[140px]">
          {/* Lyrics Button */}
          <button
            id="btn-toggle-lyrics"
            onClick={onToggleLyrics}
            className="p-1 text-zinc-400 hover:text-white transition-colors"
            title="Paroles"
          >
            <Mic2 className="w-3.5 h-3.5" />
          </button>

          {/* Queue Button */}
          <button
            id="btn-toggle-queue"
            onClick={onToggleQueue}
            className="p-1 text-zinc-400 hover:text-white transition-colors"
            title="File d'attente"
          >
            <ListMusic className="w-3.5 h-3.5" />
          </button>

          {/* Volume */}
          <div className="flex items-center gap-1.5 group">
            <button
              onClick={toggleMute}
              className="text-zinc-400 hover:text-white transition-colors p-1"
              title={isMuted ? "Activer le son" : "Couper le son"}
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-3.5 h-3.5" />
              ) : volume < 0.5 ? (
                <Volume1 className="w-3.5 h-3.5" />
              ) : (
                <Volume2 className="w-3.5 h-3.5" />
              )}
            </button>

            <div className="w-16 relative flex items-center h-3 cursor-pointer">
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={isMuted ? 0 : volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="absolute inset-0 w-full h-full opacity-0 z-20 cursor-pointer"
              />
              <div className="w-full bg-[#4d4d4d] h-1 group-hover:h-1.5 rounded-full overflow-hidden transition-all">
                <div
                  className="bg-white group-hover:bg-[#1db954] h-full rounded-full"
                  style={{ width: `${(isMuted ? 0 : volume) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Fullscreen */}
          <button
            onClick={onToggleFullScreen}
            className="p-1 text-zinc-400 hover:text-white transition-colors"
            title="Agrandir"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </footer>
    </>
  );
};
