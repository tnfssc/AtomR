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
	  };

export type AiWorkerResponse =
	| {
			id: number;
			move: Position | null;
	  }
	| {
			id: number;
			error: string;
	  };
