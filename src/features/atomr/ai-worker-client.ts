import type { AiWorkerRequest, AiWorkerResponse } from "./ai-worker-protocol";
import type { GameState, Position } from "./types";

export type AiMoveTask = {
	promise: Promise<Position | null>;
	cancel: () => void;
};

type PendingRequest = {
	resolve: (move: Position | null) => void;
	reject: (error: Error) => void;
};

let worker: Worker | null = null;
let nextRequestId = 1;
const pending = new Map<number, PendingRequest>();

function createCancellationError() {
	return new Error("AI request cancelled");
}

function rejectPending(error: Error) {
	for (const { reject } of pending.values()) {
		reject(error);
	}
	pending.clear();
}

function disposeWorker() {
	worker?.terminate();
	worker = null;
}

function resetWorker(error: Error) {
	disposeWorker();
	rejectPending(error);
}

function getWorker() {
	if (typeof window === "undefined" || typeof Worker === "undefined") {
		return null;
	}

	if (worker) return worker;

	worker = new Worker(new URL("./ai.worker.ts", import.meta.url), {
		type: "module",
	});

	worker.onmessage = (event: MessageEvent<AiWorkerResponse>) => {
		const response = event.data;
		const entry = pending.get(response.id);
		if (!entry) return;
		pending.delete(response.id);

		if ("error" in response) {
			entry.reject(new Error(response.error));
			return;
		}

		entry.resolve(response.move);
	};

	worker.onerror = () => {
		resetWorker(new Error("AI worker crashed"));
	};

	return worker;
}

function cancelPendingRequest(id: number) {
	const entry = pending.get(id);
	if (!entry) return;

	pending.delete(id);
	entry.reject(createCancellationError());
	resetWorker(createCancellationError());
}

function requestMove(
	request: Omit<AiWorkerRequest, "id">,
	fallback: () => Promise<Position | null>,
): AiMoveTask {
	const aiWorker = getWorker();
	let cancelled = false;

	if (!aiWorker) {
		return {
			promise: fallback().then((move) => {
				if (cancelled) {
					throw createCancellationError();
				}
				return move;
			}),
			cancel: () => {
				cancelled = true;
			},
		};
	}

	const id = nextRequestId++;
	const promise = new Promise<Position | null>((resolve, reject) => {
		const safeResolve = (move: Position | null) => {
			if (cancelled) {
				reject(createCancellationError());
				return;
			}
			resolve(move);
		};
		const safeReject = (error: Error) => {
			if (cancelled) {
				reject(createCancellationError());
				return;
			}
			reject(error);
		};

		pending.set(id, { resolve: safeResolve, reject: safeReject });
		aiWorker.postMessage({ ...request, id });
	});

	return {
		promise,
		cancel: () => {
			if (cancelled) return;
			cancelled = true;
			cancelPendingRequest(id);
		},
	};
}

export function requestCpuMove(state: GameState, difficulty: number) {
	return requestMove({ kind: "cpu", state, difficulty }, async () =>
		(await import("./ai")).chooseCpuMove(state, difficulty),
	);
}

export function requestRecommendedMove(state: GameState, difficulty: number) {
	return requestMove({ kind: "recommended", state, difficulty }, async () =>
		(await import("./ai")).chooseRecommendedMove(state, difficulty),
	);
}
