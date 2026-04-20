/// <reference lib="webworker" />

import { chooseCpuMove, chooseRecommendedMove, scoreCpuMoves } from "./ai";
import type { AiWorkerRequest, AiWorkerResponse } from "./ai-worker-protocol";

declare const self: DedicatedWorkerGlobalScope;

self.onmessage = (event: MessageEvent<AiWorkerRequest>) => {
	const request = event.data;

	try {
		const response: AiWorkerResponse =
			request.kind === "scoreCpuBatch"
				? {
						id: request.id,
						scored: scoreCpuMoves(request.state, request.difficulty, request.moves),
					}
				: {
						id: request.id,
						move:
							request.kind === "cpu"
								? chooseCpuMove(request.state, request.difficulty)
								: chooseRecommendedMove(request.state, request.difficulty),
					};

		self.postMessage(response);
	} catch (error) {
		const response: AiWorkerResponse = {
			id: request.id,
			error: error instanceof Error ? error.message : "AI worker failed",
		};

		self.postMessage(response);
	}
};
