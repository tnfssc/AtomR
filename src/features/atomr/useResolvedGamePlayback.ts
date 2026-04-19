import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getCapacity } from "./engine";
import type {
	Board,
	GameState,
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

type ActiveExplosion = {
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

	return { board: next, captureKeys: [...captureKeys] };
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
			if (!cell.owner || cell.count < capacity) continue;

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

export function useResolvedGamePlayback(externalState: GameState) {
	const [resolvedState, setResolvedState] = useState<GameState>(externalState);
	const [displayedState, setDisplayedState] =
		useState<GameState>(externalState);
	const [activeExplosionKeys, setActiveExplosionKeys] = useState<string[]>([]);
	const [activeCaptureKeys, setActiveCaptureKeys] = useState<string[]>([]);
	const [activeExplosions, setActiveExplosions] = useState<ActiveExplosion[]>(
		[],
	);
	const timersRef = useRef<number[]>([]);
	const animationCycleRef = useRef(0);
	const isAnimatingRef = useRef(false);
	const previousSnapshotRef = useRef({
		turnNumber: externalState.turnNumber,
		rows: externalState.rows,
		cols: externalState.cols,
	});

	const clearPlaybackTimers = useCallback(() => {
		for (const timer of timersRef.current) window.clearTimeout(timer);
		timersRef.current = [];
		isAnimatingRef.current = false;
	}, []);

	useEffect(() => {
		return () => {
			for (const timer of timersRef.current) window.clearTimeout(timer);
			timersRef.current = [];
		};
	}, []);

	useEffect(() => {
		const previous = previousSnapshotRef.current;
		const turnChanged = externalState.turnNumber !== previous.turnNumber;
		const dimensionsChanged =
			externalState.rows !== previous.rows ||
			externalState.cols !== previous.cols;
		const turnWentBack = externalState.turnNumber < previous.turnNumber;

		if (dimensionsChanged || turnWentBack) {
			clearPlaybackTimers();
			setResolvedState(externalState);
			setDisplayedState(externalState);
			setActiveExplosionKeys([]);
			setActiveCaptureKeys([]);
			setActiveExplosions([]);
		} else if (!turnChanged) {
			setResolvedState(externalState);
			if (!isAnimatingRef.current) {
				setDisplayedState(externalState);
			}
		}

		previousSnapshotRef.current = {
			turnNumber: externalState.turnNumber,
			rows: externalState.rows,
			cols: externalState.cols,
		};
	}, [externalState, clearPlaybackTimers]);

	const playEvents = useCallback(
		(events: ResolutionEvent[], nextState: GameState, initialBoard: Board) => {
			clearPlaybackTimers();
			isAnimatingRef.current = true;
			setDisplayedState((state) => ({ ...state, phase: "resolving" }));
			if (events.length === 0) {
				isAnimatingRef.current = false;
				setDisplayedState(nextState);
				setResolvedState(nextState);
				return;
			}

			const steps = buildPlaybackSteps(
				events,
				initialBoard,
				nextState.rows,
				nextState.cols,
			);
			let elapsedMs = 0;
			for (const step of steps) {
				const timer = window.setTimeout(() => {
					const animKey = ++animationCycleRef.current;
					setDisplayedState((s) => ({
						...s,
						board: step.board,
						phase: "resolving",
					}));
					setActiveExplosionKeys(step.explosionKeys);
					setActiveCaptureKeys(step.captureKeys);
					setActiveExplosions(
						step.explosions.map((explosion) => ({ ...explosion, animKey })),
					);
				}, elapsedMs);
				timersRef.current.push(timer);
				elapsedMs += step.durationMs;
			}

			const finalizeTimer = window.setTimeout(() => {
				isAnimatingRef.current = false;
				setDisplayedState(nextState);
				setResolvedState(nextState);
				setActiveExplosionKeys([]);
				setActiveCaptureKeys([]);
				setActiveExplosions([]);
			}, elapsedMs + 60);
			timersRef.current.push(finalizeTimer);
		},
		[clearPlaybackTimers],
	);

	const resetToState = useCallback(
		(nextState: GameState) => {
			clearPlaybackTimers();
			setDisplayedState(nextState);
			setResolvedState(nextState);
			setActiveExplosionKeys([]);
			setActiveCaptureKeys([]);
			setActiveExplosions([]);
		},
		[clearPlaybackTimers],
	);

	return useMemo(
		() => ({
			state: displayedState,
			resolvedState,
			isAnimating: displayedState.phase === "resolving",
			activeExplosionKeys,
			activeCaptureKeys,
			activeExplosions,
			playEvents,
			resetToState,
		}),
		[
			displayedState,
			resolvedState,
			activeExplosionKeys,
			activeCaptureKeys,
			activeExplosions,
			playEvents,
			resetToState,
		],
	);
}

export type { ActiveExplosion };
