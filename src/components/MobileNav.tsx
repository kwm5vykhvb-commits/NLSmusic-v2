import React from "react";
import { Home, Compass, FolderHeart, Heart, Download } from "lucide-react";
import { ViewMode } from "../types";
import { useDownload } from "../context/DownloadContext";

interface MobileNavProps {
  currentView: ViewMode;
  onNavigate: (view: ViewMode) => void;
  onOpenDownloadQueue?: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ currentView, onNavigate, onOpenDownloadQueue }) => {
  const { downloadedTracks, favoriteIds, activeDownloadsCount, pendingDownloadsCount } = useDownload();
  const totalQueue = activeDownloadsCount + pendingDownloadsCount;

  const navItems = [
    { id: "home" as ViewMode, label: "Accueil", icon: Home },
    { id: "genre" as ViewMode, label: "Explorer", icon: Compass },
    {
      id: "library" as ViewMode,
      label: "Ma Musique",
      icon: FolderHeart,
      badge: downloadedTracks.length > 0 ? downloadedTracks.length : undefined,
    },
    {
      id: "favorites" as ViewMode,
      label: "Favoris",
      icon: Heart,
      badge: favoriteIds.length > 0 ? favoriteIds.length : undefined,
    },
  ];

  return (
    <nav
      id="nls-mobile-nav"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#121212]/95 backdrop-blur-xl border-t border-[#262626] px-2 pt-1 pb-[calc(env(safe-area-inset-bottom,8px)+4px)] flex items-center justify-around select-none shadow-2xl"
    >
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = currentView === item.id || (item.id === "library" && currentView === "downloads");

        return (
          <button
            key={item.id}
            id={`mobile-nav-${item.id}`}
            onClick={() => onNavigate(item.id)}
            className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-all relative flex-1 ${
              isActive ? "text-[#1db954]" : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <div className="relative">
              <Icon
                className={`w-5 h-5 transition-transform ${
                  isActive ? "scale-110 stroke-[2.5]" : "stroke-[1.8]"
                } ${item.id === "favorites" && isActive ? "fill-[#1db954]" : ""}`}
              />
              {item.badge !== undefined && (
                <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 rounded-full bg-[#1db954] text-black text-[9px] font-black flex items-center justify-center shadow">
                  {item.badge > 99 ? "99+" : item.badge}
                </span>
              )}
            </div>
            <span
              className={`text-[10px] mt-1 font-medium tracking-tight truncate max-w-[70px] ${
                isActive ? "font-bold text-[#1db954]" : "text-zinc-400"
              }`}
            >
              {item.label}
            </span>
          </button>
        );
      })}

      {/* Queue Drawer Mobile Button */}
      {onOpenDownloadQueue && (
        <button
          id="mobile-nav-queue"
          onClick={onOpenDownloadQueue}
          className="flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-all relative flex-1 text-zinc-400 hover:text-[#1db954]"
        >
          <div className="relative">
            <Download className={`w-5 h-5 ${activeDownloadsCount > 0 ? "text-[#1db954] animate-bounce" : ""}`} />
            {totalQueue > 0 && (
              <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 rounded-full bg-[#1db954] text-black text-[9px] font-black flex items-center justify-center shadow">
                {totalQueue}
              </span>
            )}
          </div>
          <span className="text-[10px] mt-1 font-medium tracking-tight text-zinc-400">
            File
          </span>
        </button>
      )}
    </nav>
  );
};
