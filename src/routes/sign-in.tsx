import {
	createFileRoute,
	Link,
	redirect,
	useNavigate,
} from "@tanstack/react-router";
import { useEffect, useState } from "react";
import AtomRMark from "#/components/brand/AtomRMark";
import { authClient } from "#/lib/auth-client";
import { type AuthModes, getAuthModesFn } from "#/lib/auth-mode-fns";
import { getSessionFn } from "#/lib/session-fns";

export const Route = createFileRoute("/sign-in")({
	beforeLoad: async () => {
		const session = await getSessionFn();
		if (session?.user) {
			throw redirect({ to: "/play" });
		}
	},
	component: SignInPage,
});

const F = "'Oxanium', 'Segoe UI', sans-serif";

const inputStyle: React.CSSProperties = {
	width: "100%",
	boxSizing: "border-box",
	padding: "11px 14px",
	background: "rgba(255,255,255,0.04)",
	border: "1px solid rgba(255,255,255,0.1)",
	borderRadius: 10,
	color: "white",
	fontSize: 14,
	fontFamily: F,
	outline: "none",
};

const labelStyle: React.CSSProperties = {
	display: "block",
	fontSize: 11,
	letterSpacing: "0.1em",
	textTransform: "uppercase",
	color: "rgba(255,255,255,0.4)",
	marginBottom: 8,
};

