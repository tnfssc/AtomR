/// <reference lib="webworker" />

import { chooseCpuMove, chooseRecommendedMove } from "./ai";
import type { AiWorkerRequest, AiWorkerResponse } from "./ai-worker-protocol";

declare const self: DedicatedWorkerGlobalScope;

self.onmessage = (event: MessageEvent<AiWorkerRequest>) => {
	const request = event.data;

	try {
		const move =
			request.kind === "cpu"
				? chooseCpuMove(request.state, request.difficulty)
				: chooseRecommendedMove(request.state, request.difficulty);

		const response: AiWorkerResponse = {
			id: request.id,
			move,
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
