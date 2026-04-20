import { applyMove, getCapacity, getLegalMoves } from "./engine";
import { getActivePlayerOrder } from "./shared";
import type { GameState, PlayerId, Position } from "./types";

export type AiConfig = {
	depth: number;
	candidateLimit: number;
	mistakeProbability: number;
	softmaxTemperature: number;
	thinkDelayMs: number;
};

export type ScoredMove = {
	move: Position;
	value: number;
};

export type CpuSearchPlan = {
	difficulty: number;
	config: AiConfig;
	legalMoves: Position[];
	orderedMoves: Position[];
};

type MoveSelectionOptions = {
	allowMistakes: boolean;
	maxNodes?: number;
	maxThinkMs?: number;
};

type SearchControl = {
	nodes: number;
	exhausted: boolean;
	maxNodes?: number;
	deadlineAt?: number;
};

const NEIGHBOR_DIRECTIONS = [
	[-1, 0],
	[1, 0],
	[0, -1],
	[0, 1],
] as const;

function isCorner(row: number, col: number, rows: number, cols: number) {
	return (row === 0 || row === rows - 1) && (col === 0 || col === cols - 1);
}

function isEdge(row: number, col: number, rows: number, cols: number) {
	return row === 0 || row === rows - 1 || col === 0 || col === cols - 1;
}

function countImmediateThreats(
	state: GameState,
	row: number,
	col: number,
	playerId: PlayerId,
): number {
	let threats = 0;

	for (const [rowOffset, colOffset] of NEIGHBOR_DIRECTIONS) {
		const neighborRow = row + rowOffset;
		const neighborCol = col + colOffset;
		if (
			neighborRow < 0 ||
			neighborCol < 0 ||
			neighborRow >= state.rows ||
			neighborCol >= state.cols
		) {
			continue;
		}

		const neighbor = state.board[neighborRow][neighborCol];
		if (!neighbor.owner || neighbor.owner === playerId) {
			continue;
		}

		if (state.eliminated[neighbor.owner] ?? false) {
			continue;
		}

		const neighborCapacity = getCapacity(
			neighborRow,
			neighborCol,
			state.rows,
			state.cols,
		);
		if (neighbor.count === neighborCapacity - 1) {
			threats += 1;
		}
	}

	return threats;
}

function countFriendlySupport(
	state: GameState,
	row: number,
	col: number,
	playerId: PlayerId,
): number {
	let support = 0;

	for (const [rowOffset, colOffset] of NEIGHBOR_DIRECTIONS) {
		const neighborRow = row + rowOffset;
		const neighborCol = col + colOffset;
		if (
			neighborRow < 0 ||
			neighborCol < 0 ||
			neighborRow >= state.rows ||
			neighborCol >= state.cols
		) {
			continue;
		}

		const neighbor = state.board[neighborRow][neighborCol];
		if (neighbor.owner !== playerId || neighbor.count === 0) {
			continue;
		}

		const neighborCapacity = getCapacity(
			neighborRow,
			neighborCol,
			state.rows,
			state.cols,
		);
		support += neighbor.count === neighborCapacity - 1 ? 2 : 1;
	}

	return support;
}

