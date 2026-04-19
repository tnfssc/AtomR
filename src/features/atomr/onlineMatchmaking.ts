import { ONLINE_QUEUE_STALE_MS } from "./shared";

export type QueueEntryStatus = "searching" | "matched" | "cancelled";

export type QueueEntryLike = {
	_id: string;
	userId: string;
	status: QueueEntryStatus;
	requestedAt: number;
	matchId?: string;
};

export type PresenceUserLike = {
	_id: string;
	lastSeenAt: number;
};

export type MatchLike = {
	player1UserId: string;
	player2UserId: string;
	phase: "idle" | "resolving" | "gameOver" | "abandoned";
	winner: "p1" | "p2" | null;
};

export function isSearchingQueueEntryStale(
	now: number,
	entry: Pick<QueueEntryLike, "requestedAt">,
	user: Pick<PresenceUserLike, "lastSeenAt"> | null,
) {
	if (!user) return true;
	return (
		now - Math.max(entry.requestedAt, user.lastSeenAt) > ONLINE_QUEUE_STALE_MS
	);
}

export function evaluateSearchingQueue(
	now: number,
	entries: QueueEntryLike[],
	usersById: Map<string, PresenceUserLike>,
	excludeUserId: string,
) {
	const staleEntryIds: string[] = [];
	let opponent: QueueEntryLike | null = null;

	for (const entry of entries) {
		if (entry.userId === excludeUserId) continue;

		const user = usersById.get(entry.userId) ?? null;
		if (isSearchingQueueEntryStale(now, entry, user)) {
			staleEntryIds.push(entry._id);
			continue;
		}

		opponent = entry;
		break;
	}

	return { opponent, staleEntryIds };
}

export function isMatchedQueueEntryObsolete(
	entry: Pick<QueueEntryLike, "matchId">,
	viewer: Pick<PresenceUserLike, "_id">,
	match: MatchLike | null,
) {
	if (!entry.matchId) return true;
	if (!match) return true;

	const isPlayer =
		match.player1UserId === viewer._id || match.player2UserId === viewer._id;
	if (!isPlayer) return true;

	return (
		match.phase === "gameOver" ||
		match.phase === "abandoned" ||
		Boolean(match.winner)
	);
}
