import React from "react";
import { Play, Pause, Download, Heart, Check } from "lucide-react";
import { Track } from "../types";
import { useAudio } from "../context/AudioContext";
import { useDownload } from "../context/DownloadContext";

interface TrackCardProps {
  track: Track;
  queueContext?: Track[];
  onOpenDownloadModal?: (track: Track) => void;
  isSelectMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (track: Track) => void;
}

export const TrackCard: React.FC<TrackCardProps> = ({
  track,
  queueContext,
  onOpenDownloadModal,
  isSelectMode,
  isSelected,
  onToggleSelect,
}) => {
  const { currentTrack, isPlaying, playTrack, togglePlay } = useAudio();
  const { isDownloaded, isFavorite, toggleFavorite, startDownload, settings } = useDownload();

  const isCurrent = currentTrack?.id === track.id;
  const isPlayingCurrent = isCurrent && isPlaying;
  const downloaded = isDownloaded(track.id) || track.isDownloaded;
  const favorited = isFavorite(track.id);

  const handlePlayClick = (e: React.MouseEvent) => {
    if (isSelectMode && onToggleSelect) {
      e.stopPropagation();
      onToggleSelect(track);
      return;
    }
    e.stopPropagation();
    if (isCurrent) {
      togglePlay();
    } else {
      playTrack(track, queueContext);
    }
  };

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggleSelect) {
      onToggleSelect(track);
    }
  };

  const handleDownloadClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onOpenDownloadModal) {
      onOpenDownloadModal(track);
    } else {
      startDownload(track, settings.defaultBitrate || 320);
    }
  };

  const handleFavClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavorite(track);
  };

  return (
    <div
      id={`track-card-${track.id}`}
      onClick={handlePlayClick}
      className={`group relative p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl bg-[#181818]/90 hover:bg-[#242424] transition-all duration-200 cursor-pointer flex flex-col justify-between border border-white/5 hover:border-white/10 shadow-md ${
        isCurrent ? "bg-[#222222] border-[#1db954]/40" : ""
      }`}
    >
      {/* Thumbnail with Overlay Controls */}
      <div className="relative aspect-square w-full rounded-lg sm:rounded-xl overflow-hidden mb-2 sm:mb-3 bg-[#242424] shadow">
        <img
          src={
            track.thumbnail ||
            "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop"
          }
          alt={track.title}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />

        {/* Checkbox overlay if select mode is enabled */}
        {onToggleSelect && (
          <div
            onClick={handleCheckboxClick}
            className={`absolute top-2 right-2 z-20 p-1 rounded-lg bg-black/60 backdrop-blur-md transition-all cursor-pointer ${
              isSelectMode || isSelected ? "opacity-100 scale-100" : "opacity-0 group-hover:opacity-100"
            }`}
          >
            <input
              type="checkbox"
              checked={!!isSelected}
              onChange={() => {}}
              className="w-4 h-4 rounded accent-[#1db954] cursor-pointer block"
            />
          </div>
        )}

        {/* Play Button Floating */}
        <button
          onClick={handlePlayClick}
          className={`absolute bottom-2 right-2 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-[#1db954] text-black flex items-center justify-center shadow-lg active:scale-90 transition-all z-10 ${
            isPlayingCurrent
              ? "opacity-100 scale-100"
              : "opacity-90 sm:opacity-0 sm:group-hover:opacity-100 scale-100"
          }`}
          title={isPlayingCurrent ? "Pause" : "Écouter"}
        >
          {isPlayingCurrent ? (
            <Pause className="w-4 h-4 sm:w-5 sm:h-5 fill-black" />
          ) : (
            <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-black translate-x-0.5" />
          )}
        </button>

        {/* Downloaded status badge */}
        {downloaded && (
          <div
            className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-full bg-black/80 backdrop-blur-md text-[#1db954] text-[9px] font-bold flex items-center gap-0.5 border border-[#1db954]/40"
            title="Enregistré sur l'appareil"
          >
            <Check className="w-2.5 h-2.5 stroke-[3]" /> MP3
          </div>
        )}

        {/* Duration badge */}
        {track.durationFormatted && (
          <div className="absolute bottom-1.5 left-1.5 px-1 py-0.5 rounded bg-black/70 text-[9px] font-mono text-zinc-300">
            {track.durationFormatted}
          </div>
        )}
      </div>

      {/* Info & Metadata */}
      <div className="space-y-0.5 min-w-0">
        <h4
          className={`text-xs sm:text-sm font-bold truncate leading-tight ${
            isCurrent ? "text-[#1db954]" : "text-white"
          }`}
          title={track.title}
        >
          {track.title}
        </h4>
        <p className="text-[10px] sm:text-xs text-zinc-400 truncate font-medium">
          {track.artist}
        </p>
      </div>

      {/* Action Footer */}
      <div className="mt-2 pt-1.5 border-t border-[#282828] flex items-center justify-between text-zinc-400">
        <button
          onClick={handleFavClick}
          className={`p-1 rounded-full active:scale-90 transition-transform ${
            favorited ? "text-[#1db954]" : "hover:text-white"
          }`}
          title={favorited ? "Retirer" : "Favoris"}
        >
          <Heart className={`w-3.5 h-3.5 ${favorited ? "fill-[#1db954]" : ""}`} />
        </button>

        <button
          onClick={handleDownloadClick}
          className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold active:scale-95 transition-all ${
            downloaded
              ? "bg-[#1db954]/15 text-[#1db954]"
              : "bg-[#282828] hover:bg-[#333] text-zinc-200"
          }`}
          title="Télécharger en MP3"
        >
          <Download className="w-3 h-3" />
          <span>{downloaded ? "Sauvé" : "MP3"}</span>
        </button>
      </div>
    </div>
  );
};
