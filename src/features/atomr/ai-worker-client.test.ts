import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AiWorkerRequest } from "./ai-worker-protocol";
import type { GameState, Position } from "./types";

function createState(
	currentPlayer: GameState["currentPlayer"] = "p2",
): GameState {
	return {
		board: Array.from({ length: 3 }, () =>
			Array.from({ length: 3 }, () => ({ owner: null, count: 0 })),
		),
		rows: 3,
		cols: 3,
		playerCount: 2,
		currentPlayer,
		turnNumber: 0,
		hasPlayed: { p1: false, p2: false },
		eliminated: { p1: false, p2: false },
		winner: null,
		phase: "idle",
	};
}

class FakeWorker {
	static instances: FakeWorker[] = [];
	static batchDelayMs = 0;

	onmessage: ((event: MessageEvent) => void) | null = null;
	onerror: ((event: Event) => void) | null = null;
	postedMessages: AiWorkerRequest[] = [];
	terminated = false;

	constructor(_url: URL, _options: WorkerOptions) {
		FakeWorker.instances.push(this);
	}

	postMessage(message: AiWorkerRequest) {
		this.postedMessages.push(message);

		if (message.kind === "scoreCpuBatch") {
			setTimeout(() => {
				if (this.terminated || !this.onmessage) return;
				this.onmessage({
					data: {
						id: message.id,
						scored: message.moves.map((move) => ({
							move,
							value: move.row === 1 && move.col === 1 ? 100 : 0,
						})),
					},
				} as MessageEvent);
			}, FakeWorker.batchDelayMs);
		}
	}

	terminate() {
		this.terminated = true;
	}

	respond(move: Position | null) {
		const lastMessage = this.postedMessages.at(-1);
		if (!lastMessage || !this.onmessage) {
			throw new Error("No pending worker message");
		}

		this.onmessage({
			data: { id: lastMessage.id, move },
		} as MessageEvent);
	}
}

describe("ai worker client", () => {
	beforeEach(() => {
		vi.resetModules();
		FakeWorker.instances = [];
		FakeWorker.batchDelayMs = 0;
	});

	afterEach(() => {
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
	});

	it("falls back to main-thread AI when worker support is unavailable", async () => {
		vi.stubGlobal("window", undefined);
		vi.stubGlobal("Worker", undefined);

		const { requestCpuMove } = await import("./ai-worker-client");
		const task = requestCpuMove(createState(), 5);
		const move = await task.promise;

		expect(move).not.toBeNull();
		expect(FakeWorker.instances).toHaveLength(0);
	});

	it("resolves moves from the worker response", async () => {
		vi.stubGlobal("window", {});
		vi.stubGlobal("Worker", FakeWorker);

		const { requestCpuMove } = await import("./ai-worker-client");
		const task = requestCpuMove(createState(), 5);
		const worker = FakeWorker.instances[0];

		expect(worker).toBeDefined();
		expect(worker?.postedMessages).toHaveLength(1);

		worker?.respond({ row: 1, col: 2 });

		await expect(task.promise).resolves.toEqual({ row: 1, col: 2 });
	});

	it("fans out non-level-10 CPU search across multiple workers and returns before serial batch delays add up", async () => {
		const batchDelayMs = 50;

		vi.stubGlobal("window", {});
		vi.stubGlobal("Worker", FakeWorker);
		vi.stubGlobal("navigator", { hardwareConcurrency: 8 });
		vi.spyOn(Math, "random").mockReturnValue(0.5);
		FakeWorker.batchDelayMs = batchDelayMs;

		const { requestCpuMove } = await import("./ai-worker-client");
		const startedAt = performance.now();
		const task = requestCpuMove(createState(), 5);
		const move = await task.promise;
		const elapsedMs = performance.now() - startedAt;

		expect(FakeWorker.instances.length).toBeGreaterThan(1);
		expect(elapsedMs).toBeLessThan(batchDelayMs * 2);
		expect(move).toEqual({ row: 1, col: 1 });
	});

	it("cancels in-flight work by terminating the worker and allows a fresh restart", async () => {
		vi.stubGlobal("window", {});
		vi.stubGlobal("Worker", FakeWorker);

		const { requestCpuMove } = await import("./ai-worker-client");
		const firstTask = requestCpuMove(createState(), 8);
		const firstWorker = FakeWorker.instances[0];

		firstTask.cancel();

		expect(firstWorker?.terminated).toBe(true);
		await expect(firstTask.promise).rejects.toThrow("AI request cancelled");

		const secondTask = requestCpuMove(createState("p1"), 4);
		const secondWorker = FakeWorker.instances[1];

		expect(secondWorker).toBeDefined();
		expect(secondWorker).not.toBe(firstWorker);

		secondWorker?.respond({ row: 0, col: 0 });

		await expect(secondTask.promise).resolves.toEqual({ row: 0, col: 0 });
	});
});
