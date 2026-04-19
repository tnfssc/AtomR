import {
	useCallback,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from "react";
import { configForDifficulty } from "#/features/atomr/ai";
import {
	type AiMoveTask,
	requestCpuMove,
} from "#/features/atomr/ai-worker-client";
import { PLAYER_COLORS } from "#/features/atomr/constants";
import { useAtomRGame } from "#/features/atomr/useAtomRGame";
import { getRecommendedSize } from "#/features/atomr/utils/recommendedSize";
import AtomRBoard from "./AtomRBoard";
import GameHud from "./GameHud";
import GameOverlay from "./GameOverlay";
import GameSettings from "./GameSettings";

const PLAYER_NAMES = {
	p1: "Player",
	p2: "CPU",
} as const;

export default function AiPlayScreen() {
	const [rows, setRows] = useState(6);
	const [cols, setCols] = useState(9);
	const [difficulty, setDifficulty] = useState(5);
	const [settingsOpen, setSettingsOpen] = useState(false);
	const [isCpuThinking, setIsCpuThinking] = useState(false);
	const [settingsResetToken, setSettingsResetToken] = useState(0);

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
	} = useAtomRGame(rows, cols, 2, settingsResetToken);

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
		setIsCpuThinking(false);

		if (
			resolvedState.phase !== "idle" ||
			resolvedState.currentPlayer !== "p2"
		) {
			return;
		}

		const { thinkDelayMs } = configForDifficulty(difficulty);
		setIsCpuThinking(true);
		cpuTimerRef.current = window.setTimeout(() => {
			cpuTimerRef.current = null;
			const task = requestCpuMove(resolvedState, difficulty);
			cpuTaskRef.current = task;
			void task.promise
				.then((move) => {
					if (cpuTaskRef.current !== task) return;
					setIsCpuThinking(false);
					if (!move) return;
					handleMove(move);
				})
				.catch(() => {
					if (cpuTaskRef.current !== task) return;
					setIsCpuThinking(false);
				})
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
						onPlay={(row, col) => {
							if (isCpuThinking || resolvedState.currentPlayer !== "p1") return;
							handleMove({ row, col });
						}}
					/>
					<GameOverlay
						state={state}
						onReset={reset}
						playerNames={PLAYER_NAMES}
					/>
				</div>
			</div>

			<GameSettings
				open={settingsOpen}
				rows={rows}
				cols={cols}
				playerCount={2}
				difficulty={difficulty}
				onApply={(newRows, newCols, newDifficulty) => {
					clearCpuTimer();
					setIsCpuThinking(false);
					setRows(newRows);
					setCols(newCols);
					if (newDifficulty !== undefined) {
						setDifficulty(newDifficulty);
					}
					setSettingsResetToken((token) => token + 1);
				}}
				onClose={() => setSettingsOpen(false)}
			/>
		</main>
	);
}
