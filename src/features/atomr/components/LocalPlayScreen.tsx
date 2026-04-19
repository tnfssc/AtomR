import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { PLAYER_COLORS } from "#/features/atomr/constants";
import { useAtomRGame } from "#/features/atomr/useAtomRGame";
import { getRecommendedSize } from "#/features/atomr/utils/recommendedSize";
import AtomRBoard from "./AtomRBoard";
import GameHud from "./GameHud";
import GameOverlay from "./GameOverlay";
import GameSettings from "./GameSettings";

export default function LocalPlayScreen() {
	const [rows, setRows] = useState(6);
	const [cols, setCols] = useState(9);
	const [playerCount, setPlayerCount] = useState(2);
	const [settingsOpen, setSettingsOpen] = useState(false);
	const [settingsResetToken, setSettingsResetToken] = useState(0);

	useEffect(() => {
		const rec = getRecommendedSize();
		setRows(rec.rows);
		setCols(rec.cols);
	}, []);

	const {
		state,
		handleMove,
		reset,
		isAnimating,
		activeExplosionKeys,
		activeCaptureKeys,
		activeExplosions,
		lastMove,
	} = useAtomRGame(rows, cols, playerCount, settingsResetToken);

	const containerRef = useRef<HTMLDivElement>(null);
	const [boardDims, setBoardDims] = useState<{ w: number; h: number } | null>(
		null,
	);

	useLayoutEffect(() => {
		const element = containerRef.current;
		if (!element) return;

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

		measure(element);
		const obs = new ResizeObserver(() => measure(element));
		obs.observe(element);
		return () => obs.disconnect();
	}, [rows, cols]);

	const cellSize = boardDims ? boardDims.w / cols : 0;
	const activeColor = state.winner
		? PLAYER_COLORS[state.winner]
		: PLAYER_COLORS[state.currentPlayer];
	const boardStyle: React.CSSProperties = boardDims
		? { width: `${boardDims.w}px`, height: `${boardDims.h}px` }
		: { width: "100%", height: "100%" };
	const hudStyle: React.CSSProperties = boardDims
		? { width: `${boardDims.w}px`, maxWidth: "100%" }
		: { width: "100%", maxWidth: "100%" };

	return (
		<main
			className="relative flex h-[100dvh] flex-col overflow-hidden px-3 pt-5 pb-4"
			style={{
				background: "#07070b",
				fontFamily: "'Oxanium', 'Segoe UI', sans-serif",
			}}
		>
			<div
				className="pointer-events-none fixed inset-x-0 top-0 h-[50%]"
				style={{
					background: `radial-gradient(ellipse 80% 55% at 50% -5%, ${activeColor}14 0%, transparent 65%)`,
					transition: "background 1.2s ease",
				}}
			/>
			<div
				className="pointer-events-none fixed inset-x-0 bottom-0 h-[30%]"
				style={{
					background: `radial-gradient(ellipse 60% 40% at 50% 110%, ${activeColor}08 0%, transparent 70%)`,
					transition: "background 1.2s ease",
				}}
			/>

			<div className="relative mx-auto w-full shrink-0" style={hudStyle}>
				<GameHud state={state} onSettingsOpen={() => setSettingsOpen(true)} />
			</div>

			<div
				ref={containerRef}
				className="relative flex-1 min-h-0 flex items-center justify-center"
			>
				<div style={boardStyle} className="relative">
					<AtomRBoard
						state={state}
						activeColor={activeColor}
						isAnimating={isAnimating}
						activeExplosionKeys={activeExplosionKeys}
						activeCaptureKeys={activeCaptureKeys}
						activeExplosions={activeExplosions}
						cellSize={cellSize}
						lastMove={lastMove}
						onPlay={(row, col) => handleMove({ row, col })}
					/>
					<GameOverlay state={state} onReset={reset} />
				</div>
			</div>

			<p
				className="relative text-center text-[10px] uppercase tracking-[0.3em] shrink-0"
				style={{ color: "rgba(255,255,255,0.12)" }}
			>
				Place on empty or owned cells · chains resolve automatically
			</p>

			<GameSettings
				open={settingsOpen}
				rows={rows}
				cols={cols}
				playerCount={playerCount}
				playerCountLocked={false}
				onApply={(newRows, newCols, _newDifficulty, newPlayerCount) => {
					setRows(newRows);
					setCols(newCols);
					setPlayerCount(newPlayerCount ?? 2);
					setSettingsResetToken((token) => token + 1);
				}}
				onClose={() => setSettingsOpen(false)}
			/>
		</main>
	);
}
