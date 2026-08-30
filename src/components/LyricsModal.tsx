import React, { useEffect, useState } from "react";
import { Mic2, X, ExternalLink, Sparkles, Youtube, Music } from "lucide-react";
import { Track } from "../types";
import { getTrackInfo } from "../services/api";

interface LyricsModalProps {
  track: Track | null;
  onClose: () => void;
}

export const LyricsModal: React.FC<LyricsModalProps> = ({ track, onClose }) => {
  const [info, setInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (track) {
      setLoading(true);
      getTrackInfo(track.id)
        .then((data) => {
          setInfo(data);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [track]);

  if (!track) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[#181818] border border-[#282828] w-full max-w-xl max-h-[85vh] rounded-2xl overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-[#282828] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
              <Mic2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Paroles & Informations</h3>
              <p className="text-xs text-zinc-400">{track.artist} - {track.title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar text-center">
          <div className="max-w-xs mx-auto">
            <img
              src={track.thumbnail || "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop"}
              alt={track.title}
              referrerPolicy="no-referrer"
              className="w-44 h-44 rounded-2xl mx-auto shadow-2xl object-cover"
            />
            <h2 className="text-lg font-bold text-white mt-4">{track.title}</h2>
            <p className="text-sm text-zinc-400 mt-0.5">{track.artist}</p>
          </div>

          <div className="p-5 rounded-2xl bg-[#202020] border border-[#282828] text-left space-y-3">
            <h4 className="text-xs font-bold text-[#1db954] uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> Description & Notes du titre
            </h4>
            {loading ? (
              <div className="py-8 text-center text-zinc-500 text-xs">Chargement des détails...</div>
            ) : info?.description ? (
              <p className="text-xs text-zinc-300 whitespace-pre-line leading-relaxed max-h-60 overflow-y-auto custom-scrollbar font-mono text-[11px]">
                {info.description}
              </p>
            ) : (
              <p className="text-xs text-zinc-400 italic">
                Morceau officiel YouTube extrait avec succès. Paroles dynamiques bientôt synchronisées.
              </p>
            )}
          </div>

          {/* YouTube link */}
          <div className="flex items-center justify-center">
            <a
              href={track.url || `https://youtube.com/watch?v=${track.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#242424] hover:bg-[#333] text-zinc-300 hover:text-white text-xs font-semibold border border-[#333] transition-colors"
            >
              <Youtube className="w-4 h-4 text-red-500" />
              <span>Ouvrir la vidéo sur YouTube</span>
              <ExternalLink className="w-3 h-3 text-zinc-500" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
