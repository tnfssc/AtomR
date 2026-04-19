import {
	type ApplyMoveResult,
	type Board,
	type Cell,
	clampPlayerCount,
	createPlayerFlags,
	DEFAULT_COLS,
	DEFAULT_ROWS,
	type GameState,
	getActivePlayerOrder,
	type PlayerFlags,
	type PlayerId,
	type Position,
	type ResolutionEvent,
} from "./shared";

function getPositionKey(row: number, col: number): string {
	return `${row}:${col}`;
}

function createCell(): Cell {
	return {
		owner: null,
		count: 0,
	};
}

function cloneBoard(board: Board): Board {
	return board.map((row) => row.map((cell) => ({ ...cell })));
}

const MAX_RESOLUTION_STEPS = 2048;

function isInBounds(
	row: number,
	col: number,
	rows: number,
	cols: number,
): boolean {
	return row >= 0 && row < rows && col >= 0 && col < cols;
}

export function createInitialBoard(
	rows = DEFAULT_ROWS,
	cols = DEFAULT_COLS,
): Board {
	return Array.from({ length: rows }, () =>
		Array.from({ length: cols }, () => createCell()),
	);
}

export function createInitialGameState(
	rows = DEFAULT_ROWS,
	cols = DEFAULT_COLS,
	playerCount = 2,
): GameState {
	const activePlayers = getActivePlayerOrder(playerCount);
	return {
		board: createInitialBoard(rows, cols),
		rows,
		cols,
		playerCount: clampPlayerCount(playerCount),
		currentPlayer: activePlayers[0] ?? "p1",
		turnNumber: 0,
		hasPlayed: createPlayerFlags(false),
		eliminated: createPlayerFlags(false),
		winner: null,
		isDraw: false,
		drawReason: null,
		phase: "idle",
	};
}

export function getCapacity(
	row: number,
	col: number,
	rows: number,
	cols: number,
): number {
	if (!isInBounds(row, col, rows, cols)) {
		throw new Error("Cell is out of bounds");
	}

	let capacity = 4;
	if (row === 0 || row === rows - 1) capacity -= 1;
	if (col === 0 || col === cols - 1) capacity -= 1;
	return capacity;
}

function getNeighbors(
	row: number,
	col: number,
	rows: number,
	cols: number,
): Position[] {
	const neighbors: Position[] = [];
	const directions = [
		{ row: -1, col: 0 },
		{ row: 0, col: 1 },
		{ row: 1, col: 0 },
		{ row: 0, col: -1 },
	];

	for (const direction of directions) {
		const nextRow = row + direction.row;
		const nextCol = col + direction.col;
		if (isInBounds(nextRow, nextCol, rows, cols)) {
			neighbors.push({ row: nextRow, col: nextCol });
		}
	}

	return neighbors;
}

export function countPlayerOrbs(board: Board, playerId: PlayerId): number {
	return board.reduce((total, row) => {
		return (
			total +
			row.reduce((rowTotal, cell) => {
				if (cell.owner !== playerId) return rowTotal;
				return rowTotal + cell.count;
			}, 0)
		);
	}, 0);
}

export function allPlayersHavePlayed(
	state: Pick<GameState, "hasPlayed" | "playerCount">,
): boolean {
	return getActivePlayerOrder(state.playerCount).every(
		(playerId) => state.hasPlayed[playerId] ?? false,
	);
}

export function recomputeEliminations(
	state: Pick<GameState, "board" | "hasPlayed" | "playerCount">,
): PlayerFlags {
	if (!allPlayersHavePlayed(state)) {
		return createPlayerFlags(false);
	}

	const eliminated = createPlayerFlags(false);
	for (const playerId of getActivePlayerOrder(state.playerCount)) {
		eliminated[playerId] = countPlayerOrbs(state.board, playerId) === 0;
	}
	return eliminated;
}

