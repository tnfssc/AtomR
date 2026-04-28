import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { PLAYER_COLORS, PLAYER_NAMES } from "../constants";
import type { Board, GameState, PlayerId } from "../types";
import type { MoveRecord } from "../useAtomRGame";
import AtomRBoard from "./AtomRBoard";

type ReplayPanelProps = {
	open: boolean;
	onClose: () => void;
	moveHistory: MoveRecord[];
	rows: number;
	cols: number;
	playerCount: number;
	/** Optional name overrides for players (e.g. "CPU") */
	playerNames?: Partial<Record<PlayerId, string>>;
};

function MiniBoard({
	board,
	rows,
	cols,
	playerCount,
	highlightRow,
	highlightCol,
	highlightPlayer,
	activeColor,
}: {
	board: Board;
	rows: number;
	cols: number;
	playerCount: number;
	highlightRow?: number;
	highlightCol?: number;
	highlightPlayer?: PlayerId;
	activeColor: string;
}) {
	const containerRef = useRef<HTMLDivElement>(null);
	const [boardDims, setBoardDims] = useState<{ w: number; h: number } | null>(
		null,
	);

	useLayoutEffect(() => {
		const el = containerRef.current;
		if (!el) return;

		function measure(target: HTMLDivElement) {
			const { width, height } = target.getBoundingClientRect();
			if (!width || !height) return;
			const aspect = cols / rows;
			let w: number;
			let h: number;
			if (width / height > aspect) {
				h = height;
				w = h * aspect;
			} else {
				w = width;
				h = w / aspect;
			}
			setBoardDims({ w, h });
		}

		measure(el);
		const obs = new ResizeObserver(() => measure(el));
		obs.observe(el);
		return () => obs.disconnect();
	}, [rows, cols]);

	const cellSize = boardDims ? boardDims.w / cols : 0;
	const boardStyle: React.CSSProperties = boardDims
		? { width: `${boardDims.w}px`, height: `${boardDims.h}px` }
		: { width: "100%", height: "100%" };

	// Build a dummy GameState just for the board renderer
	const dummyState: GameState = {
		board,
		rows,
		cols,
		playerCount,
		currentPlayer: highlightPlayer ?? "p1",
		turnNumber: 0,
		hasPlayed: {},
		eliminated: {},
		winner: null,
		phase: "idle",
	};

	return (
		<div
			ref={containerRef}
			className="relative w-full flex items-center justify-center"
			style={{ height: "100%", maxHeight: "100%" }}
		>
			<div style={boardStyle} className="relative">
				<AtomRBoard
					state={dummyState}
					activeColor={activeColor}
					isAnimating={false}
					activeExplosionKeys={[]}
					activeCaptureKeys={[]}
					activeExplosions={[]}
					cellSize={cellSize}
					lastMove={
						highlightRow !== undefined && highlightCol !== undefined
							? {
									row: highlightRow,
									col: highlightCol,
									player: highlightPlayer ?? "p1",
									turnNumber: 1,
									didExplode: false,
								}
							: null
					}
					onPlay={() => {}}
				/>
			</div>
		</div>
	);
}

