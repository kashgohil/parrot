const API_BASE_URL = "http://localhost:3001";

export interface AuthUser {
	id: string;
	email: string;
	name: string | null;
	onboarding_completed: boolean;
	setup_mode: string | null;
	subscription_tier: string;
	subscription_status: string | null;
}

export interface AuthResponse {
	user: AuthUser;
	token: string;
}

class ApiClient {
	private token: string | null = null;

	constructor() {
		this.token = localStorage.getItem("auth_token");
	}

	setToken(token: string | null) {
		this.token = token;
		if (token) {
			localStorage.setItem("auth_token", token);
		} else {
			localStorage.removeItem("auth_token");
		}
	}

	getToken(): string | null {
		return this.token;
	}

	private async request<T>(
		path: string,
		options: RequestInit = {},
	): Promise<T> {
		const headers: Record<string, string> = {
			"Content-Type": "application/json",
			...(options.headers as Record<string, string>),
		};

		if (this.token) {
			headers["Authorization"] = `Bearer ${this.token}`;
		}

		const response = await fetch(`${API_BASE_URL}${path}`, {
			...options,
			headers,
		});

		if (!response.ok) {
			const error = await response
				.json()
				.catch(() => ({ error: "Request failed" }));
			throw new Error(error.error || "Request failed");
		}

		return response.json();
	}

	async signup(
		email: string,
		password: string,
		name?: string,
	): Promise<AuthResponse> {
		const response = await this.request<AuthResponse>("/api/auth/signup", {
			method: "POST",
			body: JSON.stringify({ email, password, name }),
		});
		this.setToken(response.token);
		return response;
	}

	async login(email: string, password: string): Promise<AuthResponse> {
		const response = await this.request<AuthResponse>("/api/auth/login", {
			method: "POST",
			body: JSON.stringify({ email, password }),
		});
		this.setToken(response.token);
		return response;
	}

	async googleAuth(idToken: string): Promise<AuthResponse> {
		const response = await this.request<AuthResponse>("/api/auth/google", {
			method: "POST",
			body: JSON.stringify({ id_token: idToken }),
		});
		this.setToken(response.token);
		return response;
	}

	getGoogleOAuthUrl(state: string): string {
		return `${API_BASE_URL}/api/auth/google/redirect?state=${encodeURIComponent(state)}`;
	}

	async pollGoogleAuth(
		state: string,
	): Promise<{ status: string; user?: AuthUser; token?: string }> {
		const response = await fetch(
			`${API_BASE_URL}/api/auth/google/poll?state=${encodeURIComponent(state)}`,
		);
		if (!response.ok) {
			throw new Error("Poll failed");
		}
		const data = (await response.json()) as {
			status: string;
			user?: AuthUser;
			token?: string;
		};
		if (data.status === "complete" && data.token) {
			this.setToken(data.token);
		}
		return data;
	}

	async getMe(): Promise<{ user: AuthUser }> {
		return this.request<{ user: AuthUser }>("/api/auth/me");
	}

	async updateOnboarding(
		completed: boolean,
		setupMode?: string,
	): Promise<{ user: AuthUser }> {
		return this.request<{ user: AuthUser }>("/api/auth/onboarding", {
			method: "POST",
			body: JSON.stringify({ completed, setup_mode: setupMode }),
		});
	}

	async getSubscriptionStatus(): Promise<any> {
		return this.request("/api/subscription/status");
	}

	async createCheckoutSession(
		tier: string,
		billingPeriod?: "monthly" | "annual",
	): Promise<{ url: string }> {
		return this.request("/api/subscription/checkout", {
			method: "POST",
			body: JSON.stringify({ tier, billingPeriod }),
		});
	}

	async logout(): Promise<void> {
		try {
			await this.request("/api/auth/logout", { method: "POST" });
		} finally {
			this.setToken(null);
		}
	}
}

export const api = new ApiClient();
