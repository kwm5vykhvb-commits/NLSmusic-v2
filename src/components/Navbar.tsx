import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Bell,
  X,
  Link as LinkIcon,
  WifiOff,
  Sparkles,
  CheckCircle2,
  Trash2,
  Music,
  SlidersHorizontal,
  Music2,
  User as UserIcon,
  LogIn,
  ShieldCheck,
  Download,
  Play,
  ArrowUpLeft,
  Loader2,
} from "lucide-react";
import { useDownload } from "../context/DownloadContext";
import { useAudio } from "../context/AudioContext";
import { useAuth } from "../context/AuthContext";
import { getSearchSuggestions } from "../services/api";
import { SearchSuggestionsResponse } from "../types";

interface NavbarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onPerformSearch: (q: string) => void;
  onBack?: () => void;
  onForward?: () => void;
  onOpenSettings: () => void;
  onOpenDownloadQueue?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  searchQuery,
  onSearchChange,
  onPerformSearch,
  onBack,
  onForward,
  onOpenSettings,
  onOpenDownloadQueue,
}) => {
  const {
    notifications,
    unreadNotifsCount,
    markNotificationsAsRead,
    clearNotifications,
    isOfflineOnly,
    activeDownloadsCount,
    pendingDownloadsCount,
    tasks,
  } = useDownload();
  const { playTrack } = useAudio();
  const { user, isAuthenticated, openAuthModal } = useAuth();
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement | null>(null);

  // Suggestions state
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const searchContainerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const suppressSuggestionsRef = useRef<boolean>(false);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setIsSuggestionsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isYouTubeUrl =
    searchQuery.includes("youtube.com") || searchQuery.includes("youtu.be");

  // Fetch search suggestions (debounced for 1 letter or more)
  useEffect(() => {
    const q = searchQuery.trim();
    if (suppressSuggestionsRef.current || q.length < 1 || isYouTubeUrl) {
      if (suppressSuggestionsRef.current) {
        suppressSuggestionsRef.current = false;
      }
      setSuggestions([]);
      setIsSuggestionsOpen(false);
      setIsLoadingSuggestions(false);
      return;
    }

    let isMounted = true;
    setIsLoadingSuggestions(true);

    const timer = setTimeout(async () => {
      try {
        const data = await getSearchSuggestions(q);
        if (!isMounted || suppressSuggestionsRef.current) return;

        // Combine queries, artist names and track titles as clean search suggestions
        const list: string[] = [];
        const seen = new Set<string>();

        // 1. YouTube Query Suggestions (primary, matching YouTube screenshot)
        if (Array.isArray(data.queries)) {
          for (const item of data.queries) {
            const clean = item.trim();
            if (clean && !seen.has(clean.toLowerCase())) {
              seen.add(clean.toLowerCase());
              list.push(clean);
            }
          }
        }

        // 2. Artists suggestions as query strings if not already included
        if (Array.isArray(data.artists)) {
          for (const a of data.artists) {
            const clean = a.name?.trim();
            if (clean && !seen.has(clean.toLowerCase())) {
              seen.add(clean.toLowerCase());
              list.push(clean);
            }
          }
        }

        // 3. Track suggestions as query strings
        if (Array.isArray(data.tracks)) {
          for (const t of data.tracks) {
            const clean = `${t.artist} ${t.title}`.trim();
            if (clean && !seen.has(clean.toLowerCase())) {
              seen.add(clean.toLowerCase());
              list.push(clean);
            }
          }
        }

        if (!suppressSuggestionsRef.current && isMounted) {
          setSuggestions(list.slice(0, 12));
          setIsSuggestionsOpen(list.length > 0);
          setSelectedIndex(-1);
        }
      } catch {
        if (isMounted) {
          setSuggestions([]);
          setIsSuggestionsOpen(false);
        }
      } finally {
        if (isMounted) {
          setIsLoadingSuggestions(false);
        }
      }
    }, 70);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [searchQuery, isYouTubeUrl]);

  const handleSelectSuggestion = (text: string) => {
    suppressSuggestionsRef.current = true;
    setIsSuggestionsOpen(false);
    setSuggestions([]);
    setSelectedIndex(-1);
    onSearchChange(text);
    onPerformSearch(text);
    if (inputRef.current) {
      inputRef.current.blur();
    }
  };

  const handleFillInput = (e: React.MouseEvent, text: string) => {
    e.preventDefault();
    e.stopPropagation();
    suppressSuggestionsRef.current = false;
    onSearchChange(text);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (suggestions.length > 0) {
        setIsSuggestionsOpen(true);
        setSelectedIndex((prev) => (prev + 1) % suggestions.length);
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (suggestions.length > 0) {
        setIsSuggestionsOpen(true);
        setSelectedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
      }
    } else if (e.key === "Escape") {
      setIsSuggestionsOpen(false);
      setSuggestions([]);
    } else if (e.key === "Enter") {
      if (isSuggestionsOpen && selectedIndex >= 0 && selectedIndex < suggestions.length) {
        e.preventDefault();
        handleSelectSuggestion(suggestions[selectedIndex]);
      } else {
        suppressSuggestionsRef.current = true;
        setIsSuggestionsOpen(false);
        setSuggestions([]);
        if (inputRef.current) {
          inputRef.current.blur();
        }
        onPerformSearch(searchQuery);
      }
    }
  };

  return (
    <header
      id="nls-navbar"
      className="pt-[env(safe-area-inset-top,0px)] px-3 sm:px-6 bg-[#121212]/95 backdrop-blur-md sticky top-0 z-30 border-b border-[#282828]/50 flex-shrink-0"
    >
      <div className="h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
      {/* Mobile Logo Brand */}
      <div className="flex md:hidden items-center gap-2 flex-shrink-0">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#1db954] to-[#1ed760] flex items-center justify-center shadow-md shadow-[#1db954]/20">
          <Music2 className="w-4.5 h-4.5 text-black" strokeWidth={2.5} />
        </div>
      </div>

      {/* Navigation history & Search */}
      <div className="flex items-center gap-2 sm:gap-4 flex-1 max-w-2xl min-w-0">
        <div className="hidden md:flex items-center gap-1.5 flex-shrink-0">
          <button
            id="nav-btn-back"
            onClick={onBack}
            className="w-8 h-8 rounded-full bg-black/60 hover:bg-black text-white flex items-center justify-center transition-colors disabled:opacity-40"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            id="nav-btn-forward"
            onClick={onForward}
            className="w-8 h-8 rounded-full bg-black/60 hover:bg-black text-white flex items-center justify-center transition-colors disabled:opacity-40"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Search input container with suggestions */}
        <div className="relative flex-1 group min-w-0" ref={searchContainerRef}>
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400 group-focus-within:text-white z-10">
            {isLoadingSuggestions ? (
              <Loader2 className="w-3.5 h-3.5 text-[#1db954] animate-spin" />
            ) : isYouTubeUrl ? (
              <LinkIcon className="w-3.5 h-3.5 text-[#1db954] animate-pulse" />
            ) : (
              <Search className="w-3.5 h-3.5" />
            )}
          </div>
          <input
            ref={inputRef}
            id="search-input-main"
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onFocus={() => {
              if (searchQuery.trim().length >= 1 && suggestions.length > 0) {
                setIsSuggestionsOpen(true);
              }
            }}
            onKeyDown={handleKeyDown}
            placeholder="Rechercher un morceau, un artiste ou coller un lien..."
            autoComplete="off"
            className="w-full bg-[#202020] hover:bg-[#262626] focus:bg-[#262626] text-white text-xs sm:text-sm rounded-full pl-8 sm:pl-9 pr-14 sm:pr-24 py-2 sm:py-2.5 outline-none border border-transparent focus:border-[#444] transition-all placeholder:text-zinc-500"
          />

          <div className="absolute inset-y-0 right-1 flex items-center gap-1 z-10">
            {searchQuery && (
              <button
                id="btn-clear-search"
                onClick={() => {
                  onSearchChange("");
                  setIsSuggestionsOpen(false);
                }}
                className="p-1 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-700 transition-colors"
                title="Effacer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
            <button
              id="btn-trigger-search"
              onClick={() => {
                suppressSuggestionsRef.current = true;
                setIsSuggestionsOpen(false);
                setSuggestions([]);
                if (inputRef.current) {
                  inputRef.current.blur();
                }
                onPerformSearch(searchQuery);
              }}
              className="px-2.5 sm:px-3 py-1 bg-[#1db954] hover:bg-[#1ed760] text-black text-[10px] sm:text-xs font-bold rounded-full transition-transform active:scale-95 whitespace-nowrap"
            >
              OK
            </button>
          </div>

          {/* YouTube-Style Search Suggestions Dropdown */}
          {isSuggestionsOpen && suggestions.length > 0 && (
            <div
              id="search-suggestions-dropdown"
              className="absolute left-0 right-0 top-full mt-2 bg-[#0f0f0f] border border-[#272727] rounded-2xl shadow-2xl overflow-hidden z-50 backdrop-blur-2xl max-h-[70vh] sm:max-h-96 overflow-y-auto custom-scrollbar py-1 animate-in fade-in slide-in-from-top-1 duration-100"
            >
              {suggestions.map((item, idx) => {
                const isSelected = selectedIndex === idx;
                return (
                  <div
                    key={`${item}-${idx}`}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelectSuggestion(item);
                    }}
                    onClick={() => handleSelectSuggestion(item)}
                    className={`flex items-center justify-between px-3.5 py-2.5 sm:py-3 cursor-pointer select-none transition-colors group ${
                      isSelected
                        ? "bg-[#272727] text-white"
                        : "hover:bg-[#1f1f1f] text-zinc-100"
                    }`}
                  >
                    {/* Left Icon + Text */}
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      <Search className="w-4 h-4 text-zinc-400 group-hover:text-zinc-200 flex-shrink-0" />
                      <span className="text-xs sm:text-sm font-medium text-white truncate">
                        {item}
                      </span>
                    </div>

                    {/* Right Arrow (YouTube style: insert query into search box) */}
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleFillInput(e, item);
                      }}
                      onClick={(e) => handleFillInput(e, item)}
                      className="p-1 sm:p-1.5 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800 transition-colors flex-shrink-0 ml-2"
                      title="Insérer dans la recherche"
                    >
                      <ArrowUpLeft className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right Action Icons & User Profile */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 flex-shrink-0">
        {/* Offline Pill */}
        {isOfflineOnly && (
          <div
            id="badge-offline-mode"
            className="flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] sm:text-xs font-semibold"
          >
            <WifiOff className="w-3 h-3" />
            <span className="hidden sm:inline">Hors-Ligne</span>
          </div>
        )}

        {/* Notifications Center */}
        <div className="relative" ref={notifRef}>
          <button
            id="btn-notifications-toggle"
            onClick={() => {
              setIsNotifOpen(!isNotifOpen);
              if (!isNotifOpen) markNotificationsAsRead();
            }}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#202020] hover:bg-[#2a2a2a] text-zinc-300 hover:text-white flex items-center justify-center transition-colors relative"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadNotifsCount > 0 && (
              <span className="absolute top-1 right-1 w-3.5 h-3.5 bg-[#1db954] text-black text-[9px] font-extrabold rounded-full flex items-center justify-center shadow shadow-[#1db954]/50">
                {unreadNotifsCount}
              </span>
            )}
          </button>

          {/* Dropdown menu */}
          {isNotifOpen && (
            <div
              id="notifications-dropdown-panel"
              className="absolute right-0 mt-2 w-72 sm:w-84 bg-[#181818] border border-[#282828] rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150"
            >
              <div className="p-3 sm:p-4 border-b border-[#282828] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="w-3.5 h-3.5 text-[#1db954]" />
                  <h3 className="text-xs sm:text-sm font-bold text-white">Notifications</h3>
                </div>
                {notifications.length > 0 && (
                  <button
                    onClick={clearNotifications}
                    className="text-[10px] sm:text-xs text-zinc-400 hover:text-red-400 flex items-center gap-1 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" /> Effacer
                  </button>
                )}
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-[#282828]/50 custom-scrollbar">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-zinc-500 text-xs">
                    Aucune notification.
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={`p-3 hover:bg-[#222222] transition-colors flex items-start gap-2.5 ${
                        !notif.read ? "bg-[#1f1f1f]" : ""
                      }`}
                    >
                      {notif.type === "download_complete" ? (
                        <div className="w-7 h-7 rounded-full bg-[#1db954]/20 text-[#1db954] flex items-center justify-center flex-shrink-0 mt-0.5">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </div>
                      ) : notif.type === "new_release" ? (
                        <div className="w-7 h-7 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Sparkles className="w-3.5 h-3.5" />
                        </div>
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Music className="w-3.5 h-3.5" />
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-semibold text-white truncate">{notif.title}</h4>
                        <p className="text-[10px] text-zinc-400 mt-0.5 leading-snug line-clamp-2">
                          {notif.message}
                        </p>
                        {notif.track && (
                          <button
                            onClick={() => {
                              playTrack(notif.track!);
                              setIsNotifOpen(false);
                            }}
                            className="mt-1.5 text-[10px] text-[#1db954] hover:underline font-bold flex items-center gap-1"
                          >
                            Écouter →
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Download Queue Drawer Button */}
        {onOpenDownloadQueue && (
          <button
            id="btn-download-queue-nav"
            onClick={onOpenDownloadQueue}
            className="w-8 h-8 sm:w-auto sm:h-auto sm:px-2.5 sm:py-1.5 rounded-full bg-[#202020] hover:bg-[#2a2a2a] text-zinc-300 hover:text-white flex items-center justify-center gap-1.5 transition-all border border-[#333] relative"
            title="File de téléchargement"
          >
            <Download className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${activeDownloadsCount > 0 ? "text-[#1db954] animate-bounce" : "text-[#1db954]"}`} />
            <span className="text-xs font-bold text-white hidden lg:inline">File</span>
            {activeDownloadsCount + pendingDownloadsCount > 0 && (
              <span className="absolute -top-1 -right-1 sm:static px-1.5 py-0.2 rounded-full bg-[#1db954] text-black text-[9px] font-black">
                {activeDownloadsCount + pendingDownloadsCount}
              </span>
            )}
          </button>
        )}

        {/* Settings button */}
        <button
          id="btn-settings-nav"
          onClick={onOpenSettings}
          className="w-8 h-8 sm:w-auto sm:h-auto sm:px-2.5 sm:py-1.5 rounded-full bg-[#202020] hover:bg-[#2a2a2a] text-zinc-300 hover:text-white flex items-center justify-center gap-1.5 transition-all border border-[#333]"
          title="Paramètres & MP3"
        >
          <SlidersHorizontal className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#1db954]" />
          <span className="text-xs font-bold text-white hidden md:inline">Réglages</span>
        </button>

        {/* USER AUTHENTICATION BUTTON / PROFILE BADGE */}
        {isAuthenticated && user ? (
          <button
            id="btn-user-profile-badge"
            onClick={() => openAuthModal("login")}
            className="flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-full bg-[#202020] hover:bg-[#2a2a2a] border border-[#383838] transition-all group"
            title="Mon Compte NLS"
          >
            <div className="w-6 h-6 rounded-full overflow-hidden bg-zinc-800 border border-[#1db954] flex-shrink-0">
              <img
                src={
                  user.avatar ||
                  "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80"
                }
                alt={user.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
            <span className="text-xs font-bold text-white max-w-[90px] truncate hidden sm:inline">
              {user.name.split(" ")[0]}
            </span>
          </button>
        ) : (
          <button
            id="btn-open-auth-login"
            onClick={() => openAuthModal("login")}
            className="px-3 sm:px-4 py-1.5 rounded-full bg-[#1db954] hover:bg-[#1ed760] text-black font-extrabold text-xs flex items-center gap-1.5 transition-transform active:scale-95 shadow shadow-[#1db954]/20"
          >
            <LogIn className="w-3.5 h-3.5" strokeWidth={2.5} />
            <span className="hidden sm:inline">Connexion</span>
          </button>
        )}
      </div>
      </div>
    </header>
  );
};
