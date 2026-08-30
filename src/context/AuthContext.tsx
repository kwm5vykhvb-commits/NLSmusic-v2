import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { User, AuthResponse } from "../types";
import { onAuthStateChanged } from "firebase/auth";
import {
  auth,
  signInWithGoogle,
  signInWithIdentifier,
  registerWithUsername,
  isUsernameAvailable,
  logoutFirebase,
  testFirestoreConnection,
  mapFirebaseUser,
} from "../services/firebase";
import {
  getCurrentUser,
  loginUser,
  registerUser,
  checkServerUsername,
  logoutUser,
  updateUserProfile,
  getStoredAuthToken,
} from "../services/api";

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAuthModalOpen: boolean;
  authModalInitialTab: "login" | "register";
  openAuthModal: (tab?: "login" | "register") => void;
  closeAuthModal: () => void;
  login: (identifier: string, pass: string) => Promise<AuthResponse>;
  loginWithGoogle: () => Promise<AuthResponse>;
  register: (username: string, pass: string, genre?: string, email?: string) => Promise<AuthResponse>;
  checkUsername: (username: string) => Promise<boolean>;
  logout: () => Promise<void>;
  updateProfile: (data: { name?: string; favoriteGenre?: string; avatar?: string }) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalInitialTab, setAuthModalInitialTab] = useState<"login" | "register">("login");

  // Initialize Firebase Auth listener & Test connection
  useEffect(() => {
    let isMounted = true;

    // Test Firestore connectivity in background
    testFirestoreConnection().catch(() => {});

    // Listen for Firebase Auth state changes
    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      if (!isMounted) return;
      if (fbUser) {
        setUser(mapFirebaseUser(fbUser));
        setIsLoading(false);
      } else {
        // Fallback: check stored local server token
        const token = getStoredAuthToken();
        if (token) {
          getCurrentUser()
            .then((u) => {
              if (isMounted) {
                setUser(u);
                setIsLoading(false);
              }
            })
            .catch(() => {
              if (isMounted) {
                setUser(null);
                setIsLoading(false);
              }
            });
        } else {
          setUser(null);
          setIsLoading(false);
        }
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const openAuthModal = useCallback((tab: "login" | "register" = "login") => {
    setAuthModalInitialTab(tab);
    setIsAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setIsAuthModalOpen(false);
  }, []);

  const loginWithGoogleHandler = useCallback(async (): Promise<AuthResponse> => {
    try {
      const u = await signInWithGoogle();
      if (!u) {
        // User closed or cancelled the popup without error
        return { success: false };
      }
      setUser(u);
      setIsAuthModalOpen(false);
      return { success: true, user: u };
    } catch (err: any) {
      return { success: false, error: err?.message || "Erreur de connexion Google" };
    }
  }, []);

  const login = useCallback(async (identifier: string, pass: string): Promise<AuthResponse> => {
    try {
      // 1. Try Firebase Auth with identifier (username or email)
      const u = await signInWithIdentifier(identifier, pass);
      setUser(u);
      setIsAuthModalOpen(false);
      return { success: true, user: u };
    } catch (err: any) {
      // 2. Seamlessly authenticate with backend server
      const res = await loginUser(identifier, pass);
      if (res.success && res.user) {
        setUser(res.user);
        setIsAuthModalOpen(false);
        return res;
      }
      const isOpNotAllowed =
        err?.code === "auth/operation-not-allowed" ||
        err?.message?.includes("operation-not-allowed");
      const errorMsg =
        res.error ||
        (isOpNotAllowed ? "Nom d'utilisateur ou mot de passe incorrect." : err?.message) ||
        "Identifiants invalides.";
      return { success: false, error: errorMsg };
    }
  }, []);

  const checkUsername = useCallback(async (username: string): Promise<boolean> => {
    const isFbAvail = await isUsernameAvailable(username);
    if (!isFbAvail) return false;
    const isSrvAvail = await checkServerUsername(username);
    return isSrvAvail;
  }, []);

  const register = useCallback(
    async (
      username: string,
      pass: string,
      genre?: string,
      email?: string
    ): Promise<AuthResponse> => {
      try {
        // 1. Try Firebase Auth with unique username
        const u = await registerWithUsername(username, pass, genre, email);
        setUser(u);
        setIsAuthModalOpen(false);
        return { success: true, user: u };
      } catch (err: any) {
        // 2. Seamless fallback to server register
        const res = await registerUser(username, pass, genre, email);
        if (res.success && res.user) {
          setUser(res.user);
          setIsAuthModalOpen(false);
          return res;
        }
        const isOpNotAllowed =
          err?.code === "auth/operation-not-allowed" ||
          err?.message?.includes("operation-not-allowed");
        const errorMsg =
          res.error ||
          (isOpNotAllowed ? "Impossible de créer le compte. Veuillez réessayer." : err?.message) ||
          "Échec de l'inscription.";
        return { success: false, error: errorMsg };
      }
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      await logoutFirebase();
    } catch {}
    try {
      await logoutUser();
    } catch {}
    setUser(null);
  }, []);

  const updateProfile = useCallback(
    async (data: { name?: string; favoriteGenre?: string; avatar?: string }): Promise<boolean> => {
      const updated = await updateUserProfile(data);
      if (updated) {
        setUser(updated);
        return true;
      }
      if (user) {
        setUser({ ...user, ...data });
        return true;
      }
      return false;
    },
    [user]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        isAuthModalOpen,
        authModalInitialTab,
        openAuthModal,
        closeAuthModal,
        login,
        loginWithGoogle: loginWithGoogleHandler,
        register,
        checkUsername,
        logout,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
