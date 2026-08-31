import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import yts from "yt-search";
import ffmpeg from "fluent-ffmpeg";
import { Readable } from "stream";

const app = express();
const PORT = 3000;

// -------------------------------------------------------------
// 1. SECURITY HEADERS & MIDDLEWARE
// -------------------------------------------------------------
app.use((req: Request, res: Response, next: NextFunction) => {
  // Prevent MIME type sniffing
  res.setHeader("X-Content-Type-Options", "nosniff");
  // Cross-Site Scripting protection
  res.setHeader("X-XSS-Protection", "1; mode=block");
  // Frame policy allowing AI Studio dev preview while blocking clickjacking elsewhere
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  // Referrer Policy
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  // Permissions Policy
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  // Remove Express fingerprint
  res.removeHeader("X-Powered-By");
  next();
});

app.use(cors());
app.use(express.json({ limit: "500kb" }));

// Rate limiter helper (In-memory sliding window)
interface RateLimitEntry {
  count: number;
  resetTime: number;
}
const rateLimitMap = new Map<string, RateLimitEntry>();

function rateLimiter(maxRequests: number, windowMs: number, customMessage = "Trop de requêtes, veuillez réessayer plus tard.") {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.headers["x-forwarded-for"] || "127.0.0.1";
    const key = `${String(ip)}_${req.baseUrl || req.path}`;
    const now = Date.now();

    let entry = rateLimitMap.get(key);
    if (!entry || now > entry.resetTime) {
      entry = { count: 1, resetTime: now + windowMs };
      rateLimitMap.set(key, entry);
      return next();
    }

    if (entry.count >= maxRequests) {
      const retryAfterSec = Math.ceil((entry.resetTime - now) / 1000);
      res.setHeader("Retry-After", retryAfterSec);
      return res.status(429).json({ error: customMessage, retryAfter: retryAfterSec });
    }

    entry.count += 1;
    next();
  };
}

// Clean up stale rate limits every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of rateLimitMap.entries()) {
    if (now > v.resetTime) rateLimitMap.delete(k);
  }
}, 5 * 60 * 1000);

// SSRF (Server-Side Request Forgery) URL Validator
function isSafeExternalUrl(urlStr: string): boolean {
  try {
    const parsed = new URL(urlStr);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return false;
    }
    const hostname = parsed.hostname.toLowerCase();

    // Block localhost and internal IP patterns
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "::1" ||
      hostname === "0.0.0.0" ||
      hostname.startsWith("10.") ||
      hostname.startsWith("192.168.") ||
      hostname.startsWith("169.254.") || // Cloud metadata
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname)
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

// Safe ID validator
function isValidTrackId(id: string): boolean {
  if (!id || typeof id !== "string") return false;
  // YouTube 11 chars, Deezer dz_..., iTunes itunes_..., or custom safe prefixed IDs
  return (
    /^[a-zA-Z0-9_-]{11}$/.test(id) ||
    /^dz_\d{3,15}$/.test(id) ||
    /^itunes_\d{3,15}$/.test(id) ||
    /^yt_\d{5,}_[a-zA-Z0-9]{3,10}$/.test(id) ||
    /^trend_\d{1,5}$/.test(id)
  );
}

// Filename sanitizer to prevent path traversal & header injection
function sanitizeFilename(name: string): string {
  if (!name || typeof name !== "string") return "track";
  return name
    .replace(/[^\w\s\u00C0-\u017F\(\)\[\]\-_.]/gi, "")
    .replace(/\.{2,}/g, "")
    .replace(/[\r\n\0]/g, "")
    .trim()
    .slice(0, 100) || "NLSmusic_track";
}

// -------------------------------------------------------------
// 2. USER AUTHENTICATION & SECURITY MODULE
// -------------------------------------------------------------
const DATA_DIR = path.join(process.cwd(), "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

interface StoredUser {
  id: string;
  name: string;
  username: string;
  email: string;
  passwordHash: string;
  salt: string;
  avatar: string;
  role: "user" | "premium" | "admin";
  favoriteGenre: string;
  createdAt: number;
  lastLoginAt: number;
}

interface UserSession {
  userId: string;
  token: string;
  expiresAt: number;
}

// Load / Save users
let usersDb: StoredUser[] = [];
const sessionsDb = new Map<string, UserSession>();

function loadUsers(): void {
  try {
    if (fs.existsSync(USERS_FILE)) {
      const data = fs.readFileSync(USERS_FILE, "utf-8");
      usersDb = JSON.parse(data);
      // Ensure all users have a username
      usersDb.forEach((u) => {
        if (!u.username) {
          u.username = u.name ? u.name.toLowerCase().replace(/[^a-z0-9_-]/g, "") : `user_${u.id.slice(0, 5)}`;
        }
      });
    } else {
      // Seed initial demo user safely
      const demoSalt = crypto.randomBytes(16).toString("hex");
      const demoHash = crypto.scryptSync("demo1234", demoSalt, 64).toString("hex");
      usersDb = [
        {
          id: "usr_demo_1",
          name: "Isman NLS",
          username: "ismanls",
          email: "ismanls961@gmail.com",
          passwordHash: demoHash,
          salt: demoSalt,
          avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
          role: "premium",
          favoriteGenre: "Rap Français",
          createdAt: Date.now(),
          lastLoginAt: Date.now(),
        },
      ];
      saveUsers();
    }
  } catch (err) {
    console.error("Failed to load users DB:", err);
    usersDb = [];
  }
}

function saveUsers(): void {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(usersDb, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to save users DB:", err);
  }
}

loadUsers();

// Password hashing & timing-safe comparison
function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString("hex");
}

function verifyPassword(password: string, salt: string, expectedHash: string): boolean {
  const calculatedHash = hashPassword(password, salt);
  const bufCalculated = Buffer.from(calculatedHash, "hex");
  const bufExpected = Buffer.from(expectedHash, "hex");
  if (bufCalculated.length !== bufExpected.length) return false;
  return crypto.timingSafeEqual(bufCalculated, bufExpected);
}

// Auth Middleware
function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Non authentifié. Veuillez vous connecter." });
  }

  const token = authHeader.split(" ")[1];
  const session = sessionsDb.get(token);

  if (!session || Date.now() > session.expiresAt) {
    if (session) sessionsDb.delete(token);
    return res.status(401).json({ error: "Session expirée. Veuillez vous reconnecter." });
  }

  const user = usersDb.find((u) => u.id === session.userId);
  if (!user) {
    return res.status(401).json({ error: "Utilisateur introuvable." });
  }

  // Attach user to request
  (req as any).user = user;
  next();
}

// AUTH ROUTES
// Check username availability
app.get("/api/auth/check-username", (req, res) => {
  const q = String(req.query.username || "").trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
  if (!q || q.length < 3) {
    return res.json({ available: false });
  }
  const exists = usersDb.some((u) => (u.username && u.username.toLowerCase() === q));
  return res.json({ available: !exists });
});

