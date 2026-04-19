import { describe, expect, it } from "vitest";

import {
	allPlayersHavePlayed,
	applyMove,
	countPlayerOrbs,
	createInitialGameState,
	getCapacity,
	getLegalMoves,
	getNextPlayer,
	isLegalMove,
	isStableBoard,
	pickRandomLegalMove,
} from "./engine";

import type { GameState } from "./types";

function withState(overrides: Partial<GameState>): GameState {
	return {
		...createInitialGameState(),
		...overrides,
	};
}

describe("AtomR engine", () => {
	it("returns correct capacities for corner, edge, and inner cells", () => {
		expect(getCapacity(0, 0, 6, 9)).toBe(2);
		expect(getCapacity(0, 4, 6, 9)).toBe(3);
		expect(getCapacity(2, 4, 6, 9)).toBe(4);
	});

	it("allows moves on empty and self-owned cells only", () => {
		const state = createInitialGameState(3, 3);
		state.board[0][0] = { owner: "p1", count: 1 };
		state.board[0][1] = { owner: "p2", count: 1 };

		expect(isLegalMove(state, 1, 1)).toBe(true);
		expect(isLegalMove(state, 0, 0)).toBe(true);
		expect(isLegalMove(state, 0, 1)).toBe(false);
	});

	it("enumerates only legal moves for the active player", () => {
		const state = createInitialGameState(2, 3);
		state.board[0][0] = { owner: "p1", count: 1 };
		state.board[0][1] = { owner: "p2", count: 1 };
		state.board[1][2] = { owner: "p2", count: 1 };

		expect(getLegalMoves(state)).toEqual([
			{ row: 0, col: 0 },
			{ row: 0, col: 2 },
			{ row: 1, col: 0 },
			{ row: 1, col: 1 },
		]);
	});

	it("picks a legal move from the available set", () => {
		const state = createInitialGameState(2, 2);
		state.board[0][0] = { owner: "p2", count: 1 };
		state.board[0][1] = { owner: "p1", count: 1 };

		expect(pickRandomLegalMove(state, () => 0)).toEqual({ row: 0, col: 1 });
		expect(pickRandomLegalMove(state, () => 0.99)).toEqual({ row: 1, col: 1 });
	});

	it("explodes cell when move reaches critical mass", () => {
		const state = createInitialGameState(3, 3);
		state.board[0][0] = { owner: "p1", count: 1 };

		const result = applyMove(state, 0, 0);

		expect(result.state.board[0][0]).toEqual({ owner: null, count: 0 });
		expect(result.events.some((event) => event.type === "explode")).toBe(true);
	});

	it("distributes explosions to orthogonal neighbors only", () => {
		const state = createInitialGameState(3, 3);
		state.board[0][0] = { owner: "p1", count: 1 };

		const result = applyMove(state, 0, 0);

		expect(result.state.board[0][1]).toEqual({ owner: "p1", count: 1 });
		expect(result.state.board[1][0]).toEqual({ owner: "p1", count: 1 });
		expect(result.state.board[1][1]).toEqual({ owner: null, count: 0 });
	});

	it("captures enemy-owned cells when they are hit by explosion", () => {
		const state = createInitialGameState(3, 3);
		state.board[0][0] = { owner: "p1", count: 1 };
		state.board[0][1] = { owner: "p2", count: 1 };

		const result = applyMove(state, 0, 0);

		expect(result.state.board[0][1]).toEqual({ owner: "p1", count: 2 });
		expect(
			result.events.some(
				(event) =>
					event.type === "capture" && event.row === 0 && event.col === 1,
			),
		).toBe(true);
	});

	it("resolves multi-step cascades to stable board", () => {
		const state = createInitialGameState(3, 3);
		state.board[1][1] = { owner: "p1", count: 3 };
		state.board[0][1] = { owner: "p1", count: 2 };
		state.board[1][2] = { owner: "p1", count: 2 };

		const result = applyMove(state, 1, 1);

		expect(result.state.board[0][0]).toEqual({ owner: "p1", count: 1 });
		expect(result.state.board[0][1]).toEqual({ owner: "p1", count: 1 });
		expect(result.state.board[0][2]).toEqual({ owner: null, count: 0 });
		expect(result.state.board[1][1]).toEqual({ owner: "p1", count: 2 });
		expect(result.state.board[1][2]).toEqual({ owner: "p1", count: 1 });
		expect(result.state.board[2][1]).toEqual({ owner: "p1", count: 1 });
		expect(isStableBoard(result.state.board, 3, 3)).toBe(true);
	});

	it("declares winner immediately when a resolving chain eliminates all opponents", () => {
		const state = withState({
			rows: 3,
			cols: 4,
			currentPlayer: "p1",
			turnNumber: 16,
			hasPlayed: { p1: true, p2: true },
			board: [
				[
					{ owner: "p1", count: 1 },
					{ owner: "p2", count: 2 },
					{ owner: "p2", count: 2 },
					{ owner: "p2", count: 1 },
				],
				[
					{ owner: "p1", count: 2 },
					{ owner: null, count: 0 },
					{ owner: "p2", count: 3 },
					{ owner: null, count: 0 },
				],
				[
					{ owner: "p1", count: 1 },
					{ owner: "p1", count: 2 },
					{ owner: "p2", count: 1 },
					{ owner: "p2", count: 1 },
				],
			],
		});

		const result = applyMove(state, 0, 0);

		expect(result.state.winner).toBe("p1");
		expect(result.state.isDraw).toBe(false);
		expect(result.state.phase).toBe("gameOver");
	});

	it("ends dense late-game cascades without hanging", () => {
		const state = withState({
			rows: 6,
			cols: 9,
			currentPlayer: "p1",
			hasPlayed: { p1: true, p2: true },
			board: [
				[
					{ owner: "p2", count: 1 },
					{ owner: "p2", count: 1 },
					{ owner: "p2", count: 1 },
					{ owner: "p2", count: 1 },
					{ owner: "p1", count: 1 },
					{ owner: "p1", count: 2 },
					{ owner: "p1", count: 2 },
					{ owner: "p1", count: 2 },
					{ owner: "p1", count: 1 },
				],
				[
					{ owner: "p2", count: 1 },
					{ owner: "p2", count: 3 },
					{ owner: "p2", count: 3 },
					{ owner: "p1", count: 1 },
					{ owner: "p1", count: 2 },
					{ owner: "p1", count: 2 },
					{ owner: "p1", count: 3 },
					{ owner: "p1", count: 3 },
					{ owner: "p1", count: 1 },
				],
				[
					{ owner: "p2", count: 2 },
					{ owner: "p2", count: 3 },
					{ owner: "p2", count: 3 },
					{ owner: "p1", count: 2 },
					{ owner: "p1", count: 3 },
					{ owner: "p1", count: 3 },
					{ owner: null, count: 0 },
					{ owner: "p1", count: 2 },
					{ owner: "p1", count: 2 },
				],
				[
					{ owner: "p2", count: 2 },
					{ owner: "p2", count: 2 },
					{ owner: null, count: 0 },
					{ owner: "p2", count: 3 },
					{ owner: "p2", count: 3 },
					{ owner: "p2", count: 2 },
					{ owner: "p1", count: 3 },
					{ owner: "p1", count: 3 },
					{ owner: "p1", count: 2 },
				],
				[
					{ owner: "p2", count: 1 },
					{ owner: "p2", count: 3 },
					{ owner: "p2", count: 3 },
					{ owner: "p2", count: 2 },
					{ owner: "p2", count: 2 },
					{ owner: "p2", count: 1 },
					{ owner: "p2", count: 3 },
					{ owner: "p2", count: 3 },
					{ owner: "p2", count: 1 },
				],
				[
					{ owner: "p2", count: 1 },
					{ owner: "p2", count: 2 },
					{ owner: "p2", count: 2 },
					{ owner: "p2", count: 2 },
					{ owner: "p2", count: 1 },
					{ owner: "p2", count: 1 },
					{ owner: "p2", count: 1 },
					{ owner: "p2", count: 1 },
					{ owner: "p1", count: 1 },
				],
			],
		});

		const result = applyMove(state, 0, 5);

		expect(result.state.phase).toBe("gameOver");
		expect(result.state.winner === "p1" || result.state.isDraw).toBe(true);
	});

	it("does not eliminate player before both players have taken first turn", () => {
		const result = applyMove(createInitialGameState(3, 3), 0, 0);

		expect(allPlayersHavePlayed(result.state)).toBe(false);
		expect(result.state.hasPlayed.p1).toBe(true);
		expect(result.state.hasPlayed.p2).toBe(false);
		expect(result.state.eliminated.p2).toBe(false);
		expect(result.state.winner).toBeNull();
	});

	it("detects winner after final elimination once both players have played", () => {
		const base = createInitialGameState(2, 2);
		base.board[0][0] = { owner: "p1", count: 1 };
		base.board[0][1] = { owner: "p2", count: 1 };

		const state = withState({
			...base,
			currentPlayer: "p1",
			turnNumber: 2,
			hasPlayed: { p1: true, p2: true },
		});

		const result = applyMove(state, 0, 0);

		expect(countPlayerOrbs(result.state.board, "p2")).toBe(0);
		expect(result.state.eliminated.p2).toBe(true);
		expect(result.state.winner).toBe("p1");
		expect(result.state.phase).toBe("gameOver");
	});

	it("skips eliminated players when choosing next turn", () => {
		const nextPlayer = getNextPlayer({
			currentPlayer: "p1",
			eliminated: { p1: false, p2: true },
			playerCount: 2,
		});

		expect(nextPlayer).toBe("p1");
	});

	it("cycles across all active players in multiplayer games", () => {
		const state = createInitialGameState(4, 4, 4);

		const first = applyMove(state, 0, 0).state;
		const second = applyMove(first, 0, 1).state;
		const third = applyMove(second, 0, 2).state;

		expect(first.currentPlayer).toBe("p2");
		expect(second.currentPlayer).toBe("p3");
		expect(third.currentPlayer).toBe("p4");
	});
});