function SignInPage() {
	const navigate = useNavigate();
	const [authModes, setAuthModes] = useState<AuthModes | null>(null);
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);
	const [googleLoading, setGoogleLoading] = useState(false);

	useEffect(() => {
		let cancelled = false;
		void getAuthModesFn()
			.then((modes) => {
				if (!cancelled) {
					setAuthModes(modes);
				}
			})
			.catch(() => {
				if (!cancelled) {
					setAuthModes({
						isLocal: false,
						googleEnabled: false,
						emailPasswordEnabled: false,
					});
				}
			});
		return () => {
			cancelled = true;
		};
	}, []);

	const googleEnabled = authModes?.googleEnabled ?? false;
	const emailPasswordEnabled = authModes?.emailPasswordEnabled ?? false;

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");
		setLoading(true);
		try {
			const result = await authClient.signIn.email({ email, password });
			if (result.error) {
				setError(result.error.message ?? "Sign in failed");
			} else {
				await navigate({ to: "/play" });
			}
		} catch {
			setError("An unexpected error occurred");
		} finally {
			setLoading(false);
		}
	};

	const handleGoogleSignIn = async () => {
		setError("");
		setGoogleLoading(true);
		try {
			const result = await authClient.signIn.social({
				provider: "google",
				callbackURL: "/play",
			});
			if (result.error) {
				setError(result.error.message ?? "Google sign in failed");
			}
		} catch {
			setError("An unexpected error occurred");
		} finally {
			setGoogleLoading(false);
		}
	};

	return (
		<div
			style={{
				minHeight: "100dvh",
				background: "#07070b",
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				justifyContent: "center",
				fontFamily: F,
				color: "white",
				padding: 24,
				position: "relative",
			}}
		>
			{/* Dot-grid */}
			<div
				style={{
					position: "fixed",
					inset: 0,
					pointerEvents: "none",
					zIndex: 0,
					backgroundImage:
						"radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)",
					backgroundSize: "28px 28px",
				}}
			/>
			{/* Glow */}
			<div
				style={{
					position: "fixed",
					top: "-20%",
					left: "50%",
					transform: "translateX(-50%)",
					width: 600,
					height: 600,
					background:
						"radial-gradient(circle, rgba(58,204,224,0.06) 0%, transparent 70%)",
					borderRadius: "50%",
					pointerEvents: "none",
					zIndex: 0,
				}}
			/>

			<div
				style={{
					position: "relative",
					zIndex: 1,
					width: "100%",
					maxWidth: 400,
				}}
			>
				{/* Logo */}
				<div style={{ textAlign: "center", marginBottom: 44 }}>
					<Link
						to="/"
						style={{
							textDecoration: "none",
							display: "inline-flex",
							flexDirection: "column",
							alignItems: "center",
							gap: 12,
						}}
					>
						<AtomRMark size={40} title="AtomR logo" />
						<span
							style={{
								fontSize: 12,
								fontWeight: 700,
								letterSpacing: "0.18em",
								color: "rgba(255,255,255,0.5)",
								textTransform: "uppercase",
							}}
						>
							AtomR
						</span>
					</Link>
				</div>

				{/* Card */}
				<div
					style={{
						border: "1px solid rgba(255,255,255,0.08)",
						borderRadius: 24,
						background: "rgba(255,255,255,0.03)",
						padding: 32,
					}}
				>
					<h1
						style={{
							margin: "0 0 6px",
							fontSize: 22,
							fontWeight: 700,
							color: "white",
							letterSpacing: "-0.01em",
						}}
					>
						Sign in
					</h1>
					<p
						style={{
							margin: "0 0 28px",
							fontSize: 13,
							color: "rgba(255,255,255,0.38)",
						}}
					>
						{googleEnabled
							? "Continue with your Google account"
							: emailPasswordEnabled
								? "Enter your credentials to continue"
								: "Auth is unavailable right now"}
					</p>

					{authModes == null ? (
						<div style={{ color: "rgba(255,255,255,0.45)", fontSize: 13 }}>
							Loading auth options…
						</div>
					) : googleEnabled ? (
						<div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
							<button
								type="button"
								disabled={googleLoading}
								onClick={handleGoogleSignIn}
								style={{
									padding: "13px",
									background: googleLoading
										? "rgba(255,255,255,0.04)"
										: "rgba(58,204,224,0.14)",
									border: "1px solid rgba(58,204,224,0.35)",
									borderRadius: 12,
									color: "white",
									fontSize: 13,
									fontWeight: 700,
									letterSpacing: "0.08em",
									textTransform: "uppercase",
									cursor: googleLoading ? "not-allowed" : "pointer",
									fontFamily: F,
									opacity: googleLoading ? 0.6 : 1,
								}}
							>
								{googleLoading ? "CONNECTING…" : "CONTINUE WITH GOOGLE"}
							</button>
							{error && (
								<div
									style={{
										padding: "10px 14px",
										background: "rgba(224,92,58,0.1)",
										border: "1px solid rgba(224,92,58,0.25)",
										borderRadius: 10,
										fontSize: 13,
										color: "#e87055",
									}}
								>
									{error}
								</div>
							)}
						</div>
					) : emailPasswordEnabled ? (
						<form
							onSubmit={handleSubmit}
							style={{ display: "flex", flexDirection: "column", gap: 18 }}
						>
							<div>
								<label htmlFor="email" style={labelStyle}>
									Email
								</label>
								<input
									id="email"
									type="email"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									required
									autoComplete="email"
									style={inputStyle}
								/>
							</div>
							<div>
								<label htmlFor="password" style={labelStyle}>
									Password
								</label>
								<input
									id="password"
									type="password"
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									required
									autoComplete="current-password"
									minLength={8}
									style={inputStyle}
								/>
							</div>

							{error && (
								<div
									style={{
										padding: "10px 14px",
										background: "rgba(224,92,58,0.1)",
										border: "1px solid rgba(224,92,58,0.25)",
										borderRadius: 10,
										fontSize: 13,
										color: "#e87055",
									}}
								>
									{error}
								</div>
							)}

							<button
								type="submit"
								disabled={loading}
								style={{
									marginTop: 4,
									padding: "13px",
									background: loading
										? "rgba(255,255,255,0.04)"
										: "rgba(224,92,58,0.14)",
									border: "1px solid rgba(224,92,58,0.35)",
									borderRadius: 12,
									color: "white",
									fontSize: 13,
									fontWeight: 700,
									letterSpacing: "0.1em",
									textTransform: "uppercase",
									cursor: loading ? "not-allowed" : "pointer",
									fontFamily: F,
									opacity: loading ? 0.6 : 1,
								}}
							>
								{loading ? "SIGNING IN…" : "SIGN IN →"}
							</button>
						</form>
					) : (
						<div
							style={{
								padding: "10px 14px",
								background: "rgba(224,92,58,0.1)",
								border: "1px solid rgba(224,92,58,0.25)",
								borderRadius: 10,
								fontSize: 13,
								color: "#e87055",
							}}
						>
							No sign-in method is configured.
						</div>
					)}
				</div>

				{emailPasswordEnabled ? (
					<p
						style={{
							textAlign: "center",
							marginTop: 22,
							fontSize: 13,
							color: "rgba(255,255,255,0.3)",
						}}
					>
						Don't have an account?{" "}
						<Link
							to="/sign-up"
							style={{
								color: "rgba(255,255,255,0.6)",
								textDecoration: "none",
								fontWeight: 600,
							}}
						>
							Sign up
						</Link>
					</p>
				) : null}

				<p style={{ textAlign: "center", marginTop: 10 }}>
					<Link
						to="/"
						style={{
							fontSize: 11,
							letterSpacing: "0.08em",
							textTransform: "uppercase",
							color: "rgba(255,255,255,0.2)",
							textDecoration: "none",
						}}
					>
						← Back to home
					</Link>
				</p>
			</div>
		</div>
	);
}