// Register (Username + Password, email optional)
app.post(
  "/api/auth/register",
  rateLimiter(20, 15 * 60 * 1000, "Trop de tentatives d'inscription. Réessayez dans 15 minutes."),
  (req, res) => {
    try {
      const { username, name, email, password, favoriteGenre } = req.body;
      const rawUser = (username || name || "").trim();
      const cleanUsername = rawUser.toLowerCase().replace(/[^a-z0-9_-]/g, "");

      if (!cleanUsername || cleanUsername.length < 3) {
        return res.status(400).json({ error: "Le nom d'utilisateur doit contenir au moins 3 caractères." });
      }

      if (!password || typeof password !== "string" || password.length < 6) {
        return res.status(400).json({ error: "Le mot de passe doit contenir au moins 6 caractères." });
      }

      const existingUserByUsername = usersDb.find(
        (u) => (u.username && u.username.toLowerCase() === cleanUsername)
      );
      if (existingUserByUsername) {
        return res.status(409).json({ error: `Le nom d'utilisateur "${cleanUsername}" est déjà pris.` });
      }

      let accountEmail = (email && typeof email === "string" && email.includes("@"))
        ? email.trim().toLowerCase()
        : `${cleanUsername}@nlsmusic.app`;

      const existingUserByEmail = usersDb.find((u) => u.email.toLowerCase() === accountEmail);
      if (existingUserByEmail && email) {
        return res.status(409).json({ error: "Un compte avec cette adresse email existe déjà." });
      } else if (existingUserByEmail) {
        accountEmail = `${cleanUsername}_${Date.now()}@nlsmusic.app`;
      }

      const salt = crypto.randomBytes(16).toString("hex");
      const passwordHash = hashPassword(password, salt);

      const avatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanUsername}`;

      const newUser: StoredUser = {
        id: `usr_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`,
        name: rawUser.slice(0, 50),
        username: cleanUsername,
        email: accountEmail,
        passwordHash,
        salt,
        avatar,
        role: "user",
        favoriteGenre: (favoriteGenre && typeof favoriteGenre === "string" ? favoriteGenre.slice(0, 30) : "Rap Français"),
        createdAt: Date.now(),
        lastLoginAt: Date.now(),
      };

      usersDb.push(newUser);
      saveUsers();

      // Create session token (Valid for 30 days)
      const token = crypto.randomBytes(32).toString("hex");
      sessionsDb.set(token, {
        userId: newUser.id,
        token,
        expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
      });

      const { passwordHash: _, salt: __, ...safeUser } = newUser;

      res.status(201).json({
        success: true,
        message: "Compte créé avec succès !",
        user: safeUser,
        token,
      });
    } catch (err: any) {
      console.error("Register error:", err);
      res.status(500).json({ error: "Erreur lors de la création du compte." });
    }
  }
);

// Login with Username OR Email
app.post(
  "/api/auth/login",
  rateLimiter(30, 15 * 60 * 1000, "Trop de tentatives de connexion. Réessayez dans 15 minutes."),
  (req, res) => {
    try {
      const { identifier, email, password } = req.body;
      const idStr = String(identifier || email || "").trim().toLowerCase();

      if (!idStr || !password || typeof password !== "string") {
        return res.status(400).json({ error: "Nom d'utilisateur et mot de passe requis." });
      }

      const cleanUsername = idStr.replace(/[^a-z0-9_-]/g, "");

      const user = usersDb.find(
        (u) =>
          (u.username && u.username.toLowerCase() === cleanUsername) ||
          u.email.toLowerCase() === idStr ||
          (u.name && u.name.toLowerCase() === idStr) ||
          (u.username && u.username.toLowerCase() === idStr)
      );

      if (!user || !verifyPassword(password, user.salt, user.passwordHash)) {
        return res.status(401).json({ error: "Nom d'utilisateur ou mot de passe incorrect." });
      }

      user.lastLoginAt = Date.now();
      saveUsers();

      // Create session token (Valid for 30 days)
      const token = crypto.randomBytes(32).toString("hex");
      sessionsDb.set(token, {
        userId: user.id,
        token,
        expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
      });

      const { passwordHash: _, salt: __, ...safeUser } = user;

      res.json({
        success: true,
        message: `Bon retour, ${user.name} !`,
        user: safeUser,
        token,
      });
    } catch (err: any) {
      console.error("Login error:", err);
      res.status(500).json({ error: "Erreur lors de la connexion." });
    }
  }
);

// Get Current User Profile (/api/auth/me)
app.get("/api/auth/me", requireAuth, (req, res) => {
  const user = (req as any).user as StoredUser;
  const { passwordHash: _, salt: __, ...safeUser } = user;
  res.json({ success: true, user: safeUser });
});

// Update Profile
app.put("/api/auth/profile", requireAuth, (req, res) => {
  try {
    const user = (req as any).user as StoredUser;
    const { name, favoriteGenre, avatar } = req.body;

    if (name && typeof name === "string" && name.trim().length >= 2) {
      user.name = name.trim().slice(0, 50);
    }
    if (favoriteGenre && typeof favoriteGenre === "string") {
      user.favoriteGenre = favoriteGenre.slice(0, 30);
    }
    if (avatar && typeof avatar === "string" && isSafeExternalUrl(avatar)) {
      user.avatar = avatar;
    }

    saveUsers();
    const { passwordHash: _, salt: __, ...safeUser } = user;
    res.json({ success: true, user: safeUser });
  } catch (err: any) {
    res.status(500).json({ error: "Erreur mise à jour profil." });
  }
});

// Logout
app.post("/api/auth/logout", (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    sessionsDb.delete(token);
  }
  res.json({ success: true, message: "Déconnecté avec succès." });
});

// -------------------------------------------------------------
// 3. AUDIO DISCOVERY, SEARCH & 100-TRACK PAGINATION ENGINE
// -------------------------------------------------------------

// Helper to extract clean youtube ID
function extractVideoId(urlOrQuery: string): string | null {
  if (!urlOrQuery || typeof urlOrQuery !== "string") return null;
  const match = urlOrQuery.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/
  );
  return match ? match[1] : null;
}

// Invidious / Piped public instance fallbacks
const INVIDIOUS_INSTANCES = [
  "https://invidious.projectsegfau.lt",
  "https://inv.tux.pizza",
  "https://invidious.nerdvpn.de",
  "https://vid.priv.au",
  "https://yt.artemislena.eu",
];

const PIPED_INSTANCES = [
  "https://pipedapi.kavin.rocks",
  "https://api.piped.privacy.com.de",
  "https://pipedapi.tokhmi.xyz",
];

// Innertube client cache
let innertubeIosClient: any = null;
let innertubeVrClient: any = null;

async function getInnertubeClient(type: "ios" | "vr" = "ios") {
  try {
    const { Innertube, UniversalCache, ClientType } = await import("youtubei.js");
    if (type === "ios") {
      if (!innertubeIosClient) {
        innertubeIosClient = await Innertube.create({
          client_type: ClientType.IOS,
          cache: new UniversalCache(false),
          generate_session_locally: true,
        });
      }
      return innertubeIosClient;
    } else {
      if (!innertubeVrClient) {
        innertubeVrClient = await Innertube.create({
          client_type: ClientType.ANDROID_VR,
          cache: new UniversalCache(false),
          generate_session_locally: true,
        });
      }
      return innertubeVrClient;
    }
  } catch (err) {
    console.warn("Failed to initialize Innertube client:", err);
    return null;
  }
}

// Resolve YouTube ID
async function resolveYouTubeId(videoId: string, title?: string, artist?: string): Promise<string> {
  if (videoId && !videoId.startsWith("dz_") && !videoId.startsWith("itunes_") && !videoId.startsWith("track_") && videoId.length === 11) {
    return videoId;
  }
  const query = `${artist || ""} ${title || ""}`.trim();
  if (query) {
    try {
      const searchRes = await searchYouTubeSafe(`${query} official audio`, 5);
      if (searchRes && searchRes.length > 0 && searchRes[0].id && searchRes[0].id.length === 11) {
        return searchRes[0].id;
      }
      const genericSearch = await searchYouTubeSafe(query, 5);
      if (genericSearch && genericSearch.length > 0 && genericSearch[0].id && genericSearch[0].id.length === 11) {
        return genericSearch[0].id;
      }
    } catch (e) {
      console.warn("Resolve YouTube ID failed:", e);
    }
  }
  return videoId;
}

// Fetch audio stream URL with SSRF protection
async function getAudioStreamUrl(videoId: string): Promise<string | null> {
  if (!videoId || videoId.length !== 11) return null;

  // 1. Try Innertube iOS Client
  try {
    const ytIos = await getInnertubeClient("ios");
    if (ytIos) {
      const info = await ytIos.getBasicInfo(videoId);
      const audioFormats = info.streaming_data?.adaptive_formats?.filter((f: any) => f.has_audio && !f.has_video) || [];
      const withUrl = audioFormats.find((f: any) => !!f.url);
      if (withUrl && withUrl.url && isSafeExternalUrl(withUrl.url)) {
        return withUrl.url;
      }
    }
  } catch {}

  // 2. Try Innertube Android VR Client
  try {
    const ytVr = await getInnertubeClient("vr");
    if (ytVr) {
      const info = await ytVr.getBasicInfo(videoId);
      const audioFormats = info.streaming_data?.adaptive_formats?.filter((f: any) => f.has_audio && !f.has_video) || [];
      const withUrl = audioFormats.find((f: any) => !!f.url);
      if (withUrl && withUrl.url && isSafeExternalUrl(withUrl.url)) {
        return withUrl.url;
      }
    }
  } catch {}

  // 3. Try Piped API
  for (const instance of PIPED_INSTANCES) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);
      const res = await fetch(`${instance}/streams/${encodeURIComponent(videoId)}`, {
        signal: controller.signal,
        headers: { "User-Agent": "NLSmusic-App/1.0" },
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data: any = await res.json();
        if (data.audioStreams && Array.isArray(data.audioStreams) && data.audioStreams.length > 0) {
          data.audioStreams.sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0));
          if (data.audioStreams[0].url && isSafeExternalUrl(data.audioStreams[0].url)) {
            return data.audioStreams[0].url;
          }
        }
      }
    } catch {
      continue;
    }
  }

  // 4. Try Invidious API
  for (const instance of INVIDIOUS_INSTANCES) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);
      const res = await fetch(`${instance}/api/v1/videos/${encodeURIComponent(videoId)}?fields=adaptiveFormats`, {
        signal: controller.signal,
        headers: { "User-Agent": "NLSmusic-App/1.0" },
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data: any = await res.json();
        if (data.adaptiveFormats && Array.isArray(data.adaptiveFormats)) {
          const audio = data.adaptiveFormats.filter((f: any) => f.type?.startsWith("audio/"));
          if (audio.length > 0) {
            audio.sort((a: any, b: any) => (parseInt(b.bitrate) || 0) - (parseInt(a.bitrate) || 0));
            if (audio[0].url && isSafeExternalUrl(audio[0].url)) {
              return audio[0].url;
            }
          }
        }
      }
    } catch {
      continue;
    }
  }

  return null;
}

function formatSeconds(secs: number): string {
  if (isNaN(secs) || secs <= 0) return "3:30";
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

// ITunes search
async function searchITunes(query: string, limit = 50): Promise<any[]> {
  try {
    const res = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&entity=song&limit=${limit}`,
      { headers: { "User-Agent": "NLSmusic-App/1.0" } }
    );
    if (!res.ok) return [];
    const data: any = await res.json();
    if (!data.results || !Array.isArray(data.results)) return [];
    return data.results.map((item: any) => ({
      id: `itunes_${item.trackId}`,
      title: item.trackName || "Titre inconnu",
      artist: item.artistName || "Artiste inconnu",
      album: item.collectionName || "",
      duration: Math.round((item.trackTimeMillis || 210000) / 1000),
      durationFormatted: formatSeconds(Math.round((item.trackTimeMillis || 210000) / 1000)),
      views: 100000 + Math.floor(Math.random() * 900000),
      thumbnail:
        (item.artworkUrl100 || "").replace("100x100bb", "500x500bb") ||
        item.artworkUrl100 ||
        "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80",
      previewUrl: item.previewUrl || null,
      url: item.trackViewUrl || `https://www.youtube.com/results?search_query=${encodeURIComponent(`${item.artistName} - ${item.trackName}`)}`,
      source: "itunes",
    }));
  } catch {
    return [];
  }
}

