import JSZip from "jszip";
import { Track, AppNotification, User, AuthResponse, SearchResponse, SearchSuggestionsResponse } from "../types";
import { generateClientAudioBlob } from "./audioFallback";

const API_BASE = "/api";
const AUTH_TOKEN_KEY = "nlsmusic_auth_token";

export function getStoredAuthToken(): string | null {
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredAuthToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem(AUTH_TOKEN_KEY, token);
    } else {
      localStorage.removeItem(AUTH_TOKEN_KEY);
    }
  } catch {}
}

export function getAuthHeaders(): Record<string, string> {
  const token = getStoredAuthToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

// 1. Search with 100 tracks per page & 50 pages maximum support
export async function searchTracks(query: string, page: number = 1): Promise<SearchResponse> {
  if (!query || typeof query !== "string" || !query.trim()) {
    return { results: [], page: 1, pageSize: 100, totalPages: 1, totalResults: 0 };
  }
  try {
    const res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(query.trim())}&page=${page}&limit=100`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      console.warn(`Search failed with status ${res.status}`);
      return { results: [], page: 1, pageSize: 100, totalPages: 1, totalResults: 0 };
    }
    const data = await res.json();
    return {
      results: Array.isArray(data.results) ? data.results : [],
      page: Number(data.page) || page,
      pageSize: Number(data.pageSize) || 100,
      totalPages: Number(data.totalPages) || 1,
      totalResults: Number(data.totalResults) || (Array.isArray(data.results) ? data.results.length : 0),
    };
  } catch (err: any) {
    console.warn("searchTracks network error:", err);
    return { results: [], page: 1, pageSize: 100, totalPages: 1, totalResults: 0 };
  }
}

// 1.1 Search Suggestions (Artists, Tracks, Auto-complete)
export async function getSearchSuggestions(query: string): Promise<SearchSuggestionsResponse> {
  if (!query || typeof query !== "string" || query.trim().length < 1) {
    return { artists: [], tracks: [], queries: [] };
  }
  try {
    const res = await fetch(`${API_BASE}/suggestions?q=${encodeURIComponent(query.trim())}`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) return { artists: [], tracks: [], queries: [] };
    const data = await res.json();
    return {
      artists: Array.isArray(data.artists) ? data.artists : [],
      tracks: Array.isArray(data.tracks) ? data.tracks : [],
      queries: Array.isArray(data.queries) ? data.queries : [],
    };
  } catch (err) {
    console.warn("getSearchSuggestions error:", err);
    return { artists: [], tracks: [], queries: [] };
  }
}

// 2. Trending tracks
export async function getTrendingTracks(genre: string = "tendances"): Promise<Track[]> {
  try {
    const res = await fetch(`${API_BASE}/trending?genre=${encodeURIComponent(genre || "tendances")}`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      console.warn(`Trending failed with status ${res.status}`);
      return [];
    }
    const data = await res.json();
    return Array.isArray(data.tracks) ? data.tracks : [];
  } catch (err: any) {
    console.warn("getTrendingTracks error:", err);
    return [];
  }
}

// 3. Track Info
export async function getTrackInfo(videoId: string): Promise<Partial<Track>> {
  const res = await fetch(`${API_BASE}/info/${encodeURIComponent(videoId)}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Erreur récupération infos");
  return await res.json();
}

export function getStreamUrl(videoId: string, title?: string, artist?: string): string {
  const query = new URLSearchParams();
  if (title) query.set("title", title);
  if (artist) query.set("artist", artist);
  const qStr = query.toString();
  return `${API_BASE}/stream/${encodeURIComponent(videoId)}${qStr ? `?${qStr}` : ""}`;
}

// 4. Download options & blob downloader
export interface DownloadBlobOptions {
  bitrate?: number;
  direct?: boolean;
  format?: "mp3" | "m4a" | "flac" | "wav" | "original";
  album?: string;
  genre?: string;
  year?: string;
  zipName?: string;
  folderStructure?: "flat" | "artist_album";
  includeCoverArt?: boolean;
  compressionLevel?: "STORE" | "DEFLATE_FAST" | "DEFLATE_MAX";
}

export async function downloadTrackBlob(
  track: Track,
  optionsOrBitrate: number | DownloadBlobOptions = 320,
  onProgress?: (percent: number, stats?: { speed?: string; eta?: string; bytesDownloaded?: number; totalBytes?: number }) => void
): Promise<{ blob: Blob; filename: string; format: "mp3" | "m4a" | "flac" | "wav" | "original" }> {
  const options: DownloadBlobOptions =
    typeof optionsOrBitrate === "number"
      ? { bitrate: optionsOrBitrate, direct: false, format: "mp3" }
      : optionsOrBitrate;

  const isDirect = options.direct === true || options.format === "original";
  const bitrate = options.bitrate || 320;
  const targetFormat = options.format || "mp3";
  const albumParam = options.album || track.album ? `&album=${encodeURIComponent(options.album || track.album || "")}` : "";
  const genreParam = options.genre || track.customGenre ? `&genre=${encodeURIComponent(options.genre || track.customGenre || "")}` : "";
  const yearParam = options.year || track.year ? `&year=${encodeURIComponent(options.year || track.year || "")}` : "";

  const url = isDirect
    ? `${API_BASE}/download-direct/${encodeURIComponent(track.id)}?title=${encodeURIComponent(
        track.title
      )}&artist=${encodeURIComponent(track.artist)}`
    : `${API_BASE}/download/${encodeURIComponent(track.id)}?bitrate=${bitrate}&format=${targetFormat}&title=${encodeURIComponent(
        track.title
      )}&artist=${encodeURIComponent(track.artist)}${albumParam}${genreParam}${yearParam}`;

  let response: Response | null = null;
  try {
    response = await fetch(url);
    if (!response.ok) {
      // Try direct real audio download fallback
      const directUrl = `${API_BASE}/download-direct/${encodeURIComponent(track.id)}?title=${encodeURIComponent(
        track.title
      )}&artist=${encodeURIComponent(track.artist)}`;
      const fbResponse = await fetch(directUrl);
      if (fbResponse.ok) {
        response = fbResponse;
      }
    }
  } catch (netErr) {
    try {
      const directUrl = `${API_BASE}/download-direct/${encodeURIComponent(track.id)}?title=${encodeURIComponent(
        track.title
      )}&artist=${encodeURIComponent(track.artist)}`;
      const fbResponse = await fetch(directUrl);
      if (fbResponse.ok) {
        response = fbResponse;
      }
    } catch {}
  }

  // If server is unreachable or response is completely failed, throw clear error to let queue retry
  if (!response || !response.ok) {
    throw new Error("Téléchargement impossible : flux audio réel indisponible.");
  }

  let filename = `${track.artist} - ${track.title}`.replace(/[^\w\s\u00C0-\u017F\(\)\[\]\-_.]/gi, "").trim();
  const disposition = response.headers.get("content-disposition");
  if (disposition && disposition.includes("filename=")) {
    const match = disposition.match(/filename="?([^";]+)"?/);
    if (match && match[1]) {
      try {
        filename = decodeURIComponent(match[1]);
      } catch {
        filename = match[1];
      }
    }
  }

  const contentType = response.headers.get("content-type") || (isDirect ? "audio/mp4" : "audio/mpeg");
  let detectedFormat: "mp3" | "m4a" | "flac" | "wav" | "original" = isDirect ? "original" : "mp3";
  if (contentType.includes("mpeg")) detectedFormat = "mp3";
  else if (contentType.includes("mp4") || contentType.includes("m4a")) detectedFormat = "m4a";
  else if (contentType.includes("flac")) detectedFormat = "flac";
  else if (contentType.includes("wav")) detectedFormat = "wav";

  const contentLength = response.headers.get("content-length");
  const total = contentLength ? parseInt(contentLength, 10) : 0;

  if (!response.body) {
    const rawBlob = await response.blob();
    return {
      blob: new Blob([rawBlob], { type: contentType }),
      filename,
      format: detectedFormat,
    };
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  const startTime = Date.now();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      received += value.length;
      if (onProgress) {
        const elapsedSec = (Date.now() - startTime) / 1000;
        const speedBps = elapsedSec > 0 ? received / elapsedSec : 0;
        const speedMBs = (speedBps / (1024 * 1024)).toFixed(1);
        let eta = "";
        if (total > 0 && speedBps > 0) {
          const remainingBytes = Math.max(0, total - received);
          const remainingSec = Math.round(remainingBytes / speedBps);
          eta = remainingSec > 60 ? `${Math.floor(remainingSec / 60)}m ${remainingSec % 60}s` : `${remainingSec}s`;
        }

        const percent = total > 0
          ? Math.min(99, Math.round((received / total) * 100))
          : Math.min(95, Math.round((received / (4 * 1024 * 1024)) * 100));

        onProgress(percent, {
          speed: `${speedMBs} MB/s`,
          eta: eta ? `${eta} restante${eta.endsWith("s") ? "" : "s"}` : undefined,
          bytesDownloaded: received,
          totalBytes: total || received,
        });
      }
    }
  }

  if (onProgress) {
    onProgress(100, {
      speed: "0 MB/s",
      bytesDownloaded: received,
      totalBytes: total || received,
    });
  }

  return {
    blob: new Blob(chunks, { type: contentType }),
    filename,
    format: detectedFormat,
  };
}

