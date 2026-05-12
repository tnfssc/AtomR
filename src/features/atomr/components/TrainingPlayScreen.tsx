import {
	startTransition,
	useCallback,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from "react";
import {
	type AiMoveTask,
	requestRecommendedMove,
} from "#/features/atomr/ai-worker-client";
import { PLAYER_COLORS } from "#/features/atomr/constants";
import { useAtomRGame } from "#/features/atomr/useAtomRGame";
import { getRecommendedSize } from "#/features/atomr/utils/recommendedSize";
import AtomRBoard from "./AtomRBoard";
import GameHud from "./GameHud";
import GameOverlay from "./GameOverlay";
import GameSettings from "./GameSettings";
import ReplayPanel from "./ReplayPanel";

const TRAINING_DIFFICULTY = 10;

export default function TrainingPlayScreen() {
	const [rows, setRows] = useState(6);
	const [cols, setCols] = useState(9);
	const [settingsOpen, setSettingsOpen] = useState(false);
	const [settingsResetToken, setSettingsResetToken] = useState(0);
	const [replayOpen, setReplayOpen] = useState(false);
	const [suggestedMove, setSuggestedMove] = useState<{
		row: number;
		col: number;
	} | null>(null);

	useEffect(() => {
		const rec = getRecommendedSize();
		setRows(rec.rows);
		setCols(rec.cols);
	}, []);

	const {
		state,
		resolvedState,
		handleMove,
		reset,
		isAnimating,
		activeExplosionKeys,
		activeCaptureKeys,
		activeExplosions,
		lastMove,
		moveHistory,
	} = useAtomRGame(rows, cols, 2, settingsResetToken);

	const containerRef = useRef<HTMLDivElement>(null);
	const [boardDims, setBoardDims] = useState<{ w: number; h: number } | null>(
		null,
	);
	const suggestionTimerRef = useRef<number | null>(null);
	const suggestionTaskRef = useRef<AiMoveTask | null>(null);

	const cancelSuggestionTask = useCallback(() => {
		suggestionTaskRef.current?.cancel();
		suggestionTaskRef.current = null;
	}, []);

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
	const boardKeyboardEnabled =
		!settingsOpen && !replayOpen && !state.winner && !state.isDraw;

	useEffect(() => {
		if (suggestionTimerRef.current !== null) {
			window.clearTimeout(suggestionTimerRef.current);
			suggestionTimerRef.current = null;
		}

		cancelSuggestionTask();
		setSuggestedMove(null);

		if (resolvedState.phase !== "idle") {
			return;
		}
		suggestionTimerRef.current = window.setTimeout(() => {
			suggestionTimerRef.current = null;
			const task = requestRecommendedMove(resolvedState, TRAINING_DIFFICULTY);
			suggestionTaskRef.current = task;
			void task.promise
				.then((nextSuggestedMove) => {
					if (suggestionTaskRef.current !== task) return;
					startTransition(() => {
						setSuggestedMove(nextSuggestedMove);
					});
				})
				.catch(() => {
					if (suggestionTaskRef.current !== task) return;
					startTransition(() => {
						setSuggestedMove(null);
					});
				})
				.finally(() => {
					if (suggestionTaskRef.current === task) {
						suggestionTaskRef.current = null;
					}
				});
		}, 0);

		return () => {
			if (suggestionTimerRef.current !== null) {
				window.clearTimeout(suggestionTimerRef.current);
				suggestionTimerRef.current = null;
			}
			cancelSuggestionTask();
		};
	}, [cancelSuggestionTask, resolvedState]);

	useEffect(() => {
		return () => {
			if (suggestionTimerRef.current !== null) {
				window.clearTimeout(suggestionTimerRef.current);
				suggestionTimerRef.current = null;
			}
			cancelSuggestionTask();
		};
	}, [cancelSuggestionTask]);

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

			<div
				className="relative mx-auto flex w-full shrink-0 flex-col"
				style={hudStyle}
			>
				<GameHud state={state} onSettingsOpen={() => setSettingsOpen(true)} />
			</div>

			<div
				ref={containerRef}
				className="relative flex min-h-0 flex-1 items-center justify-center"
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
						suggestedMove={suggestedMove}
						suggestedPlayer={resolvedState.currentPlayer}
						keyboardNavigationEnabled={boardKeyboardEnabled}
						canPlay={boardKeyboardEnabled}
						onPlay={(row, col) => handleMove({ row, col })}
					/>
					<GameOverlay
						state={state}
						onReset={reset}
						onReplay={
							moveHistory.length > 0 ? () => setReplayOpen(true) : undefined
						}
					/>
				</div>
			</div>

			<p
				className="relative shrink-0 text-center text-[10px] uppercase tracking-[0.3em]"
				style={{ color: "rgba(255,255,255,0.12)" }}
			>
				two-player coaching board · follow the ghost or ignore it and compare
			</p>

			<GameSettings
				open={settingsOpen}
				rows={rows}
				cols={cols}
				playerCount={2}
				onApply={(newRows, newCols) => {
					setRows(newRows);
					setCols(newCols);
					setSettingsResetToken((token) => token + 1);
				}}
				onClose={() => setSettingsOpen(false)}
			/>

			<ReplayPanel
				open={replayOpen}
				onClose={() => setReplayOpen(false)}
				moveHistory={moveHistory}
				rows={rows}
				cols={cols}
				playerCount={2}
			/>
		</main>
	);
}
