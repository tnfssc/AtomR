import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";

import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import tsconfigPaths from "vite-tsconfig-paths";

const config = defineConfig({
	ssr: {
		noExternal: ["@convex-dev/better-auth"],
	},
	server: {
		watch: {
			ignored: [
				"**/.convex/**",
				"**/.output/**",
				"**/.pnpm-store/**",
			],
			usePolling: true,
			interval: 250,
		},
	},
	plugins: [
		devtools(),
		tsconfigPaths({ projects: ["./tsconfig.json"] }),
		tailwindcss(),
		tanstackStart(),
		nitro(),
		viteReact({
			babel: {
				plugins: ["babel-plugin-react-compiler"],
			},
		}),
		VitePWA({
			registerType: "autoUpdate",
			injectRegister: "auto",
			strategies: "generateSW",
			outDir: ".output/public",
			manifest: {
				name: "Atom Reaction",
				short_name: "Atom Reaction",
				description: "A chain reaction strategy game",
				theme_color: "#07070b",
				background_color: "#07070b",
				display: "standalone",
				start_url: "/",
				icons: [
					{
						src: "/logo192.png",
						sizes: "192x192",
						type: "image/png",
					},
					{
						src: "/logo512.png",
						sizes: "512x512",
						type: "image/png",
					},
					{
						src: "/logo512.png",
						sizes: "512x512",
						type: "image/png",
						purpose: "maskable",
					},
					{
						src: "/brand/atom-reaction-mark.svg",
						sizes: "any",
						type: "image/svg+xml",
						purpose: "any",
					},
				],
			},
			workbox: {
				globDirectory: ".output/public",
				globPatterns: ["**/*.{js,css,ico,png,svg,woff2}"],
				swDest: ".output/public/sw.js",
				navigateFallback: null,
				runtimeCaching: [
					{
						urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i,
						handler: "CacheFirst",
						options: {
							cacheName: "images-cache",
							expiration: {
								maxEntries: 50,
								maxAgeSeconds: 60 * 60 * 24 * 30,
							},
						},
					},
					{
						urlPattern: /\.(?:js|css|woff2?)$/i,
						handler: "StaleWhileRevalidate",
						options: {
							cacheName: "static-assets-cache",
							expiration: {
								maxEntries: 100,
								maxAgeSeconds: 60 * 60 * 24 * 7,
							},
						},
					},
				],
			},
		}),
	],
});

export default config;
