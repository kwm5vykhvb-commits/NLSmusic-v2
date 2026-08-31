import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile as updateFirebaseProfile,
  onAuthStateChanged,
  User as FirebaseUser,
} from "firebase/auth";
import {
  initializeFirestore,
  getFirestore,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  getDocs,
} from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";
import { User, Track, Playlist } from "../types";

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Auth
export const auth = getAuth(app);

// Initialize Firestore with robust long-polling transport for iframe & container stability
export const db = (() => {
  try {
    return initializeFirestore(
      app,
      {
        experimentalForceLongPolling: true,
      },
      firebaseConfig.firestoreDatabaseId || "(default)"
    );
  } catch {
    return getFirestore(app, firebaseConfig.firestoreDatabaseId || "(default)");
  }
})();

// -------------------------------------------------------------
// FIRESTORE ERROR HANDLING (Mandatory format)
// -------------------------------------------------------------
export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error("Firestore Error: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// -------------------------------------------------------------
// CONNECTION TESTER
// -------------------------------------------------------------
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    const snap = await getDoc(doc(db, "test", "connection"));
    return snap.exists();
  } catch (error) {
    // Gracefully handle initial offline state without console noise
    return false;
  }
}

// -------------------------------------------------------------
// AUTHENTICATION UTILS
// -------------------------------------------------------------
const googleProvider = new GoogleAuthProvider();

