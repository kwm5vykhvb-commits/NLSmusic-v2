import React, { useState } from "react";
import {
  Download,
  X,
  Play,
  Pause,
  RotateCcw,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowUp,
  ArrowDown,
  Sliders,
  Sparkles,
  Layers,
  Zap,
  HardDrive,
} from "lucide-react";
import { DownloadTask } from "../types";
import { useDownload } from "../context/DownloadContext";
import { useAudio } from "../context/AudioContext";

interface DownloadQueueDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DownloadQueueDrawer: React.FC<DownloadQueueDrawerProps> = ({ isOpen, onClose }) => {
  const {
    tasks,
    isQueuePaused,
    pauseQueue,
    resumeQueue,
    pauseTask,
    resumeTask,
    cancelTask,
    cancelAllTasks,
    retryTask,
    retryFailedTasks,
    clearCompletedTasks,
    moveTaskUp,
    moveTaskDown,
    settings,
    updateSettings,
    activeDownloadsCount,
    pendingDownloadsCount,
    failedDownloadsCount,
  } = useDownload();

  const { playTrack } = useAudio();
  const [filterTab, setFilterTab] = useState<"all" | "active" | "completed" | "error">("all");

  if (!isOpen) return null;

  const filteredTasks = tasks.filter((t) => {
    if (filterTab === "active") {
      return (
        t.status === "downloading" ||
        t.status === "converting" ||
        t.status === "saving" ||
        t.status === "pending" ||
        t.status === "paused"
      );
    }
    if (filterTab === "completed") return t.status === "completed";
    if (filterTab === "error") return t.status === "error";
    return true;
  });

  const completedCount = tasks.filter((t) => t.status === "completed").length;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex justify-end animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-[#141414] border-l border-[#282828] h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200"
        id="download-queue-drawer-panel"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#282828] bg-[#181818] flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#1db954]/20 text-[#1db954] flex items-center justify-center">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-base">File de Téléchargement</h3>
                {activeDownloadsCount > 0 && (
                  <span className="w-2 h-2 rounded-full bg-[#1db954] animate-ping" />
                )}
              </div>
              <p className="text-xs text-zinc-400">
                {activeDownloadsCount} en cours • {pendingDownloadsCount} en attente • {completedCount} terminé(s)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Global Toolbar */}
        <div className="p-3 bg-[#1c1c1c] border-b border-[#282828] flex flex-wrap items-center justify-between gap-2 text-xs flex-shrink-0">
          <div className="flex items-center gap-1.5">
            {isQueuePaused ? (
              <button
                onClick={resumeQueue}
                className="px-3 py-1.5 rounded-lg bg-[#1db954] text-black font-extrabold flex items-center gap-1.5 transition-transform active:scale-95 shadow shadow-[#1db954]/20"
                title="Reprendre les téléchargements"
              >
                <Play className="w-3.5 h-3.5 fill-black" />
                <span>Reprendre la file</span>
              </button>
            ) : (
              <button
                onClick={pauseQueue}
                className="px-3 py-1.5 rounded-lg bg-[#282828] hover:bg-[#333] text-zinc-200 font-semibold flex items-center gap-1.5 border border-[#383838] transition-colors"
                title="Mettre en pause la file"
              >
                <Pause className="w-3.5 h-3.5" />
                <span>Mettre en pause</span>
              </button>
            )}