export default function ReplayPanel({
	open,
	onClose,
	moveHistory,
	rows,
	cols,
	playerCount,
	playerNames,
}: ReplayPanelProps) {
	const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
	const [showAfter, setShowAfter] = useState(true);
	const listRef = useRef<HTMLDivElement>(null);

	// Reset selection when opening
	useEffect(() => {
		if (open) {
			setSelectedIndex(moveHistory.length > 0 ? moveHistory.length - 1 : null);
			setShowAfter(true);
		}
	}, [open, moveHistory.length]);

	// Keyboard navigation
	useEffect(() => {
		if (!open) return;

		function handleKey(e: KeyboardEvent) {
			if (e.key === "Escape") {
				onClose();
				return;
			}
			if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
				e.preventDefault();
				setSelectedIndex((prev) => {
					if (prev === null) return 0;
					return Math.max(0, prev - 1);
				});
			}
			if (e.key === "ArrowDown" || e.key === "ArrowRight") {
				e.preventDefault();
				setSelectedIndex((prev) => {
					if (prev === null) return 0;
					return Math.min(moveHistory.length - 1, prev + 1);
				});
			}
			if (e.key.toLowerCase() === "b") {
				e.preventDefault();
				setShowAfter((prev) => !prev);
			}
		}

		window.addEventListener("keydown", handleKey);
		return () => window.removeEventListener("keydown", handleKey);
	}, [open, onClose, moveHistory.length]);

	// Auto-scroll to selected move
	useEffect(() => {
		if (selectedIndex === null || !listRef.current) return;
		const item = listRef.current.children[selectedIndex] as
			| HTMLElement
			| undefined;
		item?.scrollIntoView({ block: "nearest", behavior: "smooth" });
	}, [selectedIndex]);

	if (!open) return null;

	const selected =
		selectedIndex !== null ? moveHistory[selectedIndex] : undefined;
	const boardToShow = selected
		? showAfter
			? selected.boardAfter
			: selected.boardBefore
		: undefined;
	const activeColor = selected
		? PLAYER_COLORS[selected.player]
		: "rgba(255,255,255,0.3)";

	return (
		<div
			className="fixed inset-0 z-50 flex flex-col"
			style={{
				background: "rgba(7,7,11,0.96)",
				backdropFilter: "blur(16px)",
				fontFamily: "'Oxanium', 'Segoe UI', sans-serif",
			}}
		>
			{/* Header */}
			<div
				className="flex items-center justify-between px-5 py-4 shrink-0"
				style={{
					borderBottom: "1px solid rgba(255,255,255,0.06)",
				}}
			>
				<div className="flex items-center gap-3">
					<svg
						aria-hidden="true"
						focusable="false"
						width="20"
						height="20"
						viewBox="0 0 24 24"
						fill="none"
						stroke="rgba(255,255,255,0.5)"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
					>
						<polygon points="5 3 19 12 5 21 5 3" />
					</svg>
					<span
						className="text-sm font-bold uppercase tracking-[0.3em]"
						style={{ color: "rgba(255,255,255,0.55)" }}
					>
						Replay
					</span>
					<span
						className="text-xs font-medium"
						style={{ color: "rgba(255,255,255,0.22)" }}
					>
						{moveHistory.length} move{moveHistory.length !== 1 ? "s" : ""}
					</span>
				</div>
				<button
					type="button"
					onClick={onClose}
					className="flex h-9 w-9 items-center justify-center rounded-full transition-all duration-150 hover:scale-[1.05] active:scale-[0.95]"
					style={{
						background: "rgba(255,255,255,0.04)",
						color: "rgba(255,255,255,0.5)",
					}}
					aria-label="Close replay"
				>
					<svg
						aria-hidden="true"
						focusable="false"
						width="16"
						height="16"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2.5"
						strokeLinecap="round"
						strokeLinejoin="round"
					>
						<line x1="18" y1="6" x2="6" y2="18" />
						<line x1="6" y1="6" x2="18" y2="18" />
					</svg>
				</button>
			</div>

			{/* Body: move list + board preview */}
			<div className="flex flex-col sm:flex-row flex-1 min-h-0 overflow-hidden">
				{/* Move list */}
				<div
					className="order-2 sm:order-none flex flex-col sm:shrink-0 w-full sm:w-[clamp(200px,35%,320px)] h-[45vh] sm:h-auto border-t border-white/6 sm:border-t-0 sm:border-r sm:border-r-white/6"
				>
					{/* Nav controls */}
					<div
						className="flex items-center justify-between px-4 py-2.5 shrink-0"
						style={{
							borderBottom: "1px solid rgba(255,255,255,0.04)",
						}}
					>
						<div className="flex items-center gap-1">
							<button
								type="button"
								onClick={() =>
									setSelectedIndex((prev) =>
										prev === null ? 0 : Math.max(0, prev - 1),
									)
								}
								disabled={
									selectedIndex === null ||
									selectedIndex === 0 ||
									moveHistory.length === 0
								}
								className="flex h-7 w-7 items-center justify-center rounded-md transition-all duration-100 hover:scale-[1.04] active:scale-[0.96] disabled:opacity-30 disabled:scale-100"
								style={{
									background: "rgba(255,255,255,0.04)",
									color: "rgba(255,255,255,0.6)",
								}}
								aria-label="Previous move"
							>
								<svg
									aria-hidden="true"
									focusable="false"
									width="12"
									height="12"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2.5"
									strokeLinecap="round"
									strokeLinejoin="round"
								>
									<polyline points="15 18 9 12 15 6" />
								</svg>
							</button>
							<button
								type="button"
								onClick={() =>
									setSelectedIndex((prev) =>
										prev === null
											? 0
											: Math.min(moveHistory.length - 1, prev + 1),
									)
								}
								disabled={
									selectedIndex === null ||
									selectedIndex >= moveHistory.length - 1 ||
									moveHistory.length === 0
								}
								className="flex h-7 w-7 items-center justify-center rounded-md transition-all duration-100 hover:scale-[1.04] active:scale-[0.96] disabled:opacity-30 disabled:scale-100"
								style={{
									background: "rgba(255,255,255,0.04)",
									color: "rgba(255,255,255,0.6)",
								}}
								aria-label="Next move"
							>
								<svg
									aria-hidden="true"
									focusable="false"
									width="12"
									height="12"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2.5"
									strokeLinecap="round"
									strokeLinejoin="round"
								>
									<polyline points="9 18 15 12 9 6" />
								</svg>
							</button>
						</div>
						<span
							className="text-[10px] font-semibold uppercase tracking-[0.2em]"
							style={{ color: "rgba(255,255,255,0.2)" }}
						>
							{selectedIndex !== null ? selectedIndex + 1 : "–"} /{" "}
							{moveHistory.length}
						</span>
					</div>

					{/* Scrollable move list */}
					<div
						ref={listRef}
						className="flex-1 overflow-y-auto overflow-x-hidden"
						style={{
							scrollbarWidth: "thin",
							scrollbarColor: "rgba(255,255,255,0.08) transparent",
						}}
					>
						{moveHistory.length === 0 && (
							<div
								className="px-4 py-8 text-center"
								style={{
									color: "rgba(255,255,255,0.18)",
									fontSize: "12px",
								}}
							>
								No moves recorded
							</div>
						)}
						{moveHistory.map((move, index) => {
							const isSelected = index === selectedIndex;
							const color = PLAYER_COLORS[move.player];
							const name =
								playerNames?.[move.player] ?? PLAYER_NAMES[move.player];

							return (
								<button
									type="button"
									key={`move-${move.turnNumber}`}
									onClick={() => setSelectedIndex(index)}
									className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-all duration-100"
									style={{
										background: isSelected
											? `linear-gradient(90deg, ${color}14, ${color}08)`
											: "transparent",
										borderLeft: isSelected
											? `2px solid ${color}`
											: "2px solid transparent",
									}}
								>
									{/* Turn number */}
									<span
										className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[10px] font-bold"
										style={{
											background: isSelected
												? `${color}22`
												: "rgba(255,255,255,0.04)",
											color: isSelected ? color : "rgba(255,255,255,0.3)",
										}}
									>
										{move.turnNumber}
									</span>

									{/* Player orb */}
									<span
										className="block h-3 w-3 shrink-0 rounded-full"
										style={{
											backgroundColor: color,
											boxShadow: isSelected ? `0 0 8px ${color}55` : "none",
										}}
									/>

									{/* Player name & coordinate */}
									<div className="flex flex-col min-w-0">
										<span
											className="text-[11px] font-semibold truncate"
											style={{
												color: isSelected ? color : "rgba(255,255,255,0.55)",
											}}
										>
											{name}
										</span>
										<span
											className="text-[10px] font-medium tracking-wider"
											style={{
												color: isSelected
													? `color-mix(in srgb, ${color} 60%, rgba(255,255,255,0.3))`
													: "rgba(255,255,255,0.2)",
												fontFamily: "monospace",
											}}
										>
											{move.coordinate}
										</span>
									</div>
								</button>
							);
						})}
					</div>
				</div>

				{/* Board preview */}
				<div className="order-1 sm:order-none flex flex-1 flex-col min-h-0 min-w-0">
					{/* Before/After toggle */}
					{selected && (
						<div
							className="flex items-center justify-center gap-1 px-4 py-2.5 shrink-0"
							style={{
								borderBottom: "1px solid rgba(255,255,255,0.04)",
							}}
						>
							<button
								type="button"
								onClick={() => setShowAfter(false)}
								className="rounded-full px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] transition-all duration-150 whitespace-nowrap"
								style={{
									background: !showAfter
										? `${activeColor}18`
										: "rgba(255,255,255,0.02)",
									color: !showAfter ? activeColor : "rgba(255,255,255,0.25)",
									border: !showAfter
										? `1px solid ${activeColor}33`
										: "1px solid rgba(255,255,255,0.06)",
								}}
							>
								Before
							</button>
							<button
								type="button"
								onClick={() => setShowAfter(true)}
								className="rounded-full px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] transition-all duration-150 whitespace-nowrap"
								style={{
									background: showAfter
										? `${activeColor}18`
										: "rgba(255,255,255,0.02)",
									color: showAfter ? activeColor : "rgba(255,255,255,0.25)",
									border: showAfter
										? `1px solid ${activeColor}33`
										: "1px solid rgba(255,255,255,0.06)",
								}}
							>
								After
							</button>
						</div>
					)}

					{/* Board rendering area */}
					<div className="flex-1 min-h-0 p-4 sm:p-6 flex items-center justify-center">
						{boardToShow && selected ? (
							<MiniBoard
								board={boardToShow}
								rows={rows}
								cols={cols}
								playerCount={playerCount}
								highlightRow={selected.row}
								highlightCol={selected.col}
								highlightPlayer={selected.player}
								activeColor={activeColor}
							/>
						) : (
							<div
								className="flex flex-col items-center gap-3"
								style={{ color: "rgba(255,255,255,0.15)" }}
							>
								<svg
									aria-hidden="true"
									focusable="false"
									width="48"
									height="48"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="1"
									strokeLinecap="round"
									strokeLinejoin="round"
								>
									<rect x="2" y="2" width="20" height="20" rx="5" />
									<path d="M10 8l6 4-6 4V8z" />
								</svg>
								<span className="text-xs uppercase tracking-[0.3em]">
									Select a move to preview
								</span>
							</div>
						)}
					</div>

					{/* Move info footer */}
					{selected && (
						<div
							className="flex items-center justify-center gap-4 px-4 py-3 shrink-0"
							style={{
								borderTop: "1px solid rgba(255,255,255,0.04)",
							}}
						>
							<span
								className="text-[10px] uppercase tracking-[0.25em]"
								style={{ color: "rgba(255,255,255,0.2)" }}
							>
								Turn {selected.turnNumber}
							</span>
							<span
								className="inline-flex items-center gap-1.5"
								style={{ color: activeColor }}
							>
								<span
									className="block h-2 w-2 rounded-full"
									style={{
										backgroundColor: activeColor,
										boxShadow: `0 0 6px ${activeColor}66`,
									}}
								/>
								<span className="text-[11px] font-semibold">
									{playerNames?.[selected.player] ??
										PLAYER_NAMES[selected.player]}
								</span>
							</span>
							<span
								className="text-[11px] font-bold tracking-widest"
								style={{
									color: "rgba(255,255,255,0.35)",
									fontFamily: "monospace",
								}}
							>
								→ {selected.coordinate}
							</span>
						</div>
					)}
				</div>
			</div>

			{/* Footer hint */}
			<div
				className="hidden sm:flex items-center justify-center gap-6 px-4 py-2.5 shrink-0"
				style={{
					borderTop: "1px solid rgba(255,255,255,0.04)",
				}}
			>
				<span
					className="text-[9px] uppercase tracking-[0.2em]"
					style={{ color: "rgba(255,255,255,0.12)" }}
				>
					↑↓ navigate
				</span>
				<span
					className="text-[9px] uppercase tracking-[0.2em]"
					style={{ color: "rgba(255,255,255,0.12)" }}
				>
					B toggle before/after
				</span>
				<span
					className="text-[9px] uppercase tracking-[0.2em]"
					style={{ color: "rgba(255,255,255,0.12)" }}
				>
					Esc close
				</span>
			</div>
		</div>
	);
}
