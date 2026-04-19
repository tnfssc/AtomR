export const PLAYER_ORDER = [
	"p1",
	"p2",
	"p3",
	"p4",
	"p5",
	"p6",
	"p7",
	"p8",
] as const;

export type PlayerId = (typeof PLAYER_ORDER)[number];

export type Position = {
	row: number;
	col: number;
};

export type LastMove = Position & {
	player: PlayerId;
	turnNumber: number;
	didExplode: boolean;
};

export type Cell = {
	owner: PlayerId | null;
	count: number;
};

export type Board = Cell[][];

export type PlayerFlags = Partial<Record<PlayerId, boolean>>;

export type GamePhase = "idle" | "resolving" | "gameOver";

export type ResolutionEvent =
	| {
			type: "place";
			row: number;
			col: number;
			player: PlayerId;
	  }
	| {
			type: "explode";
			row: number;
			col: number;
			player: PlayerId;
			affected: Position[];
	  }
	| {
			type: "capture";
			row: number;
			col: number;
			player: PlayerId;
	  };

export type GameState = {
	board: Board;
	rows: number;
	cols: number;
	playerCount: number;
	currentPlayer: PlayerId;
	turnNumber: number;
	hasPlayed: PlayerFlags;
	eliminated: PlayerFlags;
	winner: PlayerId | null;
	isDraw?: boolean;
	drawReason?: "unstableLoop" | null;
	phase: GamePhase;
};

export type ApplyMoveResult = {
	state: GameState;
	events: ResolutionEvent[];
};

export const DEFAULT_ROWS = 6;
export const DEFAULT_COLS = 9;
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = PLAYER_ORDER.length;
export const ONLINE_TURN_TIME_LIMIT_MS = 30_000;
export const ONLINE_VIEWER_HEARTBEAT_MS = 15_000;
export const ONLINE_QUEUE_STALE_MS = 60_000;

export function clampPlayerCount(playerCount: number) {
	return Math.max(MIN_PLAYERS, Math.min(MAX_PLAYERS, Math.floor(playerCount)));
}

export function getActivePlayerOrder(playerCount: number): PlayerId[] {
	return [...PLAYER_ORDER.slice(0, clampPlayerCount(playerCount))];
}

export function createPlayerFlags(initialValue = false): PlayerFlags {
	return Object.fromEntries(
		PLAYER_ORDER.map((playerId) => [playerId, initialValue]),
	) as PlayerFlags;
}

export function formatBoardCoordinate(row: number, col: number): string {
	return `${String.fromCharCode(65 + col)}${row + 1}`;
}