function evaluateState(state: GameState, perspective: PlayerId): number {
	if (state.isDraw) return 0;
	if (state.winner === perspective) return 1_000_000;
	if (state.winner && state.winner !== perspective) return -1_000_000;

	let total = 0;
	const activePlayers = getActivePlayerOrder(state.playerCount);

	for (let row = 0; row < state.rows; row += 1) {
		for (let col = 0; col < state.cols; col += 1) {
			const cell = state.board[row][col];
			if (!cell.owner || cell.count === 0) continue;

			const sign = cell.owner === perspective ? 1 : -1;
			const capacity = getCapacity(row, col, state.rows, state.cols);
			const critical = cell.count === capacity - 1;
			const threats = countImmediateThreats(state, row, col, cell.owner);
			const support = countFriendlySupport(state, row, col, cell.owner);
			const reserve = capacity - cell.count;

			let positional = 0;
			if (isCorner(row, col, state.rows, state.cols)) positional = 8;
			else if (isEdge(row, col, state.rows, state.cols)) positional = 3;

			let survival = support * 4 - threats * (10 + reserve * 4);
			if (threats === 0) {
				survival += Math.max(0, cell.count - 1) * 2;
			} else if (cell.count === 1) {
				survival -= 8;
			}

			total +=
				sign * (cell.count * 6 + positional + (critical ? 9 : 0) + survival);

			if (!critical) continue;

			for (const [rowOffset, colOffset] of NEIGHBOR_DIRECTIONS) {
				const nr = row + rowOffset;
				const nc = col + colOffset;
				if (nr < 0 || nc < 0 || nr >= state.rows || nc >= state.cols) {
					continue;
				}
				const neighbor = state.board[nr][nc];
				if (!neighbor.owner || neighbor.count === 0) continue;
				if (
					neighbor.owner !== perspective &&
					activePlayers.includes(neighbor.owner)
				) {
					total += sign * -5;
				}
			}
		}
	}

	return total;
}

function quickMoveScore(state: GameState, move: Position): number {
	const { row, col } = move;
	const cell = state.board[row][col];
	const capacity = getCapacity(row, col, state.rows, state.cols);
	const after = cell.count + 1;
	let score = after * 2;
	const threats = countImmediateThreats(state, row, col, state.currentPlayer);
	const support = countFriendlySupport(state, row, col, state.currentPlayer);

	if (isCorner(row, col, state.rows, state.cols)) score += 10;
	else if (isEdge(row, col, state.rows, state.cols)) score += 4;

	if (after >= capacity) score += 20;
	if (after === capacity - 1) score += 8;
	score += support * 2;

	if (cell.owner === state.currentPlayer && threats > 0) {
		score += 12 + cell.count * 3;
	}
	if (cell.owner === null && threats > 0) {
		score -= 12 + threats * 8;
	}
	if (threats > 0 && after === capacity - 1) {
		score -= 6 + threats * 3;
	}

	for (const [rowOffset, colOffset] of NEIGHBOR_DIRECTIONS) {
		const nr = row + rowOffset;
		const nc = col + colOffset;
		if (nr < 0 || nc < 0 || nr >= state.rows || nc >= state.cols) {
			continue;
		}
		const neighbor = state.board[nr][nc];
		if (neighbor.owner && neighbor.owner !== state.currentPlayer) {
			score += 3;
			const neighborCapacity = getCapacity(nr, nc, state.rows, state.cols);
			if (neighbor.count >= neighborCapacity - 1) score += 7;
		}
	}

	return score;
}

function boardKey(state: GameState): string {
	const parts: string[] = [state.currentPlayer, String(state.turnNumber)];

	for (let row = 0; row < state.rows; row += 1) {
		for (let col = 0; col < state.cols; col += 1) {
			const cell = state.board[row][col];
			parts.push(`${cell.owner ?? "n"}${cell.count}`);
		}
	}

	return parts.join("|");
}

function moveKey(move: Position) {
	return `${move.row}:${move.col}`;
}

function shouldStopSearch(control: SearchControl): boolean {
	if (control.exhausted) return true;

	control.nodes += 1;

	if (control.maxNodes !== undefined && control.nodes > control.maxNodes) {
		control.exhausted = true;
		return true;
	}

	if (control.deadlineAt !== undefined && Date.now() >= control.deadlineAt) {
		control.exhausted = true;
		return true;
	}

	return false;
}

