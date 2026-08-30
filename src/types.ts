export interface Track {
  id: string; // YouTube videoId
  title: string;
  artist: string;
  album?: string;
  year?: string;
  customGenre?: string;
  duration: number; // in seconds
  durationFormatted: string;
  thumbnail: string;
  views?: number;
  ago?: string;
  url?: string;
  // Local / Offline metadata
  isDownloaded?: boolean;
  downloadedAt?: number;
  fileSize?: number; // bytes
  bitrate?: number; // e.g. 320, 192, 128
  format?: "mp3" | "m4a" | "flac" | "wav" | "original";
  downloadType?: "direct" | "converted";
  isFavorite?: boolean;
  playCount?: number;
  lastPlayedAt?: number;
  source?: string;
  previewUrl?: string | null;
}

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  coverImage?: string;
  createdAt: number;
  updatedAt: number;
  trackIds: string[];
}

export interface DownloadTask {
  id: string;
  track: Track;
  bitrate: number;
  format?: "mp3" | "m4a" | "flac" | "wav" | "original";
  isDirect?: boolean;
  progress: number; // 0 - 100
  status: "pending" | "downloading" | "converting" | "saving" | "completed" | "error" | "paused";
  errorMessage?: string;
  speed?: string;
  eta?: string;
  bytesDownloaded?: number;
  totalBytes?: number;
  retryCount?: number;
  addedAt?: number;
}

export interface BatchZipOptions {
  bitrate?: number;
  direct?: boolean;
  format?: "mp3" | "m4a" | "flac" | "wav" | "original";
  album?: string;
  genre?: string;
  year?: string;
  zipName?: string;
  folderStructure?: "flat" | "artist_album"; // "flat" = Artist - Title.ext, "artist_album" = Artist/Album/Title.ext
  includeCoverArt?: boolean; // include cover.jpg in album folders
  compressionLevel?: "STORE" | "DEFLATE_FAST" | "DEFLATE_MAX"; // STORE = instant fast, DEFLATE = compressed
}

export interface BatchDownloadProgress {
  current: number;
  total: number;
  percent: number;
  currentTitle: string;
  status: "downloading" | "zipping" | "completed" | "error";
  speed?: string;
  eta?: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: "download_complete" | "new_release" | "offline_mode" | "system";
  timestamp: number;
  read: boolean;
  track?: Track;
}

export interface UserSettings {
  autoSaveToDevice: boolean;
  defaultBitrate: number; // 320 | 192 | 128
  defaultFormat: "mp3" | "m4a" | "flac" | "wav" | "original";
  defaultDownloadMode: "direct" | "converted"; // "direct" = instant original, "converted" = MP3 studio
  offlineModeOnly: boolean;
  enableDesktopNotifications: boolean;
  audioNormalize: boolean;
  theme: "spotify-dark" | "oled-black" | "cyberpunk" | "midnight" | "minimal-light";
  autoCheckNewReleases: boolean;
  followedArtists: string[];
  maxConcurrentDownloads?: number; // 1 | 2 | 3 | 5
  autoRetryFailed?: boolean;
}

export interface User {
  id: string;
  name: string;
  username?: string;
  email: string;
  avatar?: string;
  role?: "user" | "premium" | "admin";
  favoriteGenre?: string;
  createdAt: number;
  lastLoginAt?: number;
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  token?: string;
  message?: string;
  error?: string;
}

export interface SearchResponse {
  results: Track[];
  page: number;
  pageSize: number;
  totalPages: number;
  totalResults: number;
}

export type ViewMode = "home" | "search" | "library" | "favorites" | "playlist" | "downloads" | "genre";

export interface ArtistSuggestion {
  id: string;
  name: string;
  picture?: string;
  nbFans?: number;
  type: "artist";
}

export interface TrackSuggestion {
  id: string;
  title: string;
  artist: string;
  durationFormatted?: string;
  thumbnail?: string;
  source?: string;
  type: "track";
}

export interface SearchSuggestionsResponse {
  artists: ArtistSuggestion[];
  tracks: TrackSuggestion[];
  queries: string[];
}

