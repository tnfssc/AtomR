import type { ScoredMove } from "./ai";
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

type MoveWorkerRequest = Extract<
	AiWorkerRequest,
	{ kind: "cpu" | "recommended" }
>;

const PARALLEL_CPU_DIFFICULTY = 10;
const MIN_PARALLEL_MOVES = 4;
const MAX_PARALLEL_WORKERS = 4;

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

function canUseWorkerThreads() {
	return typeof window !== "undefined" && typeof Worker !== "undefined";
}

function createWorkerInstance() {
	return new Worker(new URL("./ai.worker.ts", import.meta.url), {
		type: "module",
	});
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
	if (!canUseWorkerThreads()) {
		return null;
	}

	if (worker) return worker;

	worker = createWorkerInstance();

	worker.onmessage = (event: MessageEvent<AiWorkerResponse>) => {
		const response = event.data;
		const entry = pending.get(response.id);
		if (!entry) return;
		pending.delete(response.id);

		if ("error" in response) {
			entry.reject(new Error(response.error));
			return;
		}

		if (!("move" in response)) {
			entry.reject(new Error("AI worker returned an unexpected response"));
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
	request: Omit<MoveWorkerRequest, "id">,
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

function getParallelWorkerCount(moveCount: number) {
	if (moveCount < MIN_PARALLEL_MOVES || typeof navigator === "undefined") {
		return 1;
	}

	const hardwareConcurrency = Math.max(
		1,
		Math.floor(navigator.hardwareConcurrency ?? 1),
	);
	if (hardwareConcurrency < 2) return 1;

	return Math.min(
		moveCount,
		MAX_PARALLEL_WORKERS,
		Math.max(2, hardwareConcurrency - 1),
	);
}

function chunkMoves(moves: Position[], workerCount: number) {
	const batches = Array.from({ length: workerCount }, () => [] as Position[]);
	for (const [index, move] of moves.entries()) {
		batches[index % workerCount]?.push(move);
	}
	return batches.filter((batch) => batch.length > 0);
}

function requestParallelCpuMove(
	state: GameState,
	difficulty: number,
): AiMoveTask {
	const workers: Worker[] = [];
	let cancelled = false;
	let settled = false;
	let finishRejectRef: ((error: Error) => void) | null = null;

	const cleanup = () => {
		for (const activeWorker of workers) {
			activeWorker.terminate();
		}
		workers.length = 0;
	};

	const promise = new Promise<Position | null>((resolve, reject) => {
		const finishResolve = (move: Position | null) => {
			if (settled) return;
			settled = true;
			cleanup();
			resolve(move);
		};

		const finishReject = (error: Error) => {
			if (settled) return;
			settled = true;
			cleanup();
			reject(error);
		};
		finishRejectRef = finishReject;

		void (async () => {
			try {
				const { chooseCpuMove, createCpuSearchPlan, pickCpuMoveFromScores } =
					await import("./ai");

				if (cancelled) {
					finishReject(createCancellationError());
					return;
				}

				const plan = createCpuSearchPlan(state, difficulty);
				if (plan.legalMoves.length === 0) {
					finishResolve(null);
					return;
				}

				if (Math.random() < plan.config.mistakeProbability) {
					const index = Math.min(
						plan.legalMoves.length - 1,
						Math.floor(Math.random() * plan.legalMoves.length),
					);
					finishResolve(plan.legalMoves[index] ?? null);
					return;
				}

				const workerCount = getParallelWorkerCount(plan.orderedMoves.length);
				if (workerCount < 2) {
					finishResolve(chooseCpuMove(state, difficulty));
					return;
				}

				const batches = chunkMoves(plan.orderedMoves, workerCount);
				const scoredBatches = await Promise.all(
					batches.map(
						(moves) =>
							new Promise<ScoredMove[]>((resolveBatch, rejectBatch) => {
								try {
									const batchWorker = createWorkerInstance();
									const id = nextRequestId++;
									workers.push(batchWorker);

									batchWorker.onmessage = (
										event: MessageEvent<AiWorkerResponse>,
									) => {
										const response = event.data;
										if (response.id !== id) return;
										if ("error" in response) {
											rejectBatch(new Error(response.error));
											return;
										}
										if (!("scored" in response)) {
											rejectBatch(
												new Error("AI worker returned an unexpected response"),
											);
											return;
										}

										resolveBatch(response.scored);
									};

									batchWorker.onerror = () => {
										rejectBatch(new Error("AI worker crashed"));
									};

									batchWorker.postMessage({
										id,
										kind: "scoreCpuBatch",
										state,
										difficulty,
										moves,
									});
								} catch (error) {
									rejectBatch(
										error instanceof Error
											? error
											: new Error("AI worker pool failed"),
									);
								}
							}),
					),
				);

				if (cancelled) {
					finishReject(createCancellationError());
					return;
				}

				finishResolve(
					pickCpuMoveFromScores(plan, scoredBatches.flat(), Math.random),
				);
			} catch (error) {
				finishReject(
					error instanceof Error ? error : new Error("AI worker failed"),
				);
			}
		})();
	});

	return {
		promise,
		cancel: () => {
			if (cancelled || settled) return;
			cancelled = true;
			finishRejectRef?.(createCancellationError());
		},
	};
}

export function requestCpuMove(state: GameState, difficulty: number) {
	if (difficulty >= PARALLEL_CPU_DIFFICULTY && canUseWorkerThreads()) {
		return requestParallelCpuMove(state, difficulty);
	}

	return requestMove({ kind: "cpu", state, difficulty }, async () =>
		(await import("./ai")).chooseCpuMove(state, difficulty),
	);
}

export function requestRecommendedMove(state: GameState, difficulty: number) {
	return requestMove({ kind: "recommended", state, difficulty }, async () =>
		(await import("./ai")).chooseRecommendedMove(state, difficulty),
	);
}