            {failedDownloadsCount > 0 && (
              <button
                onClick={retryFailedTasks}
                className="px-2.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-semibold flex items-center gap-1 border border-amber-500/30 transition-colors"
                title="Réessayer tous les échecs"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Relancer ({failedDownloadsCount})</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Concurrency Selector */}
            <div className="flex items-center gap-1.5 bg-[#141414] px-2 py-1 rounded-lg border border-[#282828] text-zinc-400">
              <span className="text-[10px] uppercase font-bold">Simultanés :</span>
              <select
                value={settings.maxConcurrentDownloads || 3}
                onChange={(e) => updateSettings({ maxConcurrentDownloads: Number(e.target.value) })}
                className="bg-transparent text-white font-bold text-xs outline-none cursor-pointer"
              >
                <option value={1} className="bg-[#202020] text-white">1 flux</option>
                <option value={2} className="bg-[#202020] text-white">2 flux</option>
                <option value={3} className="bg-[#202020] text-white">3 flux (optimal)</option>
                <option value={5} className="bg-[#202020] text-white">5 flux (rapide)</option>
              </select>
            </div>

            {completedCount > 0 && (
              <button
                onClick={clearCompletedTasks}
                className="p-1.5 text-zinc-400 hover:text-zinc-200 rounded-lg hover:bg-zinc-800 transition-colors"
                title="Effacer les terminés"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}

            {tasks.length > 0 && (
              <button
                onClick={cancelAllTasks}
                className="p-1.5 text-zinc-400 hover:text-red-400 rounded-lg hover:bg-zinc-800 transition-colors"
                title="Tout annuler"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="px-4 pt-2.5 pb-1 flex items-center gap-2 border-b border-[#282828] bg-[#141414] text-xs font-semibold flex-shrink-0">
          {[
            { id: "all", label: `Tous (${tasks.length})` },
            { id: "active", label: `En cours (${activeDownloadsCount + pendingDownloadsCount})` },
            { id: "completed", label: `Terminés (${completedCount})` },
            { id: "error", label: `Échecs (${failedDownloadsCount})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-full transition-all ${
                filterTab === tab.id
                  ? "bg-[#282828] text-white font-bold"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Task List */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2.5 custom-scrollbar">
          {filteredTasks.length === 0 ? (
            <div className="py-16 text-center text-zinc-500 space-y-2">
              <Download className="w-10 h-10 mx-auto text-zinc-700 stroke-[1.5]" />
              <p className="text-sm font-semibold">Aucun téléchargement dans cette vue.</p>
              <p className="text-xs text-zinc-600 max-w-xs mx-auto">
                Recherchez des morceaux ou sélectionnez des titres à télécharger pour les voir ici en direct.
              </p>
            </div>
          ) : (
            filteredTasks.map((task, idx) => {
              const isExecuting =
                task.status === "downloading" ||
                task.status === "converting" ||
                task.status === "saving";
              const isPending = task.status === "pending";
              const isPaused = task.status === "paused";
              const isCompleted = task.status === "completed";
              const isError = task.status === "error";

              return (
                <div
                  key={task.id}
                  className={`p-3 rounded-xl border transition-all ${
                    isExecuting
                      ? "bg-[#1f1f1f] border-[#1db954]/50 shadow-md"
                      : isCompleted
                      ? "bg-[#181818] border-[#252525]"
                      : isError
                      ? "bg-red-950/20 border-red-900/40"
                      : "bg-[#1a1a1a] border-[#282828]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Thumbnail */}
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-zinc-800 flex-shrink-0 relative">
                      <img
                        src={
                          task.track.thumbnail ||
                          "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop"
                        }
                        alt={task.track.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                      {isCompleted && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <CheckCircle2 className="w-5 h-5 text-[#1db954]" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-semibold text-white text-xs truncate">
                          {task.track.title}
                        </span>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${
                            isCompleted
                              ? "bg-[#1db954]/20 text-[#1db954]"
                              : isExecuting
                              ? "bg-blue-500/20 text-blue-400 animate-pulse"
                              : isError
                              ? "bg-red-500/20 text-red-400"
                              : "bg-zinc-800 text-zinc-400"
                          }`}
                        >
                          {task.format?.toUpperCase() || "MP3"}{" "}
                          {task.format !== "original" ? `${task.bitrate}k` : "DIRECT"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-zinc-400 mt-0.5">
                        <span className="truncate">{task.track.artist}</span>
                        {task.speed && <span className="font-mono text-zinc-300 ml-1">{task.speed}</span>}
                      </div>

                      {/* Status / ETA / Error message */}
                      <div className="flex items-center justify-between text-[10px] mt-1 text-zinc-400">
                        {isExecuting ? (
                          <span className="text-[#1db954] font-medium flex items-center gap-1">
                            <Sparkles className="w-2.5 h-2.5 animate-spin" />
                            {task.status === "converting"
                              ? "Conversion MP3..."
                              : task.status === "saving"
                              ? "Enregistrement local..."
                              : "Téléchargement..."}
                          </span>
                        ) : isPending ? (
                          <span className="text-zinc-500 flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" /> En attente dans la file
                          </span>
                        ) : isPaused ? (
                          <span className="text-amber-400">En pause</span>
                        ) : isCompleted ? (
                          <span className="text-[#1db954] flex items-center gap-1">
                            Prêt hors-ligne & sur appareil
                          </span>
                        ) : (
                          <span className="text-red-400 truncate max-w-[200px]">
                            {task.errorMessage || "Échec"}
                          </span>
                        )}

                        {task.eta && <span className="text-zinc-400 font-mono">{task.eta}</span>}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {isPending && (
                        <>
                          <button
                            onClick={() => moveTaskUp(task.id)}
                            className="p-1 text-zinc-500 hover:text-white rounded"
                            title="Monter la priorité"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => moveTaskDown(task.id)}
                            className="p-1 text-zinc-500 hover:text-white rounded"
                            title="Descendre la priorité"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}

                      {isPaused ? (
                        <button
                          onClick={() => resumeTask(task.id)}
                          className="p-1 text-[#1db954] hover:bg-zinc-800 rounded"
                          title="Reprendre ce morceau"
                        >
                          <Play className="w-3.5 h-3.5" />
                        </button>
                      ) : isPending ? (
                        <button
                          onClick={() => pauseTask(task.id)}
                          className="p-1 text-zinc-400 hover:text-white rounded"
                          title="Mettre en pause"
                        >
                          <Pause className="w-3.5 h-3.5" />
                        </button>
                      ) : isError ? (
                        <button
                          onClick={() => retryTask(task.id)}
                          className="p-1 text-amber-400 hover:bg-zinc-800 rounded"
                          title="Réessayer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      ) : isCompleted ? (
                        <button
                          onClick={() => playTrack(task.track)}
                          className="p-1 text-[#1db954] hover:bg-zinc-800 rounded"
                          title="Écouter maintenant"
                        >
                          <Play className="w-3.5 h-3.5 fill-[#1db954]" />
                        </button>
                      ) : null}

                      <button
                        onClick={() => cancelTask(task.id)}
                        className="p-1 text-zinc-500 hover:text-red-400 rounded transition-colors"
                        title="Supprimer de la file"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Progress bar for active downloads */}
                  {isExecuting && (
                    <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden mt-2">
                      <div
                        className="bg-[#1db954] h-full rounded-full transition-all duration-150"
                        style={{ width: `${task.progress}%` }}
                      />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="p-3.5 border-t border-[#282828] bg-[#141414] flex items-center justify-between text-xs text-zinc-400 flex-shrink-0">
          <span className="flex items-center gap-1.5">
            <HardDrive className="w-3.5 h-3.5 text-[#1db954]" /> Auto-save appareil actif
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#282828] hover:bg-[#333] text-white font-bold rounded-full transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