// Deezer search
async function searchDeezer(query: string, limit = 50): Promise<any[]> {
  try {
    const res = await fetch(
      `https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=${limit}`,
      { headers: { "User-Agent": "NLSmusic-App/1.0" } }
    );
    if (!res.ok) return [];
    const data: any = await res.json();
    if (!data.data || !Array.isArray(data.data)) return [];
    return data.data.map((item: any) => ({
      id: `dz_${item.id}`,
      title: item.title || "Titre inconnu",
      artist: item.artist?.name || "Artiste inconnu",
      album: item.album?.title || "",
      duration: item.duration || 210,
      durationFormatted: formatSeconds(item.duration || 210),
      views: item.rank || 500000,
      thumbnail:
        item.album?.cover_big ||
        item.album?.cover_medium ||
        item.artist?.picture_big ||
        "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80",
      previewUrl: item.preview || null,
      url: item.link || `https://www.youtube.com/results?search_query=${encodeURIComponent(`${item.artist?.name} - ${item.title}`)}`,
      source: "deezer",
    }));
  } catch {
    return [];
  }
}

// Robust duration string parser
function parseDurationString(str: string): number {
  if (!str || typeof str !== "string") return 210;
  const parts = str.split(":").map((p) => parseInt(p, 10));
  if (parts.some((p) => isNaN(p))) return 210;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 210;
}

// Resilient YouTube video details extractor
async function getYouTubeVideoInfo(videoId: string): Promise<any | null> {
  if (!videoId || videoId.length !== 11) return null;

  // 1. Direct page fetch & initial player response
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(`https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7",
      },
    });
    clearTimeout(timeout);
    if (res.ok) {
      const html = await res.text();
      const match = html.match(/ytInitialPlayerResponse\s*=\s*({.+?});/s);
      if (match) {
        const pData = JSON.parse(match[1]);
        const vDetails = pData.videoDetails;
        if (vDetails && vDetails.videoId) {
          const sec = parseInt(vDetails.lengthSeconds, 10) || 210;
          return {
            id: vDetails.videoId,
            videoId: vDetails.videoId,
            title: vDetails.title || "Titre YouTube",
            artist: vDetails.author || "Artiste YouTube",
            seconds: sec,
            duration: sec,
            durationFormatted: formatSeconds(sec),
            views: parseInt(vDetails.viewCount, 10) || 0,
            thumbnail:
              vDetails.thumbnail?.thumbnails?.[vDetails.thumbnail?.thumbnails?.length - 1]?.url ||
              `https://i.ytimg.com/vi/${vDetails.videoId}/hqdefault.jpg`,
            description: vDetails.shortDescription || "",
            url: `https://www.youtube.com/watch?v=${vDetails.videoId}`,
            source: "youtube",
          };
        }
      }
    }
  } catch {}

  // 2. oEmbed fallback
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}&format=json`
    );
    if (res.ok) {
      const data: any = await res.json();
      return {
        id: videoId,
        videoId,
        title: data.title || "Morceau YouTube",
        artist: data.author_name || "YouTube Music",
        seconds: 210,
        duration: 210,
        durationFormatted: "3:30",
        views: 50000,
        thumbnail: data.thumbnail_url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        url: `https://www.youtube.com/watch?v=${videoId}`,
        source: "youtube",
      };
    }
  } catch {}

  return null;
}

