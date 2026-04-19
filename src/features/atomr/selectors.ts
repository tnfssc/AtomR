import { getActivePlayerOrder } from "./constants";
import { getCapacity } from "./engine";

import type { Cell, GameState, PlayerId } from "./types";

export function getCellCapacity(
	state: Pick<GameState, "rows" | "cols">,
	row: number,
	col: number,
) {
	return getCapacity(row, col, state.rows, state.cols);
}

export function isCellCritical(
	state: Pick<GameState, "rows" | "cols">,
	cell: Cell,
	row: number,
	col: number,
) {
	if (cell.count === 0) {
		return false;
	}

	return cell.count === getCellCapacity(state, row, col) - 1;
}

export function isCellThreatened(
	state: Pick<GameState, "board" | "rows" | "cols" | "playerCount">,
	row: number,
	col: number,
	playerId: PlayerId,
) {
	const neighbors = [
		{ row: row - 1, col },
		{ row, col: col + 1 },
		{ row: row + 1, col },
		{ row, col: col - 1 },
	];

	return neighbors.some((neighbor) => {
		if (
			neighbor.row < 0 ||
			neighbor.row >= state.rows ||
			neighbor.col < 0 ||
			neighbor.col >= state.cols
		) {
			return false;
		}

		const neighborCell = state.board[neighbor.row][neighbor.col];
		if (
			!neighborCell.owner ||
			neighborCell.owner === playerId ||
			!getActivePlayerOrder(state.playerCount).includes(neighborCell.owner)
		) {
			return false;
		}

		return isCellCritical(state, neighborCell, neighbor.row, neighbor.col);
	});
}

export function countPlayerCells(
	state: Pick<GameState, "board">,
	playerId: PlayerId,
) {
	return state.board.flat().filter((cell) => cell.owner === playerId).length;
}

export function countPlayerOrbsInState(
	state: Pick<GameState, "board">,
	playerId: PlayerId,
) {
	return state.board.flat().reduce((total, cell) => {
		if (cell.owner !== playerId) {
			return total;
		}

		return total + cell.count;
	}, 0);
}
