import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Swords } from "lucide-react";
import { authClient } from "#/lib/auth-client";
import AtomRMark from "./brand/AtomRMark";

const F = "'Oxanium', 'Segoe UI', sans-serif";

const NAV_ITEMS = [
	{ to: "/" as const, label: "Home", icon: Home, exact: true },
	{ to: "/play" as const, label: "Play", icon: Swords, exact: true },
] as const;

export default function Sidebar() {
	const { data: session, isPending } = authClient.useSession();
	const pathname = useRouterState({ select: (s) => s.location.pathname });
	const userLabel = session?.user.name || session?.user.email?.split("@")[0];
	const userInitial = session?.user.name?.charAt(0).toUpperCase() ?? "U";

	return (
		<aside
			className="fixed inset-y-0 left-0 z-40 w-[250px] px-4 py-4 max-[960px]:sticky max-[960px]:inset-y-auto max-[960px]:w-full max-[960px]:px-3 max-[960px]:py-3"
			style={{ fontFamily: F }}
		>
			<div className="relative flex h-full flex-col overflow-hidden rounded-[28px] bg-[linear-gradient(180deg,rgba(10,11,18,0.9),rgba(7,7,11,0.82))] shadow-[0_24px_72px_rgba(0,0,0,0.3)] backdrop-blur-xl max-[960px]:h-auto max-[960px]:rounded-[22px]">
				<div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[radial-gradient(circle_at_top,rgba(58,204,224,0.12),transparent_68%)] opacity-90" />
				<div className="pointer-events-none absolute right-[-28px] bottom-16 h-36 w-36 rounded-full bg-[radial-gradient(circle,rgba(224,92,58,0.12),transparent_72%)] blur-2xl" />

				<div className="relative flex items-center justify-between gap-3 px-5 pt-5 pb-2 max-[960px]:px-4 max-[960px]:pt-4 max-[460px]:items-start max-[460px]:gap-2">
					<Link
						to="/"
						className="flex min-w-0 flex-1 items-center gap-3 no-underline max-[460px]:w-full"
					>
						<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/[0.035]">
							<AtomRMark size={20} title="AtomR" />
						</div>
						<div className="min-w-0 flex-1">
							<div className="text-[17px] leading-none font-semibold tracking-[0.09em] text-white max-[520px]:text-[16px] max-[520px]:tracking-[0.06em] max-[420px]:text-[15px] max-[420px]:tracking-[0.04em]">
								AtomR
							</div>
						</div>
					</Link>

					<div className="hidden items-center gap-2 max-[960px]:flex max-[460px]:shrink-0">
						{isPending ? (
							<div className="h-10 w-20 rounded-[16px] bg-white/[0.04]" />
						) : session?.user ? (
							<>
								<div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[16px] bg-white/[0.05]">
									{session.user.image ? (
										<img
											src={session.user.image}
											alt={session.user.name ?? "User"}
											className="h-full w-full object-cover"
										/>
									) : (
										<span className="text-sm font-semibold text-white/72">
											{userInitial}
										</span>
									)}
								</div>
								<button
									type="button"
									onClick={async () => {
										await fetch("/api/auth/sign-out", {
											method: "POST",
											credentials: "include",
											headers: { "Content-Type": "application/json" },
											body: "{}",
										});
										window.location.href = "/";
									}}
									className="inline-flex h-10 items-center justify-center rounded-[16px] bg-white/[0.05] px-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/62 transition hover:bg-white/[0.08] hover:text-white/84 active:scale-[0.98] max-[520px]:px-3 max-[520px]:tracking-[0.12em]"
								>
									Sign Out
								</button>
							</>
						) : (
							<Link
								to="/sign-in"
								className="inline-flex h-10 items-center justify-center rounded-[16px] bg-white/[0.05] px-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/74 no-underline transition hover:bg-white/[0.08] active:scale-[0.98] max-[520px]:px-3 max-[520px]:tracking-[0.12em]"
							>
								Sign In
							</Link>
						)}
					</div>
				</div>

				<nav className="relative flex flex-1 flex-col gap-1 px-3 py-2 max-[960px]:flex-none max-[960px]:flex-row max-[960px]:gap-2 max-[960px]:overflow-x-auto max-[960px]:px-2 max-[960px]:pt-1 max-[960px]:pb-3">
					{NAV_ITEMS.map(({ to, label, icon: Icon, exact }) => {
						const isActive = exact ? pathname === to : pathname.startsWith(to);
						return (
							<Link
								key={to}
								to={to}
								className="group flex shrink-0 items-center gap-3 rounded-[18px] px-3 py-3 no-underline transition-all duration-200 max-[960px]:min-w-fit max-[960px]:gap-2 max-[960px]:rounded-[16px] max-[960px]:px-3.5 max-[960px]:py-2.5"
								style={{
									background: isActive
										? "rgba(255,255,255,0.055)"
										: "transparent",
								}}
							>
								<div
									className="flex h-10 w-10 items-center justify-center rounded-[14px] transition-colors duration-200 max-[960px]:h-9 max-[960px]:w-9"
									style={{
										background: isActive
											? "rgba(58,204,224,0.12)"
											: "rgba(255,255,255,0.035)",
										color: isActive
											? "oklch(0.72 0.19 195)"
											: "rgba(255,255,255,0.45)",
									}}
								>
									<Icon size={18} strokeWidth={1.9} />
								</div>
								<div className="min-w-0">
									<div
										className="text-[13px] font-semibold tracking-[0.08em] transition-colors duration-200 max-[960px]:text-[12px]"
										style={{
											color: isActive ? "white" : "rgba(255,255,255,0.58)",
										}}
									>
										{label}
									</div>
								</div>
							</Link>
						);
					})}
				</nav>

				<div className="relative mt-auto px-3 pb-3 pt-2 max-[960px]:hidden">
					{isPending ? (
						<div className="h-14 rounded-[18px] bg-white/[0.04]" />
					) : session?.user ? (
						<div
							className="rounded-[20px] p-3"
							style={{ background: "rgba(255,255,255,0.022)" }}
						>
							<div className="flex min-w-0 items-center gap-3">
								<div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-[14px] bg-white/[0.07]">
									{session.user.image ? (
										<img
											src={session.user.image}
											alt={session.user.name ?? "User"}
											className="h-full w-full object-cover"
										/>
									) : (
										<span className="text-[15px] font-bold text-white/80">
											{userInitial}
										</span>
									)}
								</div>
								<div className="min-w-0 flex-1">
									<div className="truncate text-[13px] font-semibold leading-snug text-white/92">
										{userLabel}
									</div>
									<div className="truncate text-[11px] leading-snug text-white/30 max-[420px]:hidden">
										{session.user.email}
									</div>
								</div>
							</div>
							<div
								className="my-2.5 h-px"
								style={{ background: "rgba(255,255,255,0.055)" }}
							/>
							<button
								type="button"
								onClick={async () => {
									await fetch("/api/auth/sign-out", {
										method: "POST",
										credentials: "include",
										headers: { "Content-Type": "application/json" },
										body: "{}",
									});
									window.location.href = "/";
								}}
								className="inline-flex h-9 w-full items-center justify-center rounded-[13px] bg-white/[0.04] text-[10px] font-semibold uppercase tracking-[0.22em] text-white/58 transition hover:bg-white/[0.07] hover:text-white/78 active:scale-[0.98]"
							>
								Sign Out
							</button>
						</div>
					) : (
						<Link
							to="/sign-in"
							className="flex h-12 items-center justify-center rounded-[18px] bg-[rgba(255,255,255,0.045)] text-[11px] font-semibold uppercase tracking-[0.24em] text-white/78 no-underline transition hover:bg-white/[0.08] active:scale-[0.98]"
						>
							Sign In
						</Link>
					)}
				</div>
			</div>
		</aside>
	);
}
