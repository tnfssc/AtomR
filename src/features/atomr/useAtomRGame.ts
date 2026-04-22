import { useCallback, useEffect, useRef, useState } from "react";
import {
	applyMove,
	createInitialGameState,
	getCapacity,
	isLegalMove,
} from "./engine";
import type {
	Board,
	GameState,
	LastMove,
	PlayerId,
	Position,
	ResolutionEvent,
} from "./types";

function applyEventToBoard(board: Board, event: ResolutionEvent): Board {
	const next = board.map((r) => r.map((c) => ({ ...c })));
	if (event.type === "place") {
		next[event.row][event.col] = {
			owner: event.player,
			count: next[event.row][event.col].count + 1,
		};
	} else if (event.type === "capture") {
		// Only changes ownership — the orb count was already incremented by the explode event
		next[event.row][event.col].owner = event.player;
	} else if (event.type === "explode") {
		const numNeighbors = event.affected.length;
		const newCount = Math.max(
			0,
			next[event.row][event.col].count - numNeighbors,
		);
		next[event.row][event.col] = {
			owner: newCount === 0 ? null : event.player,
			count: newCount,
		};
		for (const pos of event.affected) {
			next[pos.row][pos.col] = {
				owner: event.player,
				count: next[pos.row][pos.col].count + 1,
			};
		}
	}
	return next;
}

function cloneBoard(board: Board): Board {
	return board.map((row) => row.map((cell) => ({ ...cell })));
}

export type ActiveExplosion = {
	row: number;
	col: number;
	player: PlayerId;
	affected: Position[];
	animKey: number;
};

type SimulatedExplosion = Omit<ActiveExplosion, "animKey">;

type PlaybackStep = {
	board: Board;
	explosionKeys: string[];
	captureKeys: string[];
	explosions: SimulatedExplosion[];
	durationMs: number;
};

type Coordinates = { row: number; col: number };
type HistorySnapshot = {
	state: GameState;
	lastMove: LastMove | null;
};
type UseAtomRGameOptions = {
	enableHistory?: boolean;
};

function getPositionKey(row: number, col: number) {
	return `${row}:${col}`;
}

function applySimultaneousWave(
	board: Board,
	rows: number,
	cols: number,
	explosions: SimulatedExplosion[],
) {
	const next = cloneBoard(board);
	const explodingSet = new Set(explosions.map((e) => `${e.row}:${e.col}`));
	const captureKeys = new Set<string>();

	for (const explosion of explosions) {
		const cell = next[explosion.row][explosion.col];
		const capacity = getCapacity(explosion.row, explosion.col, rows, cols);
		cell.count = Math.max(0, cell.count - capacity);
		cell.owner = cell.count === 0 ? null : explosion.player;
	}

	for (const explosion of explosions) {
		for (const pos of explosion.affected) {
			const cell = next[pos.row][pos.col];
			cell.owner = explosion.player;
			cell.count += 1;
			if (!explodingSet.has(`${pos.row}:${pos.col}`)) {
				captureKeys.add(`${pos.row}:${pos.col}`);
			}
		}
	}

	return {
		board: next,
		captureKeys: [...captureKeys],
	};
}

