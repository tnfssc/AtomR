import { describe, expect, it } from "vitest";
import { chooseCpuMove, chooseRecommendedMove } from "./ai";
import { getLegalMoves } from "./engine";
import type { GameState } from "./types";

describe("chooseCpuMove", () => {
	it("returns a move on an empty board", () => {
		const state: GameState = {
			board: Array.from({ length: 6 }, () =>
				Array.from({ length: 9 }, () => ({ owner: null, count: 0 })),
			),
			rows: 6,
			cols: 9,
			playerCount: 2,
			currentPlayer: "p2",
			turnNumber: 0,
			hasPlayed: { p1: false, p2: false },
			eliminated: { p1: false, p2: false },
			winner: null,
			phase: "idle",
		};

		const move = chooseCpuMove(state, 5, () => 0.5);

		expect(move).not.toBeNull();
		expect(move?.row).toBeGreaterThanOrEqual(0);
		expect(move?.col).toBeGreaterThanOrEqual(0);
	});

	it("takes an immediate winning explosion when available", () => {
		const state: GameState = {
			board: [
				[
					{ owner: null, count: 0 },
					{ owner: "p1", count: 1 },
					{ owner: null, count: 0 },
				],
				[
					{ owner: null, count: 0 },
					{ owner: "p2", count: 3 },
					{ owner: null, count: 0 },
				],
				[
					{ owner: null, count: 0 },
					{ owner: null, count: 0 },
					{ owner: null, count: 0 },
				],
			],
			rows: 3,
			cols: 3,
			playerCount: 2,
			currentPlayer: "p2",
			turnNumber: 6,
			hasPlayed: { p1: true, p2: true },
			eliminated: { p1: false, p2: false },
			winner: null,
			phase: "idle",
		};

		const move = chooseCpuMove(state, 10, () => 0.99);

		expect(move).toEqual({ row: 1, col: 1 });
	});

	it("returns a legal recommendation on a crowded 3x4 late-game board", () => {
		const state: GameState = {
			board: [
				[
					{ owner: "p1", count: 1 },
					{ owner: "p2", count: 1 },
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
			rows: 3,
			cols: 4,
			playerCount: 2,
			currentPlayer: "p2",
			turnNumber: 15,
			hasPlayed: { p1: true, p2: true },
			eliminated: { p1: false, p2: false },
			winner: null,
			phase: "idle",
		};

		const move = chooseRecommendedMove(state, 10);
		const legalMoves = getLegalMoves(state);

		expect(move).not.toBeNull();
		expect(legalMoves).toContainEqual(move);
	});

	it("returns a legal move for a multiplayer state", () => {
		const state: GameState = {
			board: [
				[
					{ owner: "p1", count: 1 },
					{ owner: null, count: 0 },
					{ owner: "p2", count: 1 },
				],
				[
					{ owner: null, count: 0 },
					{ owner: "p3", count: 2 },
					{ owner: "p4", count: 1 },
				],
				[
					{ owner: null, count: 0 },
					{ owner: "p3", count: 1 },
					{ owner: null, count: 0 },
				],
			],
			rows: 3,
			cols: 3,
			playerCount: 4,
			currentPlayer: "p3",
			turnNumber: 9,
			hasPlayed: { p1: true, p2: true, p3: true, p4: true },
			eliminated: { p1: false, p2: false, p3: false, p4: false },
			winner: null,
			phase: "idle",
		};

		const move = chooseCpuMove(state, 8, () => 0.5);
		const legalMoves = getLegalMoves(state);

		expect(move).not.toBeNull();
		expect(legalMoves).toContainEqual(move);
	});

	it("avoids spawning into a threatened corner when a safe corner exists", () => {
		const state: GameState = {
			board: [
				[
					{ owner: null, count: 0 },
					{ owner: "p1", count: 2 },
					{ owner: null, count: 0 },
				],
				[
					{ owner: null, count: 0 },
					{ owner: null, count: 0 },
					{ owner: null, count: 0 },
				],
				[
					{ owner: null, count: 0 },
					{ owner: null, count: 0 },
					{ owner: "p2", count: 1 },
				],
			],
			rows: 3,
			cols: 3,
			playerCount: 2,
			currentPlayer: "p2",
			turnNumber: 8,
			hasPlayed: { p1: true, p2: true },
			eliminated: { p1: false, p2: false },
			winner: null,
			isDraw: false,
			drawReason: null,
			phase: "idle",
		};

		const move = chooseRecommendedMove(state, 10);

		expect(move).toEqual({ row: 2, col: 0 });
	});

	it("avoids corners covered by multiple enemy critical stacks", () => {
		const state: GameState = {
			board: [
				[
					{ owner: null, count: 0 },
					{ owner: "p1", count: 2 },
					{ owner: null, count: 0 },
				],
				[
					{ owner: "p1", count: 2 },
					{ owner: null, count: 0 },
					{ owner: null, count: 0 },
				],
				[
					{ owner: null, count: 0 },
					{ owner: null, count: 0 },
					{ owner: "p2", count: 1 },
				],
			],
			rows: 3,
			cols: 3,
			playerCount: 2,
			currentPlayer: "p2",
			turnNumber: 10,
			hasPlayed: { p1: true, p2: true },
			eliminated: { p1: false, p2: false },
			winner: null,
			isDraw: false,
			drawReason: null,
			phase: "idle",
		};

		const move = chooseRecommendedMove(state, 10);

		expect(move).toEqual({ row: 2, col: 0 });
	});
});
