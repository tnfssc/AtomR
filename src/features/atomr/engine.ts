import type { Board } from "./shared";
import { getCapacity } from "./shared-engine";

export {
	allPlayersHavePlayed,
	applyMove,
	countPlayerOrbs,
	createInitialBoard,
	createInitialGameState,
	getCapacity,
	getLegalMoves,
	getNextPlayer,
	isLegalMove,
	pickRandomLegalMove,
	recomputeEliminations,
	recomputeWinner,
} from "./shared-engine";
export function isStableBoard(
	board: Board,
	rows: number,
	cols: number,
): boolean {
	return board.every((row, rowIndex) =>
		row.every(
			(cell, colIndex) =>
				cell.count < getCapacity(rowIndex, colIndex, rows, cols),
		),
	);
}