function buildPlaybackSteps(
	events: ResolutionEvent[],
	initialBoard: Board,
	rows: number,
	cols: number,
): PlaybackStep[] {
	const steps: PlaybackStep[] = [];
	const placeEvent = events.find(
		(event): event is Extract<ResolutionEvent, { type: "place" }> =>
			event.type === "place",
	);
	const explodeEvents = events.filter(
		(event): event is Extract<ResolutionEvent, { type: "explode" }> =>
			event.type === "explode",
	);

	let runningBoard = cloneBoard(initialBoard);
	const queue: Position[] = [];
	const queued = new Set<string>();
	let explodeIndex = 0;

	function enqueue(position: Position) {
		const key = getPositionKey(position.row, position.col);
		if (queued.has(key)) return;
		queued.add(key);
		queue.push(position);
	}

	if (placeEvent) {
		runningBoard = applyEventToBoard(runningBoard, placeEvent);
		steps.push({
			board: cloneBoard(runningBoard),
			explosionKeys: [],
			captureKeys: [],
			explosions: [],
			durationMs: 90,
		});

		const placedCell = runningBoard[placeEvent.row][placeEvent.col];
		if (
			placedCell.owner === placeEvent.player &&
			placedCell.count >=
				getCapacity(placeEvent.row, placeEvent.col, rows, cols)
		) {
			enqueue({ row: placeEvent.row, col: placeEvent.col });
		}
	}

	while (queue.length > 0 && explodeIndex < explodeEvents.length) {
		const waveStartBoard = cloneBoard(runningBoard);
		const waveSize = queue.length;
		const explosions: SimulatedExplosion[] = [];

		for (let i = 0; i < waveSize; i += 1) {
			const current = queue.shift();
			if (!current) continue;
			queued.delete(getPositionKey(current.row, current.col));

			const cell = runningBoard[current.row][current.col];
			const capacity = getCapacity(current.row, current.col, rows, cols);
			if (!cell.owner || cell.count < capacity) {
				continue;
			}

			const explodeEvent = explodeEvents[explodeIndex];
			if (!explodeEvent) break;

			explodeIndex += 1;
			explosions.push({
				row: explodeEvent.row,
				col: explodeEvent.col,
				player: explodeEvent.player,
				affected: explodeEvent.affected,
			});

			runningBoard = applyEventToBoard(runningBoard, explodeEvent);

			for (const neighbor of explodeEvent.affected) {
				const neighborCell = runningBoard[neighbor.row][neighbor.col];
				if (
					neighborCell.owner === explodeEvent.player &&
					neighborCell.count >=
						getCapacity(neighbor.row, neighbor.col, rows, cols)
				) {
					enqueue(neighbor);
				}
			}

			const currentCell = runningBoard[current.row][current.col];
			if (
				currentCell.owner === explodeEvent.player &&
				currentCell.count >= getCapacity(current.row, current.col, rows, cols)
			) {
				enqueue(current);
			}
		}

		if (explosions.length === 0) continue;

		const explodingSet = new Set(
			explosions.map((explosion) =>
				getPositionKey(explosion.row, explosion.col),
			),
		);
		const visibleExplosions = explosions.map((explosion) => ({
			...explosion,
			affected: explosion.affected.filter(
				(position) =>
					!explodingSet.has(getPositionKey(position.row, position.col)),
			),
		}));
		const launchBoard = applySimultaneousWave(
			waveStartBoard,
			rows,
			cols,
			visibleExplosions,
		).board;
		const captureKeys = [
			...new Set(
				visibleExplosions.flatMap((explosion) =>
					explosion.affected.map((position) =>
						getPositionKey(position.row, position.col),
					),
				),
			),
		];

		steps.push({
			board: launchBoard,
			explosionKeys: explosions.map((explosion) =>
				getPositionKey(explosion.row, explosion.col),
			),
			captureKeys: [],
			explosions: visibleExplosions,
			durationMs: 180,
		});

		steps.push({
			board: cloneBoard(runningBoard),
			explosionKeys: [],
			captureKeys,
			explosions: [],
			durationMs: 120,
		});
	}

	return steps;
}

