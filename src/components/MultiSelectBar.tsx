import React from "react";
import {
  CheckSquare,
  Archive,
  Download,
  Heart,
  X,
  Sparkles,
  Layers,
  RotateCcw,
} from "lucide-react";
import { Track } from "../types";
import { useDownload } from "../context/DownloadContext";

interface MultiSelectBarProps {
  selectedTracks: Track[];
  onClearSelection: () => void;
  onSelectAll: () => void;
  onInvertSelection?: () => void;
  allCount?: number;
  onOpenBatchZip?: () => void;
  onDownloadZip?: () => void;
  onAddToQueue?: () => void;
  onPlaySelected?: () => void;
}

export const MultiSelectBar: React.FC<MultiSelectBarProps> = ({
  selectedTracks,
  onClearSelection,
  onSelectAll,
  onInvertSelection,
  allCount = 0,
  onOpenBatchZip,
  onDownloadZip,
  onAddToQueue,
  onPlaySelected,
}) => {
  const { addTracksToQueue, toggleFavorite, favoriteIds, settings } = useDownload();

  if (!selectedTracks || selectedTracks.length === 0) return null;

  const count = selectedTracks.length;

  const handleZip = () => {
    if (onOpenBatchZip) onOpenBatchZip();
    else if (onDownloadZip) onDownloadZip();
  };

  const handleQueueAll = () => {
    if (onAddToQueue) {
      onAddToQueue();
    } else {
      addTracksToQueue(selectedTracks, settings.defaultBitrate || 320);
      onClearSelection();
    }
  };

  const handleFavoriteAll = async () => {
    for (const track of selectedTracks) {
      if (!favoriteIds.includes(track.id)) {
        await toggleFavorite(track);
      }
    }
  };

  return (
    <div className="fixed bottom-24 md:bottom-28 left-1/2 -translate-x-1/2 z-40 w-[94%] max-w-2xl animate-in slide-in-from-bottom-5 duration-200">
      <div className="bg-[#181818]/95 backdrop-blur-md border border-[#1db954]/40 rounded-2xl p-2.5 sm:p-3 shadow-2xl shadow-black/80 flex flex-wrap items-center justify-between gap-2.5 text-white">
        {/* Left Count & select tools */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#1db954] text-black flex items-center justify-center font-black text-xs">
            {count}
          </div>
          <div>
            <div className="font-bold text-xs sm:text-sm text-white flex items-center gap-1.5">
              <span>{count} morceau{count > 1 ? "x" : ""} sélectionné{count > 1 ? "s" : ""}</span>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-zinc-400">
              {allCount > 0 && count < allCount && (
                <button
                  onClick={onSelectAll}
                  className="hover:text-[#1db954] underline transition-colors"
                >
                  Tout cocher ({allCount})
                </button>
              )}
              {onInvertSelection && (
                <button
                  onClick={onInvertSelection}
                  className="hover:text-zinc-200 transition-colors"
                >
                  Inverser
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Play selected */}
          {onPlaySelected && (
            <button
              onClick={onPlaySelected}
              className="p-2 rounded-xl bg-[#282828] hover:bg-[#333] border border-[#383838] text-[#1db954] hover:text-[#1ed760] transition-colors"
              title="Écouter la sélection"
            >
              <Sparkles className="w-4 h-4" />
            </button>
          )}

          {/* Create ZIP */}
          <button
            onClick={handleZip}
            className="px-3 py-2 rounded-xl bg-[#1db954] hover:bg-[#1ed760] text-black font-extrabold text-xs flex items-center gap-1.5 transition-transform active:scale-95 shadow-md shadow-[#1db954]/20"
            title="Créer une archive ZIP avec ces morceaux"
          >
            <Archive className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Créer</span> ZIP
          </button>

          {/* Queue All for download */}
          <button
            onClick={handleQueueAll}
            className="px-3 py-2 rounded-xl bg-[#282828] hover:bg-[#333] border border-[#383838] text-white font-bold text-xs flex items-center gap-1.5 transition-colors"
            title="Ajouter à la file de téléchargement"
          >
            <Download className="w-3.5 h-3.5 text-[#1db954]" />
            <span>Télécharger tout</span>
          </button>

          {/* Batch Like */}
          <button
            onClick={handleFavoriteAll}
            className="p-2 rounded-xl bg-[#282828] hover:bg-[#333] border border-[#383838] text-zinc-300 hover:text-pink-400 transition-colors"
            title="Ajouter tous aux favoris"
          >
            <Heart className="w-4 h-4" />
          </button>

          {/* Dismiss */}
          <button
            onClick={onClearSelection}
            className="p-2 rounded-xl bg-[#222] hover:bg-[#2e2e2e] text-zinc-400 hover:text-white transition-colors"
            title="Annuler la sélection"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
