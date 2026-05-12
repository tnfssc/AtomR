// @vitest-environment jsdom

import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createInitialGameState } from "../engine";
import type { GameState } from "../types";
import AtomRBoard from "./AtomRBoard";

function renderBoard({
	state = createInitialGameState(2, 3),
	keyboardNavigationEnabled = true,
	canPlay = true,
	isAnimating = false,
	onPlay = vi.fn(),
}: {
	state?: GameState;
	keyboardNavigationEnabled?: boolean;
	canPlay?: boolean;
	isAnimating?: boolean;
	onPlay?: ReturnType<typeof vi.fn>;
} = {}) {
	render(
		<AtomRBoard
			state={state}
			activeColor="#ff00aa"
			isAnimating={isAnimating}
			activeExplosionKeys={[]}
			activeCaptureKeys={[]}
			activeExplosions={[]}
			cellSize={48}
			keyboardNavigationEnabled={keyboardNavigationEnabled}
			canPlay={canPlay}
			onPlay={onPlay}
		/>,
	);

	return { onPlay };
}

function getCell(label: string) {
	return screen.getByRole("button", { name: new RegExp(`^${label},`, "i") });
}

function expectFocused(element: HTMLElement) {
	expect(document.activeElement).toBe(element);
}

describe("AtomRBoard keyboard navigation", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		cleanup();
		vi.runOnlyPendingTimers();
		vi.useRealTimers();
	});

	it("wraps focus horizontally and vertically with arrow keys", () => {
		renderBoard();

		const a1 = getCell("A1");
		const c1 = getCell("C1");
		const a2 = getCell("A2");

		a1.focus();
		expectFocused(a1);

		fireEvent.keyDown(a1, { key: "ArrowLeft" });
		expectFocused(c1);

		fireEvent.keyDown(c1, { key: "ArrowUp" });
		expectFocused(screen.getByRole("button", { name: /^C2,/i }));

		fireEvent.keyDown(screen.getByRole("button", { name: /^C2,/i }), {
			key: "ArrowRight",
		});
		expectFocused(a2);
	});

	it("supports Home and End navigation", () => {
		renderBoard();

		const b2 = getCell("B2");
		const a2 = getCell("A2");
		const c2 = getCell("C2");
		const a1 = getCell("A1");
		const c2Again = getCell("C2");

		b2.focus();
		fireEvent.keyDown(b2, { key: "Home" });
		expectFocused(a2);

		fireEvent.keyDown(a2, { key: "End" });
		expectFocused(c2);

		fireEvent.keyDown(c2, { key: "Home", ctrlKey: true });
		expectFocused(a1);

		fireEvent.keyDown(a1, { key: "End", ctrlKey: true });
		expectFocused(c2Again);
	});

	it("activates the focused cell with Enter and Space", () => {
		const onPlay = vi.fn();
		renderBoard({ onPlay });

		const b1 = getCell("B1");
		b1.focus();

		fireEvent.keyDown(b1, { key: "Enter" });
		fireEvent.keyDown(b1, { key: " " });

		expect(onPlay).toHaveBeenCalledTimes(2);
		expect(onPlay).toHaveBeenNthCalledWith(1, 0, 1);
		expect(onPlay).toHaveBeenNthCalledWith(2, 0, 1);
	});

	it("announces blocked illegal moves instead of playing them", () => {
		const onPlay = vi.fn();
		const state = createInitialGameState(2, 2);
		state.board[0][1] = { owner: "p2", count: 1 };

		renderBoard({ state, onPlay });

		const b1 = getCell("B1");
		b1.focus();

		fireEvent.keyDown(b1, { key: "Enter" });

		expect(onPlay).not.toHaveBeenCalled();

		act(() => {
			vi.runOnlyPendingTimers();
		});

		expect(
			screen.getByText("Illegal move. Choose an empty or owned cell."),
		).not.toBeNull();
		expect(b1.getAttribute("aria-disabled")).toBe("true");
	});

	it("repeats arrow navigation while a key is held and stops on keyup", () => {
		renderBoard();

		const a1 = getCell("A1");
		const b1 = getCell("B1");
		const c1 = getCell("C1");

		a1.focus();
		fireEvent.keyDown(a1, { key: "ArrowRight" });
		expectFocused(b1);

		act(() => {
			vi.advanceTimersByTime(180);
		});
		expectFocused(c1);

		act(() => {
			vi.advanceTimersByTime(90);
		});
		expectFocused(a1);

		fireEvent.keyUp(window, { key: "ArrowRight" });

		act(() => {
			vi.advanceTimersByTime(500);
		});
		expectFocused(a1);
	});

	it("keeps board cells out of tab order when keyboard navigation is disabled", () => {
		renderBoard({ keyboardNavigationEnabled: false });

		expect(getCell("A1").getAttribute("tabindex")).toBe("-1");
	});
});