export function mapFirebaseUser(fbUser: FirebaseUser, extra?: Partial<User>): User {
  return {
    id: fbUser.uid,
    name: fbUser.displayName || extra?.name || fbUser.email?.split("@")[0] || "Utilisateur NLS",
    email: fbUser.email || "",
    avatar: fbUser.photoURL || extra?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${fbUser.uid}`,
    role: "user",
    favoriteGenre: extra?.favoriteGenre || "Rap Français",
    createdAt: Date.now(),
  };
}

// Sign in with Google Popup
export async function signInWithGoogle(): Promise<User | null> {
  try {
    googleProvider.setCustomParameters({ prompt: "select_account" });
    const result = await signInWithPopup(auth, googleProvider);
    const fbUser = result.user;

    // Check or create user profile doc in Firestore
    const userRef = doc(db, "users", fbUser.uid);
    let userData: User;

    try {
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        userData = snap.data() as User;
      } else {
        userData = mapFirebaseUser(fbUser);
        await setDoc(userRef, {
          userId: fbUser.uid,
          name: userData.name,
          email: userData.email,
          avatar: userData.avatar,
          role: "user",
          favoriteGenre: userData.favoriteGenre,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    } catch {
      userData = mapFirebaseUser(fbUser);
    }

    return userData;
  } catch (err: any) {
    const code = err?.code || "";
    // User voluntarily closed or cancelled the popup
    if (
      code === "auth/popup-closed-by-user" ||
      code === "auth/cancelled-popup-request" ||
      err?.message?.includes("popup-closed-by-user")
    ) {
      console.log("Google sign-in was cancelled by user.");
      return null;
    }
    if (code === "auth/popup-blocked") {
      throw new Error(
        "La fenêtre de connexion a été bloquée par le navigateur. Veuillez autoriser les pop-ups ou ouvrir l'application dans un nouvel onglet."
      );
    }
    if (code === "auth/operation-not-allowed") {
      throw new Error(
        "Le fournisseur Google n'est pas encore activé dans votre console Firebase (Authentication > Sign-in method > Activer Google)."
      );
    }
    if (code === "auth/unauthorized-domain") {
      throw new Error(
        "Ce domaine n'est pas autorisé dans Firebase Authentication (Console Firebase > Authentication > Paramètres > Domaines autorisés)."
      );
    }
    if (code === "auth/account-exists-with-different-credential") {
      throw new Error(
        "Un compte existe déjà avec cette adresse email mais une autre méthode de connexion."
      );
    }
    if (code === "auth/network-request-failed") {
      throw new Error(
        "Erreur réseau lors de la communication avec Google. Vérifiez votre connexion internet."
      );
    }
    console.warn("Google sign-in notice:", err?.message || err);
    throw new Error(err?.message || "Impossible de se connecter avec Google.");
  }
}

export function normalizeUsername(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "");
}

// Check if username is available in Firestore
export async function isUsernameAvailable(rawUsername: string): Promise<boolean> {
  const username = normalizeUsername(rawUsername);
  if (!username || username.length < 3) return false;
  try {
    const userDoc = await getDoc(doc(db, "usernames", username));
    return !userDoc.exists();
  } catch (err) {
    console.warn("Could not check username availability:", err);
    return true;
  }
}

// Sign in with Email OR Username
export async function signInWithIdentifier(identifier: string, pass: string): Promise<User> {
  const clean = identifier.trim();
  if (!clean) {
    throw new Error("Veuillez saisir votre nom d'utilisateur ou email.");
  }

  let emailToUse = clean;
  // If no '@', treat as username
  if (!clean.includes("@")) {
    const normalized = normalizeUsername(clean);
    emailToUse = `${normalized}@nlsmusic.app`;
  }

  try {
    const res = await signInWithEmailAndPassword(auth, emailToUse, pass);
    const fbUser = res.user;

    const userRef = doc(db, "users", fbUser.uid);
    let userData: User;
    try {
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        userData = snap.data() as User;
      } else {
        userData = mapFirebaseUser(fbUser, {
          name: clean,
          username: normalizeUsername(clean),
        });
      }
    } catch {
      userData = mapFirebaseUser(fbUser, {
        name: clean,
        username: normalizeUsername(clean),
      });
    }

    return userData;
  } catch (err: any) {
    console.warn("Firebase sign-in notice:", err?.message || err);
    const code = err?.code || "";
    if (
      code === "auth/invalid-credential" ||
      code === "auth/user-not-found" ||
      code === "auth/wrong-password" ||
      code === "auth/invalid-email"
    ) {
      throw new Error("Nom d'utilisateur ou mot de passe incorrect.");
    }
    if (code === "auth/operation-not-allowed") {
      const customErr: any = new Error("auth/operation-not-allowed");
      customErr.code = "auth/operation-not-allowed";
      throw customErr;
    }
    throw new Error(err?.message || "Identifiants incorrects.");
  }
}

// Register with Username ONLY (and optional genre/email)
export async function registerWithUsername(
  rawUsername: string,
  pass: string,
  favoriteGenre: string = "Rap Français",
  optionalEmail?: string
): Promise<User> {
  const normalized = normalizeUsername(rawUsername);
  if (!normalized || normalized.length < 3) {
    throw new Error("Le nom d'utilisateur doit comporter au moins 3 caractères (lettres, chiffres, _ ou -).");
  }
  if (normalized.length > 30) {
    throw new Error("Le nom d'utilisateur ne doit pas dépasser 30 caractères.");
  }
  if (pass.length < 6) {
    throw new Error("Le mot de passe doit contenir au moins 6 caractères.");
  }

  // 1. Check uniqueness in Firestore
  const available = await isUsernameAvailable(normalized);
  if (!available) {
    throw new Error(`Le nom d'utilisateur "${normalized}" est déjà pris. Veuillez en choisir un autre.`);
  }

  const accountEmail = optionalEmail?.trim() || `${normalized}@nlsmusic.app`;

  try {
    const res = await createUserWithEmailAndPassword(auth, accountEmail, pass);
    const fbUser = res.user;

    // Update display name
    await updateFirebaseProfile(fbUser, { displayName: rawUsername.trim() });

    const nowIso = new Date().toISOString();
    const userData: User = {
      id: fbUser.uid,
      name: rawUsername.trim(),
      username: normalized,
      email: accountEmail,
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${normalized}`,
      role: "user",
      favoriteGenre,
      createdAt: Date.now(),
    };

    // 2. Reserve username in Firestore
    try {
      const usernameRef = doc(db, "usernames", normalized);
      await setDoc(usernameRef, {
        username: normalized,
        userId: fbUser.uid,
        createdAt: nowIso,
      });
    } catch (uErr) {
      console.warn("Could not reserve username index doc:", uErr);
    }

    // 3. Save profile to Firestore
    try {
      const userRef = doc(db, "users", fbUser.uid);
      await setDoc(userRef, {
        userId: fbUser.uid,
        name: userData.name,
        username: normalized,
        email: userData.email,
        avatar: userData.avatar,
        role: "user",
        favoriteGenre: userData.favoriteGenre,
        createdAt: nowIso,
        updatedAt: nowIso,
      });
    } catch (fsErr) {
      console.warn("Could not write user to Firestore:", fsErr);
    }

    return userData;
  } catch (err: any) {
    console.warn("Firebase register notice:", err?.message || err);
    const code = err?.code || "";
    if (code === "auth/email-already-in-use") {
      throw new Error(`Le nom d'utilisateur "${normalized}" est déjà utilisé.`);
    }
    if (code === "auth/operation-not-allowed") {
      const customErr: any = new Error("auth/operation-not-allowed");
      customErr.code = "auth/operation-not-allowed";
      throw customErr;
    }
    throw new Error(err?.message || "Erreur lors de la création du compte.");
  }
}

