import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { createFileRoute, Link } from "@tanstack/react-router";
import { openUrl } from "@tauri-apps/plugin-opener";
import { useRef, useState } from "react";
import { Mail, Lock, ArrowRight, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_auth/login")({
	component: LoginPage,
});

function LoginPage() {
	const { login } = useAuth();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");
		setIsSubmitting(true);

		try {
			await login(email, password);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Login failed");
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<div className="w-full max-w-sm mx-auto">
			<div className="text-center mb-8">
				<h2 className="text-2xl font-bold text-foreground mb-2">Welcome back</h2>
				<p className="text-sm text-muted-foreground">
					Sign in to continue to Parrot
				</p>
			</div>

			<form onSubmit={handleSubmit} className="space-y-5">
				{error && (
					<div className="p-3.5 rounded-xl border border-red-200 bg-red-50 text-sm text-red-600">
						{error}
					</div>
				)}

				<div className="space-y-2">
					<Label htmlFor="email" className="text-sm font-medium">
						Email
					</Label>
					<div className="relative">
						<Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
						<Input
							id="email"
							type="email"
							placeholder="you@example.com"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							required
							autoFocus
							className="pl-10 h-12"
						/>
					</div>
				</div>

				<div className="space-y-2">
					<Label htmlFor="password" className="text-sm font-medium">
						Password
					</Label>
					<div className="relative">
						<Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
						<Input
							id="password"
							type="password"
							placeholder="Your password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							required
							className="pl-10 h-12"
						/>
					</div>
				</div>

				<Button 
					type="submit" 
					className="w-full h-12 text-base"
					disabled={isSubmitting}
				>
					{isSubmitting ? (
						<>
							<Loader2 className="w-4 h-4 mr-2 animate-spin" />
							Signing in...
						</>
					) : (
						<>
							Sign in
							<ArrowRight className="w-4 h-4 ml-2" />
						</>
					)}
				</Button>

				<div className="relative py-2">
					<div className="absolute inset-0 flex items-center">
						<div className="w-full border-t border-border" />
					</div>
					<div className="relative flex justify-center text-xs uppercase">
						<span className="bg-background px-2 text-muted-foreground">Or continue with</span>
					</div>
				</div>

				<GoogleSignInButton />
			</form>

			<p className="mt-8 text-center text-sm text-muted-foreground">
				Don't have an account?{" "}
				<Link
					to="/signup"
					className="font-semibold text-primary hover:text-primary/80 transition-colors"
				>
					Sign up
				</Link>
			</p>
		</div>
	);
}

function GoogleSignInButton() {
	const [isLoading, setIsLoading] = useState(false);
	const pollingRef = useRef<ReturnType<typeof setInterval> | undefined>(
		undefined,
	);

	const handleGoogleSignIn = async () => {
		setIsLoading(true);
		try {
			const state = crypto.randomUUID();
			const url = api.getGoogleOAuthUrl(state);
			await openUrl(url);

			// Poll for result
			pollingRef.current = setInterval(async () => {
				try {
					const result = await api.pollGoogleAuth(state);
					if (result.status === "complete" && result.user) {
						clearInterval(pollingRef.current);
						setIsLoading(false);
						// Trigger auth context refresh
						window.location.reload();
					}
				} catch {
					// Keep polling
				}
			}, 1500);

			// Stop polling after 5 minutes
			setTimeout(() => {
				clearInterval(pollingRef.current);
				setIsLoading(false);
			}, 5 * 60 * 1000);
		} catch (err) {
			console.error("Google auth failed:", err);
			setIsLoading(false);
		}
	};

	return (
		<Button
			type="button"
			variant="outline"
			className="w-full h-12 gap-3 font-medium"
			onClick={handleGoogleSignIn}
			disabled={isLoading}
		>
			{isLoading ? (
				<Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
			) : (
				<svg className="w-5 h-5" viewBox="0 0 24 24">
					<path
						fill="#4285F4"
						d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
					/>
					<path
						fill="#34A853"
						d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
					/>
					<path
						fill="#FBBC05"
						d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
					/>
					<path
						fill="#EA4335"
						d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
					/>
				</svg>
			)}
			{isLoading ? "Connecting..." : "Continue with Google"}
		</Button>
	);
}