export function useAtomRGame(
	rows = 6,
	cols = 9,
	playerCount = 2,
	resetToken = 0,
	options: UseAtomRGameOptions = {},
) {
	const enableHistory = options.enableHistory ?? false;
	const [resolvedState, setResolvedState] = useState<GameState>(() =>
		createInitialGameState(rows, cols, playerCount),
	);
	const [displayedState, setDisplayedState] = useState<GameState>(() =>
		createInitialGameState(rows, cols, playerCount),
	);
	const [activeExplosionKeys, setActiveExplosionKeys] = useState<string[]>([]);
	const [activeCaptureKeys, setActiveCaptureKeys] = useState<string[]>([]);
	const [activeExplosions, setActiveExplosions] = useState<ActiveExplosion[]>(
		[],
	);
	const [lastMove, setLastMove] = useState<LastMove | null>(null);
	const timersRef = useRef<number[]>([]);
	const historyRef = useRef<HistorySnapshot[]>([]);
	const animationCycleRef = useRef(0);
	const isAnimatingRef = useRef(false);
	const didMountRef = useRef(false);
	const [canUndo, setCanUndo] = useState(false);

	const isAnimating = resolvedState.phase === "resolving";

	function clearPlaybackTimers() {
		for (const timer of timersRef.current) window.clearTimeout(timer);
		timersRef.current = [];
		isAnimatingRef.current = false;
	}

	const clearHistory = useCallback(() => {
		historyRef.current = [];
		setCanUndo(false);
	}, []);

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			for (const timer of timersRef.current) window.clearTimeout(timer);
			timersRef.current = [];
		};
	}, []);

	// Reset when board dimensions change or a caller requests a hard reset
	useEffect(() => {
		void resetToken;

		if (!didMountRef.current) {
			didMountRef.current = true;
			return;
		}
		for (const t of timersRef.current) window.clearTimeout(t);
		timersRef.current = [];
		isAnimatingRef.current = false;
		const initialState = createInitialGameState(rows, cols, playerCount);
		setResolvedState(initialState);
		setDisplayedState(initialState);
		setActiveExplosionKeys([]);
		setActiveCaptureKeys([]);
		setActiveExplosions([]);
		setLastMove(null);
		clearHistory();
	}, [rows, cols, playerCount, resetToken]);

	function finishPlayback(nextState: GameState) {
		isAnimatingRef.current = false;
		setDisplayedState(nextState);
		setResolvedState(nextState);
		setActiveExplosionKeys([]);
		setActiveCaptureKeys([]);
		setActiveExplosions([]);
	}

	function playEvents(
		events: ResolutionEvent[],
		nextState: GameState,
		initialBoard: Board,
	) {
		clearPlaybackTimers();
		isAnimatingRef.current = true;

		setResolvedState((s) => ({ ...s, phase: "resolving" }));
		setDisplayedState((s) => ({ ...s, phase: "resolving" }));

		if (events.length === 0) {
			const t = window.setTimeout(() => finishPlayback(nextState), 120);
			timersRef.current.push(t);
			return;
		}

		let steps: PlaybackStep[];
		try {
			steps = buildPlaybackSteps(
				events,
				initialBoard,
				nextState.rows,
				nextState.cols,
			);
		} catch {
			const fallbackTimer = window.setTimeout(
				() => finishPlayback(nextState),
				0,
			);
			timersRef.current.push(fallbackTimer);
			return;
		}

		let elapsedMs = 0;
		for (const step of steps) {
			const timer = window.setTimeout(() => {
				const animKey = ++animationCycleRef.current;
				setDisplayedState((s) => ({ ...s, board: step.board }));
				setActiveExplosionKeys(step.explosionKeys);
				setActiveCaptureKeys(step.captureKeys);
				setActiveExplosions(
					step.explosions.map((explosion) => ({ ...explosion, animKey })),
				);
			}, elapsedMs);
			timersRef.current.push(timer);
			elapsedMs += step.durationMs;
		}

		const finalizeTimer = window.setTimeout(
			() => finishPlayback(nextState),
			elapsedMs + 60,
		);
		timersRef.current.push(finalizeTimer);
	}

	function handleMove({ row, col }: Coordinates) {
		if (!isLegalMove(displayedState, row, col) || isAnimatingRef.current)
			return;
		if (enableHistory) {
			historyRef.current = [
				...historyRef.current,
				{
					state: resolvedState,
					lastMove,
				},
			];
			setCanUndo(true);
		}
		const result = applyMove(displayedState, row, col);
		setLastMove({
			row,
			col,
			player: displayedState.currentPlayer,
			turnNumber: displayedState.turnNumber + 1,
			didExplode: result.events.some((event) => event.type === "explode"),
		});
		playEvents(result.events, result.state, displayedState.board);
	}

	function undo(moveCount = 1) {
		if (!enableHistory || moveCount < 1) return 0;
		const steps = Math.min(moveCount, historyRef.current.length);
		if (steps === 0) return 0;

		clearPlaybackTimers();
		const snapshot = historyRef.current.at(-steps);
		if (!snapshot) return 0;

		historyRef.current = historyRef.current.slice(0, -steps);
		setCanUndo(historyRef.current.length > 0);
		setResolvedState(snapshot.state);
		setDisplayedState(snapshot.state);
		setActiveExplosionKeys([]);
		setActiveCaptureKeys([]);
		setActiveExplosions([]);
		setLastMove(snapshot.lastMove);
		return steps;
	}

	function reset() {
		clearPlaybackTimers();
		const initialState = createInitialGameState(rows, cols, playerCount);
		setResolvedState(initialState);
		setDisplayedState(initialState);
		setActiveExplosionKeys([]);
		setActiveCaptureKeys([]);
		setActiveExplosions([]);
		setLastMove(null);
		clearHistory();
	}

	return {
		state: displayedState,
		resolvedState,
		isAnimating,
		activeExplosionKeys,
		activeCaptureKeys,
		activeExplosions,
		lastMove,
		canUndo,
		handleMove,
		undo,
		reset,
	};
}
