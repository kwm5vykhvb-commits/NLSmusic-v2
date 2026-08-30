import { get, set, del, keys, entries } from "idb-keyval";
import { Track, Playlist, UserSettings } from "../types";

const TRACKS_PREFIX = "nlsmusic_track_meta_";
const AUDIO_PREFIX = "nlsmusic_audio_blob_";
const PLAYLISTS_KEY = "nlsmusic_playlists";
const SETTINGS_KEY = "nlsmusic_settings";
const FAVORITES_KEY = "nlsmusic_favorites";

export const DEFAULT_SETTINGS: UserSettings = {
  autoSaveToDevice: true,
  defaultBitrate: 320,
  defaultFormat: "mp3",
  defaultDownloadMode: "direct",
  offlineModeOnly: false,
  enableDesktopNotifications: true,
  audioNormalize: true,
  theme: "spotify-dark",
  autoCheckNewReleases: true,
  followedArtists: ["Gazo", "Ninho", "Tiakola", "The Weeknd", "Drake", "Burna Boy"],
};

// 1. Settings
export async function getSettings(): Promise<UserSettings> {
  try {
    const s = await get<UserSettings>(SETTINGS_KEY);
    return s ? { ...DEFAULT_SETTINGS, ...s } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings: UserSettings): Promise<void> {
  await set(SETTINGS_KEY, settings);
}

// 2. Local Track Storage & Audio Blobs
export async function saveTrackOffline(
  track: Track,
  audioBlob: Blob,
  bitrate: number = 320,
  format: "mp3" | "m4a" | "flac" | "wav" | "original" = "original",
  downloadType: "direct" | "converted" = "direct"
): Promise<Track> {
  const updatedTrack: Track = {
    ...track,
    isDownloaded: true,
    downloadedAt: Date.now(),
    fileSize: audioBlob.size,
    bitrate: bitrate,
    format: format,
    downloadType: downloadType,
  };

  // Store audio binary data
  await set(`${AUDIO_PREFIX}${track.id}`, audioBlob);
  // Store track metadata
  await set(`${TRACKS_PREFIX}${track.id}`, updatedTrack);

  return updatedTrack;
}

export async function getOfflineAudioBlob(trackId: string): Promise<Blob | null> {
  try {
    const blob = await get<Blob>(`${AUDIO_PREFIX}${trackId}`);
    return blob || null;
  } catch (e) {
    console.error("Error reading offline audio blob:", e);
    return null;
  }
}

export async function getOfflineAudioUrl(trackId: string): Promise<string | null> {
  const blob = await getOfflineAudioBlob(trackId);
  if (blob) {
    return URL.createObjectURL(blob);
  }
  return null;
}

export async function removeOfflineTrack(trackId: string): Promise<void> {
  await del(`${AUDIO_PREFIX}${trackId}`);
  await del(`${TRACKS_PREFIX}${trackId}`);
}

export async function getAllOfflineTracks(): Promise<Track[]> {
  try {
    const allEntries = await entries();
    const tracks: Track[] = [];

    for (const [key, value] of allEntries) {
      if (typeof key === "string" && key.startsWith(TRACKS_PREFIX)) {
        tracks.push(value as Track);
      }
    }

    return tracks.sort((a, b) => (b.downloadedAt || 0) - (a.downloadedAt || 0));
  } catch (e) {
    console.error("Error fetching offline tracks:", e);
    return [];
  }
}

export async function updateTrackMetadata(track: Track): Promise<void> {
  await set(`${TRACKS_PREFIX}${track.id}`, track);
}

// 3. Storage statistics (Used MB, track count)
export async function getStorageStats(): Promise<{ totalBytes: number; totalTracks: number }> {
  try {
    const tracks = await getAllOfflineTracks();
    const totalBytes = tracks.reduce((acc, t) => acc + (t.fileSize || 0), 0);
    return {
      totalBytes,
      totalTracks: tracks.length,
    };
  } catch {
    return { totalBytes: 0, totalTracks: 0 };
  }
}

// 4. Playlists
export async function getPlaylists(): Promise<Playlist[]> {
  try {
    const playlists = await get<Playlist[]>(PLAYLISTS_KEY);
    if (!playlists || playlists.length === 0) {
      // Default starter playlists
      const initial: Playlist[] = [
        {
          id: "favorites",
          name: "Titres likés",
          description: "Vos morceaux préférés rassemblés au même endroit.",
          createdAt: Date.now(),
          updatedAt: Date.now(),
          trackIds: [],
        },
        {
          id: "top-downloads",
          name: "Téléchargements récents",
          description: "Morceaux MP3 enregistrés sur cet appareil.",
          createdAt: Date.now(),
          updatedAt: Date.now(),
          trackIds: [],
        },
      ];
      await set(PLAYLISTS_KEY, initial);
      return initial;
    }
    return playlists;
  } catch {
    return [];
  }
}

export async function savePlaylists(playlists: Playlist[]): Promise<void> {
  await set(PLAYLISTS_KEY, playlists);
}

// 5. Favorites
export async function getFavorites(): Promise<string[]> {
  try {
    const favs = await get<string[]>(FAVORITES_KEY);
    return favs || [];
  } catch {
    return [];
  }
}

export async function toggleFavorite(trackId: string): Promise<boolean> {
  const favs = await getFavorites();
  let updated: string[];
  let isFav = false;
  if (favs.includes(trackId)) {
    updated = favs.filter((id) => id !== trackId);
    isFav = false;
  } else {
    updated = [trackId, ...favs];
    isFav = true;
  }
  await set(FAVORITES_KEY, updated);
  return isFav;
}

// 6. Device File System Helper: Trigger instant device file save
export function triggerBrowserFileDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  // Ensure appropriate extension if none is provided
  let cleanName = filename;
  if (!cleanName.includes(".")) {
    cleanName = `${cleanName}.mp3`;
  }
  a.download = cleanName;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 1000);
}