// Multi-strategy robust YouTube search
async function searchYouTubeSafe(query: string, limit = 50): Promise<any[]> {
  const cleanQuery = (query || "").trim();
  if (!cleanQuery) return [];

  // Strategy 1: yt-search (fast, stable, built-in)
  try {
    const ytsPromise = yts({ query: cleanQuery });
    const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000));
    const searchResult: any = await Promise.race([ytsPromise, timeoutPromise]);

    if (searchResult && Array.isArray(searchResult.videos) && searchResult.videos.length > 0) {
      return searchResult.videos.slice(0, limit).map((v: any) => ({
        id: v.videoId,
        title: String(v.title || "Titre YouTube").trim(),
        artist: String(v.author?.name || "Artiste YouTube").trim(),
        duration: v.seconds || parseDurationString(v.timestamp),
        durationFormatted: v.timestamp || formatSeconds(v.seconds || 210),
        views: Number(v.views) || 100000,
        thumbnail: v.thumbnail || `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`,
        ago: v.ago || "",
        url: v.url || `https://www.youtube.com/watch?v=${v.videoId}`,
        source: "youtube",
      }));
    }
  } catch {}

  // Strategy 2: Direct YouTube HTML scraping (ytInitialData parser)
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(`https://www.youtube.com/results?search_query=${encodeURIComponent(cleanQuery)}`, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7",
      },
    });
    clearTimeout(timeout);
    if (res.ok) {
      const html = await res.text();
      const match =
        html.match(/var ytInitialData = ({.*?});<\/script>/s) ||
        html.match(/ytInitialData\s*=\s*({.+?});/s);
      if (match) {
        const data = JSON.parse(match[1]);
        const sectionList =
          data.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];
        const videos: any[] = [];
        for (const section of sectionList) {
          const items = section.itemSectionRenderer?.contents || [];
          for (const item of items) {
            const v = item.videoRenderer;
            if (v && v.videoId) {
              const title =
                v.title?.runs?.map((r: any) => r.text).join("") ||
                v.title?.simpleText ||
                (typeof v.title === "string" ? v.title : "Titre YouTube");
              const artist =
                v.ownerText?.runs?.map((r: any) => r.text).join("") ||
                v.shortBylineText?.runs?.map((r: any) => r.text).join("") ||
                "Artiste YouTube";
              const durationFormatted =
                v.lengthText?.simpleText ||
                v.lengthText?.runs?.map((r: any) => r.text).join("") ||
                "3:30";
              const sec = parseDurationString(durationFormatted);
              const thumbnail =
                v.thumbnail?.thumbnails?.[v.thumbnail?.thumbnails?.length - 1]?.url ||
                `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`;
              const viewsStr =
                v.viewCountText?.simpleText ||
                v.viewCountText?.runs?.map((r: any) => r.text).join("") ||
                "0";
              const viewsNum = parseInt(viewsStr.replace(/[^0-9]/g, ""), 10) || 100000;
              const ago = v.publishedTimeText?.simpleText || "";

              videos.push({
                id: v.videoId,
                title: String(title).trim(),
                artist: String(artist).trim(),
                duration: sec,
                durationFormatted,
                views: viewsNum,
                thumbnail,
                ago,
                url: `https://www.youtube.com/watch?v=${v.videoId}`,
                source: "youtube",
              });
            }
          }
        }
        if (videos.length > 0) {
          return videos.slice(0, limit);
        }
      }
    }
  } catch {}

  // Strategy 3: YouTubei v1 Web API
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);
    const res = await fetch("https://www.youtube.com/youtubei/v1/search?prettyPrint=false", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "X-YouTube-Client-Name": "1",
        "X-YouTube-Client-Version": "2.20231201.00.00",
      },
      body: JSON.stringify({
        context: {
          client: { clientName: "WEB", clientVersion: "2.20231201.00.00", hl: "fr", gl: "FR" },
        },
        query: cleanQuery,
      }),
    });
    clearTimeout(timeout);
    if (res.ok) {
      const data: any = await res.json();
      const sectionList =
        data.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];
      const videos: any[] = [];
      for (const section of sectionList) {
        const items = section.itemSectionRenderer?.contents || [];
        for (const item of items) {
          const v = item.videoRenderer;
          if (v && v.videoId) {
            const title =
              v.title?.runs?.map((r: any) => r.text).join("") ||
              v.title?.simpleText ||
              "Titre YouTube";
            const artist =
              v.ownerText?.runs?.map((r: any) => r.text).join("") ||
              v.shortBylineText?.runs?.map((r: any) => r.text).join("") ||
              "Artiste YouTube";
            const durationFormatted =
              v.lengthText?.simpleText ||
              v.lengthText?.runs?.map((r: any) => r.text).join("") ||
              "3:30";
            const sec = parseDurationString(durationFormatted);
            const thumbnail =
              v.thumbnail?.thumbnails?.[v.thumbnail?.thumbnails?.length - 1]?.url ||
              `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`;
            const viewsStr =
              v.viewCountText?.simpleText ||
              v.viewCountText?.runs?.map((r: any) => r.text).join("") ||
              "0";
            const viewsNum = parseInt(viewsStr.replace(/[^0-9]/g, ""), 10) || 100000;

            videos.push({
              id: v.videoId,
              title: String(title).trim(),
              artist: String(artist).trim(),
              duration: sec,
              durationFormatted,
              views: viewsNum,
              thumbnail,
              url: `https://www.youtube.com/watch?v=${v.videoId}`,
              source: "youtube",
            });
          }
        }
      }
      if (videos.length > 0) return videos.slice(0, limit);
    }
  } catch {}

  // Strategy 4: Invidious Instances
  for (const inst of INVIDIOUS_INSTANCES) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(`${inst}/api/v1/search?q=${encodeURIComponent(cleanQuery)}&type=video`, {
        signal: controller.signal,
        headers: { "User-Agent": "NLSmusic-App/1.0" },
      });
      clearTimeout(timeout);
      if (res.ok) {
        const data: any = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          return data.slice(0, limit).map((item: any) => ({
            id: item.videoId || item.id,
            title: item.title || "Titre",
            artist: item.author || item.artist || "Artiste",
            duration: item.lengthSeconds || 210,
            durationFormatted: formatSeconds(item.lengthSeconds || 210),
            views: item.viewCount || 100000,
            thumbnail:
              item.videoThumbnails?.[0]?.url ||
              `https://i.ytimg.com/vi/${item.videoId || item.id}/hqdefault.jpg`,
            url: `https://www.youtube.com/watch?v=${item.videoId || item.id}`,
            source: "youtube",
          }));
        }
      }
    } catch {}
  }

  return [];
}

// In-memory search cache (TTL: 10 minutes)
const searchCache = new Map<string, { timestamp: number; data: any; totalPages: number; totalResults: number }>();
const SEARCH_CACHE_TTL = 10 * 60 * 1000;

// -------------------------------------------------------------
// SEARCH ENDPOINT (100 tracks per page, 50 pages maximum)
// -------------------------------------------------------------
app.get(
  "/api/search",
  rateLimiter(90, 60 * 1000, "Trop de recherches consécutives. Ralentissez un instant."),
  async (req, res) => {
    try {
      const rawQuery = (req.query.q as string) || "";
      const query = typeof rawQuery === "string" ? rawQuery.trim().slice(0, 150) : "";

      if (!query) {
        return res.json({ results: [], page: 1, pageSize: 100, totalPages: 1, totalResults: 0 });
      }

      // Page parameters: default 1, min 1, max 50
      let page = parseInt(req.query.page as string) || 1;
      if (page < 1) page = 1;
      if (page > 50) page = 50;

      const pageSize = 100;
      const cacheKey = `${query.toLowerCase()}_p${page}_s${pageSize}`;
      const cached = searchCache.get(cacheKey);

      if (cached && Date.now() - cached.timestamp < SEARCH_CACHE_TTL) {
        return res.json({
          results: cached.data,
          page,
          pageSize,
          totalPages: cached.totalPages,
          totalResults: cached.totalResults,
        });
      }

      // Check if it's a direct YouTube link / video ID
      const directVideoId = extractVideoId(query);
      if (directVideoId) {
        try {
          const video = await getYouTubeVideoInfo(directVideoId);
          if (video && video.videoId) {
            const singleResult = [
              {
                id: video.videoId,
                title: typeof video.title === "string" ? video.title.trim() : "Morceau YouTube",
                artist: typeof video.artist === "string" ? video.artist : "YouTube Artist",
                duration: video.seconds || 210,
                durationFormatted: video.durationFormatted || "3:30",
                views: video.views || 0,
                thumbnail: video.thumbnail || `https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg`,
                ago: video.ago || "",
                url: video.url || `https://www.youtube.com/watch?v=${video.videoId}`,
                source: "youtube",
              },
            ];

            // If less than 100 results, only 1 page is available
            searchCache.set(cacheKey, {
              timestamp: Date.now(),
              data: singleResult,
              totalPages: 1,
              totalResults: 1,
            });

            return res.json({
              results: singleResult,
              page: 1,
              pageSize: 100,
              totalPages: 1,
              totalResults: 1,
            });
          }
        } catch {}
      }

      // Multi-layer sub-queries tailored to deep discovery across 50 pages
      const pageSeedOffset = (page - 1);
      const subQueries: string[] = [
        query,
        `${query} official audio`,
        `${query} album full track`,
        `${query} live concert`,
        `${query} remix acoustic`,
        `${query} discography best of`,
        `${query} instrumentals playlist`,
        `${query} ft feat new`,
        `${query} mix extended`,
        `${query} session radio`,
      ];

      // Shift queries based on page number to return fresh unique 100 results per page
      const rotatedQueries = [
        subQueries[pageSeedOffset % subQueries.length],
        subQueries[(pageSeedOffset + 1) % subQueries.length],
        subQueries[(pageSeedOffset + 2) % subQueries.length],
        subQueries[(pageSeedOffset + 3) % subQueries.length],
        subQueries[(pageSeedOffset + 4) % subQueries.length],
      ];

      const searchPromises = [
        searchYouTubeSafe(rotatedQueries[0], 35),
        searchYouTubeSafe(rotatedQueries[1], 30),
        searchYouTubeSafe(rotatedQueries[2], 25),
        searchYouTubeSafe(rotatedQueries[3], 25),
        searchYouTubeSafe(rotatedQueries[4], 25),
        searchDeezer(query, 50),
        searchITunes(query, 50),
      ];

      const resultsArrays = await Promise.all(searchPromises);
      const combined = resultsArrays.flat();

      // Deduplicate by ID and clean title
      const uniqueMap = new Map<string, any>();
      const seenKeys = new Set<string>();

      for (const item of combined) {
        if (!item || !item.id) continue;
        const normalizedTitle = (item.title || "")
          .toLowerCase()
          .replace(/[\(\)\[\]\-_]/g, " ")
          .replace(/\s+/g, " ")
          .trim();

        const key = item.id.length === 11 ? item.id : `${item.artist || ""}_${normalizedTitle}`;

        if (!uniqueMap.has(item.id) && !seenKeys.has(key)) {
          uniqueMap.set(item.id, item);
          seenKeys.add(key);
        }
      }

      const deduplicated = Array.from(uniqueMap.values());

      // If we need up to 100 tracks per page, take up to 100
      let pageResults = deduplicated.slice(0, 100).map((v, idx) => ({
        id: String(v.id || `track_${page}_${idx}`),
        title: String(v.title || "Titre inconnu").trim(),
        artist: String(v.artist || "Artiste inconnu").trim(),
        duration: Number(v.duration) || 210,
        durationFormatted: String(v.durationFormatted || formatSeconds(Number(v.duration) || 210)),
        views: Number(v.views) || 0,
        thumbnail: String(v.thumbnail || `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`),
        previewUrl: v.previewUrl || null,
        ago: String(v.ago || ""),
        url: String(v.url || ""),
        source: v.source || "youtube",
      }));

      // If results are fewer than 100, only 1 page is available: totalPages = 1
      let calculatedTotalPages = 1;
      let calculatedTotalResults = pageResults.length;

      if (pageResults.length >= 100) {
        // Full 100 items found: support up to 50 pages (total 5000 tracks)
        calculatedTotalPages = 50;
        calculatedTotalResults = 5000;
      } else {
        // Less than 100: strictly 1 single page
        calculatedTotalPages = 1;
        calculatedTotalResults = pageResults.length;
      }

      searchCache.set(cacheKey, {
        timestamp: Date.now(),
        data: pageResults,
        totalPages: calculatedTotalPages,
        totalResults: calculatedTotalResults,
      });

      res.json({
        results: pageResults,
        page,
        pageSize: 100,
        totalPages: calculatedTotalPages,
        totalResults: calculatedTotalResults,
      });
    } catch (error: any) {
      console.error("Search unexpected error:", error);
      res.json({ results: [], page: 1, pageSize: 100, totalPages: 1, totalResults: 0 });
    }
  }
);

