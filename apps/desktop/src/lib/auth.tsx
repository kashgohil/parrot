import { invoke } from "@tauri-apps/api/core";
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useState,
	type ReactNode,
} from "react";

interface LocalUser {
	name: string;
	email: string;
	onboarding_completed: boolean;
}

/** Local-only app user (on-device profile, no cloud account). */
export interface User {
	email: string;
	name: string | null;
	onboarding_completed: boolean;
}

interface AuthContextType {
	user: User | null;
	isLoading: boolean;
	isAuthenticated: boolean;
	refreshUser: () => Promise<void>;
	completeOnboarding: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
	const [user, setUser] = useState<User | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	const refreshUser = useCallback(async () => {
		setIsLoading(true);
		try {
			// Drop leftover cloud session tokens from older builds.
			try {
				localStorage.removeItem("auth_token");
			} catch {
				/* ignore */
			}

			// Heal any leftover cloud install to local-only.
			await invoke("set_setting", { key: "setup_mode", value: "local" }).catch(
				() => {},
			);

			try {
				const localUser = await invoke<LocalUser>("get_local_user");
				setUser({
					email: localUser.email,
					name: localUser.name || null,
					onboarding_completed: localUser.onboarding_completed,
				});
			} catch {
				// No local profile yet — first-run onboarding will create one.
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

	const completeOnboarding = async () => {
		await invoke("complete_local_onboarding");
		setUser((prev) =>
			prev ? { ...prev, onboarding_completed: true } : prev,
		);
	};

	return (
		<AuthContext.Provider
			value={{
				user,
				isLoading,
				isAuthenticated: !!user,
				refreshUser,
				completeOnboarding,
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