export function recomputeWinner(
	state: Pick<GameState, "board" | "eliminated" | "hasPlayed" | "playerCount">,
): PlayerId | null {
	if (!allPlayersHavePlayed(state)) {
		return null;
	}

	const activePlayers = getActivePlayerOrder(state.playerCount).filter(
		(playerId) => {
			return (
				!(state.eliminated[playerId] ?? false) &&
				countPlayerOrbs(state.board, playerId) > 0
			);
		},
	);

	return activePlayers.length === 1 ? activePlayers[0] : null;
}

function getResolvedWinnerFromBoard(
	board: Board,
	hasPlayed: PlayerFlags,
	playerCount: number,
): PlayerId | null {
	const eliminated = recomputeEliminations({
		board,
		hasPlayed,
		playerCount,
	});

	return recomputeWinner({
		board,
		eliminated,
		hasPlayed,
		playerCount,
	});
}

export function getNextPlayer(
	state: Pick<GameState, "currentPlayer" | "eliminated" | "playerCount">,
): PlayerId {
	const activePlayers = getActivePlayerOrder(state.playerCount);
	const currentIndex = activePlayers.indexOf(state.currentPlayer);

	for (let offset = 1; offset <= activePlayers.length; offset += 1) {
		const nextPlayer =
			activePlayers[(currentIndex + offset) % activePlayers.length];
		if (nextPlayer && !(state.eliminated[nextPlayer] ?? false)) {
			return nextPlayer;
		}
	}

	return state.currentPlayer;
}

export function isLegalMove(
	state: Pick<GameState, "board" | "rows" | "cols" | "currentPlayer" | "phase">,
	row: number,
	col: number,
): boolean {
	if (state.phase === "gameOver") return false;
	if (!isInBounds(row, col, state.rows, state.cols)) return false;
	const cell = state.board[row][col];
	return cell.owner === null || cell.owner === state.currentPlayer;
}

export function getLegalMoves(
	state: Pick<GameState, "board" | "rows" | "cols" | "currentPlayer" | "phase">,
): Position[] {
	const positions: Position[] = [];
	for (let row = 0; row < state.rows; row += 1) {
		for (let col = 0; col < state.cols; col += 1) {
			if (isLegalMove(state, row, col)) {
				positions.push({ row, col });
			}
		}
	}
	return positions;
}

export function pickRandomLegalMove(
	state: Pick<GameState, "board" | "rows" | "cols" | "currentPlayer" | "phase">,
	random = Math.random,
): Position | null {
	const legalMoves = getLegalMoves(state);
	if (legalMoves.length === 0) return null;
	const index = Math.min(
		legalMoves.length - 1,
		Math.floor(random() * legalMoves.length),
	);
	return legalMoves[index] ?? null;
}

function resolveBoard(
	board: Board,
	rows: number,
	cols: number,
	currentPlayer: PlayerId,
	playerCount: number,
	hasPlayed: PlayerFlags,
	queue: Position[],
	events: ResolutionEvent[],
): { didLoop: boolean; winner: PlayerId | null } {
	const queued = new Set(
		queue.map((position) => getPositionKey(position.row, position.col)),
	);
	let queueIndex = 0;
	let explosionCount = 0;
	const seen = new Set<string>();

	function boardKey() {
		const parts: string[] = [];
		for (let row = 0; row < rows; row += 1) {
			for (let col = 0; col < cols; col += 1) {
				const cell = board[row][col];
				parts.push(`${cell.owner ?? "n"}${cell.count}`);
			}
		}
		return parts.join("|");
	}

	function pendingQueueKey() {
		return queue
			.slice(queueIndex)
			.map((position) => getPositionKey(position.row, position.col))
			.join(",");
	}

	function resolutionKey() {
		return `${boardKey()}#${pendingQueueKey()}`;
	}

	seen.add(resolutionKey());

	function enqueue(row: number, col: number) {
		const key = getPositionKey(row, col);
		if (queued.has(key)) return;
		queued.add(key);
		queue.push({ row, col });
	}

	while (queueIndex < queue.length) {
		const current = queue[queueIndex];
		queueIndex += 1;
		queued.delete(getPositionKey(current.row, current.col));
		if (!current) continue;

		const cell = board[current.row][current.col];
		const capacity = getCapacity(current.row, current.col, rows, cols);
		if (cell.count < capacity) continue;
		explosionCount += 1;

		events.push({
			type: "explode",
			row: current.row,
			col: current.col,
			player: currentPlayer,
			affected: getNeighbors(current.row, current.col, rows, cols),
		});

		cell.count -= capacity;
		cell.owner = cell.count === 0 ? null : currentPlayer;

		for (const neighbor of getNeighbors(current.row, current.col, rows, cols)) {
			const neighborCell = board[neighbor.row][neighbor.col];
			if (neighborCell.owner !== null && neighborCell.owner !== currentPlayer) {
				events.push({
					type: "capture",
					row: neighbor.row,
					col: neighbor.col,
					player: currentPlayer,
				});
			}

			neighborCell.owner = currentPlayer;
			neighborCell.count += 1;

			if (
				neighborCell.count >=
				getCapacity(neighbor.row, neighbor.col, rows, cols)
			) {
				enqueue(neighbor.row, neighbor.col);
			}
		}

		if (cell.count >= capacity) {
			enqueue(current.row, current.col);
		}

		if (explosionCount >= MAX_RESOLUTION_STEPS) {
			return { didLoop: true, winner: null };
		}

		const nextKey = resolutionKey();
		if (seen.has(nextKey)) {
			return { didLoop: true, winner: null };
		}
		seen.add(nextKey);

		const winner = getResolvedWinnerFromBoard(board, hasPlayed, playerCount);
		if (winner) {
			return { didLoop: false, winner };
		}
	}

	return { didLoop: false, winner: null };
}

