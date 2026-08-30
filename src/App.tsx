import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Sparkles,
  Play,
  Pause,
  Download,
  Flame,
  Search,
  FolderHeart,
  Heart,
  WifiOff,
  Link as LinkIcon,
  HardDrive,
  AlertCircle,
  Disc,
  ArrowRight,
  SlidersHorizontal,
  Bell,
  FileDown,
  Layers,
  Music2,
} from "lucide-react";
import { Track, ViewMode } from "./types";
import { AudioProvider, useAudio } from "./context/AudioContext";
import { DownloadProvider, useDownload } from "./context/DownloadContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Sidebar } from "./components/Sidebar";
import { Navbar } from "./components/Navbar";
import { Player } from "./components/Player";
import { MobileNav } from "./components/MobileNav";
import { TrackCard } from "./components/TrackCard";
import { TrackRow } from "./components/TrackRow";
import { DownloadModal } from "./components/DownloadModal";
import { LibraryView } from "./components/LibraryView";
import { TrendingView } from "./components/TrendingView";
import { QueueDrawer } from "./components/QueueDrawer";
import { LyricsModal } from "./components/LyricsModal";
import { SettingsModal } from "./components/SettingsModal";
import { FullScreenPlayer } from "./components/FullScreenPlayer";
import { AuthModal } from "./components/AuthModal";
import { AuthScreen } from "./components/AuthScreen";
import { Pagination } from "./components/Pagination";
import { BatchDownloadModal } from "./components/BatchDownloadModal";
import { TagEditorModal } from "./components/TagEditorModal";
import { DownloadQueueDrawer } from "./components/DownloadQueueDrawer";
import { MultiSelectBar } from "./components/MultiSelectBar";
import { searchTracks, getTrendingTracks } from "./services/api";

