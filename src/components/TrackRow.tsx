import React from "react";
import {
  Play,
  Pause,
  Download,
  Heart,
  Check,
  HardDrive,
  Trash2,
  Edit3,
} from "lucide-react";
import { Track } from "../types";
import { useAudio } from "../context/AudioContext";
import { useDownload } from "../context/DownloadContext";

interface TrackRowProps {
  track: Track;
  index: number;
  queueContext?: Track[];
  isLocalView?: boolean;
  onOpenDownloadModal?: (track: Track) => void;
  onEditMetadata?: (track: Track) => void;
  onDeleteLocal?: (trackId: string) => void;
  isSelectMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (track: Track) => void;
}

export const TrackRow: React.FC<TrackRowProps> = ({
  track,
  index,
  queueContext,
  isLocalView,
  onOpenDownloadModal,
  onEditMetadata,
  onDeleteLocal,
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

  const handleRowClick = (e: React.MouseEvent) => {
    if (isSelectMode && onToggleSelect) {
      onToggleSelect(track);
      return;
    }
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

  return (
    <div
      id={`track-row-${track.id}`}
      onClick={handleRowClick}
      className={`group px-2 sm:px-4 py-2 sm:py-2.5 rounded-xl flex items-center gap-2 sm:gap-3.5 text-xs sm:text-sm transition-colors cursor-pointer select-none ${
        isSelected
          ? "bg-[#1db954]/15 border border-[#1db954]/40 text-white"
          : isCurrent
          ? "bg-[#242424] text-[#1db954]"
          : "hover:bg-[#1f1f1f] text-zinc-300"
      }`}
    >
      {/* Checkbox (if select mode or on hover with onToggleSelect) */}
      {onToggleSelect ? (
        <div
          onClick={handleCheckboxClick}
          className={`w-5 sm:w-6 flex items-center justify-center flex-shrink-0 cursor-pointer ${
            isSelectMode || isSelected ? "block" : "hidden group-hover:flex"
          }`}
        >
          <input
            type="checkbox"
            checked={!!isSelected}
            onChange={() => {}}
            className="w-4 h-4 rounded accent-[#1db954] cursor-pointer"
          />
        </div>
      ) : null}

      {/* Index or Play Icon (shown when checkbox is not visible) */}
      <div
        className={`w-5 sm:w-6 flex items-center justify-center text-xs font-semibold flex-shrink-0 ${
          onToggleSelect && (isSelectMode || isSelected) ? "hidden" : onToggleSelect ? "group-hover:hidden" : ""
        }`}
      >
        {isPlayingCurrent ? (
          <div className="flex items-end gap-0.5 h-3.5">
            <span className="w-1 bg-[#1db954] h-full animate-bounce" />
            <span className="w-1 bg-[#1db954] h-2/3 animate-bounce delay-75" />
            <span className="w-1 bg-[#1db954] h-4/5 animate-bounce delay-150" />
          </div>
        ) : (
          <>
            <span className="group-hover:hidden text-zinc-500 text-[11px]">{index + 1}</span>
            <Play className="w-3.5 h-3.5 hidden group-hover:block text-white fill-white" />
          </>
        )}
      </div>

      {/* Thumbnail + Title & Artist */}
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <div className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-lg overflow-hidden bg-[#242424] flex-shrink-0 shadow">
          <img
            src={
              track.thumbnail ||
              "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop"
            }
            alt={track.title}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span
              className={`font-semibold truncate text-xs sm:text-sm ${
                isCurrent ? "text-[#1db954]" : "text-white"
              }`}
            >
              {track.title}
            </span>
            {downloaded && (
              <span className="text-[8px] bg-[#1db954]/20 text-[#1db954] px-1 py-0.2 rounded font-bold flex-shrink-0">
                MP3
              </span>
            )}
          </div>
          <span className="text-[10px] sm:text-xs text-zinc-400 truncate block">
            {track.artist}
          </span>
        </div>
      </div>

      {/* Extra info / File Size on desktop */}
      <div className="hidden lg:block w-32 text-xs text-zinc-400 truncate">
        {track.fileSize ? (
          <span className="flex items-center gap-1 text-zinc-400 text-[11px]">
            <HardDrive className="w-3 h-3 text-[#1db954]" />
            {(track.fileSize / (1024 * 1024)).toFixed(1)} MB
          </span>
        ) : track.ago ? (
          <span>{track.ago}</span>
        ) : track.views ? (
          <span>{track.views.toLocaleString()} vues</span>
        ) : null}
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {/* Favorite Heart */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleFavorite(track);
          }}
          className={`p-1.5 rounded-full transition-colors active:scale-90 ${
            favorited ? "text-[#1db954]" : "text-zinc-500 hover:text-white"
          }`}
          title={favorited ? "Retirer" : "Favoris"}
        >
          <Heart className={`w-3.5 h-3.5 ${favorited ? "fill-[#1db954]" : ""}`} />
        </button>

        {/* Quick Download */}
        <button
          onClick={handleDownloadClick}
          className={`p-1.5 rounded-full transition-all active:scale-90 ${
            downloaded ? "text-[#1db954]" : "text-zinc-400 hover:text-white"
          }`}
          title={downloaded ? "Sauvegardé" : "Télécharger MP3"}
        >
          {downloaded ? <Check className="w-3.5 h-3.5 stroke-[2.5]" /> : <Download className="w-3.5 h-3.5" />}
        </button>

        {/* Local Action: Edit / Delete */}
        {isLocalView && (
          <>
            {onEditMetadata && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEditMetadata(track);
                }}
                className="p-1.5 text-zinc-400 hover:text-white active:scale-90 rounded-full"
                title="Modifier les tags"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            )}
            {onDeleteLocal && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteLocal(track.id);
                }}
                className="p-1.5 text-zinc-400 hover:text-red-400 active:scale-90 rounded-full"
                title="Supprimer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </>
        )}

        {/* Duration */}
        <div className="w-8 sm:w-10 text-right text-[10px] sm:text-xs text-zinc-400 font-mono">
          {track.durationFormatted || "3:30"}
        </div>
      </div>
    </div>
  );
};
