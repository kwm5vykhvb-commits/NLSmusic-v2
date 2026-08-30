import React, { useState, useEffect } from "react";
import { Compass, Flame, Play, Download, Check } from "lucide-react";
import { Track } from "../types";
import { getTrendingTracks } from "../services/api";
import { TrackCard } from "./TrackCard";
import { TrackRow } from "./TrackRow";
import { useAudio } from "../context/AudioContext";
import { useDownload } from "../context/DownloadContext";

interface TrendingViewProps {
  onOpenDownloadModal?: (track: Track) => void;
  selectedTracks?: Track[];
  onToggleSelect?: (track: Track) => void;
  isSelectMode?: boolean;
}

const GENRES = [
  { id: "tendances", label: "🔥 Tendances", desc: "Les musiques les plus virales du moment" },
  { id: "rap", label: "🎤 Rap Français & US", desc: "Top bangers, drill et morceaux urbains" },
  { id: "afro", label: "🌍 Afrobeats", desc: "Rythmes chauds, Burna Boy, Rema, Asake & plus" },
  { id: "pop", label: "✨ Pop & Hits", desc: "Les plus grands hits internationaux" },
  { id: "r&b", label: "💜 R&B & Soul", desc: "Voix suaves et vibes nocturnes" },
  { id: "electro", label: "⚡ Electro & Club", desc: "Dance, House, EDM et beats énergiques" },
  { id: "lofi", label: "☕ Lofi Chill", desc: "Beats relaxants pour étudier et se détendre" },
  { id: "hits-fr", label: "🇫🇷 Top France", desc: "Le classement des titres les plus écoutés" },
];

export const TrendingView: React.FC<TrendingViewProps> = ({
  onOpenDownloadModal,
  selectedTracks = [],
  onToggleSelect,
  isSelectMode = false,
}) => {
  const [selectedGenre, setSelectedGenre] = useState("tendances");
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewStyle, setViewStyle] = useState<"grid" | "list">("grid");

  const { playTrack } = useAudio();
  const { startDownload, isDownloaded, settings } = useDownload();

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    getTrendingTracks(selectedGenre)
      .then((data) => {
        if (isMounted) {
          setTracks(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error("Error loading genre:", err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedGenre]);

  const activeGenreObj = GENRES.find((g) => g.id === selectedGenre) || GENRES[0];

  return (
    <div id="trending-view-container" className="p-3.5 sm:p-5 md:p-8 space-y-4 sm:space-y-6 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#1e1b4b] via-[#1e1b4b]/80 to-[#121212] p-4 sm:p-6 border border-indigo-900/30 shadow-xl">
        <div className="flex items-center gap-2 text-indigo-400 text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-1">
          <Compass className="w-3.5 h-3.5 animate-spin-slow" />
          <span>Explorer & Tendances</span>
        </div>

        <h1 className="text-xl sm:text-3xl font-extrabold text-white font-['Outfit']">
          {activeGenreObj.label}
        </h1>
        <p className="text-xs sm:text-sm text-zinc-300 mt-0.5 max-w-xl">{activeGenreObj.desc}</p>

        {tracks.length > 0 && (
          <div className="mt-3 sm:mt-4 flex items-center gap-2">
            <button
              onClick={() => playTrack(tracks[0], tracks.slice(1))}
              className="px-4 py-2 rounded-full bg-[#1db954] hover:bg-[#1ed760] text-black font-extrabold text-xs flex items-center gap-1.5 shadow-lg shadow-[#1db954]/20 transition-transform active:scale-95"
            >
              <Play className="w-3.5 h-3.5 fill-black" />
              <span>Tout écouter</span>
            </button>
          </div>
        )}
      </div>

      {/* Genre Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar -mx-1 px-1">
        {GENRES.map((genre) => (
          <button
            key={genre.id}
            onClick={() => setSelectedGenre(genre.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all active:scale-95 ${
              selectedGenre === genre.id
                ? "bg-white text-black shadow"
                : "bg-[#202020] text-zinc-300 hover:bg-[#2a2a2a] hover:text-white"
            }`}
          >
            {genre.label}
          </button>
        ))}
      </div>

      {/* Tracks Container */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-1.5">
            <Flame className="w-4 h-4 text-amber-500" /> Morceaux ({tracks.length})
          </h2>

          <div className="flex items-center gap-1 text-xs bg-[#181818] p-0.5 rounded-lg border border-[#282828]">
            <button
              onClick={() => setViewStyle("grid")}
              className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
                viewStyle === "grid" ? "bg-[#282828] text-white" : "text-zinc-400"
              }`}
            >
              Grille
            </button>
            <button
              onClick={() => setViewStyle("list")}
              className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
                viewStyle === "list" ? "bg-[#282828] text-white" : "text-zinc-400"
              }`}
            >
              Liste
            </button>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="p-3 rounded-xl bg-[#181818] animate-pulse space-y-2 border border-[#282828]"
              >
                <div className="aspect-square w-full rounded-lg bg-[#242424]" />
                <div className="h-3 bg-[#242424] rounded w-3/4" />
                <div className="h-2.5 bg-[#242424] rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : viewStyle === "grid" ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
            {tracks.map((track) => (
              <TrackCard
                key={track.id}
                track={track}
                queueContext={tracks}
                onOpenDownloadModal={onOpenDownloadModal}
                isSelectMode={isSelectMode || selectedTracks.length > 0}
                isSelected={selectedTracks.some((t) => t.id === track.id)}
                onToggleSelect={onToggleSelect}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-xl bg-[#181818] border border-[#282828] p-1 divide-y divide-[#282828]/40">
            {tracks.map((track, i) => (
              <TrackRow
                key={track.id}
                track={track}
                index={i}
                queueContext={tracks}
                onOpenDownloadModal={onOpenDownloadModal}
                isSelectMode={isSelectMode || selectedTracks.length > 0}
                isSelected={selectedTracks.some((t) => t.id === track.id)}
                onToggleSelect={onToggleSelect}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