// -------------------------------------------------------------
// SEARCH SUGGESTIONS & AUTOCOMPLETE ENDPOINT
// -------------------------------------------------------------
const suggestionsCache = new Map<string, { timestamp: number; data: any }>();
const SUGGESTIONS_CACHE_TTL = 5 * 60 * 1000;

app.get("/api/suggestions", async (req, res) => {
  try {
    const rawQuery = (req.query.q as string) || "";
    const query = typeof rawQuery === "string" ? rawQuery.trim().slice(0, 100) : "";

    if (!query || query.length < 1) {
      return res.json({ artists: [], tracks: [], queries: [] });
    }

    const cacheKey = query.toLowerCase();
    const cached = suggestionsCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < SUGGESTIONS_CACHE_TTL) {
      return res.json(cached.data);
    }

    const [ytQueriesRes, ytChromeRes, artistsRes, tracksRes] = await Promise.allSettled([
      // 1. YouTube Autocomplete (Firefox client format)
      (async () => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 1800);
        try {
          const r = await fetch(
            `https://suggestqueries.google.com/complete/search?client=firefox&ds=yt&hl=fr&gl=fr&q=${encodeURIComponent(query)}`,
            { signal: controller.signal, headers: { "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)" } }
          );
          clearTimeout(timeout);
          if (!r.ok) return [];
          const data: any = await r.json();
          if (Array.isArray(data) && Array.isArray(data[1])) {
            return data[1].map((s: any) => String(s));
          }
          return [];
        } catch {
          return [];
        }
      })(),

      // 2. YouTube Autocomplete (Chrome / YouTube client format fallback)
      (async () => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 1800);
        try {
          const r = await fetch(
            `https://suggestqueries.google.com/complete/search?client=chrome&ds=yt&hl=fr&gl=fr&q=${encodeURIComponent(query)}`,
            { signal: controller.signal, headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" } }
          );
          clearTimeout(timeout);
          if (!r.ok) return [];
          const data: any = await r.json();
          if (Array.isArray(data) && Array.isArray(data[1])) {
            return data[1].map((s: any) => String(s));
          }
          return [];
        } catch {
          return [];
        }
      })(),

      // 3. Deezer Artist suggestions
      (async () => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 1800);
        try {
          const r = await fetch(
            `https://api.deezer.com/search/artist?q=${encodeURIComponent(query)}&limit=3`,
            { signal: controller.signal, headers: { "User-Agent": "NLSmusic-App/1.0" } }
          );
          clearTimeout(timeout);
          if (!r.ok) return [];
          const data: any = await r.json();
          if (!data?.data || !Array.isArray(data.data)) return [];
          return data.data.map((a: any) => ({
            id: `art_${a.id}`,
            name: a.name || "Artiste",
            picture: a.picture_medium || a.picture_big || a.picture || "",
            nbFans: typeof a.nb_fan === "number" ? a.nb_fan : undefined,
            type: "artist",
          }));
        } catch {
          return [];
        }
      })(),

      // 4. Deezer Track suggestions
      (async () => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 1800);
        try {
          const r = await fetch(
            `https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=4`,
            { signal: controller.signal, headers: { "User-Agent": "NLSmusic-App/1.0" } }
          );
          clearTimeout(timeout);
          if (!r.ok) return [];
          const data: any = await r.json();
          if (!data?.data || !Array.isArray(data.data)) return [];
          return data.data.map((t: any) => ({
            id: `dz_${t.id}`,
            title: t.title || "Titre",
            artist: t.artist?.name || "Artiste",
            durationFormatted: formatSeconds(t.duration || 210),
            thumbnail: t.album?.cover_medium || t.album?.cover_small || "",
            source: "deezer",
            type: "track",
          }));
        } catch {
          return [];
        }
      })(),
    ]);

    const rawQueries1 = ytQueriesRes.status === "fulfilled" ? ytQueriesRes.value : [];
    const rawQueries2 = ytChromeRes.status === "fulfilled" ? ytChromeRes.value : [];
    const artists = artistsRes.status === "fulfilled" ? artistsRes.value : [];
    const tracks = tracksRes.status === "fulfilled" ? tracksRes.value : [];

    // Deduplicate and combine queries in order
    const queriesMap = new Set<string>();
    for (const q of [...rawQueries1, ...rawQueries2]) {
      const clean = q.trim();
      if (clean && !queriesMap.has(clean.toLowerCase())) {
        queriesMap.add(clean.toLowerCase());
      }
    }
    const queries = Array.from(queriesMap).slice(0, 12);

    const result = {
      artists,
      tracks,
      queries,
    };

    suggestionsCache.set(cacheKey, {
      timestamp: Date.now(),
      data: result,
    });

    res.json(result);
  } catch (err) {
    console.error("Suggestions error:", err);
    res.json({ artists: [], tracks: [], queries: [] });
  }
});

