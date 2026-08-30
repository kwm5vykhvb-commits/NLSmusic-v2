import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import confetti from "canvas-confetti";
import { Track, DownloadTask, UserSettings, AppNotification, BatchDownloadProgress, BatchZipOptions } from "../types";
import { downloadTrackBlob, checkNewReleases, createBatchZip, DownloadBlobOptions } from "../services/api";
import {
  saveTrackOffline,
  getAllOfflineTracks,
  removeOfflineTrack,
  triggerBrowserFileDownload,
  getSettings,
  saveSettings,
  getFavorites,
  toggleFavorite as toggleFavDB,
  getPlaylists,
  savePlaylists,
  updateTrackMetadata,
} from "../services/db";
import {
  auth,
  saveFavoriteToFirestore,
  removeFavoriteFromFirestore,
  fetchUserFavoritesFromFirestore,
} from "../services/firebase";

export interface DownloadOptions {
  bitrate?: number;
  direct?: boolean;
  format?: "mp3" | "m4a" | "flac" | "wav" | "original";
  album?: string;
  genre?: string;
  year?: string;
}

const QUEUE_STORAGE_KEY = "nlsmusic_download_queue_v2";

interface DownloadContextType {
  tasks: DownloadTask[];
  downloadedTracks: Track[];
  favoriteIds: string[];
  settings: UserSettings;
  notifications: AppNotification[];
  unreadNotifsCount: number;
  isOfflineOnly: boolean;
  batchProgress: BatchDownloadProgress | null;
  isQueuePaused: boolean;
  activeDownloadsCount: number;
  pendingDownloadsCount: number;
  failedDownloadsCount: number;
  // Queue actions
  startDownload: (track: Track, options?: number | DownloadOptions) => Promise<void>;
  startDirectDownload: (track: Track) => Promise<void>;
  addTracksToQueue: (tracks: Track[], options?: DownloadOptions) => void;
  startBatchDownload: (tracks: Track[], options?: BatchZipOptions) => Promise<void>;
  pauseQueue: () => void;
  resumeQueue: () => void;
  pauseTask: (taskId: string) => void;
  resumeTask: (taskId: string) => void;
  cancelTask: (taskId: string) => void;
  cancelAllTasks: () => void;
  retryTask: (taskId: string) => void;
  retryFailedTasks: () => void;
  clearCompletedTasks: () => void;
  moveTaskUp: (taskId: string) => void;
  moveTaskDown: (taskId: string) => void;
  // Library & Metadata actions
  deleteDownloadedTrack: (trackId: string) => Promise<void>;
  editTrackTags: (trackId: string, newTags: Partial<Track>) => Promise<void>;
  isDownloaded: (trackId: string) => boolean;
  toggleFavorite: (track: Track) => Promise<boolean>;
  isFavorite: (trackId: string) => boolean;
  updateSettings: (newSettings: Partial<UserSettings>) => Promise<void>;
  markNotificationsAsRead: () => void;
  clearNotifications: () => void;
  exportAllTracksAsBackup: () => void;
  refreshOfflineLibrary: () => Promise<void>;
}

const DownloadContext = createContext<DownloadContextType | null>(null);

