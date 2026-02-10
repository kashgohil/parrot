import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { invoke } from "@tauri-apps/api/core";
import { api } from "./api";

interface LocalUser {
  name: string;
  email: string;
  onboarding_completed: boolean;
}

// Combined user type that works for both cloud and local mode
export interface User {
  id?: string;
  email: string;
  name: string | null;
  onboarding_completed: boolean;
  setup_mode: string | null;
  subscription_tier?: string;
  subscription_status?: string | null;
  isLocal: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  justLoggedIn: boolean;
  clearJustLoggedIn: () => void;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name?: string) => Promise<void>;
  googleAuth: (idToken: string) => Promise<void>;
  logout: () => Promise<void>;
  updateOnboarding: (completed: boolean, setupMode?: string) => Promise<void>;
  refreshUser: () => Promise<void>;
  setupMode: string | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [justLoggedIn, setJustLoggedIn] = useState(false);
  const [setupMode, setSetupMode] = useState<string | null>(null);

  // Check setup mode on mount
  useEffect(() => {
    const checkSetupMode = async () => {
      try {
        const mode = await invoke<string | null>("get_setting", { key: "setup_mode" });
        setSetupMode(mode);
      } catch {
        setSetupMode(null);
      }
    };
    checkSetupMode();
  }, []);

  const refreshUser = useCallback(async () => {
    setIsLoading(true);
    
    try {
      // First check if we have an API token (cloud mode)
      if (api.getToken()) {
        try {
          const { user: apiUser } = await api.getMe();
          setUser({
            ...apiUser,
            isLocal: false,
          });
          setSetupMode(apiUser.setup_mode);
          setIsLoading(false);
          return;
        } catch {
          // Token invalid, clear it
          api.setToken(null);
        }
      }
      
      // No API token - check for local user (local mode)
      const mode = await invoke<string | null>("get_setting", { key: "setup_mode" });
      
      if (mode === "local") {
        try {
          const localUser = await invoke<LocalUser>("get_local_user");
          setUser({
            id: "local",
            email: localUser.email,
            name: localUser.name || null,
            onboarding_completed: localUser.onboarding_completed,
            setup_mode: "local",
            subscription_tier: "local",
            subscription_status: "active",
            isLocal: true,
          });
        } catch {
          // No local user yet, that's ok
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (email: string, password: string) => {
    const { user: apiUser } = await api.login(email, password);
    setJustLoggedIn(true);
    setUser({
      ...apiUser,
      isLocal: false,
    });
    setSetupMode(apiUser.setup_mode);
  };

  const signup = async (email: string, password: string, name?: string) => {
    const { user: apiUser } = await api.signup(email, password, name);
    setJustLoggedIn(true);
    setUser({
      ...apiUser,
      isLocal: false,
    });
    setSetupMode(apiUser.setup_mode);
  };

  const googleAuth = async (idToken: string) => {
    const { user: apiUser } = await api.googleAuth(idToken);
    setJustLoggedIn(true);
    setUser({
      ...apiUser,
      isLocal: false,
    });
    setSetupMode(apiUser.setup_mode);
  };

  const logout = async () => {
    await api.logout();
    setUser(null);
  };

  const updateOnboarding = async (completed: boolean, newSetupMode?: string) => {
    if (user?.isLocal) {
      // For local users, use Tauri command
      await invoke("complete_local_onboarding");
      setUser(prev => prev ? { ...prev, onboarding_completed: true } : null);
    } else {
      // For cloud users, use API
      const { user: apiUser } = await api.updateOnboarding(completed, newSetupMode);
      setUser({
        ...apiUser,
        isLocal: false,
      });
    }
    
    if (newSetupMode) {
      setSetupMode(newSetupMode);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        justLoggedIn,
        clearJustLoggedIn: () => setJustLoggedIn(false),
        login,
        signup,
        googleAuth,
        logout,
        updateOnboarding,
        refreshUser,
        setupMode,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