// 5. Batch Download as ZIP with customizable structure, album covers, and compression
export async function createBatchZip(
  tracks: Track[],
  options?: DownloadBlobOptions,
  onProgress?: (
    completed: number,
    total: number,
    percent: number,
    currentTitle: string,
    stats?: { speed?: string; eta?: string }
  ) => void
): Promise<{ zipBlob: Blob; zipFilename: string }> {
  const zip = new JSZip();
  const folderStructure = options?.folderStructure || "flat";
  const includeCoverArt = options?.includeCoverArt ?? false;
  const compressionMode = options?.compressionLevel || "DEFLATE_FAST";

  const rootFolder = zip;
  let completed = 0;
  const total = tracks.length;
  const processedAlbumCovers = new Set<string>();
  const startTime = Date.now();

  const sanitizeName = (str: string) =>
    str.replace(/[<>:"/\\|?*]+/g, "").replace(/\s+/g, " ").trim() || "Inconnu";

  for (let i = 0; i < tracks.length; i++) {
    const track = tracks[i];
    const itemStartTime = Date.now();

    if (onProgress) {
      const currentPercent = Math.round((completed / total) * 85);
      const elapsed = (Date.now() - startTime) / 1000;
      const avgPerItem = completed > 0 ? elapsed / completed : 3;
      const remainingItems = total - completed;
      const estSec = Math.round(remainingItems * avgPerItem);
      const eta = estSec > 60 ? `${Math.floor(estSec / 60)}m ${estSec % 60}s` : `${estSec}s`;

      onProgress(
        completed,
        total,
        currentPercent,
        track.title,
        { speed: "En cours...", eta: `${eta} restante(s)` }
      );
    }

    try {
      const { blob, filename } = await downloadTrackBlob(track, options, (subPercent, stats) => {
        if (onProgress) {
          const basePercent = (completed / total) * 85;
          const trackSlice = (1 / total) * 85 * (subPercent / 100);
          onProgress(
            completed,
            total,
            Math.min(88, Math.round(basePercent + trackSlice)),
            `${track.title} (${subPercent}%)`,
            { speed: stats?.speed, eta: stats?.eta }
          );
        }
      });

      if (folderStructure === "artist_album") {
        const artistDir = sanitizeName(track.artist || "Artiste Inconnu");
        const albumDir = sanitizeName(track.album || "Single");
        const trackFolder = rootFolder.folder(`${artistDir}/${albumDir}`) || rootFolder;
        trackFolder.file(filename, blob);

        // Fetch & save cover.jpg for this album if requested
        if (includeCoverArt && track.thumbnail && !processedAlbumCovers.has(`${artistDir}/${albumDir}`)) {
          processedAlbumCovers.add(`${artistDir}/${albumDir}`);
          try {
            const imgRes = await fetch(track.thumbnail);
            if (imgRes.ok) {
              const imgBlob = await imgRes.blob();
              trackFolder.file("cover.jpg", imgBlob);
            }
          } catch {}
        }
      } else {
        // Flat root
        rootFolder.file(filename, blob);
      }
    } catch (err) {
      console.warn(`Échec téléchargement pour ZIP: ${track.title}`, err);
    }

    completed++;
    if (onProgress) {
      onProgress(completed, total, Math.round((completed / total) * 85), track.title);
    }
  }

  if (onProgress) {
    onProgress(total, total, 90, "Compression de l'archive ZIP...");
  }

  // Compression options
  const jszipOptions: JSZip.JSZipGeneratorOptions<"blob"> =
    compressionMode === "STORE"
      ? { type: "blob", compression: "STORE" }
      : compressionMode === "DEFLATE_MAX"
      ? { type: "blob", compression: "DEFLATE", compressionOptions: { level: 9 } }
      : { type: "blob", compression: "DEFLATE", compressionOptions: { level: 4 } };

  const zipBlob = await zip.generateAsync(jszipOptions, (metadata) => {
    if (onProgress) {
      onProgress(
        total,
        total,
        90 + Math.round(metadata.percent * 0.1),
        `Finalisation du ZIP (${Math.round(metadata.percent)}%)...`
      );
    }
  });

  // Calculate clean ZIP filename
  let zipFilename = "";
  if (options?.zipName && options.zipName.trim()) {
    zipFilename = sanitizeName(options.zipName.trim());
    if (!zipFilename.toLowerCase().endsWith(".zip")) {
      zipFilename += ".zip";
    }
  } else {
    zipFilename = `NLSmusic_Collection_${total}_titres_${new Date().toISOString().slice(0, 10)}.zip`;
  }

  if (onProgress) {
    onProgress(total, total, 100, "Archive prête !");
  }

  return { zipBlob, zipFilename };
}

// 6. Notifications
export async function checkNewReleases(artist?: string): Promise<AppNotification[]> {
  try {
    const url = artist
      ? `${API_BASE}/notifications/new-releases?artist=${encodeURIComponent(artist)}`
      : `${API_BASE}/notifications/new-releases`;
    const res = await fetch(url, { headers: getAuthHeaders() });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.notifications || []).map((n: any) => ({
      id: `notif_${n.id}_${Date.now()}`,
      title: n.title,
      message: n.message,
      type: "new_release",
      timestamp: Date.now(),
      read: false,
      track: {
        id: n.id,
        title: n.title,
        artist: n.artist,
        duration: 0,
        durationFormatted: n.durationFormatted || "3:30",
        thumbnail: n.thumbnail,
      },
    }));
  } catch {
    return [];
  }
}

// 7. User Authentication API
export async function checkServerUsername(username: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/auth/check-username?username=${encodeURIComponent(username.trim())}`);
    if (!res.ok) return true;
    const data = await res.json();
    return Boolean(data.available);
  } catch {
    return true;
  }
}

export async function registerUser(
  usernameOrName: string,
  password: string,
  favoriteGenre?: string,
  optionalEmail?: string
): Promise<AuthResponse> {
  try {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: usernameOrName,
        name: usernameOrName,
        email: optionalEmail || undefined,
        password,
        favoriteGenre,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || "Échec de l'inscription." };
    }
    if (data.token) {
      setStoredAuthToken(data.token);
    }
    return { success: true, user: data.user, token: data.token, message: data.message };
  } catch (err: any) {
    return { success: false, error: "Erreur réseau lors de l'inscription." };
  }
}

export async function loginUser(identifier: string, password: string): Promise<AuthResponse> {
  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier, email: identifier, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || "Nom d'utilisateur ou mot de passe incorrect." };
    }
    if (data.token) {
      setStoredAuthToken(data.token);
    }
    return { success: true, user: data.user, token: data.token, message: data.message };
  } catch (err: any) {
    return { success: false, error: "Erreur réseau lors de la connexion." };
  }
}

export async function getCurrentUser(): Promise<User | null> {
  const token = getStoredAuthToken();
  if (!token) return null;
  try {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      if (res.status === 401) {
        setStoredAuthToken(null);
      }
      return null;
    }
    const data = await res.json();
    return data.user || null;
  } catch {
    return null;
  }
}

export async function logoutUser(): Promise<void> {
  try {
    await fetch(`${API_BASE}/auth/logout`, {
      method: "POST",
      headers: getAuthHeaders(),
    });
  } catch {}
  setStoredAuthToken(null);
}

export async function updateUserProfile(data: { name?: string; favoriteGenre?: string; avatar?: string }): Promise<User | null> {
  try {
    const res = await fetch(`${API_BASE}/auth/profile`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.user || null;
  } catch {
    return null;
  }
}
