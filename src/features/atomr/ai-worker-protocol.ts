import type { ScoredMove } from "./ai";
import type { GameState, Position } from "./types";

export type AiWorkerRequest =
	| {
			id: number;
			kind: "cpu";
			state: GameState;
			difficulty: number;
	  }
	| {
			id: number;
			kind: "recommended";
			state: GameState;
			difficulty: number;
	  }
	| {
			id: number;
			kind: "scoreCpuBatch";
			state: GameState;
			difficulty: number;
			moves: Position[];
	  };

export type AiWorkerResponse =
	| {
			id: number;
			move: Position | null;
	  }
	| {
			id: number;
			scored: ScoredMove[];
	  }
	| {
			id: number;
			error: string;
	  };