function minimax(
	state: GameState,
	depth: number,
	perspective: PlayerId,
	alpha: number,
	beta: number,
	candidateLimit: number,
	cache: Map<string, { depth: number; value: number }>,
	control: SearchControl,
): number {
	if (
		depth <= 0 ||
		state.winner ||
		state.phase === "gameOver" ||
		shouldStopSearch(control)
	) {
		return evaluateState(state, perspective);
	}

	const key = `${depth}:${boardKey(state)}`;
	const cached = cache.get(key);
	if (cached && cached.depth >= depth) return cached.value;

	const legalMoves = getLegalMoves(state);
	if (legalMoves.length === 0) return evaluateState(state, perspective);

	const orderedMoves = legalMoves
		.map((move) => ({ move, score: quickMoveScore(state, move) }))
		.sort((a, b) => b.score - a.score)
		.slice(0, Math.max(1, candidateLimit))
		.map((item) => item.move);

	const maximizing = state.currentPlayer === perspective;
	let best = maximizing ? -Infinity : Infinity;
	let evaluatedAny = false;

	for (const move of orderedMoves) {
		if (control.exhausted) break;
		evaluatedAny = true;
		const next = applyMove(state, move.row, move.col).state;
		const value = minimax(
			next,
			depth - 1,
			perspective,
			alpha,
			beta,
			candidateLimit,
			cache,
			control,
		);

		if (maximizing) {
			best = Math.max(best, value);
			alpha = Math.max(alpha, best);
			if (alpha >= beta) break;
		} else {
			best = Math.min(best, value);
			beta = Math.min(beta, best);
			if (alpha >= beta) break;
		}
	}

	if (!evaluatedAny) {
		return evaluateState(state, perspective);
	}

	cache.set(key, { depth, value: best });
	return best;
}

function orderCandidateMoves(
	state: GameState,
	legalMoves: Position[],
	candidateLimit: number,
): Position[] {
	return legalMoves
		.map((move) => ({ move, score: quickMoveScore(state, move) }))
		.sort((a, b) => b.score - a.score)
		.slice(0, Math.max(1, candidateLimit))
		.map((item) => item.move);
}

function scoreMovesWithConfig(
	state: GameState,
	config: AiConfig,
	moves: Position[],
	options: Pick<MoveSelectionOptions, "maxNodes" | "maxThinkMs"> = {},
): ScoredMove[] {
	const cache = new Map<string, { depth: number; value: number }>();
	const control: SearchControl = {
		nodes: 0,
		exhausted: false,
		maxNodes: options.maxNodes,
		deadlineAt:
			options.maxThinkMs !== undefined
				? Date.now() + options.maxThinkMs
				: undefined,
	};
	const scored: ScoredMove[] = [];

	for (const move of moves) {
		if (control.exhausted && scored.length > 0) break;
		const next = applyMove(state, move.row, move.col).state;
		const value = minimax(
			next,
			Math.max(0, config.depth - 1),
			state.currentPlayer,
			-Infinity,
			Infinity,
			config.candidateLimit,
			cache,
			control,
		);
		scored.push({ move, value });
	}

	return scored;
}

function pickMoveFromScores(
	legalMoves: Position[],
	orderedMoves: Position[],
	scored: ScoredMove[],
	config: AiConfig,
	random: () => number,
): Position | null {
	if (scored.length === 0) {
		return orderedMoves[0] ?? legalMoves[0] ?? null;
	}

	const scoredByMove = new Map(
		scored.map((item) => [moveKey(item.move), item.value]),
	);
	const orderedScored = orderedMoves.flatMap((move) => {
		const value = scoredByMove.get(moveKey(move));
		return value === undefined ? [] : [{ move, value }];
	});

	if (orderedScored.length === 0) {
		return orderedMoves[0] ?? legalMoves[0] ?? null;
	}

	let bestScore = -Infinity;
	for (const item of orderedScored) {
		bestScore = Math.max(bestScore, item.value);
	}

	const topMoves = orderedScored.filter((item) => item.value >= bestScore - 6);
	if (topMoves.length <= 1 || config.softmaxTemperature <= 0.01) {
		return topMoves[0]?.move ?? orderedMoves[0] ?? legalMoves[0] ?? null;
	}

	const weights = topMoves.map((item) =>
		Math.exp((item.value - bestScore) / config.softmaxTemperature),
	);
	const totalWeight = weights.reduce((acc, weight) => acc + weight, 0);
	let pick = random() * totalWeight;

	for (let i = 0; i < topMoves.length; i += 1) {
		pick -= weights[i] ?? 0;
		if (pick <= 0) return topMoves[i]?.move ?? legalMoves[0] ?? null;
	}

	return topMoves[topMoves.length - 1]?.move ?? legalMoves[0] ?? null;
}

