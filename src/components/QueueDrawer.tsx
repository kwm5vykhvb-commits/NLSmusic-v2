import React from "react";
import { X, Trash2, Music, Play, ListMusic } from "lucide-react";
import { useAudio } from "../context/AudioContext";

interface QueueDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QueueDrawer: React.FC<QueueDrawerProps> = ({ isOpen, onClose }) => {
  const { queue, currentTrack, removeFromQueue, clearQueue, playTrack } = useAudio();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-80 sm:w-96 bg-[#121212] border-l border-[#282828] shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="p-5 border-b border-[#282828] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ListMusic className="w-5 h-5 text-[#1db954]" />
          <h3 className="font-bold text-white text-base">File d'attente</h3>
        </div>
        <div className="flex items-center gap-2">
          {queue.length > 0 && (
            <button
              onClick={clearQueue}
              className="text-xs text-zinc-400 hover:text-red-400 flex items-center gap-1 transition-colors p-1"
              title="Vider la file"
            >
              <Trash2 className="w-3.5 h-3.5" /> Vider
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
        {/* Currently Playing */}
        {currentTrack && (
          <div>
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-2">
              En cours de lecture
            </span>
            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-[#202020] border border-[#1db954]/30">
              <img
                src={currentTrack.thumbnail || "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop"}
                alt={currentTrack.title}
                referrerPolicy="no-referrer"
                className="w-11 h-11 rounded-lg object-cover flex-shrink-0"
              />
              <div className="min-w-0 flex-1">
                <h4 className="text-xs font-bold text-[#1db954] truncate">{currentTrack.title}</h4>
                <p className="text-[11px] text-zinc-400 truncate">{currentTrack.artist}</p>
              </div>
            </div>
          </div>
        )}

        {/* Up Next List */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
              À suivre ({queue.length})
            </span>
          </div>

          {queue.length === 0 ? (
            <div className="p-8 text-center text-zinc-500 text-xs bg-[#181818] rounded-xl border border-[#282828]">
              La file d'attente est vide. Ajoutez des titres depuis la recherche ou votre bibliothèque.
            </div>
          ) : (
            <div className="space-y-1.5">
              {queue.map((track, i) => (
                <div
                  key={`${track.id}_${i}`}
                  className="group flex items-center justify-between gap-3 p-2 rounded-lg hover:bg-[#1f1f1f] transition-colors"
                >
                  <div
                    onClick={() => playTrack(track)}
                    className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                  >
                    <img
                      src={track.thumbnail || "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop"}
                      alt={track.title}
                      referrerPolicy="no-referrer"
                      className="w-9 h-9 rounded object-cover flex-shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <h5 className="text-xs font-semibold text-white truncate group-hover:text-[#1db954]">
                        {track.title}
                      </h5>
                      <span className="text-[11px] text-zinc-400 truncate block">
                        {track.artist}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => removeFromQueue(i)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-zinc-400 hover:text-red-400 transition-opacity"
                    title="Retirer de la file"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