export const DownloadProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tasks, setTasks] = useState<DownloadTask[]>(() => {
    try {
      const saved = localStorage.getItem(QUEUE_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Reset any previously "downloading" states to "pending" on boot
          return parsed.map((t: DownloadTask) =>
            t.status === "downloading" || t.status === "converting" || t.status === "saving"
              ? { ...t, status: "pending" as const, progress: 0 }
              : t
          );
        }
      }
    } catch {}
    return [];
  });

  const [downloadedTracks, setDownloadedTracks] = useState<Track[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [batchProgress, setBatchProgress] = useState<BatchDownloadProgress | null>(null);
  const [isQueuePaused, setIsQueuePaused] = useState(false);
  const [settings, setSettingsState] = useState<UserSettings>(() => {
    let initialTheme: any = "spotify-dark";
    try {
      initialTheme = localStorage.getItem("nlsmusic_theme") || "spotify-dark";
    } catch {}
    return {
      autoSaveToDevice: true,
      defaultBitrate: 320,
      defaultFormat: "mp3",
      defaultDownloadMode: "direct",
      offlineModeOnly: false,
      enableDesktopNotifications: true,
      audioNormalize: true,
      theme: initialTheme,
      autoCheckNewReleases: true,
      followedArtists: ["Gazo", "Ninho", "Tiakola", "The Weeknd", "Drake", "Burna Boy"],
      maxConcurrentDownloads: 3,
      autoRetryFailed: true,
    };
  });
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  // Ref to prevent race conditions during parallel task processing
  const processingTaskIds = useRef<Set<string>>(new Set());

  // Save queue tasks to localStorage for offline persistence
  useEffect(() => {
    try {
      const tasksToPersist = tasks.slice(0, 50); // limit to 50 items
      localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(tasksToPersist));
    } catch {}
  }, [tasks]);

  // Apply theme to document element
  useEffect(() => {
    const activeTheme = settings.theme || "spotify-dark";
    document.documentElement.setAttribute("data-theme", activeTheme);
    document.body.setAttribute("data-theme", activeTheme);
    try {
      localStorage.setItem("nlsmusic_theme", activeTheme);
    } catch {}

    if (activeTheme === "minimal-light") {
      document.documentElement.classList.remove("dark");
      document.body.classList.remove("bg-[#121212]");
      document.body.classList.add("bg-[#f4f5f7]");
    } else {
      document.documentElement.classList.add("dark");
      document.body.classList.remove("bg-[#f4f5f7]");
      document.body.classList.add("bg-[#121212]");
    }
  }, [settings.theme]);

  // Load initial data
  const refreshOfflineLibrary = useCallback(async () => {
    const tracks = await getAllOfflineTracks();
    setDownloadedTracks(tracks);
    const favs = await getFavorites();
    
    // Sync with Firestore if logged in
    if (auth.currentUser) {
      try {
        const firestoreFavs = await fetchUserFavoritesFromFirestore();
        const firestoreIds = firestoreFavs.map((f) => f.id);
        const merged = Array.from(new Set([...favs, ...firestoreIds]));
        setFavoriteIds(merged);
      } catch {
        setFavoriteIds(favs);
      }
    } else {
      setFavoriteIds(favs);
    }

    const s = await getSettings();
    setSettingsState((prev) => ({ ...prev, ...s }));
  }, []);

  useEffect(() => {
    refreshOfflineLibrary();

    // Welcome notification
    setNotifications([
      {
        id: "welcome-1",
        title: "Bienvenue sur NLSmusic 🎵",
        message: "Gestionnaire de file d'attente, téléchargements par lot ZIP, MP3 320k et écoute 100% hors-ligne.",
        type: "system",
        timestamp: Date.now(),
        read: false,
      },
    ]);

    // Initial check for new releases
    checkNewReleases()
      .then((notifs) => {
        if (notifs.length > 0) {
          setNotifications((prev) => [...notifs, ...prev]);
        }
      })
      .catch(() => {});
  }, [refreshOfflineLibrary]);

  // Request browser notification helper (Notification API)
  const sendDesktopNotification = useCallback(
    (title: string, body: string, icon?: string) => {
      if (!settings.enableDesktopNotifications) return;
      if (typeof window === "undefined" || !("Notification" in window)) return;

      const triggerNotify = () => {
        try {
          const notif = new Notification(title, {
            body,
            icon: icon || "/icon-192.svg",
            badge: "/icon-192.svg",
            silent: false,
          });
          notif.onclick = () => {
            window.focus();
            notif.close();
          };
        } catch (e) {
          console.warn("Notification error:", e);
        }
      };

      if (Notification.permission === "granted") {
        triggerNotify();
      } else if (Notification.permission !== "denied") {
        Notification.requestPermission().then((perm) => {
          if (perm === "granted") {
            triggerNotify();
          }
        });
      }
    },
    [settings.enableDesktopNotifications]
  );

  // ----------------------------------------------------
  // TASK PROCESSOR ENGINE WITH PARALLEL CONCURRENCY
  // ----------------------------------------------------
  const executeTask = useCallback(
    async (task: DownloadTask) => {
      if (processingTaskIds.current.has(task.id)) return;
      processingTaskIds.current.add(task.id);

      const isDirect = task.isDirect || task.format === "original";
      const bitrate = task.bitrate || settings.defaultBitrate || 320;
      const targetFormat = task.format || (isDirect ? "original" : "mp3");

      setTasks((prev) =>
        prev.map((t) =>
          t.id === task.id
            ? { ...t, status: isDirect ? "downloading" : "downloading", progress: 10, errorMessage: undefined }
            : t
        )
      );

      try {
        if (!isDirect) {
          setTasks((prev) =>
            prev.map((t) => (t.id === task.id ? { ...t, status: "converting", progress: 25 } : t))
          );
        }

        const { blob, filename, format } = await downloadTrackBlob(
          task.track,
          {
            bitrate,
            direct: isDirect,
            format: targetFormat,
          },
          (progress, stats) => {
            setTasks((prev) =>
              prev.map((t) =>
                t.id === task.id
                  ? {
                      ...t,
                      progress,
                      speed: stats?.speed || t.speed,
                      eta: stats?.eta || t.eta,
                      bytesDownloaded: stats?.bytesDownloaded,
                      totalBytes: stats?.totalBytes,
                    }
                  : t
              )
            );
          }
        );

        // Step 2: Save to IndexedDB
        setTasks((prev) =>
          prev.map((t) => (t.id === task.id ? { ...t, status: "saving", progress: 95 } : t))
        );

        const savedTrack = await saveTrackOffline(
          task.track,
          blob,
          bitrate,
          format,
          isDirect ? "direct" : "converted"
        );

        // Step 3: Trigger auto-save to device folder if enabled
        if (settings.autoSaveToDevice) {
          triggerBrowserFileDownload(blob, filename);
        }

        // Step 4: Mark task completed
        setTasks((prev) =>
          prev.map((t) =>
            t.id === task.id
              ? { ...t, status: "completed", progress: 100, speed: "Terminé", eta: undefined }
              : t
          )
        );

        // Update local offline tracks list
        setDownloadedTracks((prev) => [savedTrack, ...prev.filter((t) => t.id !== savedTrack.id)]);

        // Confetti feedback
        try {
          confetti({
            particleCount: 35,
            spread: 50,
            origin: { y: 0.85, x: 0.5 },
            colors: ["#1db954", "#ffffff", "#1ed760"],
          });
        } catch {}

        // Add Notification
        const notif: AppNotification = {
          id: `dl_notif_${Date.now()}_${task.id}`,
          title: isDirect ? "⚡ Téléchargement Direct terminé" : `Audio ${format.toUpperCase()} prêt ✅`,
          message: `"${task.track.title}" (${format.toUpperCase()} ${bitrate}kbps) est sauvegardé sur votre appareil.`,
          type: "download_complete",
          timestamp: Date.now(),
          read: false,
          track: savedTrack,
        };
        setNotifications((prev) => [notif, ...prev]);

        sendDesktopNotification(
          "NLSmusic - Téléchargement terminé ✅",
          `"${task.track.title}" (${format.toUpperCase()} ${bitrate}kbps) est prêt pour l'écoute hors-ligne.`,
          task.track.thumbnail || "/icon-192.svg"
        );
      } catch (err: any) {
        console.error(`Task ${task.id} failed:`, err);
        const currentRetry = (task.retryCount || 0) + 1;
        const willRetry = (settings.autoRetryFailed ?? true) && currentRetry <= 3;

        if (willRetry) {
          // Auto retry after 3 seconds
          setTasks((prev) =>
            prev.map((t) =>
              t.id === task.id
                ? {
                    ...t,
                    status: "pending",
                    progress: 0,
                    retryCount: currentRetry,
                    errorMessage: `Nouvelle tentative (${currentRetry}/3)...`,
                  }
                : t
            )
          );
        } else {
          setTasks((prev) =>
            prev.map((t) =>
              t.id === task.id
                ? {
                    ...t,
                    status: "error",
                    errorMessage: err.message || "Échec du téléchargement",
                    retryCount: currentRetry,
                  }
                : t
            )
          );

          const notif: AppNotification = {
            id: `dl_err_${Date.now()}_${task.id}`,
            title: "Échec du téléchargement ❌",
            message: `Impossible de télécharger "${task.track.title}". Vous pouvez réessayer dans la file d'attente.`,
            type: "system",
            timestamp: Date.now(),
            read: false,
          };
          setNotifications((prev) => [notif, ...prev]);
        }
      } finally {
        processingTaskIds.current.delete(task.id);
      }
    },
    [settings, sendDesktopNotification]
  );

  // Queue runner effect: monitors tasks and triggers concurrent execution
  useEffect(() => {
    if (isQueuePaused) return;

    const maxConcurrency = settings.maxConcurrentDownloads || 3;
    const currentlyActive = tasks.filter(
      (t) => t.status === "downloading" || t.status === "converting" || t.status === "saving"
    ).length;

    const availableSlots = maxConcurrency - currentlyActive;
    if (availableSlots <= 0) return;

    const pendingTasks = tasks.filter((t) => t.status === "pending" && !processingTaskIds.current.has(t.id));
    const tasksToStart = pendingTasks.slice(0, availableSlots);

    for (const task of tasksToStart) {
      executeTask(task);
    }
  }, [tasks, isQueuePaused, settings.maxConcurrentDownloads, executeTask]);

  // ----------------------------------------------------
  // PUBLIC QUEUE ACTIONS
  // ----------------------------------------------------
  const promptNotificationPermissionIfDefault = useCallback(() => {
    if (
      settings.enableDesktopNotifications &&
      typeof window !== "undefined" &&
      "Notification" in window &&
      Notification.permission === "default"
    ) {
      Notification.requestPermission().catch(() => {});
    }
  }, [settings.enableDesktopNotifications]);

  const startDownload = useCallback(
    async (track: Track, optionsOrBitrate?: number | DownloadOptions) => {
      promptNotificationPermissionIfDefault();
      const options: DownloadOptions =
        typeof optionsOrBitrate === "number"
          ? { bitrate: optionsOrBitrate, direct: false, format: "mp3" }
          : optionsOrBitrate || {
              bitrate: settings.defaultBitrate || 320,
              direct: settings.defaultDownloadMode === "direct",
              format: settings.defaultDownloadMode === "direct" ? "original" : settings.defaultFormat || "mp3",
            };

      const isDirect = options.direct === true || options.format === "original";
      const bitrate = options.bitrate || settings.defaultBitrate || 320;
      const targetFormat = options.format || (isDirect ? "original" : "mp3");
      const taskId = `task_${track.id}_${Date.now()}`;

      // If existing active/pending task exists, don't duplicate
      if (tasks.some((t) => t.track.id === track.id && t.status !== "completed" && t.status !== "error")) {
        return;
      }

      const newTask: DownloadTask = {
        id: taskId,
        track,
        bitrate,
        isDirect,
        format: targetFormat,
        progress: 0,
        status: "pending",
        speed: "En attente...",
        retryCount: 0,
        addedAt: Date.now(),
      };

      setTasks((prev) => [newTask, ...prev]);
    },
    [settings, tasks]
  );

  const startDirectDownload = useCallback(
    async (track: Track) => {
      await startDownload(track, { direct: true, format: "original" });
    },
    [startDownload]
  );

  const addTracksToQueue = useCallback(
    (tracksToAdd: Track[], options?: DownloadOptions) => {
      promptNotificationPermissionIfDefault();
      if (!tracksToAdd || tracksToAdd.length === 0) return;

      const opts: DownloadOptions = options || {
        bitrate: settings.defaultBitrate || 320,
        direct: settings.defaultDownloadMode === "direct",
        format: settings.defaultDownloadMode === "direct" ? "original" : settings.defaultFormat || "mp3",
      };

      const isDirect = opts.direct === true || opts.format === "original";
      const bitrate = opts.bitrate || settings.defaultBitrate || 320;
      const targetFormat = opts.format || (isDirect ? "original" : "mp3");

      const newTasks: DownloadTask[] = [];

      for (const track of tracksToAdd) {
        if (!tasks.some((t) => t.track.id === track.id && t.status !== "completed" && t.status !== "error")) {
          newTasks.push({
            id: `task_${track.id}_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            track,
            bitrate,
            isDirect,
            format: targetFormat,
            progress: 0,
            status: "pending",
            speed: "En attente...",
            retryCount: 0,
            addedAt: Date.now(),
          });
        }
      }

      if (newTasks.length > 0) {
        setTasks((prev) => [...newTasks, ...prev]);

        const notif: AppNotification = {
          id: `queue_add_${Date.now()}`,
          title: "File de téléchargement mise à jour 📥",
          message: `${newTasks.length} morceau${newTasks.length > 1 ? "x" : ""} ajouté${
            newTasks.length > 1 ? "s" : ""
          } à la file.`,
          type: "system",
          timestamp: Date.now(),
          read: false,
        };
        setNotifications((prev) => [notif, ...prev]);
      }
    },
    [settings, tasks]
  );

  // Batch ZIP generation
  const startBatchDownload = useCallback(
    async (tracks: Track[], options?: BatchZipOptions) => {
      promptNotificationPermissionIfDefault();
      if (!tracks || tracks.length === 0) return;

      const opts: DownloadBlobOptions = options || {
        bitrate: settings.defaultBitrate || 320,
        direct: settings.defaultDownloadMode === "direct",
        format: settings.defaultDownloadMode === "direct" ? "original" : settings.defaultFormat || "mp3",
        folderStructure: options?.folderStructure || "flat",
        includeCoverArt: options?.includeCoverArt ?? false,
        compressionLevel: options?.compressionLevel || "DEFLATE_FAST",
        zipName: options?.zipName,
      };

      setBatchProgress({
        current: 0,
        total: tracks.length,
        percent: 5,
        currentTitle: `Préparation de l'archive ZIP (${tracks.length} titres)...`,
        status: "downloading",
      });

      try {
        const { zipBlob, zipFilename } = await createBatchZip(
          tracks,
          opts,
          (completed, total, percent, currentTitle, stats) => {
            setBatchProgress({
              current: completed,
              total,
              percent,
              currentTitle,
              status: percent >= 90 ? "zipping" : "downloading",
              speed: stats?.speed,
              eta: stats?.eta,
            });
          }
        );

        // Trigger zip download to user's device
        triggerBrowserFileDownload(zipBlob, zipFilename);

        setBatchProgress({
          current: tracks.length,
          total: tracks.length,
          percent: 100,
          currentTitle: "Archive ZIP téléchargée avec succès !",
          status: "completed",
        });

        // Confetti feedback
        try {
          confetti({
            particleCount: 60,
            spread: 80,
            origin: { y: 0.7, x: 0.5 },
            colors: ["#1db954", "#3b82f6", "#f355da"],
          });
        } catch {}

        // Add In-App Notification
        const notif: AppNotification = {
          id: `zip_notif_${Date.now()}`,
          title: `📦 Archive ZIP générée (${tracks.length} morceaux)`,
          message: `L'archive ZIP "${zipFilename}" a été créée et téléchargée sur votre appareil.`,
          type: "download_complete",
          timestamp: Date.now(),
          read: false,
        };
        setNotifications((prev) => [notif, ...prev]);

        sendDesktopNotification(
          "NLSmusic - Archive ZIP prête 📦",
          `L'archive "${zipFilename}" (${tracks.length} titres) a été téléchargée avec succès.`,
          "/icon-192.svg"
        );

        setTimeout(() => {
          setBatchProgress(null);
        }, 3500);
      } catch (err: any) {
        console.error("Batch zip error:", err);
        setBatchProgress({
          current: 0,
          total: tracks.length,
          percent: 100,
          currentTitle: "Erreur lors de la création du ZIP",
          status: "error",
        });
        setTimeout(() => {
          setBatchProgress(null);
        }, 4000);
      }
    },
    [settings]
  );

  const pauseQueue = useCallback(() => {
    setIsQueuePaused(true);
  }, []);

  const resumeQueue = useCallback(() => {
    setIsQueuePaused(false);
  }, []);

  const pauseTask = useCallback((taskId: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: "paused" as const, speed: "En pause" } : t))
    );
  }, []);

  const resumeTask = useCallback((taskId: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: "pending" as const, speed: "En attente..." } : t))
    );
  }, []);

  const cancelTask = useCallback((taskId: string) => {
    processingTaskIds.current.delete(taskId);
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  }, []);

  const cancelAllTasks = useCallback(() => {
    processingTaskIds.current.clear();
    setTasks((prev) => prev.filter((t) => t.status === "completed"));
  }, []);

  const retryTask = useCallback((taskId: string) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? { ...t, status: "pending" as const, progress: 0, errorMessage: undefined, retryCount: 0 }
          : t
      )
    );
  }, []);

  const retryFailedTasks = useCallback(() => {
    setTasks((prev) =>
      prev.map((t) =>
        t.status === "error"
          ? { ...t, status: "pending" as const, progress: 0, errorMessage: undefined, retryCount: 0 }
          : t
      )
    );
  }, []);

  const clearCompletedTasks = useCallback(() => {
    setTasks((prev) => prev.filter((t) => t.status !== "completed"));
  }, []);

  const moveTaskUp = useCallback((taskId: string) => {
    setTasks((prev) => {
      const idx = prev.findIndex((t) => t.id === taskId);
      if (idx <= 0) return prev;
      const newTasks = [...prev];
      const temp = newTasks[idx - 1];
      newTasks[idx - 1] = newTasks[idx];
      newTasks[idx] = temp;
      return newTasks;
    });
  }, []);

  const moveTaskDown = useCallback((taskId: string) => {
    setTasks((prev) => {
      const idx = prev.findIndex((t) => t.id === taskId);
      if (idx === -1 || idx >= prev.length - 1) return prev;
      const newTasks = [...prev];
      const temp = newTasks[idx + 1];
      newTasks[idx + 1] = newTasks[idx];
      newTasks[idx] = temp;
      return newTasks;
    });
  }, []);

  // Library & Metadata actions
  const editTrackTags = useCallback(
    async (trackId: string, newTags: Partial<Track>) => {
      const existing = downloadedTracks.find((t) => t.id === trackId);
      if (!existing) return;

      const updated: Track = {
        ...existing,
        ...newTags,
      };

      await updateTrackMetadata(updated);
      setDownloadedTracks((prev) => prev.map((t) => (t.id === trackId ? updated : t)));

      const notif: AppNotification = {
        id: `tag_edit_${Date.now()}`,
        title: "Tags ID3 mis à jour 🏷️",
        message: `Les métadonnées de "${updated.title}" ont été enregistrées avec succès.`,
        type: "system",
        timestamp: Date.now(),
        read: false,
      };
      setNotifications((prev) => [notif, ...prev]);
    },
    [downloadedTracks]
  );

  const deleteDownloadedTrack = useCallback(async (trackId: string) => {
    await removeOfflineTrack(trackId);
    setDownloadedTracks((prev) => prev.filter((t) => t.id !== trackId));
  }, []);

  const isDownloaded = useCallback(
    (trackId: string) => {
      return downloadedTracks.some((t) => t.id === trackId);
    },
    [downloadedTracks]
  );

  const toggleFavorite = useCallback(async (track: Track) => {
    const isFav = await toggleFavDB(track.id);
    setFavoriteIds((prev) => (isFav ? [track.id, ...prev] : prev.filter((id) => id !== track.id)));
    
    // Cloud sync with Firestore if authenticated
    if (auth.currentUser) {
      try {
        if (isFav) {
          await saveFavoriteToFirestore(track);
        } else {
          await removeFavoriteFromFirestore(track.id);
        }
      } catch (err) {
        console.warn("Firestore favorite sync error:", err);
      }
    }
    return isFav;
  }, []);

  const isFavorite = useCallback(
    (trackId: string) => {
      return favoriteIds.includes(trackId);
    },
    [favoriteIds]
  );

  const updateSettings = useCallback(async (newSettings: Partial<UserSettings>) => {
    setSettingsState((prev) => {
      const updated = { ...prev, ...newSettings };
      saveSettings(updated);
      return updated;
    });
  }, []);

  const markNotificationsAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const exportAllTracksAsBackup = useCallback(() => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(downloadedTracks, null, 2));
    const a = document.createElement("a");
    a.setAttribute("href", dataStr);
    a.setAttribute("download", `NLSmusic_backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [downloadedTracks]);

  const unreadNotifsCount = notifications.filter((n) => !n.read).length;
  const activeDownloadsCount = tasks.filter(
    (t) => t.status === "downloading" || t.status === "converting" || t.status === "saving"
  ).length;
  const pendingDownloadsCount = tasks.filter((t) => t.status === "pending" || t.status === "paused").length;
  const failedDownloadsCount = tasks.filter((t) => t.status === "error").length;

  return (
    <DownloadContext.Provider
      value={{
        tasks,
        downloadedTracks,
        favoriteIds,
        settings,
        notifications,
        unreadNotifsCount,
        isOfflineOnly: settings.offlineModeOnly,
        batchProgress,
        isQueuePaused,
        activeDownloadsCount,
        pendingDownloadsCount,
        failedDownloadsCount,
        startDownload,
        startDirectDownload,
        addTracksToQueue,
        startBatchDownload,
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
        deleteDownloadedTrack,
        editTrackTags,
        isDownloaded,
        toggleFavorite,
        isFavorite,
        updateSettings,
        markNotificationsAsRead,
        clearNotifications,
        exportAllTracksAsBackup,
        refreshOfflineLibrary,
      }}
    >
      {children}
    </DownloadContext.Provider>
  );
};

export const useDownload = () => {
  const context = useContext(DownloadContext);
  if (!context) {
    throw new Error("useDownload must be used within a DownloadProvider");
  }
  return context;
};
