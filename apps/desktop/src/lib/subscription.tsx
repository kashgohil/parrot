import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useState,
	type ReactNode,
} from "react";
import { api } from "./api";

interface SubscriptionStatus {
	tier: string;
	status: string | null;
	expiresAt: string | null;
	usage: {
		month: string;
		transcriptionMinutes: number;
		cleanupRequests: number;
	};
	limits: {
		transcriptionMinutes: number | null;
		cleanupRequests: number | null;
	};
}

interface SubscriptionContextType {
	subscription: SubscriptionStatus | null;
	isLoading: boolean;
	refresh: () => Promise<void>;
	canUseFeature: (feature: "transcription" | "cleanup" | "sync") => boolean;
	isApproachingLimit: () => boolean;
}

const SubscriptionContext = createContext<SubscriptionContextType | null>(null);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
	const [subscription, setSubscription] = useState<SubscriptionStatus | null>(
		null,
	);
	const [isLoading, setIsLoading] = useState(true);

	const refresh = useCallback(async () => {
		try {
			const data = await api.getSubscriptionStatus();
			setSubscription(data);
		} catch {
			// Not logged in or API unavailable
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		refresh();
		const interval = setInterval(refresh, 5 * 60 * 1000); // refresh every 5 min
		return () => clearInterval(interval);
	}, [refresh]);

	const canUseFeature = useCallback(
		(feature: "transcription" | "cleanup" | "sync") => {
			if (!subscription) return true; // allow offline/local usage
			const tier = subscription.tier;
			if (feature === "sync") {
				return ["byok", "managed", "teams", "enterprise"].includes(tier);
			}
			if (tier === "local") return true; // local mode uses local providers
			if (!subscription.limits.transcriptionMinutes) return true; // unlimited
			if (feature === "transcription") {
				return (
					subscription.usage.transcriptionMinutes <
					(subscription.limits.transcriptionMinutes || Infinity)
				);
			}
			if (feature === "cleanup") {
				return (
					subscription.usage.cleanupRequests <
					(subscription.limits.cleanupRequests || Infinity)
				);
			}
			return true;
		},
		[subscription],
	);

	const isApproachingLimit = useCallback(() => {
		if (!subscription || !subscription.limits.transcriptionMinutes)
			return false;
		return (
			subscription.usage.transcriptionMinutes >=
			subscription.limits.transcriptionMinutes * 0.8
		);
	}, [subscription]);

	return (
		<SubscriptionContext.Provider
			value={{
				subscription,
				isLoading,
				refresh,
				canUseFeature,
				isApproachingLimit,
			}}
		>
			{children}
		</SubscriptionContext.Provider>
	);
}

export function useSubscription() {
	const context = useContext(SubscriptionContext);
	if (!context) {
		throw new Error(
			"useSubscription must be used within a SubscriptionProvider",
		);
	}
	return context;
}