export function configForDifficulty(level: number): AiConfig {
	const clamped = Math.max(1, Math.min(10, level));
	const depth = clamped <= 2 ? 1 : clamped <= 5 ? 2 : clamped <= 8 ? 3 : 4;
	const candidateLimit =
		clamped <= 2 ? 8 : clamped <= 5 ? 12 : clamped <= 8 ? 14 : 18;
	const mistakeProbability =
		clamped <= 2
			? 0.45
			: clamped <= 4
				? 0.25
				: clamped <= 6
					? 0.12
					: clamped <= 8
						? 0.06
						: 0.02;
	const softmaxTemperature =
		clamped <= 2 ? 2.0 : clamped <= 4 ? 1.0 : clamped <= 7 ? 0.55 : 0.22;
	const thinkDelayMs = Math.max(120, 420 - clamped * 24);

	return {
		depth,
		candidateLimit,
		mistakeProbability,
		softmaxTemperature,
		thinkDelayMs,
	};
}

export function createCpuSearchPlan(
	state: GameState,
	difficulty: number,
): CpuSearchPlan {
	const config = configForDifficulty(difficulty);
	const legalMoves = getLegalMoves(state);

	return {
		difficulty,
		config,
		legalMoves,
		orderedMoves: orderCandidateMoves(state, legalMoves, config.candidateLimit),
	};
}

export function scoreCpuMoves(
	state: GameState,
	difficulty: number,
	moves: Position[],
): ScoredMove[] {
	return scoreMovesWithConfig(state, configForDifficulty(difficulty), moves);
}

export function pickCpuMoveFromScores(
	plan: CpuSearchPlan,
	scored: ScoredMove[],
	random = Math.random,
): Position | null {
	return pickMoveFromScores(
		plan.legalMoves,
		plan.orderedMoves,
		scored,
		plan.config,
		random,
	);
}

function chooseMoveWithConfig(
	state: GameState,
	config: AiConfig,
	random: () => number,
	options: MoveSelectionOptions,
): Position | null {
	const legalMoves = getLegalMoves(state);
	if (legalMoves.length === 0) return null;

	if (options.allowMistakes && random() < config.mistakeProbability) {
		const index = Math.min(
			legalMoves.length - 1,
			Math.floor(random() * legalMoves.length),
		);
		return legalMoves[index] ?? null;
	}

	const orderedMoves = orderCandidateMoves(
		state,
		legalMoves,
		config.candidateLimit,
	);
	const scored = scoreMovesWithConfig(state, config, orderedMoves, options);
	return pickMoveFromScores(legalMoves, orderedMoves, scored, config, random);
}

export function chooseCpuMove(
	state: GameState,
	difficulty: number,
	random = Math.random,
): Position | null {
	const plan = createCpuSearchPlan(state, difficulty);
	if (plan.legalMoves.length === 0) return null;

	if (random() < plan.config.mistakeProbability) {
		const index = Math.min(
			plan.legalMoves.length - 1,
			Math.floor(random() * plan.legalMoves.length),
		);
		return plan.legalMoves[index] ?? null;
	}

	return pickCpuMoveFromScores(
		plan,
		scoreMovesWithConfig(state, plan.config, plan.orderedMoves),
		random,
	);
}

export function chooseRecommendedMove(
	state: GameState,
	difficulty = 10,
): Position | null {
	if (state.phase !== "idle" || state.isDraw) return null;
	const cells = state.rows * state.cols;
	const config = configForDifficulty(difficulty);
	return chooseMoveWithConfig(
		state,
		{
			...config,
			depth: Math.min(config.depth, cells <= 12 ? 2 : 3),
			candidateLimit: Math.min(config.candidateLimit, cells <= 12 ? 6 : 10),
			mistakeProbability: 0,
			softmaxTemperature: 0,
		},
		() => 0.5,
		{
			allowMistakes: false,
			maxNodes: cells <= 12 ? 1_400 : cells <= 24 ? 3_500 : 6_000,
			maxThinkMs: cells <= 12 ? 16 : cells <= 24 ? 28 : 40,
		},
	);
}
