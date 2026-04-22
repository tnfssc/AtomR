// @vitest-environment jsdom

import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAtomRGame } from "./useAtomRGame";

function flushPlayback() {
	act(() => {
		vi.runAllTimers();
	});
}

describe("useAtomRGame undo history", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.runOnlyPendingTimers();
		vi.useRealTimers();
	});

	it("restores the previous settled state when undo is enabled", () => {
		const { result } = renderHook(() =>
			useAtomRGame(2, 2, 2, 0, { enableHistory: true }),
		);

		act(() => {
			result.current.handleMove({ row: 0, col: 0 });
		});
		flushPlayback();

		expect(result.current.resolvedState.turnNumber).toBe(1);
		expect(result.current.state.board[0][0]).toEqual({ owner: "p1", count: 1 });
		expect(result.current.lastMove).toMatchObject({
			row: 0,
			col: 0,
			player: "p1",
			turnNumber: 1,
		});
		expect(result.current.canUndo).toBe(true);

		let undoneMoves = 0;
		act(() => {
			undoneMoves = result.current.undo();
		});

		expect(undoneMoves).toBe(1);
		expect(result.current.resolvedState.turnNumber).toBe(0);
		expect(result.current.state.board[0][0]).toEqual({ owner: null, count: 0 });
		expect(result.current.lastMove).toBeNull();
		expect(result.current.canUndo).toBe(false);
	});

	it("can undo multiple moves in one action", () => {
		const { result } = renderHook(() =>
			useAtomRGame(2, 2, 2, 0, { enableHistory: true }),
		);

		act(() => {
			result.current.handleMove({ row: 0, col: 0 });
		});
		flushPlayback();

		act(() => {
			result.current.handleMove({ row: 1, col: 1 });
		});
		flushPlayback();

		expect(result.current.resolvedState.turnNumber).toBe(2);
		expect(result.current.state.board[0][0]).toEqual({ owner: "p1", count: 1 });
		expect(result.current.state.board[1][1]).toEqual({ owner: "p2", count: 1 });
		expect(result.current.canUndo).toBe(true);

		let undoneMoves = 0;
		act(() => {
			undoneMoves = result.current.undo(2);
		});

		expect(undoneMoves).toBe(2);
		expect(result.current.resolvedState.turnNumber).toBe(0);
		expect(result.current.state.board[0][0]).toEqual({ owner: null, count: 0 });
		expect(result.current.state.board[1][1]).toEqual({ owner: null, count: 0 });
		expect(result.current.lastMove).toBeNull();
		expect(result.current.canUndo).toBe(false);
	});

	it("ignores undo requests when history tracking is disabled", () => {
		const { result } = renderHook(() => useAtomRGame(2, 2));

		act(() => {
			result.current.handleMove({ row: 0, col: 0 });
		});
		flushPlayback();

		let undoneMoves = 0;
		act(() => {
			undoneMoves = result.current.undo();
		});

		expect(undoneMoves).toBe(0);
		expect(result.current.resolvedState.turnNumber).toBe(1);
		expect(result.current.canUndo).toBe(false);
	});
});
