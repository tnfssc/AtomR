import {
	createFileRoute,
	Link,
	Outlet,
	useRouterState,
} from "@tanstack/react-router";
import {
	Bot,
	BrainCircuit,
	ChevronRight,
	Monitor,
	Swords,
	Wifi,
} from "lucide-react";

export const Route = createFileRoute("/play")({
	head: () => ({
		meta: [
			{ title: "AtomR" },
			{ name: "description", content: "Choose a mode and launch." },
		],
	}),
	component: PlayRoute,
});

const MODES = [
	{
		to: "/play/local" as const,
		label: "Offline",
		title: "Local",
		copy: "Same device. Shared turns.",
		icon: Monitor,
		tint: "rgba(255,255,255,0.08)",
		glow: "rgba(255,255,255,0.08)",
	},
	{
		to: "/play/online" as const,
		label: "Realtime",
		title: "Online",
		copy: "Quick match or private room.",
		icon: Wifi,
		tint: "rgba(224,92,58,0.14)",
		glow: "rgba(224,92,58,0.18)",
	},
	{
		to: "/play/training" as const,
		label: "Coach",
		title: "Training",
		copy: "Ghost hints every turn.",
		icon: BrainCircuit,
		tint: "rgba(116,188,255,0.14)",
		glow: "rgba(116,188,255,0.18)",
	},
	{
		to: "/play/ai" as const,
		label: "Solo",
		title: "AI Game",
		copy: "Play the CPU. Tune the heat.",
		icon: Bot,
		tint: "rgba(101,214,114,0.14)",
		glow: "rgba(101,214,114,0.18)",
	},
	{
		to: "/play/ai-battle" as const,
		label: "Sim",
		title: "AI Battle",
		copy: "Let bots run the board.",
		icon: Swords,
		tint: "rgba(255,255,255,0.08)",
		glow: "rgba(255,255,255,0.12)",
	},
] as const;

function PlayRoute() {
	const pathname = useRouterState({
		select: (state) => state.location.pathname,
	});

	return pathname === "/play" ? <PlayPage /> : <Outlet />;
}

function PlayPage() {
	return (
		<main
			className="min-h-[100dvh] px-4 py-4 sm:px-6 sm:py-6 max-[960px]:min-h-0"
			style={{
				background:
					"radial-gradient(circle at top, rgba(58,204,224,0.08), transparent 24%), radial-gradient(circle at 85% 18%, rgba(224,92,58,0.08), transparent 18%), #07070b",
				fontFamily: "'Oxanium', 'Segoe UI', sans-serif",
			}}
		>
			<div className="mx-auto flex max-w-[1180px] flex-col gap-4">
				<div className="flex items-end justify-between gap-4 px-1">
					<div>
						<p className="text-[10px] uppercase tracking-[0.42em] text-white/28">
							Play
						</p>
						<h1 className="mt-2 text-[2.05rem] leading-[0.92] font-semibold tracking-[-0.07em] text-white sm:text-[2.7rem]">
							Pick a mode.
						</h1>
					</div>
					<p className="hidden max-w-[22ch] text-right text-[12px] leading-5 text-white/38 md:block">
						Five ways in. One tap to board.
					</p>
				</div>

				<section className="flex flex-col">
					{MODES.map(({ to, label, title, copy, icon: Icon, tint, glow }) => (
						<Link
							key={to}
							to={to}
							className="group relative overflow-hidden no-underline"
						>
							<div
								className="pointer-events-none absolute inset-0 opacity-0 transition duration-300 group-hover:opacity-100"
								style={{
									background: `radial-gradient(circle at right center, ${glow}, transparent 42%)`,
								}}
							/>
							<div className="relative flex min-h-[92px] items-center gap-4 py-4 sm:min-h-[84px]">
								<div
									className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[15px]"
									style={{ background: tint }}
								>
									<Icon size={18} strokeWidth={1.9} className="text-white/76" />
								</div>

								<div className="min-w-0 flex-1">
									<div className="flex items-end gap-3">
										<h2 className="text-[1.5rem] leading-none font-semibold tracking-[-0.05em] text-white sm:text-[1.7rem]">
											{title}
										</h2>
										<span className="pb-0.5 text-[10px] font-semibold uppercase tracking-[0.28em] text-white/24">
											{label}
										</span>
									</div>
									<p className="mt-2 text-sm leading-6 text-white/50">{copy}</p>
								</div>

								<div className="flex h-9 w-9 shrink-0 items-center justify-center text-white/38 transition duration-300 group-hover:text-white/72">
									<ChevronRight size={16} strokeWidth={1.9} />
								</div>
							</div>

							<div className="h-px bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.09),transparent)]" />
						</Link>
					))}
				</section>
			</div>
		</main>
	);
}
