import React, { useState } from "react";
import {
  HardDrive,
  FolderHeart,
  Music,
  Play,
  Shuffle,
  Trash2,
  Download,
  Search,
  ArrowUpDown,
  Edit3,
  CheckCircle2,
  FileDown,
} from "lucide-react";
import { Track } from "../types";
import { useDownload } from "../context/DownloadContext";
import { useAudio } from "../context/AudioContext";
import { TrackRow } from "./TrackRow";
import { updateTrackMetadata, triggerBrowserFileDownload, getOfflineAudioBlob } from "../services/db";

interface LibraryViewProps {
  onOpenDownloadModal?: (track: Track) => void;
  onOpenBatchModal?: (tracks: Track[], title?: string) => void;
  onOpenTagEditor?: (track: Track) => void;
  selectedTracks?: Track[];
  onToggleSelect?: (track: Track) => void;
  isSelectMode?: boolean;
}

export const LibraryView: React.FC<LibraryViewProps> = ({
  onOpenDownloadModal,
  onOpenBatchModal,
  onOpenTagEditor,
  selectedTracks = [],
  onToggleSelect,
  isSelectMode = false,
}) => {
  const { downloadedTracks, deleteDownloadedTrack, exportAllTracksAsBackup, refreshOfflineLibrary } =
    useDownload();
  const { playTrack } = useAudio();

  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "title" | "artist" | "size" | "plays">("date");
  const [editingTrack, setEditingTrack] = useState<Track | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editArtist, setEditArtist] = useState("");
  const [editAlbum, setEditAlbum] = useState("");

  // Calculate storage metrics
  const totalBytes = downloadedTracks.reduce((acc, t) => acc + (t.fileSize || 0), 0);
  const totalMB = (totalBytes / (1024 * 1024)).toFixed(1);

  // Filter and sort
  const filteredTracks = downloadedTracks
    .filter((t) => {
      const q = searchQuery.toLowerCase();
      return t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q);
    })
    .sort((a, b) => {
      if (sortBy === "title") return a.title.localeCompare(b.title);
      if (sortBy === "artist") return a.artist.localeCompare(b.artist);
      if (sortBy === "size") return (b.fileSize || 0) - (a.fileSize || 0);
      if (sortBy === "plays") return (b.playCount || 0) - (a.playCount || 0);
      return (b.downloadedAt || 0) - (a.downloadedAt || 0);
    });

  const handlePlayAll = (shuffle: boolean = false) => {
    if (filteredTracks.length === 0) return;
    let list = [...filteredTracks];
    if (shuffle) {
      list = list.sort(() => Math.random() - 0.5);
    }
    playTrack(list[0], list.slice(1));
  };

  const handleOpenTagEditor = (track: Track) => {
    setEditingTrack(track);
    setEditTitle(track.title);
    setEditArtist(track.artist);
    setEditAlbum(track.album || "NLSmusic");
  };

  const handleSaveTags = async () => {
    if (!editingTrack) return;
    const updated: Track = {
      ...editingTrack,
      title: editTitle.trim() || editingTrack.title,
      artist: editArtist.trim() || editingTrack.artist,
      album: editAlbum.trim() || editingTrack.album,
    };
    await updateTrackMetadata(updated);
    await refreshOfflineLibrary();
    setEditingTrack(null);
  };

  return (
    <div id="library-view-container" className="p-3.5 sm:p-5 md:p-8 space-y-4 sm:space-y-6 animate-in fade-in duration-300">
      {/* Storage Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#181818] via-[#1f1f1f] to-[#162e1e] p-4 sm:p-6 border border-[#282828] shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-tr from-[#1db954] to-[#1ed760] flex items-center justify-center text-black shadow-lg shadow-[#1db954]/20 flex-shrink-0">
              <HardDrive className="w-6 h-6 sm:w-7 sm:h-7" strokeWidth={2.5} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] uppercase font-bold tracking-wider text-[#1db954]">
                  Stockage & Hors-Ligne
                </span>
                <span className="text-[10px] bg-[#242424] text-zinc-300 px-1.5 py-0.2 rounded font-semibold border border-[#333]">
                  {downloadedTracks.length} titres
                </span>
              </div>
              <h1 className="text-lg sm:text-2xl font-extrabold text-white font-['Outfit'] mt-0.5">
                Ma Musique Téléchargée
              </h1>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                {totalMB} MB stockés localement • Écoute 100% sans connexion Internet
              </p>
            </div>
          </div>

          {/* Action Tools */}
          <div className="flex items-center gap-2">
            <button
              id="btn-play-all-library"
              onClick={() => handlePlayAll(false)}
              disabled={filteredTracks.length === 0}
              className="px-4 py-2 rounded-full bg-[#1db954] hover:bg-[#1ed760] disabled:bg-zinc-800 disabled:text-zinc-600 text-black text-xs font-black flex items-center gap-1.5 transition-transform active:scale-95 shadow-md"
            >
              <Play className="w-3.5 h-3.5 fill-black" />
              <span>Tout écouter</span>
            </button>

            <button
              id="btn-shuffle-library"
              onClick={() => handlePlayAll(true)}
              disabled={filteredTracks.length === 0}
              className="px-3.5 py-2 rounded-full bg-[#242424] hover:bg-[#333] disabled:bg-zinc-800 disabled:text-zinc-600 text-white text-xs font-bold flex items-center gap-1.5 border border-[#333] transition-colors"
            >
              <Shuffle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Aléatoire</span>
            </button>

            {onOpenBatchModal && (
              <button
                id="btn-batch-zip-library"
                onClick={() => onOpenBatchModal(filteredTracks, "Télécharger la bibliothèque en ZIP")}
                disabled={filteredTracks.length === 0}
                className="px-3 py-2 rounded-full bg-[#242424] hover:bg-[#333] disabled:bg-zinc-800 disabled:text-zinc-600 text-[#1db954] text-xs font-bold flex items-center gap-1.5 border border-[#333] transition-colors"
                title="Télécharger toute la sélection en archive ZIP"
              >
                <FileDown className="w-3.5 h-3.5" />
                <span className="hidden md:inline">ZIP</span>
              </button>
            )}

            <button
              id="btn-export-backup"
              onClick={exportAllTracksAsBackup}
              disabled={downloadedTracks.length === 0}
              className="p-2 rounded-full bg-[#242424] hover:bg-[#333] text-zinc-300 hover:text-white border border-[#333] transition-colors"
              title="Exporter la sauvegarde JSON"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Search & Sort Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        {/* Local Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filtrer mes MP3..."
            className="w-full bg-[#181818] border border-[#282828] focus:border-[#444] rounded-full pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-zinc-500 outline-none transition-colors"
          />
        </div>

        {/* Sort Select */}
        <div className="flex items-center gap-1.5 self-end sm:self-auto text-xs text-zinc-400">
          <ArrowUpDown className="w-3 h-3 text-zinc-400" />
          <span>Trier :</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-[#181818] border border-[#282828] text-white text-[11px] rounded-lg px-2 py-1 outline-none cursor-pointer"
          >
            <option value="date">Plus récents</option>
            <option value="title">Titre (A-Z)</option>
            <option value="artist">Artiste</option>
            <option value="size">Taille</option>
            <option value="plays">Plus écoutés</option>
          </select>
        </div>
      </div>

      {/* Tracks List */}
      {filteredTracks.length === 0 ? (
        <div className="p-8 sm:p-12 text-center rounded-2xl bg-[#181818]/60 border border-[#282828] space-y-3">
          <div className="w-12 h-12 rounded-full bg-[#242424] text-zinc-500 flex items-center justify-center mx-auto">
            <Music className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white">
              {searchQuery ? "Aucun morceau correspondant" : "Votre bibliothèque est vide"}
            </h3>
            <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
              {searchQuery
                ? "Essayez un autre mot-clé."
                : "Recherchez un morceau ou collez un lien YouTube depuis la barre supérieure pour le télécharger en MP3."}
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl bg-[#181818]/80 border border-[#282828]/60 p-1.5 divide-y divide-[#282828]/40">
          <div className="space-y-0.5">
            {filteredTracks.map((track, i) => (
              <TrackRow
                key={track.id}
                track={track}
                index={i}
                queueContext={filteredTracks}
                isLocalView={true}
                onOpenDownloadModal={onOpenDownloadModal}
                onEditMetadata={handleOpenTagEditor}
                onDeleteLocal={deleteDownloadedTrack}
                isSelectMode={isSelectMode || selectedTracks.length > 0}
                isSelected={selectedTracks.some((t) => t.id === track.id)}
                onToggleSelect={onToggleSelect}
              />
            ))}
          </div>
        </div>
      )}

      {/* ID3 Tag Editor Modal */}
      {editingTrack && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#181818] border border-[#282828] w-full max-w-sm rounded-2xl p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#282828] pb-2.5">
              <h3 className="font-bold text-white text-sm flex items-center gap-1.5">
                <Edit3 className="w-4 h-4 text-[#1db954]" /> Modifier les tags MP3
              </h3>
              <button
                onClick={() => setEditingTrack(null)}
                className="text-zinc-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-zinc-400 font-semibold mb-1">Titre</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-[#242424] border border-[#333] rounded-lg px-3 py-2 text-white outline-none focus:border-[#1db954]"
                />
              </div>

              <div>
                <label className="block text-zinc-400 font-semibold mb-1">Artiste</label>
                <input
                  type="text"
                  value={editArtist}
                  onChange={(e) => setEditArtist(e.target.value)}
                  className="w-full bg-[#242424] border border-[#333] rounded-lg px-3 py-2 text-white outline-none focus:border-[#1db954]"
                />
              </div>

              <div>
                <label className="block text-zinc-400 font-semibold mb-1">Album</label>
                <input
                  type="text"
                  value={editAlbum}
                  onChange={(e) => setEditAlbum(e.target.value)}
                  className="w-full bg-[#242424] border border-[#333] rounded-lg px-3 py-2 text-white outline-none focus:border-[#1db954]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#282828]">
              <button
                onClick={() => setEditingTrack(null)}
                className="px-3 py-1.5 text-xs text-zinc-400 hover:text-white"
              >
                Annuler
              </button>
              <button
                onClick={handleSaveTags}
                className="px-4 py-1.5 bg-[#1db954] hover:bg-[#1ed760] text-black text-xs font-bold rounded-lg"
              >
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
