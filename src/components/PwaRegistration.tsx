import { useEffect } from "react";

export default function PwaRegistration() {
	useEffect(() => {
		if (
			!import.meta.env.PROD ||
			typeof window === "undefined" ||
			!("serviceWorker" in navigator)
		) {
			return;
		}

		const register = async () => {
			try {
				await navigator.serviceWorker.register("/sw.js", {
					scope: "/",
				});
			} catch (error) {
				if (import.meta.env.DEV) {
					console.warn("Service worker registration failed.", error);
				}
			}
		};

		if (document.readyState === "complete") {
			void register();
			return;
		}

		window.addEventListener("load", register, { once: true });

		return () => {
			window.removeEventListener("load", register);
		};
	}, []);

	return null;
}
