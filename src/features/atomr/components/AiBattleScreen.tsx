import {
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { configForDifficulty } from "#/features/atomr/ai";
import {
	type AiMoveTask,
	requestCpuMove,
} from "#/features/atomr/ai-worker-client";
import {
	getActivePlayerOrder,
	PLAYER_COLORS,
} from "#/features/atomr/constants";
import type { PlayerId } from "#/features/atomr/types";
import { useAtomRGame } from "#/features/atomr/useAtomRGame";
import { getRecommendedSize } from "#/features/atomr/utils/recommendedSize";
import AtomRBoard from "./AtomRBoard";
import GameHud from "./GameHud";
import GameOverlay from "./GameOverlay";
import GameSettings from "./GameSettings";
import ReplayPanel from "./ReplayPanel";

function getAiNames(playerCount: number): Partial<Record<PlayerId, string>> {
	return Object.fromEntries(
		getActivePlayerOrder(playerCount).map((playerId, index) => [
			playerId,
			`CPU ${index + 1}`,
		]),
	) as Partial<Record<PlayerId, string>>;
}

export default function AiBattleScreen() {
	const [rows, setRows] = useState(6);
	const [cols, setCols] = useState(9);
	const [playerCount, setPlayerCount] = useState(4);
	const [difficulty, setDifficulty] = useState(6);
	const [settingsOpen, setSettingsOpen] = useState(false);
	const [settingsResetToken, setSettingsResetToken] = useState(0);
	const [replayOpen, setReplayOpen] = useState(false);

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
	} = useAtomRGame(rows, cols, playerCount, settingsResetToken);

	const cpuTimerRef = useRef<number | null>(null);
	const cpuTaskRef = useRef<AiMoveTask | null>(null);

	const clearCpuTimer = useCallback(() => {
		if (cpuTimerRef.current !== null) {
			window.clearTimeout(cpuTimerRef.current);
			cpuTimerRef.current = null;
		}
	}, []);

	const cancelCpuTask = useCallback(() => {
		cpuTaskRef.current?.cancel();
		cpuTaskRef.current = null;
	}, []);

	useEffect(() => {
		clearCpuTimer();
		cancelCpuTask();

		if (
			resolvedState.phase !== "idle" ||
			resolvedState.winner ||
			resolvedState.isDraw
		) {
			return;
		}

		const { thinkDelayMs } = configForDifficulty(difficulty);
		cpuTimerRef.current = window.setTimeout(() => {
			cpuTimerRef.current = null;
			const task = requestCpuMove(resolvedState, difficulty);
			cpuTaskRef.current = task;
			void task.promise
				.then((move) => {
					if (cpuTaskRef.current !== task) return;
					if (!move) return;
					handleMove(move);
				})
				.catch(() => {})
				.finally(() => {
					if (cpuTaskRef.current === task) {
						cpuTaskRef.current = null;
					}
				});
		}, thinkDelayMs);

		return () => {
			clearCpuTimer();
			cancelCpuTask();
		};
	}, [cancelCpuTask, clearCpuTimer, difficulty, handleMove, resolvedState]);

	useEffect(() => {
		return () => {
			clearCpuTimer();
			cancelCpuTask();
		};
	}, [cancelCpuTask, clearCpuTimer]);

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
	const playerNames = useMemo(() => getAiNames(playerCount), [playerCount]);
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
						keyboardNavigationEnabled={false}
						canPlay={false}
						onPlay={() => {}}
					/>
					<GameOverlay
						state={state}
						onReset={reset}
						resetLabel="run again"
						playerNames={playerNames}
						onReplay={
							moveHistory.length > 0 ? () => setReplayOpen(true) : undefined
						}
					/>
				</div>
			</div>
			<GameSettings
				open={settingsOpen}
				rows={rows}
				cols={cols}
				playerCount={playerCount}
				playerCountLocked={false}
				difficulty={difficulty}
				onApply={(newRows, newCols, newDifficulty, newPlayerCount) => {
					clearCpuTimer();
					cancelCpuTask();
					setRows(newRows);
					setCols(newCols);
					if (newDifficulty !== undefined) {
						setDifficulty(newDifficulty);
					}
					if (newPlayerCount !== undefined) {
						setPlayerCount(newPlayerCount);
					}
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
				playerCount={playerCount}
				playerNames={playerNames}
			/>
		</main>
	);
}