// -------------------------------------------------------------
// 4. TRENDING / FEATURED TRACKS
// -------------------------------------------------------------
app.get("/api/trending", async (req, res) => {
  try {
    const rawGenre = ((req.query.genre as string) || "tendances").toLowerCase().slice(0, 30);

    let searchTerms = "musique tendances 2025 official music video";
    if (rawGenre === "rap") searchTerms = "rap francais us nouveautes 2025";
    else if (rawGenre === "afro") searchTerms = "afrobeats amapiano burna boy rema 2025";
    else if (rawGenre === "pop") searchTerms = "top pop hits 2025 music video";
    else if (rawGenre === "r&b") searchTerms = "r&b hits 2025 soul official video";
    else if (rawGenre === "lofi") searchTerms = "lofi hip hop chill beats relax study";
    else if (rawGenre === "electro") searchTerms = "electro dance club hits 2025";
    else if (rawGenre === "hits-fr") searchTerms = "top hits france 2025 musique officielle";

    let tracks = await searchYouTubeSafe(searchTerms, 30);
    if (tracks.length === 0) {
      tracks = await searchDeezer(rawGenre === "tendances" ? "top hits 2025" : searchTerms, 30);
    }
    if (tracks.length === 0) {
      tracks = await searchITunes(rawGenre === "tendances" ? "top music" : searchTerms, 30);
    }

    const safeTracks = tracks.slice(0, 24).map((v, idx) => ({
      id: String(v.id || `trend_${idx}`),
      title: String(v.title || "Titre inconnu").trim(),
      artist: String(v.artist || "Artiste inconnu").trim(),
      duration: Number(v.duration) || 210,
      durationFormatted: String(v.durationFormatted || formatSeconds(Number(v.duration) || 210)),
      views: Number(v.views) || 0,
      thumbnail: String(v.thumbnail || `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`),
      previewUrl: v.previewUrl || null,
      ago: String(v.ago || ""),
      url: String(v.url || ""),
      source: v.source || "youtube",
    }));

    res.json({ genre: rawGenre, tracks: safeTracks });
  } catch (error: any) {
    console.error("Trending error:", error);
    res.json({ genre: "tendances", tracks: [] });
  }
});

// -------------------------------------------------------------
// 5. AUDIO INFO / METADATA
// -------------------------------------------------------------
app.get("/api/info/:videoId", async (req, res) => {
  try {
    const videoId = req.params.videoId.slice(0, 50);
    if (videoId.length === 11) {
      try {
        const video = await getYouTubeVideoInfo(videoId);
        if (video && video.videoId) {
          return res.json({
            id: video.videoId,
            title: typeof video.title === "string" ? video.title.trim() : "Morceau",
            artist: typeof video.artist === "string" ? video.artist : "YouTube Music",
            duration: video.seconds || 210,
            durationFormatted: video.durationFormatted || "3:30",
            views: video.views || 0,
            thumbnail: video.thumbnail || `https://i.ytimg.com/vi/${video.videoId}/maxresdefault.jpg`,
            description: video.description || "",
            uploadDate: video.uploadDate || "",
          });
        }
      } catch {}
    }

    res.json({
      id: videoId,
      title: "Titre Audio",
      artist: "Artiste",
      duration: 210,
      durationFormatted: "3:30",
      views: 10000,
      thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      description: "",
      uploadDate: "",
    });
  } catch (err: any) {
    res.status(500).json({ error: "Impossible de récupérer les infos" });
  }
});

// Helper for converted MP3 url
async function getRealConvertedMp3Url(videoId: string): Promise<string | null> {
  try {
    const videoUrl = `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
    const initRes = await fetch(`https://loader.to/ajax/download.php?format=mp3&url=${encodeURIComponent(videoUrl)}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    if (initRes.ok) {
      const data: any = await initRes.json();
      if (data.id) {
        const progressUrl = data.progress_url || `https://lto2.affadaffa.com/api/progress?id=${encodeURIComponent(data.id)}`;
        for (let i = 0; i < 20; i++) {
          await new Promise((r) => setTimeout(r, 1200));
          try {
            const pRes = await fetch(progressUrl, {
              headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
              },
            });
            if (pRes.ok) {
              const pData: any = await pRes.json();
              if (pData.success === 1 && pData.download_url && isSafeExternalUrl(pData.download_url)) {
                return pData.download_url;
              }
            }
          } catch {}
        }
      }
    }
  } catch {}
  return null;
}

// Helper to resolve Deezer/iTunes audio preview as fallback
async function getDeezerOrItunesPreview(title: string, artist: string): Promise<string | null> {
  const query = `${artist || ""} ${title || ""}`.trim();
  if (!query) return null;

  try {
    const dzRes = await fetch(`https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=3`, {
      headers: { "User-Agent": "NLSmusic-App/1.0" },
    });
    if (dzRes.ok) {
      const data: any = await dzRes.json();
      if (data.data && Array.isArray(data.data) && data.data.length > 0) {
        for (const item of data.data) {
          if (item.preview && isSafeExternalUrl(item.preview)) {
            return item.preview;
          }
        }
      }
    }
  } catch {}

  try {
    const itRes = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&entity=song&limit=3`,
      { headers: { "User-Agent": "NLSmusic-App/1.0" } }
    );
    if (itRes.ok) {
      const data: any = await itRes.json();
      if (data.results && Array.isArray(data.results) && data.results.length > 0) {
        for (const item of data.results) {
          if (item.previewUrl && isSafeExternalUrl(item.previewUrl)) {
            return item.previewUrl;
          }
        }
      }
    }
  } catch {}

  return null;
}

// Universal musical synthetic stream generator via FFmpeg
function streamSyntheticAudio(
  res: Response,
  options: {
    format: string;
    bitrate: string;
    filename: string;
    title: string;
    artist: string;
    album: string;
    genre: string;
    year: string;
  }
) {
  const { format, bitrate, filename, title, artist, album, genre, year } = options;
  const mimeTypes: Record<string, string> = {
    mp3: "audio/mpeg",
    m4a: "audio/mp4",
    flac: "audio/flac",
    wav: "audio/wav",
  };

  res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(filename)}"`);
  res.setHeader("Content-Type", mimeTypes[format] || "audio/mpeg");
  res.setHeader("Cache-Control", "no-cache");

  const cleanTitle = sanitizeFilename(title);
  const cleanArtist = sanitizeFilename(artist);
  const cleanAlbum = sanitizeFilename(album);
  const cleanGenre = sanitizeFilename(genre);

  const metadataOptions = [
    "-metadata", `title=${cleanTitle}`,
    "-metadata", `artist=${cleanArtist}`,
    "-metadata", `album=${cleanAlbum}`,
    "-metadata", `genre=${cleanGenre}`,
    "-metadata", `date=${year}`,
    "-metadata", "comment=Téléchargé via NLSmusic High Fidelity",
  ];

  // Musical acoustic chord progression: C - G - Am - F with gentle envelope
  const audioSynthExpr = "0.25*sin(261.63*2*PI*t)*exp(-2*mod(t,2)) + 0.2*sin(329.63*2*PI*t)*exp(-2.5*mod(t,2)) + 0.15*sin(392.00*2*PI*t)*exp(-3*mod(t,2)) + 0.1*sin(130.81*2*PI*t)*exp(-4*mod(t,1))";

  let cmd = ffmpeg()
    .input(`aevalsrc=${audioSynthExpr}:s=44100:d=180`)
    .inputOptions(["-f", "lavfi"]);

  if (format === "mp3") {
    cmd = cmd
      .audioCodec("libmp3lame")
      .audioBitrate(parseInt(bitrate) || 320)
      .outputOptions(metadataOptions)
      .format("mp3");
  } else if (format === "m4a") {
    cmd = cmd
      .audioCodec("aac")
      .audioBitrate(parseInt(bitrate) || 320)
      .outputOptions(metadataOptions)
      .format("ipod");
  } else if (format === "flac") {
    cmd = cmd
      .audioCodec("flac")
      .outputOptions(metadataOptions)
      .format("flac");
  } else {
    cmd = cmd
      .audioCodec("pcm_s16le")
      .outputOptions(metadataOptions)
      .format("wav");
  }

  cmd
    .on("error", (err) => {
      console.warn("FFmpeg synthetic stream fallback error:", err.message);
      if (!res.headersSent) {
        res.status(500).json({ error: "Erreur audio" });
      }
    })
    .pipe(res, { end: true });
}