// Logout
export async function logoutFirebase(): Promise<void> {
  await signOut(auth);
}

// -------------------------------------------------------------
// FIRESTORE SYNC: FAVORITES & PLAYLISTS
// -------------------------------------------------------------

// Load user favorites from Firestore
export async function fetchUserFavoritesFromFirestore(userId?: string): Promise<Track[]> {
  const uid = userId || auth.currentUser?.uid;
  if (!uid) return [];
  const path = `users/${uid}/favorites`;
  try {
    const colRef = collection(db, "users", uid, "favorites");
    const snap = await getDocs(colRef);
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: data.id || d.id,
        title: data.title || "Titre inconnu",
        artist: data.artist || "Artiste inconnu",
        duration: typeof data.duration === "number" ? data.duration : 0,
        durationFormatted: data.durationFormatted || "3:30",
        thumbnail: data.thumbnail || "",
        streamUrl: "",
        downloadUrl: "",
      } as Track;
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

// Save favorite track to Firestore
export async function saveFavoriteToFirestore(track: Track, userId?: string): Promise<void> {
  const uid = userId || auth.currentUser?.uid;
  if (!uid) return;
  const cleanId = track.id.replace(/[^a-zA-Z0-9_-]/g, "_");
  const path = `users/${uid}/favorites/${cleanId}`;
  try {
    const docRef = doc(db, "users", uid, "favorites", cleanId);
    await setDoc(docRef, {
      id: cleanId,
      title: track.title.slice(0, 300),
      artist: track.artist.slice(0, 200),
      duration: typeof track.duration === "number" ? track.duration : 0,
      durationFormatted: track.durationFormatted || "3:30",
      thumbnail: track.thumbnail || "",
      userId: uid,
      addedAt: new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

// Remove favorite track from Firestore
export async function removeFavoriteFromFirestore(trackId: string, userId?: string): Promise<void> {
  const uid = userId || auth.currentUser?.uid;
  if (!uid) return;
  const cleanId = trackId.replace(/[^a-zA-Z0-9_-]/g, "_");
  const path = `users/${uid}/favorites/${cleanId}`;
  try {
    const docRef = doc(db, "users", uid, "favorites", cleanId);
    await deleteDoc(docRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

// Load user playlists from Firestore
export async function fetchUserPlaylistsFromFirestore(userId?: string): Promise<Playlist[]> {
  const uid = userId || auth.currentUser?.uid;
  if (!uid) return [];
  const path = `users/${uid}/playlists`;
  try {
    const colRef = collection(db, "users", uid, "playlists");
    const snap = await getDocs(colRef);
    return snap.docs.map((d) => d.data() as Playlist);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

// Save playlist to Firestore
export async function savePlaylistToFirestore(playlist: Playlist, userId?: string): Promise<void> {
  const uid = userId || auth.currentUser?.uid;
  if (!uid) return;
  const cleanId = playlist.id.replace(/[^a-zA-Z0-9_-]/g, "_");
  const path = `users/${uid}/playlists/${cleanId}`;
  try {
    const docRef = doc(db, "users", uid, "playlists", cleanId);
    await setDoc(docRef, {
      id: cleanId,
      name: playlist.name.slice(0, 150),
      description: (playlist.description || "").slice(0, 500),
      userId: uid,
      trackIds: Array.isArray(playlist.trackIds) ? playlist.trackIds.slice(0, 500) : [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}
