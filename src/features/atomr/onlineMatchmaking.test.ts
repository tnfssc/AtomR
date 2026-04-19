import { describe, expect, it } from "vitest";

import {
	evaluateSearchingQueue,
	isMatchedQueueEntryObsolete,
	isSearchingQueueEntryStale,
	type MatchLike,
	type PresenceUserLike,
	type QueueEntryLike,
} from "./onlineMatchmaking";
import { ONLINE_QUEUE_STALE_MS } from "./shared";

function queueEntry(
	overrides: Partial<QueueEntryLike> & Pick<QueueEntryLike, "_id" | "userId">,
): QueueEntryLike {
	return {
		status: "searching",
		requestedAt: 1_000,
		...overrides,
	};
}

function presenceUser(
	overrides: Partial<PresenceUserLike> & Pick<PresenceUserLike, "_id">,
): PresenceUserLike {
	return {
		lastSeenAt: 1_000,
		...overrides,
	};
}

function match(overrides: Partial<MatchLike>): MatchLike {
	return {
		player1UserId: "u1",
		player2UserId: "u2",
		phase: "idle",
		winner: null,
		...overrides,
	};
}

describe("online matchmaking freshness", () => {
	it("treats queue entries as stale when the user heartbeat is outside the freshness window", () => {
		const entry = queueEntry({ _id: "q1", userId: "u2", requestedAt: 1_000 });
		const user = presenceUser({
			_id: "u2",
			lastSeenAt: 1_000 + ONLINE_QUEUE_STALE_MS + 1,
		});

		expect(
			isSearchingQueueEntryStale(
				1_000 + ONLINE_QUEUE_STALE_MS + 2,
				entry,
				presenceUser({ _id: "u2", lastSeenAt: 1_000 }),
			),
		).toBe(true);
		expect(isSearchingQueueEntryStale(user.lastSeenAt, entry, user)).toBe(
			false,
		);
	});

	it("skips stale queue entries and returns the first fresh opponent", () => {
		const entries = [
			queueEntry({ _id: "self", userId: "u1", requestedAt: 2_000 }),
			queueEntry({ _id: "stale", userId: "u2", requestedAt: 1_000 }),
			queueEntry({ _id: "fresh", userId: "u3", requestedAt: 2_500 }),
		];
		const usersById = new Map<string, PresenceUserLike>([
			["u2", presenceUser({ _id: "u2", lastSeenAt: 1_000 })],
			["u3", presenceUser({ _id: "u3", lastSeenAt: 2_700 })],
		]);

		const result = evaluateSearchingQueue(
			1_000 + ONLINE_QUEUE_STALE_MS + 10,
			entries,
			usersById,
			"u1",
		);

		expect(result.opponent?._id).toBe("fresh");
		expect(result.staleEntryIds).toEqual(["stale"]);
	});

	it("marks matched queue entries obsolete when the match is finished or no longer belongs to the viewer", () => {
		const entry = queueEntry({
			_id: "matched",
			userId: "u1",
			status: "matched",
			matchId: "m1",
		});
		const viewer = presenceUser({ _id: "u1" });

		expect(
			isMatchedQueueEntryObsolete(entry, viewer, match({ phase: "gameOver" })),
		).toBe(true);
		expect(
			isMatchedQueueEntryObsolete(entry, viewer, match({ winner: "p2" })),
		).toBe(true);
		expect(
			isMatchedQueueEntryObsolete(
				entry,
				viewer,
				match({ player1UserId: "u9", player2UserId: "u8" }),
			),
		).toBe(true);
		expect(
			isMatchedQueueEntryObsolete(entry, viewer, match({ phase: "idle" })),
		).toBe(false);
	});
});