export function applyMove(
	state: GameState,
	row: number,
	col: number,
): ApplyMoveResult {
	if (!isLegalMove(state, row, col)) {
		throw new Error("Illegal move");
	}

	const board = cloneBoard(state.board);
	const events: ResolutionEvent[] = [];
	const targetCell = board[row][col];

	targetCell.owner = state.currentPlayer;
	targetCell.count += 1;

	events.push({
		type: "place",
		row,
		col,
		player: state.currentPlayer,
	});

	const queue: Position[] = [];
	const hasPlayed: PlayerFlags = {
		...state.hasPlayed,
		[state.currentPlayer]: true,
	};

	if (targetCell.count >= getCapacity(row, col, state.rows, state.cols)) {
		queue.push({ row, col });
	}

	const resolution = resolveBoard(
		board,
		state.rows,
		state.cols,
		state.currentPlayer,
		state.playerCount,
		hasPlayed,
		queue,
		events,
	);

	if (resolution.didLoop) {
		return {
			state: {
				...state,
				board,
				turnNumber: state.turnNumber + 1,
				hasPlayed,
				eliminated: createPlayerFlags(false),
				winner: null,
				isDraw: true,
				drawReason: "unstableLoop",
				phase: "gameOver",
			},
			events: [],
		};
	}

	if (resolution.winner) {
		const eliminated = recomputeEliminations({
			board,
			hasPlayed,
			playerCount: state.playerCount,
		});

		return {
			state: {
				...state,
				board,
				turnNumber: state.turnNumber + 1,
				hasPlayed,
				eliminated,
				winner: resolution.winner,
				isDraw: false,
				drawReason: null,
				currentPlayer: state.currentPlayer,
				phase: "gameOver",
			},
			events,
		};
	}

	const eliminated = recomputeEliminations({
		board,
		hasPlayed,
		playerCount: state.playerCount,
	});
	const resolvedWinner = recomputeWinner({
		board,
		eliminated,
		hasPlayed,
		playerCount: state.playerCount,
	});

	const nextState: GameState = {
		...state,
		board,
		turnNumber: state.turnNumber + 1,
		hasPlayed,
		eliminated,
		winner: resolvedWinner,
		isDraw: false,
		drawReason: null,
		currentPlayer: resolvedWinner
			? state.currentPlayer
			: getNextPlayer({
					currentPlayer: state.currentPlayer,
					eliminated,
					playerCount: state.playerCount,
				}),
		phase: resolvedWinner ? "gameOver" : "idle",
	};

	return {
		state: nextState,
		events,
	};
}
