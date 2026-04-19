import type { QueryClient } from "@tanstack/react-query";
import {
	createRootRouteWithContext,
	HeadContent,
	Outlet,
	Scripts,
	useRouterState,
} from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import PwaRegistration from "../components/PwaRegistration";
import Sidebar from "../components/Sidebar";
import ConvexProvider from "../integrations/convex/provider";
import PostHogProvider from "../integrations/posthog/provider";
import appCss from "../styles.css?url";

interface MyRouterContext {
	queryClient: QueryClient;
}

const THEME_INIT_SCRIPT = `(function(){try{var stored=window.localStorage.getItem('theme');var mode=(stored==='light'||stored==='dark'||stored==='auto')?stored:'auto';var prefersDark=window.matchMedia('(prefers-color-scheme: dark)').matches;var resolved=mode==='auto'?(prefersDark?'dark':'light'):mode;var root=document.documentElement;root.classList.remove('light','dark');root.classList.add(resolved);if(mode==='auto'){root.removeAttribute('data-theme')}else{root.setAttribute('data-theme',mode)}root.style.colorScheme=resolved;}catch(e){}})();`;
const AppDevtools = import.meta.env.DEV
	? lazy(() => import("../components/AppDevtools"))
	: null;

export const Route = createRootRouteWithContext<MyRouterContext>()({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{ name: "viewport", content: "width=device-width, initial-scale=1" },
			{ title: "AtomR" },
			{ name: "apple-mobile-web-app-capable", content: "yes" },
			{
				name: "apple-mobile-web-app-status-bar-style",
				content: "black-translucent",
			},
			{ name: "apple-mobile-web-app-title", content: "AtomR" },
			{ name: "mobile-web-app-capable", content: "yes" },
			{ name: "theme-color", content: "#07070b" },
		],
		links: [
			{
				rel: "icon",
				type: "image/svg+xml",
				href: "/brand/atomr-mark.svg",
			},
			{
				rel: "manifest",
				href: "/manifest.webmanifest",
			},
			{
				rel: "stylesheet",
				href: appCss,
			},
		],
	}),
	shellComponent: RootDocument,
	component: RootLayout,
	notFoundComponent: () => <div>Not found</div>,
});

function RootLayout() {
	const matches = useRouterState({
		select: (state) => state.matches,
	});
	const isNoChrome = matches.some(
		(match) =>
			match.fullPath === "/sign-in" ||
			match.fullPath === "/sign-up" ||
			match.fullPath === "/play/ai" ||
			match.fullPath === "/play/ai-battle" ||
			match.fullPath === "/play/local" ||
			match.fullPath === "/play/training" ||
			match.fullPath === "/play/match/$matchId" ||
			match.fullPath === "/play/room/$code",
	);

	return (
		<>
			{!isNoChrome ? <Sidebar /> : null}
			<div
				className={
					!isNoChrome ? "min-w-0 pl-[274px] max-[960px]:pl-0" : undefined
				}
			>
				<Outlet />
			</div>
			{!isNoChrome && AppDevtools ? (
				<Suspense fallback={null}>
					<AppDevtools />
				</Suspense>
			) : null}
		</>
	);
}

function RootDocument({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				<script>{THEME_INIT_SCRIPT}</script>
				<HeadContent />
			</head>
			<body className="font-sans antialiased wrap-anywhere selection:bg-[rgba(79,184,178,0.24)]">
				<ConvexProvider>
					<PostHogProvider>
						<PwaRegistration />
						{children}
					</PostHogProvider>
				</ConvexProvider>
				<Scripts />
			</body>
		</html>
	);
}
