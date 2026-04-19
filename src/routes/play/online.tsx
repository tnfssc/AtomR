import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useEffectEvent, useState } from "react";
import { ONLINE_VIEWER_HEARTBEAT_MS } from "#/features/atomr/shared";
import { authClient } from "#/lib/auth-client";
import { requireSessionFn } from "#/lib/session-fns";
import { api } from "../../../convex/_generated/api";

export const Route = createFileRoute("/play/online")({
	beforeLoad: async () => {
		await requireSessionFn();
	},
	component: OnlineLobbyPage,
});

function OnlineLobbyPage() {
	const navigate = useNavigate();
	const { data: session } = authClient.useSession();
	const syncViewer = useMutation(api.online.syncViewer);
	const createPrivateRoom = useMutation(api.online.createPrivateRoom);
	const joinQueue = useMutation(api.online.joinQueue);
	const leaveQueue = useMutation(api.online.leaveQueue);

	const [joinCode, setJoinCode] = useState("");
	const [roomCode, setRoomCode] = useState<string | null>(null);
	const [roomRows, setRoomRows] = useState(6);
	const [roomCols, setRoomCols] = useState(9);
	const [isCreating, setIsCreating] = useState(false);
	const [isJoining, setIsJoining] = useState(false);
	const [isSearching, setIsSearching] = useState(false);

	const room = useQuery(
		api.online.getRoomByCode,
		roomCode ? { code: roomCode } : "skip",
	);

	const queueEntry = useQuery(
		api.online.getMyQueueEntry,
		session?.user ? {} : "skip",
	);

	// Auto-navigate when matched
	useEffect(() => {
		if (queueEntry?.status === "matched" && queueEntry.matchId) {
			void navigate({
				to: "/play/match/$matchId",
				params: { matchId: queueEntry.matchId },
			});
		}
	}, [queueEntry, navigate]);

	const user = session?.user ?? null;
	const displayName = user?.name || user?.email || "Player";

	const ensureViewer = useEffectEvent(async () => {
		if (!user) return;
		await syncViewer({});
	});

	useEffect(() => {
		if (!user) return;
		let cancelled = false;
		async function heartbeat() {
			if (cancelled) return;
			try {
				await ensureViewer();
			} catch {
				// Presence should be best-effort, not a render blocker.
			}
		}

		void heartbeat();
		const timer = window.setInterval(() => {
			void heartbeat();
		}, ONLINE_VIEWER_HEARTBEAT_MS);
		return () => {
			cancelled = true;
			window.clearInterval(timer);
		};
	}, [user]);

	if (!user) return null;

	const isInQueue =
		queueEntry?.status === "searching" ||
		queueEntry?.status === "matched" ||
		isSearching;

	return (
		<main
			className="min-h-[100dvh] bg-[#07070b] px-4 py-10 text-white"
			style={{ fontFamily: "'Oxanium', 'Segoe UI', sans-serif" }}
		>
			<div className="mx-auto flex max-w-5xl flex-col gap-6">
				{/* Header */}
				<div className="rounded-3xl border border-white/8 bg-white/[0.03] p-8">
					<p className="text-[11px] uppercase tracking-[0.38em] text-white/35">
						Online Lobby
					</p>
					<h1 className="mt-3 text-4xl font-semibold tracking-tight">
						Welcome, {displayName}
					</h1>
					<p className="mt-3 max-w-2xl text-sm leading-6 text-white/60">
						Find an opponent instantly with Quick Match, or invite a friend with
						a private room code.
					</p>
				</div>

				<div className="grid gap-4 lg:grid-cols-3">
					{/* Quick Match */}
					<div className="rounded-3xl border border-[oklch(0.72_0.19_23_/_0.22)] bg-[oklch(0.72_0.19_23_/_0.04)] p-6">
						<p className="text-[10px] uppercase tracking-[0.32em] text-white/35">
							Quick Match
						</p>
						<p className="mt-3 text-sm leading-6 text-white/60">
							Join the public queue. 6×9 board. You'll be matched with the next
							available player.
						</p>
						<div className="mt-5 grid gap-3">
							{isInQueue ? (
								<>
									<div className="flex items-center gap-3 rounded-2xl border border-white/8 bg-black/20 px-4 py-3">
										<span className="relative flex h-2 w-2">
											<span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[oklch(0.72_0.19_23)] opacity-75" />
											<span className="relative inline-flex h-2 w-2 rounded-full bg-[oklch(0.72_0.19_23)]" />
										</span>
										<span className="text-sm text-white/70">
											Searching for opponent…
										</span>
									</div>
									<button
										type="button"
										className="rounded-full border border-white/12 px-5 py-3 text-sm font-semibold uppercase tracking-[0.24em] text-white/60 transition-colors hover:text-white"
										onClick={async () => {
											setIsSearching(false);
											await leaveQueue({});
										}}
									>
										Cancel
									</button>
								</>
							) : (
								<button
									type="button"
									className="rounded-full bg-[oklch(0.72_0.19_23)] px-5 py-3 text-sm font-semibold uppercase tracking-[0.24em] text-[#07070b] transition-opacity disabled:opacity-50"
									onClick={async () => {
										setIsSearching(true);
										try {
											await ensureViewer();
											const result = await joinQueue({});
											if (result.status === "matched" && result.matchId) {
												void navigate({
													to: "/play/match/$matchId",
													params: { matchId: result.matchId },
												});
											}
										} catch {
											setIsSearching(false);
										}
									}}
								>
									Find Match
								</button>
							)}
						</div>
					</div>

					{/* Create Private Room */}
					<div className="rounded-3xl border border-white/8 bg-white/[0.03] p-6">
						<p className="text-[10px] uppercase tracking-[0.32em] text-white/35">
							Create Private Room
						</p>
						<div className="mt-5 grid gap-4">
							<label className="grid gap-2 text-sm text-white/70">
								Rows
								<input
									type="range"
									min={3}
									max={12}
									value={roomRows}
									onChange={(e) => setRoomRows(Number(e.target.value))}
								/>
								<span className="font-mono text-xs text-white/45">
									{roomRows}
								</span>
							</label>
							<label className="grid gap-2 text-sm text-white/70">
								Columns
								<input
									type="range"
									min={4}
									max={16}
									value={roomCols}
									onChange={(e) => setRoomCols(Number(e.target.value))}
								/>
								<span className="font-mono text-xs text-white/45">
									{roomCols}
								</span>
							</label>
							<button
								type="button"
								disabled={isCreating}
								className="rounded-full border border-white/12 px-5 py-3 text-sm font-semibold uppercase tracking-[0.24em] transition-opacity disabled:opacity-50"
								onClick={async () => {
									setIsCreating(true);
									try {
										await ensureViewer();
										const result = await createPrivateRoom({
											rows: roomRows,
											cols: roomCols,
										});
										setRoomCode(result.code);
									} finally {
										setIsCreating(false);
									}
								}}
							>
								{isCreating ? "Creating…" : "Create Room"}
							</button>

							{roomCode ? (
								<div className="rounded-2xl border border-white/8 bg-black/20 p-4">
									<p className="text-[10px] uppercase tracking-[0.32em] text-white/35">
										Room Code
									</p>
									<p className="mt-2 font-mono text-3xl tracking-[0.2em]">
										{roomCode}
									</p>
									<p className="mt-2 text-sm text-white/60">
										Share this code. The match starts when the second player
										joins.
									</p>
									{room?.matchId ? (
										<button
											type="button"
											className="mt-4 rounded-full bg-[oklch(0.72_0.19_23)] px-4 py-2 text-sm font-semibold uppercase tracking-[0.2em] text-[#07070b]"
											onClick={() => {
												if (!room.matchId) return;
												void navigate({
													to: "/play/match/$matchId",
													params: { matchId: room.matchId },
												});
											}}
										>
											Open Match
										</button>
									) : (
										<p className="mt-3 text-sm text-white/45">
											Waiting for opponent…
										</p>
									)}
								</div>
							) : null}
						</div>
					</div>

					{/* Join Private Room */}
					<div className="rounded-3xl border border-white/8 bg-white/[0.03] p-6">
						<p className="text-[10px] uppercase tracking-[0.32em] text-white/35">
							Join Private Room
						</p>
						<p className="mt-3 text-sm leading-6 text-white/60">
							Enter the 5-letter code your opponent shared with you.
						</p>
						<div className="mt-5 grid gap-4">
							<input
								value={joinCode}
								onChange={(e) =>
									setJoinCode(e.target.value.toUpperCase().slice(0, 5))
								}
								placeholder="ABCDE"
								maxLength={5}
								className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 font-mono text-lg tracking-[0.28em] text-white outline-none placeholder:text-white/20 focus:border-white/25"
							/>
							<button
								type="button"
								disabled={joinCode.length !== 5 || isJoining}
								className="rounded-full bg-[oklch(0.72_0.19_23)] px-5 py-3 text-sm font-semibold uppercase tracking-[0.24em] text-[#07070b] transition-opacity disabled:opacity-40"
								onClick={async () => {
									if (joinCode.length !== 5) return;
									setIsJoining(true);
									try {
										await ensureViewer();
										void navigate({
											to: "/play/room/$code",
											params: { code: joinCode },
										});
									} finally {
										setIsJoining(false);
									}
								}}
							>
								{isJoining ? "Joining…" : "Join Room"}
							</button>
						</div>
					</div>
				</div>

				{/* Back link */}
				<div className="text-center">
					<Link
						to="/play"
						className="text-sm text-white/35 no-underline transition-colors hover:text-white/60"
					>
						← Back to mode selection
					</Link>
				</div>
			</div>
		</main>
	);
}
