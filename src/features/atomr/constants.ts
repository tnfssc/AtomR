import {
	clampPlayerCount,
	createPlayerFlags,
	DEFAULT_COLS,
	DEFAULT_ROWS,
	getActivePlayerOrder,
	MAX_PLAYERS,
	MIN_PLAYERS,
	PLAYER_ORDER,
	type PlayerId,
} from "./shared";

export {
	clampPlayerCount,
	createPlayerFlags,
	DEFAULT_COLS,
	DEFAULT_ROWS,
	getActivePlayerOrder,
	MAX_PLAYERS,
	MIN_PLAYERS,
	PLAYER_ORDER,
};

export const PLAYER_COLORS: Record<PlayerId, string> = {
	p1: "oklch(0.68 0.24 35)",
	p2: "oklch(0.73 0.17 250)",
	p3: "oklch(0.78 0.17 145)",
	p4: "oklch(0.76 0.2 345)",
	p5: "oklch(0.84 0.22 125)",
	p6: "oklch(0.68 0.21 300)",
	p7: "oklch(0.7 0.22 20)",
	p8: "oklch(0.95 0.03 255)",
};

export const PLAYER_NAMES: Record<PlayerId, string> = {
	p1: "Player 1",
	p2: "Player 2",
	p3: "Player 3",
	p4: "Player 4",
	p5: "Player 5",
	p6: "Player 6",
	p7: "Player 7",
	p8: "Player 8",
};