function MainApp() {
  const [currentView, setCurrentView] = useState<ViewMode>("home");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Track[]>([]);
  const [searchCurrentPage, setSearchCurrentPage] = useState(1);
  const [searchTotalPages, setSearchTotalPages] = useState(1);
  const [searchTotalResults, setSearchTotalResults] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Multi-select state
  const [selectedTracks, setSelectedTracks] = useState<Track[]>([]);
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);

  // Home curated sections
  const [featuredTracks, setFeaturedTracks] = useState<Track[]>([]);
  const [rapTracks, setRapTracks] = useState<Track[]>([]);
  const [popTracks, setPopTracks] = useState<Track[]>([]);
  const [isLoadingHome, setIsLoadingHome] = useState(true);

  // Modals & Drawers state
  const [selectedDownloadTrack, setSelectedDownloadTrack] = useState<Track | null>(null);
  const [selectedTagTrack, setSelectedTagTrack] = useState<Track | null>(null);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [batchTracksList, setBatchTracksList] = useState<Track[]>([]);
  const [batchModalTitle, setBatchModalTitle] = useState("Téléchargement par lot");
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [isDownloadQueueOpen, setIsDownloadQueueOpen] = useState(false);
  const [isLyricsOpen, setIsLyricsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isFullScreenOpen, setIsFullScreenOpen] = useState(false);

  // Quick link converter input
  const [quickUrl, setQuickUrl] = useState("");

  const mainScrollRef = useRef<HTMLElement | null>(null);

  const { playTrack, togglePlay, currentTrack, isPlaying } = useAudio();
  const {
    downloadedTracks,
    favoriteIds,
    isOfflineOnly,
    startDownload,
    addTracksToQueue,
    isDownloaded,
    settings,
    tasks,
    updateSettings,
    exportAllTracksAsBackup,
  } = useDownload();
  const { isAuthModalOpen, closeAuthModal, authModalInitialTab } = useAuth();

  // Multi-select helpers
  const toggleSelectTrack = useCallback((track: Track) => {
    setSelectedTracks((prev) => {
      const exists = prev.some((t) => t.id === track.id);
      if (exists) {
        const next = prev.filter((t) => t.id !== track.id);
        if (next.length === 0) setIsMultiSelectMode(false);
        return next;
      } else {
        return [...prev, track];
      }
    });
  }, []);

  const selectAllTracks = useCallback((tracks: Track[]) => {
    setSelectedTracks(tracks);
    setIsMultiSelectMode(true);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedTracks([]);
    setIsMultiSelectMode(false);
  }, []);

  // Calculate storage metrics
  const totalBytes = downloadedTracks.reduce((acc, t) => acc + (t.fileSize || 0), 0);
  const totalMB = (totalBytes / (1024 * 1024)).toFixed(1);
  const activeDownloadingTask = tasks.find((t) => t.status === "downloading" || t.status === "converting");

  // Load home data
  useEffect(() => {
    let isMounted = true;
    setIsLoadingHome(true);

    Promise.allSettled([
      getTrendingTracks("tendances"),
      getTrendingTracks("rap"),
      getTrendingTracks("pop"),
    ]).then(([trendingRes, rapRes, popRes]) => {
      if (!isMounted) return;
      if (trendingRes.status === "fulfilled") setFeaturedTracks(trendingRes.value);
      if (rapRes.status === "fulfilled") setRapTracks(rapRes.value);
      if (popRes.status === "fulfilled") setPopTracks(popRes.value);
      setIsLoadingHome(false);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  // Handle Search with 100 tracks per page & 50 pages maximum support
  const handlePerformSearch = useCallback(
    async (query: string, page: number = 1) => {
      const q = query.trim();
      if (!q) return;

      setIsSearching(true);
      setSearchError(null);
      setCurrentView("search");
      setSearchCurrentPage(page);

      try {
        const response = await searchTracks(q, page);
        setSearchResults(response.results);
        setSearchCurrentPage(response.page);
        setSearchTotalPages(response.totalPages);
        setSearchTotalResults(response.totalResults);

        // Scroll to top of content smoothly
        if (mainScrollRef.current) {
          mainScrollRef.current.scrollTo({ top: 0, behavior: "smooth" });
        }
      } catch (err: any) {
        console.error("Search error:", err);
        setSearchError("Impossible de récupérer les résultats. Vérifiez votre connexion.");
      } finally {
        setIsSearching(false);
      }
    },
    []
  );

  const handleQuickUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickUrl.trim()) return;
    setSearchQuery(quickUrl.trim());
    handlePerformSearch(quickUrl.trim(), 1);
    setQuickUrl("");
  };

  const spotlightTrack = currentTrack || featuredTracks[0] || null;
  const isSpotlightPlaying = currentTrack?.id === spotlightTrack?.id && isPlaying;
  const isSpotlightDownloaded = spotlightTrack ? (isDownloaded(spotlightTrack.id) || spotlightTrack.isDownloaded) : false;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#000000] text-[#FFFFFF] font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Left Sidebar (Desktop Only) */}
      <Sidebar
        currentView={currentView}
        onNavigate={(v) => {
          setCurrentView(v);
          if (v === "home") setSearchQuery("");
        }}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenDownloadQueue={() => setIsDownloadQueueOpen(true)}
      />

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative">
        {/* Top Navbar */}
        <Navbar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onPerformSearch={(q) => handlePerformSearch(q, 1)}
          onBack={() => setCurrentView("home")}
          onForward={() => {}}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenDownloadQueue={() => setIsDownloadQueueOpen(true)}
        />

        {/* Offline Banner if active */}
        {isOfflineOnly && (
          <div className="bg-gradient-to-r from-amber-600 to-amber-700 px-3 sm:px-6 py-1.5 flex items-center justify-between text-[11px] font-semibold text-black flex-shrink-0">
            <div className="flex items-center gap-1.5">
              <WifiOff className="w-3.5 h-3.5" />
              <span>Mode Hors-Ligne actif — Lecture de vos MP3 locaux uniquement.</span>
            </div>
            <span className="bg-black/20 text-black px-1.5 py-0.2 rounded font-bold text-[10px]">
              {downloadedTracks.length} titres
            </span>
          </div>
        )}

        {/* Content Scrollable Area */}
        <main
          ref={mainScrollRef}
          className="flex-1 overflow-y-auto custom-scrollbar bg-gradient-to-b from-[#121212] via-[#0d0d0d] to-[#000000] p-3 sm:p-5 md:p-8 pb-32 md:pb-6"
        >
          {/* VIEW: Search Results */}
          {currentView === "search" && (
            <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#282828] pb-4">
                <div>
                  <h1 className="text-lg sm:text-2xl font-extrabold text-white">
                    Résultats pour <span className="text-[#1db954]">"{searchQuery}"</span>
                  </h1>
                  <p className="text-xs text-zinc-400 mt-1 flex items-center gap-2">
                    {searchTotalPages > 1 ? (
                      <>
                        <span className="bg-[#1db954]/10 text-[#1db954] font-bold px-2 py-0.5 rounded border border-[#1db954]/30">
                          100 morceaux par page
                        </span>
                        <span>
                          Page <strong className="text-white">{searchCurrentPage}</strong> sur{" "}
                          <strong className="text-white">{searchTotalPages}</strong> (50 pages max)
                        </span>
                      </>
                    ) : (
                      <span className="text-zinc-300">
                        {searchResults.length} morceaux trouvés • Page unique disponible
                      </span>
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {searchResults.length > 0 && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          if (selectedTracks.length === searchResults.length) {
                            clearSelection();
                          } else {
                            selectAllTracks(searchResults);
                          }
                        }}
                        className="px-3 py-1.5 bg-[#242424] hover:bg-[#333] border border-[#383838] text-white font-bold text-xs rounded-full flex items-center gap-1.5 transition-colors"
                      >
                        <Layers className="w-3.5 h-3.5 text-[#1db954]" />
                        <span>
                          {selectedTracks.length === searchResults.length
                            ? "Tout désélectionner"
                            : "Tout sélectionner"}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setBatchTracksList(searchResults);
                          setBatchModalTitle(`Télécharger la page ${searchCurrentPage} en ZIP`);
                          setIsBatchModalOpen(true);
                        }}
                        className="px-3.5 py-1.5 bg-[#1db954] hover:bg-[#1ed760] text-black font-extrabold text-xs rounded-full flex items-center gap-1.5 transition-transform active:scale-95 shadow-md shadow-[#1db954]/20 whitespace-nowrap"
                      >
                        <FileDown className="w-3.5 h-3.5" />
                        <span>ZIP page ({searchResults.length})</span>
                      </button>
                    </>
                  )}

                  {searchTotalPages > 1 && (
                    <div className="text-xs text-zinc-400 font-medium hidden sm:block">
                      Total : <span className="text-white font-bold">{searchTotalResults} morceaux</span>
                    </div>
                  )}
                </div>
              </div>

              {isSearching ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5 sm:gap-4">
                  {Array.from({ length: 18 }).map((_, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-xl bg-[#181818] animate-pulse space-y-2 border border-[#282828]"
                    >
                      <div className="aspect-square w-full rounded-lg bg-[#242424]" />
                      <div className="h-3.5 bg-[#242424] rounded w-3/4" />
                      <div className="h-2.5 bg-[#242424] rounded w-1/2" />
                    </div>
                  ))}
                </div>
              ) : searchError ? (
                <div className="p-6 text-center bg-[#181818] border border-red-500/30 rounded-2xl text-red-400 text-xs space-y-2">
                  <AlertCircle className="w-6 h-6 mx-auto" />
                  <p>{searchError}</p>
                </div>
              ) : searchResults.length === 0 ? (
                <div className="p-8 text-center bg-[#181818] border border-[#282828] rounded-2xl text-zinc-400 space-y-2">
                  <Search className="w-7 h-7 mx-auto text-zinc-600" />
                  <p className="text-xs sm:text-sm font-semibold">Aucun résultat trouvé pour "{searchQuery}"</p>
                  <p className="text-[11px] text-zinc-500">Essayez un autre artiste ou collez un lien vidéo.</p>
                </div>
              ) : (
                <>
                  {/* Results Grid (100 items per page) */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5 sm:gap-4">
                    {searchResults.map((track) => (
                      <TrackCard
                        key={track.id}
                        track={track}
                        queueContext={searchResults}
                        onOpenDownloadModal={(t) => setSelectedDownloadTrack(t)}
                        isSelectMode={selectedTracks.length > 0 || isMultiSelectMode}
                        isSelected={selectedTracks.some((t) => t.id === track.id)}
                        onToggleSelect={toggleSelectTrack}
                      />
                    ))}
                  </div>

                  {/* Dynamic Pagination Component */}
                  <Pagination
                    currentPage={searchCurrentPage}
                    totalPages={searchTotalPages}
                    totalResults={searchTotalResults}
                    onPageChange={(p) => handlePerformSearch(searchQuery, p)}
                    disabled={isSearching}
                  />
                </>
              )}
            </div>
          )}

          {/* VIEW: Home / Discover (Mobile-Friendly Grid) */}
          {currentView === "home" && (
            <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-300">
              {/* Top Quick Converter Bar */}
              <div className="bg-[#181818] border border-[#282828] hover:border-[#383838] transition-colors rounded-2xl p-3.5 sm:p-5 shadow-lg flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-[#1db954]/20 text-[#1db954] flex items-center justify-center flex-shrink-0 border border-[#1db954]/30">
                    <LinkIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-xs sm:text-sm font-bold text-white truncate">Convertisseur YouTube MP3</h3>
                      <span className="text-[9px] bg-[#242424] text-[#1db954] font-extrabold px-1.5 py-0.2 rounded border border-[#333]">
                        {settings.defaultBitrate || 320}k HD
                      </span>
                    </div>
                    <p className="text-[10px] sm:text-xs text-zinc-400 truncate">
                      Collez un lien YouTube pour extraire le MP3
                    </p>
                  </div>
                </div>

                <form onSubmit={handleQuickUrlSubmit} className="flex items-center gap-1.5 w-full sm:w-auto flex-1 max-w-md">
                  <input
                    type="text"
                    value={quickUrl}
                    onChange={(e) => setQuickUrl(e.target.value)}
                    placeholder="https://youtube.com/watch?v=..."
                    className="flex-1 bg-[#242424] border border-[#333] focus:border-[#1db954] rounded-full py-1.5 sm:py-2 pl-3 pr-3 text-xs text-white placeholder:text-zinc-500 outline-none"
                  />
                  <button
                    type="submit"
                    className="px-3.5 py-1.5 sm:py-2 bg-[#1db954] hover:bg-[#1ed760] text-black text-xs font-black rounded-full transition-transform active:scale-95 whitespace-nowrap shadow"
                  >
                    CONVERTIR
                  </button>
                </form>
              </div>

              {/* PRIMARY CARDS (Bento / Responsive on mobile) */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 sm:gap-4">
                {/* SPOTLIGHT CARD */}
                <div className="md:col-span-7 bg-[#1db954]/10 border border-[#1db954]/25 rounded-2xl p-4 sm:p-6 relative overflow-hidden shadow-lg flex flex-col justify-between group">
                  <div className="relative z-10 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="bg-[#1db954] text-black text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded">
                        {activeDownloadingTask
                          ? "TÉLÉCHARGEMENT"
                          : isPlaying
                          ? "LECTURE EN COURS"
                          : "EN VEDETTE"}
                      </span>
                      {activeDownloadingTask ? (
                        <span className="text-xs font-mono text-[#1db954] font-bold animate-pulse">
                          {activeDownloadingTask.progress}%
                        </span>
                      ) : (
                        <span className="text-[11px] text-zinc-400 font-medium">
                          {spotlightTrack?.durationFormatted || "3:45"}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3.5">
                      <div className="relative w-16 h-16 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-[#242424] shadow flex-shrink-0">
                        <img
                          src={
                            spotlightTrack?.thumbnail ||
                            "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop"
                          }
                          alt={spotlightTrack?.title || "NLSmusic"}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                        {isSpotlightPlaying && (
                          <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                            <span className="w-2.5 h-2.5 bg-[#1db954] rounded-full animate-ping" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0 space-y-0.5">
                        <h2 className="text-sm sm:text-lg font-black text-white font-['Outfit'] truncate">
                          {spotlightTrack?.title || "Découvrez vos morceaux préférés"}
                        </h2>
                        <p className="text-xs font-semibold text-zinc-300 truncate">
                          {spotlightTrack?.artist || "YouTube MP3"}
                        </p>
                        <p className="text-[10px] text-zinc-400 truncate">
                          Sauvegarde directe en haute qualité (.mp3)
                        </p>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-white/10 h-1 rounded-full overflow-hidden">
                      <div
                        className="bg-[#1db954] h-full rounded-full transition-all duration-300"
                        style={{
                          width: activeDownloadingTask
                            ? `${activeDownloadingTask.progress}%`
                            : isPlaying
                            ? "65%"
                            : "100%",
                        }}
                      />
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-1">
                      {spotlightTrack && (
                        <button
                          onClick={() => {
                            if (isSpotlightPlaying) togglePlay();
                            else playTrack(spotlightTrack, featuredTracks);
                          }}
                          className="px-4 py-1.5 rounded-full bg-[#1db954] hover:bg-[#1ed760] text-black text-xs font-black flex items-center gap-1.5 transition-transform active:scale-95 shadow"
                        >
                          {isSpotlightPlaying ? (
                            <>
                              <Pause className="w-3.5 h-3.5 fill-black" />
                              <span>Pause</span>
                            </>
                          ) : (
                            <>
                              <Play className="w-3.5 h-3.5 fill-black" />
                              <span>Écouter</span>
                            </>
                          )}
                        </button>
                      )}

                      {spotlightTrack && (
                        <button
                          onClick={() => setSelectedDownloadTrack(spotlightTrack)}
                          className="px-3 py-1.5 rounded-full bg-black/40 text-white text-xs font-bold flex items-center gap-1.5 border border-white/10 active:scale-95 transition-all"
                        >
                          <Download className="w-3.5 h-3.5 text-[#1db954]" />
                          <span>{isSpotlightDownloaded ? "Sauvegardé" : "MP3"}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* NOTIFICATION CARD */}
                <div className="md:col-span-5 bg-gradient-to-br from-[#1db954]/80 via-[#10331d] to-[#121212] rounded-2xl p-4 sm:p-5 flex flex-col justify-between border border-[#1db954]/30 shadow-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="bg-black/40 px-2.5 py-0.5 rounded-md border border-white/10 flex items-center gap-1.5 text-[10px] font-bold text-white uppercase">
                      <Bell className="w-3 h-3 text-[#1db954]" />
                      <span>Nouveauté</span>
                    </div>
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  </div>

                  <div>
                    <h4 className="text-sm sm:text-base font-black text-white leading-tight font-['Outfit']">
                      Gazo & Tiakola • Nouveau single disponible
                    </h4>
                    <p className="text-[11px] text-zinc-300 mt-1">
                      Téléchargement MP3 320 kbps avec tags intégrés.
                    </p>
                  </div>

                  <button
                    onClick={() => handlePerformSearch("Gazo Tiakola", 1)}
                    className="w-full bg-black hover:bg-zinc-900 text-white py-2 rounded-full text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-transform border border-white/10"
                  >
                    <Download className="w-3.5 h-3.5 text-[#1db954]" />
                    <span>TÉLÉCHARGER MAINTENANT</span>
                  </button>
                </div>
              </div>

              {/* SECTION: TENDANCES */}
              <div className="pt-2 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Flame className="w-4 h-4 text-amber-500" />
                    <h2 className="text-sm sm:text-base font-black text-white font-['Outfit']">Tendances Musicales</h2>
                  </div>
                  <button
                    onClick={() => setCurrentView("genre")}
                    className="text-[11px] text-zinc-400 hover:text-[#1db954] font-bold flex items-center gap-0.5"
                  >
                    <span>Voir tout</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 sm:gap-4">
                  {featuredTracks.slice(0, 12).map((track) => (
                    <TrackCard
                      key={track.id}
                      track={track}
                      queueContext={featuredTracks}
                      onOpenDownloadModal={(t) => setSelectedDownloadTrack(t)}
                    />
                  ))}
                </div>
              </div>

              {/* SECTION: RAP */}
              <div className="pt-2 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Disc className="w-4 h-4 text-[#1db954]" />
                    <h2 className="text-sm sm:text-base font-black text-white font-['Outfit']">Top Rap & Urbain</h2>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 sm:gap-4">
                  {rapTracks.slice(0, 6).map((track) => (
                    <TrackCard
                      key={track.id}
                      track={track}
                      queueContext={rapTracks}
                      onOpenDownloadModal={(t) => setSelectedDownloadTrack(t)}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* VIEW: Library */}
          {currentView === "library" && (
            <LibraryView
              onOpenDownloadModal={(t) => setSelectedDownloadTrack(t)}
              onOpenBatchModal={(tracks, title) => {
                setBatchTracksList(tracks);
                if (title) setBatchModalTitle(title);
                setIsBatchModalOpen(true);
              }}
              onOpenTagEditor={(t) => setSelectedTagTrack(t)}
              selectedTracks={selectedTracks}
              onToggleSelect={toggleSelectTrack}
              isSelectMode={selectedTracks.length > 0 || isMultiSelectMode}
            />
          )}

          {/* VIEW: Explore / Genre */}
          {currentView === "genre" && (
            <TrendingView
              onOpenDownloadModal={(t) => setSelectedDownloadTrack(t)}
              selectedTracks={selectedTracks}
              onToggleSelect={toggleSelectTrack}
              isSelectMode={selectedTracks.length > 0 || isMultiSelectMode}
            />
          )}

          {/* VIEW: Favorites */}
          {currentView === "favorites" && (
            <div className="p-3.5 sm:p-5 md:p-8 space-y-4 sm:space-y-6">
              <div className="p-4 sm:p-6 rounded-2xl bg-gradient-to-r from-[#450af5] to-[#8e8ee5] text-white flex items-center justify-between shadow-xl border border-white/10">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow flex-shrink-0">
                    <Heart className="w-6 h-6 sm:w-8 sm:h-8 fill-white" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider opacity-80">
                      Playlist
                    </span>
                    <h1 className="text-lg sm:text-3xl font-black mt-0.5 font-['Outfit']">
                      Titres likés
                    </h1>
                    <p className="text-[11px] opacity-90 mt-0.5">{favoriteIds.length} morceaux favoris</p>
                  </div>
                </div>

                {downloadedTracks.filter((t) => favoriteIds.includes(t.id)).length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      const favs = downloadedTracks.filter((t) => favoriteIds.includes(t.id));
                      setBatchTracksList(favs);
                      setBatchModalTitle(`Télécharger les favoris en ZIP (${favs.length})`);
                      setIsBatchModalOpen(true);
                    }}
                    className="px-3.5 py-2 bg-white text-black font-extrabold text-xs rounded-full flex items-center gap-1.5 transition-transform active:scale-95 shadow"
                  >
                    <FileDown className="w-3.5 h-3.5 text-[#450af5]" />
                    <span>ZIP</span>
                  </button>
                )}
              </div>

              {downloadedTracks.filter((t) => favoriteIds.includes(t.id)).length === 0 ? (
                <div className="p-8 text-center bg-[#181818] rounded-2xl border border-[#282828] text-zinc-400 space-y-2">
                  <Heart className="w-6 h-6 mx-auto text-zinc-600" />
                  <p className="font-semibold text-xs sm:text-sm">Aucun morceau liké pour le moment.</p>
                  <p className="text-[11px] text-zinc-500">
                    Cliquez sur le cœur d'un titre pour l'ajouter à vos favoris.
                  </p>
                </div>
              ) : (
                <div className="rounded-2xl bg-[#181818] border border-[#282828] p-1.5 divide-y divide-[#282828]/40">
                  {downloadedTracks
                    .filter((t) => favoriteIds.includes(t.id))
                    .map((track, i) => (
                      <TrackRow
                        key={track.id}
                        track={track}
                        index={i}
                        queueContext={downloadedTracks.filter((t) => favoriteIds.includes(t.id))}
                        onOpenDownloadModal={(t) => setSelectedDownloadTrack(t)}
                        onEditMetadata={(t) => setSelectedTagTrack(t)}
                        isSelectMode={selectedTracks.length > 0 || isMultiSelectMode}
                        isSelected={selectedTracks.some((t) => t.id === track.id)}
                        onToggleSelect={toggleSelectTrack}
                      />
                    ))}
                </div>
              )}
            </div>
          )}

          {/* VIEW: Downloads */}
          {currentView === "downloads" && (
            <LibraryView
              onOpenDownloadModal={(t) => setSelectedDownloadTrack(t)}
              onOpenBatchModal={(tracks, title) => {
                setBatchTracksList(tracks);
                if (title) setBatchModalTitle(title);
                setIsBatchModalOpen(true);
              }}
              onOpenTagEditor={(t) => setSelectedTagTrack(t)}
              selectedTracks={selectedTracks}
              onToggleSelect={toggleSelectTrack}
              isSelectMode={selectedTracks.length > 0 || isMultiSelectMode}
            />
          )}
        </main>

        {/* Floating Multi-Select Action Bar */}
        <MultiSelectBar
          selectedTracks={selectedTracks}
          onClearSelection={clearSelection}
          onSelectAll={() => {
            if (currentView === "search") selectAllTracks(searchResults);
            else if (currentView === "library" || currentView === "downloads") selectAllTracks(downloadedTracks);
            else if (currentView === "favorites") selectAllTracks(downloadedTracks.filter((t) => favoriteIds.includes(t.id)));
          }}
          onDownloadZip={() => {
            if (selectedTracks.length === 0) return;
            setBatchTracksList(selectedTracks);
            setBatchModalTitle(`Télécharger ${selectedTracks.length} titres en ZIP`);
            setIsBatchModalOpen(true);
          }}
          onAddToQueue={() => {
            if (selectedTracks.length === 0) return;
            addTracksToQueue(selectedTracks, settings.defaultBitrate || 320);
            clearSelection();
            setIsDownloadQueueOpen(true);
          }}
          onPlaySelected={() => {
            if (selectedTracks.length === 0) return;
            playTrack(selectedTracks[0], selectedTracks.slice(1));
          }}
        />

        {/* Player (Dual mode: Mini Floating Player on mobile, Desktop Bar on >= md) */}
        <Player
          onToggleQueue={() => setIsQueueOpen(!isQueueOpen)}
          onToggleLyrics={() => setIsLyricsOpen(!isLyricsOpen)}
          onToggleFullScreen={() => setIsFullScreenOpen(true)}
          onOpenDownloadModal={() => {
            if (currentTrack) setSelectedDownloadTrack(currentTrack);
          }}
        />

        {/* Mobile Bottom Navigation Bar (iPhone & Android) */}
        <MobileNav
          currentView={currentView}
          onNavigate={(v) => {
            setCurrentView(v);
            if (v === "home") setSearchQuery("");
          }}
          onOpenDownloadQueue={() => setIsDownloadQueueOpen(true)}
        />
      </div>

      {/* Slide-over Audio Playback Queue Drawer */}
      <QueueDrawer isOpen={isQueueOpen} onClose={() => setIsQueueOpen(false)} />

      {/* Slide-over Background Download Queue Manager Drawer */}
      <DownloadQueueDrawer
        isOpen={isDownloadQueueOpen}
        onClose={() => setIsDownloadQueueOpen(false)}
      />

      {/* Lyrics / Song details modal */}
      {isLyricsOpen && (
        <LyricsModal track={currentTrack} onClose={() => setIsLyricsOpen(false)} />
      )}

      {/* MP3 Download Quality Modal */}
      {selectedDownloadTrack && (
        <DownloadModal
          track={selectedDownloadTrack}
          onClose={() => setSelectedDownloadTrack(null)}
        />
      )}

      {/* Settings Modal */}
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

      {/* Fullscreen Player */}
      <FullScreenPlayer
        isOpen={isFullScreenOpen}
        onClose={() => setIsFullScreenOpen(false)}
        onOpenDownloadModal={() => {
          if (currentTrack) setSelectedDownloadTrack(currentTrack);
        }}
      />

      {/* User Login / Register / Profile Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={closeAuthModal}
        initialTab={authModalInitialTab}
      />

      {/* Batch ZIP Download Modal */}
      <BatchDownloadModal
        tracks={batchTracksList}
        title={batchModalTitle}
        isOpen={isBatchModalOpen}
        onClose={() => setIsBatchModalOpen(false)}
      />

      {/* ID3 Tag Editor Modal */}
      <TagEditorModal
        track={selectedTagTrack}
        isOpen={!!selectedTagTrack}
        onClose={() => setSelectedTagTrack(null)}
      />
    </div>
  );
}

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div
        id="app-initial-loader"
        className="h-screen w-screen bg-[#0a0a0a] flex flex-col items-center justify-center text-white space-y-4 font-['Plus_Jakarta_Sans',sans-serif]"
      >
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#1db954] to-[#1ed760] flex items-center justify-center shadow-xl shadow-[#1db954]/30 animate-pulse">
          <Music2 className="w-8 h-8 text-black" strokeWidth={2.5} />
        </div>
        <div className="flex items-center gap-2 text-zinc-400 text-xs font-semibold">
          <div className="w-2 h-2 rounded-full bg-[#1db954] animate-ping" />
          <span>Chargement de NLSmusic...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthScreen />;
  }

  return (
    <AudioProvider>
      <DownloadProvider>
        <MainApp />
      </DownloadProvider>
    </AudioProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