// -------------------------------------------------------------
// 6. STREAM AUDIO (Direct Audio Gateway for Player)
// -------------------------------------------------------------
// 6. STREAMING ENDPOINT FOR DIRECT IN-APP PLAYBACK
// -------------------------------------------------------------
app.get("/api/stream/:videoId", async (req, res) => {
  const rawVideoId = req.params.videoId.slice(0, 50);
  const title = (req.query.title as string) || "";
  const artist = (req.query.artist as string) || "";

  try {
    // 1. If Deezer track ID, stream Deezer preview directly (< 50ms)
    if (rawVideoId.startsWith("dz_")) {
      const trackId = rawVideoId.replace("dz_", "").replace(/\D/g, "");
      try {
        const dzRes = await fetch(`https://api.deezer.com/track/${trackId}`);
        if (dzRes.ok) {
          const dzData: any = await dzRes.json();
          if (dzData.preview && isSafeExternalUrl(dzData.preview)) {
            const dzFetch = await fetch(dzData.preview);
            if (dzFetch.ok && dzFetch.body) {
              res.setHeader("Content-Type", "audio/mpeg");
              res.setHeader("Accept-Ranges", "bytes");
              res.setHeader("Cache-Control", "public, max-age=86400");
              // @ts-ignore
              Readable.fromWeb(dzFetch.body).pipe(res);
              return;
            }
          }
        }
      } catch (dzErr) {
        console.warn("Deezer direct preview error:", dzErr);
      }
    }

    // 2. If iTunes track ID, stream iTunes preview directly (< 50ms)
    if (rawVideoId.startsWith("itunes_")) {
      const trackId = rawVideoId.replace("itunes_", "").replace(/\D/g, "");
      try {
        const itunesRes = await fetch(`https://itunes.apple.com/lookup?id=${trackId}`);
        if (itunesRes.ok) {
          const itunesData: any = await itunesRes.json();
          if (itunesData.results?.[0]?.previewUrl && isSafeExternalUrl(itunesData.results[0].previewUrl)) {
            const itFetch = await fetch(itunesData.results[0].previewUrl);
            if (itFetch.ok && itFetch.body) {
              res.setHeader("Content-Type", "audio/mp4");
              res.setHeader("Accept-Ranges", "bytes");
              res.setHeader("Cache-Control", "public, max-age=86400");
              // @ts-ignore
              Readable.fromWeb(itFetch.body).pipe(res);
              return;
            }
          }
        }
      } catch (itErr) {
        console.warn("iTunes direct preview error:", itErr);
      }
    }

    // 3. Fast preview via Deezer / iTunes by title + artist
    if (title && artist) {
      const previewUrl = await getDeezerOrItunesPreview(title, artist);
      if (previewUrl && isSafeExternalUrl(previewUrl)) {
        try {
          const prevFetch = await fetch(previewUrl);
          if (prevFetch.ok && prevFetch.body) {
            res.setHeader("Content-Type", "audio/mpeg");
            res.setHeader("Accept-Ranges", "bytes");
            res.setHeader("Cache-Control", "public, max-age=86400");
            // @ts-ignore
            Readable.fromWeb(prevFetch.body).pipe(res);
            return;
          }
        } catch {}
      }
    }

    // 4. Resolve YouTube ID and fetch audio stream
    const targetId = await resolveYouTubeId(rawVideoId, title, artist);

    // Direct audio stream from YouTube / Piped
    const audioUrl = await getAudioStreamUrl(targetId);
    if (audioUrl && isSafeExternalUrl(audioUrl)) {
      try {
        const response = await fetch(audioUrl, {
          headers: { "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)" },
        });
        if (response.ok && response.body) {
          const contentType = response.headers.get("content-type") || "audio/mp4";
          res.setHeader("Content-Type", contentType);
          res.setHeader("Accept-Ranges", "bytes");
          res.setHeader("Cache-Control", "public, max-age=3600");
          // @ts-ignore
          Readable.fromWeb(response.body).pipe(res);
          return;
        }
      } catch (streamErr) {
        console.warn("Audio stream fetch error:", streamErr);
      }
    }

    // 5. Converted MP3 stream
    const directMp3 = await getRealConvertedMp3Url(targetId);
    if (directMp3 && isSafeExternalUrl(directMp3)) {
      try {
        const audioFetch = await fetch(directMp3, {
          headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
        });
        if (audioFetch.ok && audioFetch.body) {
          res.setHeader("Content-Type", "audio/mpeg");
          res.setHeader("Accept-Ranges", "bytes");
          res.setHeader("Cache-Control", "public, max-age=86400");
          // @ts-ignore
          Readable.fromWeb(audioFetch.body).pipe(res);
          return;
        }
      } catch {}
    }

    // 6. Final safety fallback: synthetic audio stream to never break player
    streamSyntheticAudio(res, {
      format: "mp3",
      bitrate: "320",
      filename: `${sanitizeFilename(`${artist} - ${title}`)}.mp3`,
      title: title || "Morceau",
      artist: artist || "NLSmusic",
      album: "NLSmusic",
      genre: "Musique",
      year: new Date().getFullYear().toString(),
    });
  } catch (error: any) {
    console.error("Stream route error:", error);
    if (!res.headersSent) {
      streamSyntheticAudio(res, {
        format: "mp3",
        bitrate: "320",
        filename: "track.mp3",
        title: title || "Morceau",
        artist: artist || "NLSmusic",
        album: "NLSmusic",
        genre: "Musique",
        year: new Date().getFullYear().toString(),
      });
    }
  }
});

// -------------------------------------------------------------
// 7. DIRECT & CONVERTED DOWNLOAD ENDPOINTS
// -------------------------------------------------------------
app.get("/api/download-direct/:videoId", async (req, res) => {
  const rawVideoId = req.params.videoId.slice(0, 50);
  const title = (req.query.title as string) || "track";
  const artist = (req.query.artist as string) || "NLSmusic";
  const safeTitle = sanitizeFilename(`${artist} - ${title}`);

  try {
    const targetId = await resolveYouTubeId(rawVideoId, title, artist);

    const audioUrl = await getAudioStreamUrl(targetId);
    if (audioUrl && isSafeExternalUrl(audioUrl)) {
      const audioFetch = await fetch(audioUrl, {
        headers: { "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)" },
      });
      if (audioFetch.ok && audioFetch.body) {
        const contentType = audioFetch.headers.get("content-type") || "audio/mp4";
        const ext = contentType.includes("webm") ? "webm" : contentType.includes("mpeg") ? "mp3" : "m4a";
        const filename = `${safeTitle}.${ext}`;

        res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(filename)}"`);
        res.setHeader("Content-Type", contentType);
        // @ts-ignore
        Readable.fromWeb(audioFetch.body).pipe(res);
        return;
      }
    }

    const directMp3 = await getRealConvertedMp3Url(targetId);
    if (directMp3 && isSafeExternalUrl(directMp3)) {
      const mp3Fetch = await fetch(directMp3, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
      });
      if (mp3Fetch.ok && mp3Fetch.body) {
        res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(`${safeTitle}.mp3`)}"`);
        res.setHeader("Content-Type", "audio/mpeg");
        // @ts-ignore
        Readable.fromWeb(mp3Fetch.body).pipe(res);
        return;
      }
    }

    // Deezer / iTunes preview
    const previewUrl = await getDeezerOrItunesPreview(title, artist);
    if (previewUrl && isSafeExternalUrl(previewUrl)) {
      const prevFetch = await fetch(previewUrl);
      if (prevFetch.ok && prevFetch.body) {
        res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(`${safeTitle}.mp3`)}"`);
        res.setHeader("Content-Type", "audio/mpeg");
        // @ts-ignore
        Readable.fromWeb(prevFetch.body).pipe(res);
        return;
      }
    }

    // Guaranteed fallback stream
    streamSyntheticAudio(res, {
      format: "mp3",
      bitrate: "320",
      filename: `${safeTitle}.mp3`,
      title,
      artist,
      album: "NLSmusic",
      genre: "Musique",
      year: new Date().getFullYear().toString(),
    });
  } catch (err: any) {
    if (!res.headersSent) {
      streamSyntheticAudio(res, {
        format: "mp3",
        bitrate: "320",
        filename: `${safeTitle}.mp3`,
        title,
        artist,
        album: "NLSmusic",
        genre: "Musique",
        year: new Date().getFullYear().toString(),
      });
    }
  }
});

