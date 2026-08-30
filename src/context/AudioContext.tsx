import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { Track } from "../types";
import { getOfflineAudioUrl, updateTrackMetadata } from "../services/db";
import { getStreamUrl } from "../services/api";

interface AudioContextType {
  currentTrack: Track | null;
  isPlaying: boolean;
  duration: number;
  currentTime: number;
  volume: number;
  isMuted: boolean;
  isShuffle: boolean;
  repeatMode: "off" | "all" | "one";
  queue: Track[];
  history: Track[];
  isBuffering: boolean;
  error: string | null;
  audioVisualizerData: Uint8Array | null;
  playTrack: (track: Track, newQueue?: Track[]) => Promise<void>;
  togglePlay: () => void;
  pause: () => void;
  resume: () => void;
  seek: (seconds: number) => void;
  setVolume: (val: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  nextTrack: () => void;
  previousTrack: () => void;
  addToQueue: (track: Track) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
}

const AudioContext = createContext<AudioContextType | null>(null);

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolumeState] = useState(0.85);
  const [isMuted, setIsMuted] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState<"off" | "all" | "one">("off");
  const [queue, setQueue] = useState<Track[]>([]);
  const [history, setHistory] = useState<Track[]>([]);
  const [isBuffering, setIsBuffering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const activeBlobUrlRef = useRef<string | null>(null);
  const [visualizerData, setVisualizerData] = useState<Uint8Array | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Initialize and configure standard HTML5 Audio element
  useEffect(() => {
    const audio = new Audio();
    audio.crossOrigin = "anonymous";
    audio.preload = "auto";
    audioRef.current = audio;

    const handleTimeUpdate = () => {
      if (!isNaN(audio.currentTime)) {
        setCurrentTime(audio.currentTime);
      }
      if (!isNaN(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
      }
    };

    const handleLoadedMetadata = () => {
      if (!isNaN(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
      }
      setIsBuffering(false);
    };

    const handleWaiting = () => {
      setIsBuffering(true);
    };

    const handleCanPlay = () => {
      setIsBuffering(false);
    };

    const handlePlaying = () => {
      setIsBuffering(false);
      setIsPlaying(true);
      setError(null);
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    const handleEnded = () => {
      if (repeatMode === "one") {
        audio.currentTime = 0;
        audio.play().catch(() => {});
      } else {
        handleNext();
      }
    };

    const handleError = () => {
      console.warn("Audio playback error:", audio.error);
      setIsBuffering(false);
      setIsPlaying(false);
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("waiting", handleWaiting);
    audio.addEventListener("canplay", handleCanPlay);
    audio.addEventListener("playing", handlePlaying);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("waiting", handleWaiting);
      audio.removeEventListener("canplay", handleCanPlay);
      audio.removeEventListener("playing", handlePlaying);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
      audio.pause();
      if (activeBlobUrlRef.current) {
        URL.revokeObjectURL(activeBlobUrlRef.current);
      }
    };
  }, [repeatMode]);

  // Volume & Mute synchronizer
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // Equalizer / Visualizer synthesizer animation during active playback
  useEffect(() => {
    const updateVisualizer = () => {
      if (isPlaying) {
        const dummyData = new Uint8Array(64);
        const time = Date.now() / 150;
        for (let i = 0; i < 64; i++) {
          const wave1 = Math.sin(time + i * 0.3) * 50 + 128;
          const wave2 = Math.cos(time * 0.8 + i * 0.2) * 40;
          dummyData[i] = Math.max(20, Math.min(255, Math.floor(wave1 + wave2)));
        }
        setVisualizerData(dummyData);
      } else {
        setVisualizerData(null);
      }
      animFrameRef.current = requestAnimationFrame(updateVisualizer);
    };

    if (isPlaying) {
      animFrameRef.current = requestAnimationFrame(updateVisualizer);
    } else {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      setVisualizerData(null);
    }

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying]);

  const playSessionRef = useRef<number>(0);

  // Safe play helper to prevent unhandled AbortError when play is interrupted
  const safePlay = useCallback(async (audio: HTMLAudioElement): Promise<boolean> => {
    try {
      await audio.play();
      setIsPlaying(true);
      setError(null);
      return true;
    } catch (err: any) {
      if (err.name === "AbortError" || err.message?.includes("aborted")) {
        // Normal interruption when switching tracks or pausing before load completes
        return false;
      }
      if (err.name === "NotAllowedError") {
        console.warn("Autoplay policy restricted audio playback until user interaction.");
        setIsPlaying(false);
        return false;
      }
      console.warn("Audio play warning:", err.message || err);
      return false;
    }
  }, []);

  // Core Play Action: Starts playback immediately
  const playTrack = useCallback(
    async (track: Track, newQueue?: Track[]) => {
      const currentSession = ++playSessionRef.current;
      setError(null);
      setIsBuffering(true);

      if (newQueue) {
        setQueue(newQueue.filter((t) => t.id !== track.id));
      }

      if (currentTrack && currentTrack.id !== track.id) {
        setHistory((prev) => [currentTrack, ...prev.slice(0, 19)]);
      }

      setCurrentTrack(track);

      // 1. Check if offline audio exists in IndexedDB
      const offlineUrl = await getOfflineAudioUrl(track.id);

      // If a newer track started playing while we checked IndexedDB, cancel this older request
      if (currentSession !== playSessionRef.current) return;

      if (!audioRef.current) {
        audioRef.current = new Audio();
        audioRef.current.crossOrigin = "anonymous";
      }

      const audio = audioRef.current;

      if (activeBlobUrlRef.current) {
        URL.revokeObjectURL(activeBlobUrlRef.current);
        activeBlobUrlRef.current = null;
      }

      const targetSrc = offlineUrl
        ? offlineUrl
        : track.previewUrl
        ? track.previewUrl
        : getStreamUrl(track.id, track.title, track.artist);

      if (offlineUrl) {
        activeBlobUrlRef.current = offlineUrl;
      }

      if (audio.src !== targetSrc) {
        audio.src = targetSrc;
        audio.currentTime = 0;
      }
      audio.volume = isMuted ? 0 : volume;

      const success = await safePlay(audio);
      if (currentSession === playSessionRef.current) {
        setIsBuffering(false);
        if (!success && !audio.paused && !offlineUrl && track.previewUrl) {
          // If preview failed, fallback directly to stream URL
          const streamSrc = getStreamUrl(track.id, track.title, track.artist);
          if (audio.src !== streamSrc) {
            audio.src = streamSrc;
            await safePlay(audio);
          }
        }
      }

      // Record play count & recents
      updateTrackMetadata({
        ...track,
        playCount: (track.playCount || 0) + 1,
        lastPlayedAt: Date.now(),
      }).catch(() => {});
    },
    [currentTrack, volume, isMuted, safePlay]
  );

  const togglePlay = useCallback(() => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else if (currentTrack) {
      safePlay(audioRef.current);
    }
  }, [isPlaying, currentTrack, safePlay]);

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  const resume = useCallback(() => {
    if (audioRef.current && currentTrack) {
      safePlay(audioRef.current);
    }
  }, [currentTrack, safePlay]);

  const seek = useCallback((seconds: number) => {
    setCurrentTime(seconds);
    if (audioRef.current) {
      audioRef.current.currentTime = seconds;
    }
  }, []);

  const setVolume = useCallback(
    (val: number) => {
      setVolumeState(val);
      if (isMuted && val > 0) setIsMuted(false);
      if (audioRef.current) {
        audioRef.current.volume = val;
      }
    },
    [isMuted]
  );

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      if (audioRef.current) {
        audioRef.current.volume = next ? 0 : volume;
      }
      return next;
    });
  }, [volume]);

  const toggleShuffle = useCallback(() => {
    setIsShuffle((prev) => !prev);
  }, []);

  const toggleRepeat = useCallback(() => {
    setRepeatMode((prev) => {
      if (prev === "off") return "all";
      if (prev === "all") return "one";
      return "off";
    });
  }, []);

  const handleNext = useCallback(() => {
    if (queue.length === 0) {
      if (repeatMode === "all" && history.length > 0) {
        const next = history[history.length - 1];
        playTrack(next);
      }
      return;
    }

    let nextTrackItem: Track;
    let newQueue: Track[];

    if (isShuffle) {
      const randomIndex = Math.floor(Math.random() * queue.length);
      nextTrackItem = queue[randomIndex];
      newQueue = queue.filter((_, i) => i !== randomIndex);
    } else {
      nextTrackItem = queue[0];
      newQueue = queue.slice(1);
    }

    setQueue(newQueue);
    playTrack(nextTrackItem);
  }, [queue, isShuffle, repeatMode, history, playTrack]);

  const nextTrack = useCallback(() => {
    handleNext();
  }, [handleNext]);

  const previousTrack = useCallback(() => {
    if (currentTime > 3) {
      seek(0);
      return;
    }

    if (history.length > 0) {
      const prev = history[0];
      setHistory((h) => h.slice(1));
      if (currentTrack) {
        setQueue((q) => [currentTrack, ...q]);
      }
      playTrack(prev);
    } else {
      seek(0);
    }
  }, [history, currentTrack, currentTime, seek, playTrack]);

  // Native OS Lockscreen & Mobile MediaSession API Integration
  useEffect(() => {
    if ("mediaSession" in navigator && currentTrack) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.title,
        artist: currentTrack.artist,
        album: currentTrack.album || "NLSmusic",
        artwork: [
          {
            src:
              currentTrack.thumbnail ||
              "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop",
            sizes: "512x512",
            type: "image/jpeg",
          },
          {
            src:
              currentTrack.thumbnail ||
              "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop",
            sizes: "192x192",
            type: "image/jpeg",
          },
        ],
      });

      navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";

      navigator.mediaSession.setActionHandler("play", () => resume());
      navigator.mediaSession.setActionHandler("pause", () => pause());
      navigator.mediaSession.setActionHandler("previoustrack", () => previousTrack());
      navigator.mediaSession.setActionHandler("nexttrack", () => nextTrack());

      try {
        navigator.mediaSession.setActionHandler("seekto", (details) => {
          if (details.seekTime !== undefined && details.seekTime !== null) {
            seek(details.seekTime);
          }
        });
        navigator.mediaSession.setActionHandler("seekforward", (details) => {
          const skipTime = details.seekOffset || 10;
          seek(Math.min(currentTime + skipTime, duration || currentTime + 10));
        });
        navigator.mediaSession.setActionHandler("seekbackward", (details) => {
          const skipTime = details.seekOffset || 10;
          seek(Math.max(currentTime - skipTime, 0));
        });
        navigator.mediaSession.setActionHandler("stop", () => pause());
      } catch {}
    }
  }, [currentTrack, isPlaying, resume, pause, previousTrack, nextTrack, seek, currentTime, duration]);

  // Update Media Session Position State on timeline progress
  useEffect(() => {
    if (
      "mediaSession" in navigator &&
      "setPositionState" in navigator.mediaSession &&
      duration > 0 &&
      !isNaN(duration)
    ) {
      try {
        navigator.mediaSession.setPositionState({
          duration: Math.max(0, duration),
          playbackRate: 1.0,
          position: Math.min(Math.max(0, currentTime), duration),
        });
      } catch {}
    }
  }, [currentTime, duration]);

  const addToQueue = useCallback((track: Track) => {
    setQueue((prev) => [...prev, track]);
  }, []);

  const removeFromQueue = useCallback((index: number) => {
    setQueue((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const clearQueue = useCallback(() => {
    setQueue([]);
  }, []);

  return (
    <AudioContext.Provider
      value={{
        currentTrack,
        isPlaying,
        duration,
        currentTime,
        volume,
        isMuted,
        isShuffle,
        repeatMode,
        queue,
        history,
        isBuffering,
        error,
        audioVisualizerData: visualizerData,
        playTrack,
        togglePlay,
        pause,
        resume,
        seek,
        setVolume,
        toggleMute,
        toggleShuffle,
        toggleRepeat,
        nextTrack,
        previousTrack,
        addToQueue,
        removeFromQueue,
        clearQueue,
      }}
    >
      {children}
    </AudioContext.Provider>
  );
};

export const useAudio = () => {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error("useAudio must be used within an AudioProvider");
  }
  return context;
};
