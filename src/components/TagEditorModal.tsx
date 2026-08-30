import React, { useState, useEffect } from "react";
import { X, Tag, Save, Music, User, Disc, Calendar, Radio } from "lucide-react";
import { Track } from "../types";
import { useDownload } from "../context/DownloadContext";

interface TagEditorModalProps {
  track: Track | null;
  isOpen: boolean;
  onClose: () => void;
}

export const TagEditorModal: React.FC<TagEditorModalProps> = ({ track, isOpen, onClose }) => {
  const { editTrackTags, startDownload } = useDownload();
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [album, setAlbum] = useState("");
  const [genre, setGenre] = useState("");
  const [year, setYear] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (track) {
      setTitle(track.title || "");
      setArtist(track.artist || "");
      setAlbum(track.album || "NLSmusic Studio");
      setGenre(track.customGenre || "Musique");
      setYear(track.year || new Date().getFullYear().toString());
    }
  }, [track]);

  if (!isOpen || !track) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !artist.trim()) return;

    setIsSaving(true);
    try {
      await editTrackTags(track.id, {
        title: title.trim(),
        artist: artist.trim(),
        album: album.trim(),
        customGenre: genre.trim(),
        year: year.trim(),
      });
      onClose();
    } catch (err) {
      console.error("Save tags failed:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAndExport = async () => {
    if (!title.trim() || !artist.trim()) return;
    setIsSaving(true);
    try {
      await editTrackTags(track.id, {
        title: title.trim(),
        artist: artist.trim(),
        album: album.trim(),
        customGenre: genre.trim(),
        year: year.trim(),
      });
      await startDownload(
        {
          ...track,
          title: title.trim(),
          artist: artist.trim(),
          album: album.trim(),
          customGenre: genre.trim(),
          year: year.trim(),
        },
        {
          direct: false,
          format: "mp3",
          bitrate: 320,
          album: album.trim(),
          genre: genre.trim(),
          year: year.trim(),
        }
      );
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-[#181818] border border-[#282828] w-full max-w-md rounded-2xl overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#282828] flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-[#1db954]/20 text-[#1db954] flex items-center justify-center">
              <Tag className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm sm:text-base">Éditeur de Tags ID3</h3>
              <p className="text-[10px] sm:text-xs text-zinc-400">Personnalisez les métadonnées audio</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-4 sm:p-5 space-y-3.5 flex-1 overflow-y-auto custom-scrollbar text-xs sm:text-sm">
          {/* Cover & Track Info */}
          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-[#222] border border-[#282828]">
            <img
              src={track.thumbnail || "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop"}
              alt={track.title}
              referrerPolicy="no-referrer"
              className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
            />
            <div className="min-w-0 flex-1">
              <div className="text-white font-bold text-xs sm:text-sm truncate">{track.title}</div>
              <div className="text-zinc-400 text-[11px] truncate">{track.artist}</div>
              <div className="text-[10px] text-[#1db954] font-medium mt-0.5">Tags ID3v2 standardisés</div>
            </div>
          </div>

          {/* Title input */}
          <div className="space-y-1">
            <label className="block text-[11px] font-bold text-zinc-300 flex items-center gap-1.5">
              <Music className="w-3.5 h-3.5 text-[#1db954]" /> Titre du morceau
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-[#242424] border border-[#333] focus:border-[#1db954] focus:ring-1 focus:ring-[#1db954] rounded-xl px-3 py-2 text-white text-xs outline-none"
              placeholder="Ex: Die For You"
            />
          </div>

          {/* Artist input */}
          <div className="space-y-1">
            <label className="block text-[11px] font-bold text-zinc-300 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-[#1db954]" /> Artiste(s)
            </label>
            <input
              type="text"
              required
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              className="w-full bg-[#242424] border border-[#333] focus:border-[#1db954] focus:ring-1 focus:ring-[#1db954] rounded-xl px-3 py-2 text-white text-xs outline-none"
              placeholder="Ex: The Weeknd"
            />
          </div>

          {/* Album input */}
          <div className="space-y-1">
            <label className="block text-[11px] font-bold text-zinc-300 flex items-center gap-1.5">
              <Disc className="w-3.5 h-3.5 text-[#1db954]" /> Nom de l'album
            </label>
            <input
              type="text"
              value={album}
              onChange={(e) => setAlbum(e.target.value)}
              className="w-full bg-[#242424] border border-[#333] focus:border-[#1db954] focus:ring-1 focus:ring-[#1db954] rounded-xl px-3 py-2 text-white text-xs outline-none"
              placeholder="Ex: Starboy / NLSmusic"
            />
          </div>

          {/* Genre & Year Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-zinc-300 flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-[#1db954]" /> Genre musical
              </label>
              <input
                type="text"
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                className="w-full bg-[#242424] border border-[#333] focus:border-[#1db954] focus:ring-1 focus:ring-[#1db954] rounded-xl px-3 py-2 text-white text-xs outline-none"
                placeholder="Ex: Pop, Rap, R&B"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-zinc-300 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#1db954]" /> Année
              </label>
              <input
                type="text"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="w-full bg-[#242424] border border-[#333] focus:border-[#1db954] focus:ring-1 focus:ring-[#1db954] rounded-xl px-3 py-2 text-white text-xs outline-none"
                placeholder="Ex: 2025"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-[#282828] flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={handleSaveAndExport}
              disabled={isSaving}
              className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition-colors flex items-center gap-1.5"
            >
              <span>Enregistrer & Ré-exporter</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-2 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-4 py-2 bg-[#1db954] hover:bg-[#1ed760] text-black text-xs font-bold rounded-full transition-transform active:scale-95 flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSaving ? "Sauvegarde..." : "Enregistrer les tags"}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