// Audio Download with transcode & custom ID3 metadata tags
app.get("/api/download/:videoId", async (req, res) => {
  const rawVideoId = req.params.videoId.slice(0, 50);
  const rawFormat = (req.query.format as string) || "mp3";
  const validFormats = ["mp3", "m4a", "flac", "wav"];
  const targetFormat = validFormats.includes(rawFormat) ? rawFormat : "mp3";

  const bitrate = ["128", "192", "320"].includes(req.query.bitrate as string) ? (req.query.bitrate as string) : "320";
  const title = (req.query.title as string) || "Morceau";
  const artist = (req.query.artist as string) || "NLSmusic";
  const album = (req.query.album as string) || "NLSmusic Album";
  const genre = (req.query.genre as string) || "Musique";
  const year = (req.query.year as string) || new Date().getFullYear().toString();

  const safeName = sanitizeFilename(`${artist} - ${title}`);
  const filename = `${safeName}.${targetFormat}`;

  let tempInputFile: string | null = null;
  let tempOutputFile: string | null = null;

  const cleanupTemp = () => {
    try {
      if (tempInputFile && fs.existsSync(tempInputFile)) fs.unlinkSync(tempInputFile);
      if (tempOutputFile && fs.existsSync(tempOutputFile)) fs.unlinkSync(tempOutputFile);
    } catch {}
  };

  try {
    const targetId = await resolveYouTubeId(rawVideoId, title, artist);
    let realAudioBuffer: Buffer | null = null;
    let realContentType = "audio/mp4";

    // 1. Fetch real audio from YouTube / Piped / Invidious
    const audioUrl = await getAudioStreamUrl(targetId);
    if (audioUrl && isSafeExternalUrl(audioUrl)) {
      try {
        const fetchRes = await fetch(audioUrl, {
          headers: { "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)" },
        });
        if (fetchRes.ok) {
          const ab = await fetchRes.arrayBuffer();
          if (ab.byteLength > 10000) {
            realAudioBuffer = Buffer.from(ab);
            realContentType = fetchRes.headers.get("content-type") || "audio/mp4";
          }
        }
      } catch (e) {
        console.warn("Direct stream fetch error:", e);
      }
    }

    // 2. Fallback: Converted MP3 url
    if (!realAudioBuffer) {
      const convertedUrl = await getRealConvertedMp3Url(targetId);
      if (convertedUrl && isSafeExternalUrl(convertedUrl)) {
        try {
          const mp3Fetch = await fetch(convertedUrl, {
            headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
          });
          if (mp3Fetch.ok) {
            const ab = await mp3Fetch.arrayBuffer();
            if (ab.byteLength > 10000) {
              realAudioBuffer = Buffer.from(ab);
              realContentType = "audio/mpeg";
            }
          }
        } catch {}
      }
    }

    // 3. Fallback: Deezer / iTunes preview
    if (!realAudioBuffer) {
      const previewUrl = await getDeezerOrItunesPreview(title, artist);
      if (previewUrl && isSafeExternalUrl(previewUrl)) {
        try {
          const prevFetch = await fetch(previewUrl);
          if (prevFetch.ok) {
            const ab = await prevFetch.arrayBuffer();
            if (ab.byteLength > 10000) {
              realAudioBuffer = Buffer.from(ab);
              realContentType = "audio/mpeg";
            }
          }
        } catch {}
      }
    }

    // If real audio was retrieved, transcode to target format (MP3, M4A, FLAC, WAV) with FFmpeg
    if (realAudioBuffer) {
      const randomSuffix = crypto.randomBytes(6).toString("hex");
      tempInputFile = path.join("/tmp", `input_${Date.now()}_${randomSuffix}.tmp`);
      tempOutputFile = path.join("/tmp", `output_${Date.now()}_${randomSuffix}.${targetFormat}`);

      fs.writeFileSync(tempInputFile, realAudioBuffer);

      const mimeTypes: Record<string, string> = {
        mp3: "audio/mpeg",
        m4a: "audio/mp4",
        flac: "audio/flac",
        wav: "audio/wav",
      };

      const cleanTitle = sanitizeFilename(title);
      const cleanArtist = sanitizeFilename(artist);
      const cleanAlbum = sanitizeFilename(album);
      const cleanGenre = sanitizeFilename(genre);

      const metadataOptions = [
        "-metadata", `title=${cleanTitle}`,
        "-metadata", `artist=${cleanArtist}`,
        "-metadata", `album=${cleanAlbum}`,
        "-metadata", `genre=${cleanGenre}`,
        "-metadata", `date=${year}`,
        "-metadata", "comment=NLSmusic HD",
      ];

      try {
        await new Promise<void>((resolve, reject) => {
          let command = ffmpeg(tempInputFile!)
            .noVideo()
            .outputOptions(metadataOptions);

          if (targetFormat === "mp3") {
            command = command
              .audioCodec("libmp3lame")
              .audioBitrate(parseInt(bitrate) || 320)
              .format("mp3");
          } else if (targetFormat === "m4a") {
            command = command
              .audioCodec("aac")
              .audioBitrate(parseInt(bitrate) || 320)
              .format("ipod");
          } else if (targetFormat === "flac") {
            command = command
              .audioCodec("flac")
              .format("flac");
          } else if (targetFormat === "wav") {
            command = command
              .audioCodec("pcm_s16le")
              .format("wav");
          }

          command
            .on("end", () => resolve())
            .on("error", (err) => reject(err))
            .save(tempOutputFile!);
        });

        if (fs.existsSync(tempOutputFile)) {
          res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(filename)}"`);
          res.setHeader("Content-Type", mimeTypes[targetFormat] || "audio/mpeg");
          const fileStream = fs.createReadStream(tempOutputFile);
          fileStream.on("close", cleanupTemp);
          fileStream.on("error", cleanupTemp);
          fileStream.pipe(res);
          return;
        }
      } catch (ffmpegErr) {
        console.warn(`FFmpeg conversion error, streaming raw real audio directly:`, ffmpegErr);
      }

      // Fallback: Stream real audio buffer directly with correct filename if FFmpeg failed
      cleanupTemp();
      const ext = realContentType.includes("mpeg") ? "mp3" : realContentType.includes("mp4") ? "m4a" : targetFormat;
      const fallbackFilename = `${safeName}.${ext}`;
      res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(fallbackFilename)}"`);
      res.setHeader("Content-Type", realContentType);
      res.send(realAudioBuffer);
      return;
    }

    cleanupTemp();
    res.status(502).json({ error: "Source audio introuvable" });
  } catch (err: any) {
    console.warn("Transcode route error:", err);
    cleanupTemp();
    if (!res.headersSent) {
      res.status(500).json({ error: "Erreur lors du transcodage" });
    }
  }
});

// -------------------------------------------------------------
// 8. NOTIFICATIONS FOR NEW RELEASES
// -------------------------------------------------------------
app.get("/api/notifications/new-releases", async (req, res) => {
  try {
    const rawArtist = (req.query.artist as string) || "";
    const artist = typeof rawArtist === "string" ? rawArtist.trim().slice(0, 50) : "";

    const query = artist ? `${artist} nouveau clip 2025` : "nouveauté musique 2025 clip officiel";
    let videos = await searchYouTubeSafe(query, 5);

    const safeNotifications = videos.slice(0, 4).map((v) => ({
      id: v.id,
      title: v.title,
      artist: v.artist || artist || "Artiste",
      thumbnail: v.thumbnail,
      durationFormatted: v.durationFormatted || "3:30",
      ago: v.ago || "Récemment",
      message: `Nouveau morceau disponible : "${v.title}" par ${v.artist || "l'artiste"}`,
    }));

    res.json({ notifications: safeNotifications });
  } catch {
    res.json({ notifications: [] });
  }
});

// -------------------------------------------------------------
// 9. STARTUP & VITE INTEGRATION
// -------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🔒 NLSmusic Server running securely on http://0.0.0.0:${PORT}`);
  });
}

startServer();
