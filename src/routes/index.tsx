import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { ArrowRight } from "lucide-react";
import { useEffect } from "react";
import { authClient } from "#/lib/auth-client";
import { api } from "../../convex/_generated/api";

export const Route = createFileRoute("/")({
	head: () => ({
		meta: [
			{ title: "AtomR" },
			{
				name: "description",
				content:
					"Deterministic board tactics with cascading orb explosions. Local, online, CPU, and training modes.",
			},
		],
	}),
	component: HomePage,
});

const F = "'Oxanium', 'Segoe UI', sans-serif";

function HomePage() {
	const navigate = useNavigate();
	const { data: session } = authClient.useSession();
	const activeMatch = useQuery(
		api.online.getMyActiveMatch,
		session?.user ? {} : "skip",
	);

	useEffect(() => {
		if (!activeMatch?.matchId) return;
		void navigate({
			to: "/play/match/$matchId",
			params: { matchId: activeMatch.matchId },
			replace: true,
		});
	}, [activeMatch?.matchId, navigate]);

	if (activeMatch?.matchId) {
		return (
			<main
				style={{
					background: "#07070b",
					minHeight: "100dvh",
					display: "grid",
					placeItems: "center",
					fontFamily: F,
					color: "rgba(255,255,255,0.68)",
					letterSpacing: "0.2em",
					textTransform: "uppercase",
					fontSize: 12,
				}}
			>
				Rejoining active match…
			</main>
		);
	}

	return (
		<main
			className="relative min-h-[100dvh] overflow-x-hidden bg-[#07070b] text-white max-[960px]:min-h-0"
			style={{ fontFamily: F }}
		>
			<div
				className="pointer-events-none fixed inset-0 z-0"
				style={{
					backgroundImage:
						"radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)",
					backgroundSize: "28px 28px",
				}}
			/>
			<div className="pointer-events-none fixed top-[-18%] left-[-12%] z-0 h-[680px] w-[680px] rounded-full bg-[radial-gradient(circle,rgba(58,204,224,0.08)_0%,transparent_68%)]" />
			<div className="pointer-events-none fixed top-[-12%] right-[-14%] z-0 h-[560px] w-[560px] rounded-full bg-[radial-gradient(circle,rgba(224,92,58,0.08)_0%,transparent_68%)]" />

			<div className="relative z-10 mx-auto flex min-h-[100dvh] max-w-[1220px] flex-col justify-center px-4 py-6 sm:px-6 sm:py-8 max-[960px]:min-h-0">
				<section className="max-w-[780px]">
					<div>
						<div className="flex items-center justify-between gap-4">
							<Link
								to="/play"
								className="hidden h-11 items-center justify-center rounded-full bg-white/[0.06] px-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/82 no-underline transition hover:bg-white/[0.1] lg:inline-flex"
							>
								Play
							</Link>
						</div>

						<h1 className="max-w-[8ch] text-[3.2rem] leading-[0.88] font-semibold tracking-[-0.08em] text-white sm:text-[4.8rem] lg:text-[6.1rem]">
							Turn-based orb tactics.
						</h1>
						<p className="mt-4 max-w-[34ch] text-[15px] leading-7 text-white/56 sm:text-[16px]">
							Place orbs. Capture cells. Clear the board.
						</p>

						<div className="mt-7 flex flex-wrap gap-3">
							<Link
								to="/play"
								className="inline-flex h-12 items-center justify-center gap-2 rounded-[18px] bg-[rgba(224,92,58,0.14)] px-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-white no-underline transition hover:bg-[rgba(224,92,58,0.2)]"
							>
								Play
								<ArrowRight size={15} strokeWidth={1.9} />
							</Link>
							<Link
								to="/play/online"
								className="inline-flex h-12 items-center justify-center rounded-[18px] bg-white/[0.03] px-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/68 no-underline transition hover:bg-white/[0.05] hover:text-white/82"
							>
								Live Match
							</Link>
						</div>
					</div>
				</section>
			</div>
		</main>
	);
}
