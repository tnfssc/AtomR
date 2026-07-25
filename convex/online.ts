import { internal } from './_generated/api'
import { internalMutation, mutation, query } from './_generated/server'
import type { MutationCtx, QueryCtx } from './_generated/server'
import type { Doc, Id } from './_generated/dataModel'
import { v } from 'convex/values'
import { authComponent } from './auth'
import {
	applyMove,
	createInitialGameState,
	pickRandomLegalMove,
} from '../src/features/atomr/shared-engine'
import {
	appendQueuedPremove,
	canAppendQueuedPremove,
	clearQueuedPremove,
	getExecutablePremove,
	getQueuedPremoves,
	removeQueuedPremoveAt,
	shiftQueuedPremove,
} from '../src/features/atomr/premoves'
import {
	ONLINE_TURN_TIME_LIMIT_MS,
	ONLINE_PRESENCE_WINDOW_MS,
	createPlayerFlags,
	type GameState,
	type PlayerId,
	type PlayerFlags,
} from '../src/features/atomr/shared'
import {
	evaluateSearchingQueue,
	isMatchedQueueEntryObsolete as isMatchedQueueEntryObsoleteRule,
	isSearchingQueueEntryStale,
	type MatchLike,
} from '../src/features/atomr/onlineMatchmaking'

const MIN_PRIVATE_ROWS = 3
const MAX_PRIVATE_ROWS = 12
const MIN_PRIVATE_COLS = 4
const MAX_PRIVATE_COLS = 16
const MAX_SEARCHING_QUEUE_SCAN = 128
const MAX_ACTIVE_MATCH_SCAN = 24
const PRESENCE_UPDATE_INTERVAL_MS = 30_000
const MAX_OPEN_ROOMS_PER_USER = 3
const MAX_QUEUED_PREMOVES = 5
const MAX_EXPIRED_ROOMS_SCAN = 100

function getOpponentPlayer(playerId: PlayerId): PlayerId {
	return playerId === 'p1' ? 'p2' : 'p1'
}

function toStoredPlayerFlags(flags: PlayerFlags) {
	const defaults = createPlayerFlags(false)
	return {
		p1: flags.p1 ?? defaults.p1 ?? false,
		p2: flags.p2 ?? defaults.p2 ?? false,
		p3: flags.p3 ?? defaults.p3 ?? false,
		p4: flags.p4 ?? defaults.p4 ?? false,
		p5: flags.p5 ?? defaults.p5 ?? false,
		p6: flags.p6 ?? defaults.p6 ?? false,
		p7: flags.p7 ?? defaults.p7 ?? false,
		p8: flags.p8 ?? defaults.p8 ?? false,
	}
}

function toGameState(match: Doc<'matches'>): GameState {
	return {
		board: match.board,
		rows: match.rows,
		cols: match.cols,
		playerCount: match.playerCount ?? 2,
		currentPlayer: match.currentPlayer,
		turnNumber: match.turnNumber,
		hasPlayed: toStoredPlayerFlags(match.hasPlayed ?? {}),
		eliminated: toStoredPlayerFlags(match.eliminated ?? {}),
		winner: match.winner,
		isDraw: false,
		drawReason: null,
		phase: match.phase === 'gameOver' ? 'gameOver' : 'idle',
	}
}

function assertBoardSize(rows: number, cols: number) {
	if (
		!Number.isInteger(rows) ||
		!Number.isInteger(cols) ||
		rows < MIN_PRIVATE_ROWS ||
		rows > MAX_PRIVATE_ROWS ||
		cols < MIN_PRIVATE_COLS ||
		cols > MAX_PRIVATE_COLS
	) {
		throw new Error('Invalid board size')
	}
}

async function requireAuthUser(ctx: MutationCtx) {
	const authUser = await authComponent.getAuthUser(ctx)
	if (!authUser) {
		throw new Error('Not authenticated')
	}
	return authUser
}

async function getViewerByAuthUserId(ctx: QueryCtx, authUserId: string) {
	return await ctx.db
		.query('users')
		.withIndex('by_auth_user_id', (q) => q.eq('authUserId', authUserId))
		.unique()
}

async function ensureCurrentUser(ctx: MutationCtx) {
	const authUser = await requireAuthUser(ctx)
	const { _id: userId, doc: viewer } = await ensureUser(
		ctx,
		authUser._id,
		authUser.name || authUser.email || 'Player',
		authUser.email ?? undefined,
	)
	if (!viewer) throw new Error('User not found')
	return { authUser, viewer, userId }
}

async function getCurrentViewer(ctx: QueryCtx) {
	const authUser = await authComponent.getAuthUser(ctx)
	if (!authUser) return null
	const viewer = await getViewerByAuthUserId(ctx, authUser._id)
	return {
		authUser,
		viewer,
	}
}

async function findFreshSearchingOpponent(
	ctx: MutationCtx,
	{
		excludeUserId,
		now,
	}: {
		excludeUserId: Id<'users'>
		now: number
	},
) {
	const searchingEntries = await ctx.db
		.query('matchmakingQueue')
		.withIndex('by_status_requested_at', (q) => q.eq('status', 'searching'))
		.take(MAX_SEARCHING_QUEUE_SCAN)

	const usersById = new Map()
	for (const entry of searchingEntries) {
		if (entry.userId === excludeUserId || usersById.has(entry.userId)) continue
		usersById.set(entry.userId, await ctx.db.get(entry.userId))
	}

	const { opponent, staleEntryIds } = evaluateSearchingQueue(
		now,
		searchingEntries,
		usersById,
		excludeUserId,
	)

	for (const staleEntryId of staleEntryIds) {
		await ctx.db.patch(staleEntryId as Id<'matchmakingQueue'>, { status: 'cancelled' })
	}

	return opponent
}

async function isMatchedQueueEntryObsolete(
	ctx: QueryCtx,
	entry: Doc<'matchmakingQueue'>,
	viewer: Doc<'users'>,
) {
	if (!entry.matchId) return true

	const match = await ctx.db.get(entry.matchId)
	return isMatchedQueueEntryObsoleteRule(entry, viewer, match as MatchLike | null)
}

function alphabet() {
	return 'ABCDEFGHJKLMNPQRSTUVWXYZ'
}

function makeRoomCode() {
	const chars = alphabet()
	let code = ''
	const maxUnbiasedValue = 256 - (256 % chars.length)
	while (code.length < 5) {
		const [value] = crypto.getRandomValues(new Uint8Array(1))
		if (value >= maxUnbiasedValue) continue
		code += chars[value % chars.length]
	}
	return code
}

async function ensureUser(
	ctx: MutationCtx,
	authUserId: string,
	displayName: string,
	email?: string,
) {
	const existing = await ctx.db
		.query('users')
		.withIndex('by_auth_user_id', (q) => q.eq('authUserId', authUserId))
		.unique()
	const now = Date.now()
	if (existing) {
		const patch: Record<string, any> = {}
		if (existing.displayName !== displayName) {
			patch.displayName = displayName
		}
		if (existing.email !== email) {
			patch.email = email
		}
		if (
			existing.lastSeenAt === undefined ||
			now - existing.lastSeenAt >= PRESENCE_UPDATE_INTERVAL_MS
		) {
			patch.lastSeenAt = now
		}
		if (Object.keys(patch).length > 0) {
			await ctx.db.patch(existing._id, patch)
		}
		return { _id: existing._id, doc: existing }
	}
	const insertedId = await ctx.db.insert('users', {
		authUserId,
		displayName,
		email,
		createdAt: now,
		lastSeenAt: now,
	})
	const doc = await ctx.db.get(insertedId)
	return { _id: insertedId, doc }
}

async function cleanupStaleQueueEntries(ctx: MutationCtx, now = Date.now()) {
	const searchingEntries = await ctx.db
		.query('matchmakingQueue')
		.withIndex('by_status_requested_at', (q) => q.eq('status', 'searching'))
		.take(MAX_SEARCHING_QUEUE_SCAN)

	const usersById = new Map()
	for (const entry of searchingEntries) {
		if (usersById.has(entry.userId)) continue
		usersById.set(entry.userId, await ctx.db.get(entry.userId))
	}

	for (const entry of searchingEntries) {
		const user = usersById.get(entry.userId) ?? null
		if (isSearchingQueueEntryStale(now, entry, user)) {
			await ctx.db.patch(entry._id, { status: 'cancelled' })
		}
	}
}

async function scheduleTurnTimeout(
	ctx: MutationCtx,
	args: {
		matchId: Id<'matches'>
		expectedTurnNumber: number
		expectedCurrentPlayer: PlayerId
		expectedLastMoveAt: number
	},
) {
	// `internal` is typed via FilterApi, which narrows `expectedCurrentPlayer` to
	// `'p1' | 'p2'` from the validator, but this helper works with the broader
	// `PlayerId` union used by the shared engine. The scheduler's
	// function-reference type does not accept the wider union, so the cast is
	// required to bridge the generated scheduler typing to our engine types.
	const internalApi = internal as any
	await ctx.scheduler.runAfter(
		ONLINE_TURN_TIME_LIMIT_MS,
		internalApi.online.resolveTurnTimeout,
		args,
	)
}

async function scheduleQueuedPremoveExecution(
	ctx: MutationCtx,
	args: {
		matchId: Id<'matches'>
		expectedTurnNumber: number
		expectedCurrentPlayer: PlayerId
		expectedLastMoveAt: number
	},
) {
	// See scheduleTurnTimeout: the scheduler's function-reference type narrows
	// `expectedCurrentPlayer` to `'p1' | 'p2'` (from the validator), which is
	// incompatible with the broader `PlayerId` used by the shared engine, so
	// the cast on `internal` is retained.
	const internalApi = internal as any
	await ctx.scheduler.runAfter(0, internalApi.online.executeQueuedPremove, args)
}

async function persistResolvedMove(
	ctx: MutationCtx,
	match: Doc<'matches'>,
	{
		playerId,
		now,
		result,
	}: {
		playerId: PlayerId
		now: number
		result: ReturnType<typeof applyMove>
	},
) {
		await ctx.db.patch(match._id, {
			board: result.state.board,
		playerCount: result.state.playerCount,
		currentPlayer: result.state.currentPlayer,
		turnNumber: result.state.turnNumber,
		hasPlayed: toStoredPlayerFlags(result.state.hasPlayed),
		eliminated: toStoredPlayerFlags(result.state.eliminated),
		winner: result.state.winner,
		phase: result.state.phase,
		lastMoveEvents: result.events,
		lastMoveAt: now,
			queuedPremoves: shiftQueuedPremove(match.queuedPremoves, playerId),
			endedAt: result.state.winner ? now : undefined,
		})

	if (!result.state.winner) {
		await scheduleQueuedPremoveExecution(ctx, {
			matchId: match._id,
			expectedTurnNumber: result.state.turnNumber,
			expectedCurrentPlayer: result.state.currentPlayer,
			expectedLastMoveAt: now,
		})

		await scheduleTurnTimeout(ctx, {
			matchId: match._id,
			expectedTurnNumber: result.state.turnNumber,
			expectedCurrentPlayer: result.state.currentPlayer,
			expectedLastMoveAt: now,
		})
	}
}

async function resolveTurnTimeoutIfNeeded(
	ctx: MutationCtx,
	match: Doc<'matches'> | null,
	expected?: {
		expectedTurnNumber?: number
		expectedCurrentPlayer?: PlayerId
		expectedLastMoveAt?: number
	},
) {
	if (!match) return { timedOut: false }
	if (match.winner) return { timedOut: false }
	if (match.phase !== 'idle') return { timedOut: false }
	if (
		expected?.expectedTurnNumber !== undefined &&
		match.turnNumber !== expected.expectedTurnNumber
	) {
		return { timedOut: false }
	}
	if (
		expected?.expectedCurrentPlayer !== undefined &&
		match.currentPlayer !== expected.expectedCurrentPlayer
	) {
		return { timedOut: false }
	}
	if (
		expected?.expectedLastMoveAt !== undefined &&
		match.lastMoveAt !== expected.expectedLastMoveAt
	) {
		return { timedOut: false }
	}

	const now = Date.now()
	if (now <= match.lastMoveAt + ONLINE_TURN_TIME_LIMIT_MS) {
		return { timedOut: false }
	}

	const state = toGameState(match)
	const move = pickRandomLegalMove(state)
	if (!move) {
		await ctx.db.patch(match._id, {
			winner: getOpponentPlayer(match.currentPlayer),
			phase: 'gameOver',
			endedAt: now,
		})
		return { timedOut: true, autoMoved: false }
	}

	const playerId = match.currentPlayer as PlayerId
	const result = applyMove(state, move.row, move.col)
	await persistResolvedMove(ctx, match, {
		playerId,
		now,
		result,
	})

	return {
		timedOut: true,
		autoMoved: true,
		move,
	}
}

export const syncViewer = mutation({
	args: {},
	handler: async (ctx) => {
		const { userId } = await ensureCurrentUser(ctx)
		return { userId }
	},
})

export const createPrivateRoom = mutation({
	args: {
		rows: v.number(),
		cols: v.number(),
	},
	handler: async (ctx, args) => {
		assertBoardSize(args.rows, args.cols)
		const { userId: hostUserId } = await ensureCurrentUser(ctx)

		const openRooms = await ctx.db
			.query('privateRooms')
			.withIndex('by_host_user_id', (q) => q.eq('hostUserId', hostUserId))
			.filter((q) => q.eq(q.field('status'), 'open'))
			.collect()
		if (openRooms.length >= MAX_OPEN_ROOMS_PER_USER) {
			throw new Error('Too many open rooms')
		}

		for (let attempt = 0; attempt < 10; attempt += 1) {
			const code = makeRoomCode()
			const existing = await ctx.db
				.query('privateRooms')
				.withIndex('by_code', (q) => q.eq('code', code))
				.unique()
			if (existing) continue
			const roomId = await ctx.db.insert('privateRooms', {
				code,
				hostUserId,
				status: 'open',
				rows: args.rows,
				cols: args.cols,
				createdAt: Date.now(),
				expiresAt: Date.now() + 1000 * 60 * 60,
			})
			return { roomId, code }
		}
		throw new Error('Could not allocate room code')
	},
})

export const joinPrivateRoom = mutation({
	args: {
		code: v.string(),
	},
	handler: async (ctx, args) => {
		const { userId: guestUserId } = await ensureCurrentUser(ctx)
		const room = await ctx.db
			.query('privateRooms')
			.withIndex('by_code', (q) => q.eq('code', args.code.toUpperCase()))
			.unique()
		if (!room) throw new Error('Room not found')
		if (room.expiresAt < Date.now()) throw new Error('Room has expired')
		if (room.status !== 'open' && room.guestUserId !== guestUserId) {
			throw new Error('Room is not joinable')
		}

		if (room.matchId) {
			return { roomId: room._id, matchId: room.matchId, code: room.code }
		}

		if (room.hostUserId === guestUserId) {
			return { roomId: room._id, matchId: room.matchId ?? null, code: room.code }
		}

		const initialState = createInitialGameState(room.rows, room.cols, 2)
		const now = Date.now()
		const matchId = await ctx.db.insert('matches', {
			type: 'private',
			roomId: room._id,
			player1UserId: room.hostUserId,
			player2UserId: guestUserId,
			rows: room.rows,
			cols: room.cols,
			playerCount: initialState.playerCount,
			board: initialState.board,
			currentPlayer: initialState.currentPlayer,
			turnNumber: initialState.turnNumber,
			hasPlayed: toStoredPlayerFlags(initialState.hasPlayed),
			eliminated: toStoredPlayerFlags(initialState.eliminated),
			winner: initialState.winner,
			phase: initialState.phase,
			lastMoveEvents: [],
			createdAt: now,
		startedAt: now,
		lastMoveAt: now,
		queuedPremoves: {},
		})

		await scheduleTurnTimeout(ctx, {
			matchId,
			expectedTurnNumber: initialState.turnNumber,
			expectedCurrentPlayer: initialState.currentPlayer,
			expectedLastMoveAt: now,
		})

		await ctx.db.patch(room._id, {
			guestUserId,
			status: 'full',
			matchId,
		})

		return { roomId: room._id, matchId, code: room.code }
	},
})

export const joinQueue = mutation({
	args: {},
	handler: async (ctx) => {
		const now = Date.now()
		await cleanupStaleQueueEntries(ctx, now)
		const { userId } = await ensureCurrentUser(ctx)

		const existing = await ctx.db
			.query('matchmakingQueue')
			.withIndex('by_user_id', (q) => q.eq('userId', userId))
			.filter((q) => q.eq(q.field('status'), 'searching'))
			.first()
		if (existing) {
			return { queueId: existing._id, status: 'searching' as const, matchId: null }
		}

		const opponent = await findFreshSearchingOpponent(ctx, {
			excludeUserId: userId,
			now,
		})

		if (opponent) {
			const initialState = createInitialGameState(6, 9, 2)
			const matchId = await ctx.db.insert('matches', {
				type: 'public',
				player1UserId: opponent.userId as Id<'users'>,
				player2UserId: userId,
				rows: 6,
				cols: 9,
				playerCount: initialState.playerCount,
				board: initialState.board,
				currentPlayer: initialState.currentPlayer,
				turnNumber: initialState.turnNumber,
				hasPlayed: toStoredPlayerFlags(initialState.hasPlayed),
				eliminated: toStoredPlayerFlags(initialState.eliminated),
				winner: initialState.winner,
				phase: initialState.phase,
				lastMoveEvents: [],
				createdAt: now,
			startedAt: now,
			lastMoveAt: now,
			queuedPremoves: {},
			})

			await scheduleTurnTimeout(ctx, {
				matchId,
				expectedTurnNumber: initialState.turnNumber,
				expectedCurrentPlayer: initialState.currentPlayer,
				expectedLastMoveAt: now,
			})

			await ctx.db.patch(opponent._id as Id<'matchmakingQueue'>, { status: 'matched', matchId })
			const queueId = await ctx.db.insert('matchmakingQueue', {
				userId,
				status: 'matched',
				requestedAt: now,
				matchId,
			})
			return { queueId, status: 'matched' as const, matchId }
		}

		const queueId = await ctx.db.insert('matchmakingQueue', {
			userId,
			status: 'searching',
			requestedAt: now,
		})
		return { queueId, status: 'searching' as const, matchId: null }
	},
})

export const leaveQueue = mutation({
	args: {},
	handler: async (ctx) => {
		const current = await getCurrentViewer(ctx)
		const viewer = current?.viewer
		if (!viewer) return
		const entry = await ctx.db
			.query('matchmakingQueue')
			.withIndex('by_user_id', (q) => q.eq('userId', viewer._id))
			.filter((q) => q.eq(q.field('status'), 'searching'))
			.first()
		if (entry) {
			await ctx.db.patch(entry._id, { status: 'cancelled' })
		}
	},
})

export const getMyQueueEntry = query({
	args: {},
	handler: async (ctx) => {
		const current = await getCurrentViewer(ctx)
		const viewer = current?.viewer
		if (!viewer) return null

		const entry = await ctx.db
			.query('matchmakingQueue')
			.withIndex('by_user_id', (q) => q.eq('userId', viewer._id))
			.filter((q) => q.neq(q.field('status'), 'cancelled'))
			.order('desc')
			.first()
		if (!entry) return null
		if (
			entry.status === 'searching' &&
			isSearchingQueueEntryStale(Date.now(), entry, viewer)
		) {
			return null
		}
		if (
			entry.status === 'matched' &&
			(await isMatchedQueueEntryObsolete(ctx, entry, viewer))
		) {
			return null
		}
		return entry
	},
})

export const getRoomByCode = query({
	args: { code: v.string() },
	handler: async (ctx, args) => {
		const current = await getCurrentViewer(ctx)
		if (!current?.viewer) return null

		const room = await ctx.db
			.query('privateRooms')
			.withIndex('by_code', (q) => q.eq('code', args.code.toUpperCase()))
			.unique()
		if (!room) return null

		return {
			_id: room._id,
			code: room.code,
			rows: room.rows,
			cols: room.cols,
			status: room.status,
			expiresAt: room.expiresAt,
			matchId: room.matchId ?? null,
		}
	},
})

export const getMatch = query({
	args: { matchId: v.id('matches') },
	handler: async (ctx, args) => {
		const current = await getCurrentViewer(ctx)
		const viewer = current?.viewer
		if (!viewer) return null

		const match = await ctx.db.get(args.matchId)
		if (!match) return null
		const viewerPlayerId =
			match.player1UserId === viewer._id
				? 'p1'
				: match.player2UserId === viewer._id
					? 'p2'
					: null
		if (!viewerPlayerId) return null

		const player1 = await ctx.db.get(match.player1UserId)
		const player2 = await ctx.db.get(match.player2UserId)
		return {
			...match,
			player1: player1
				? {
						displayName: player1.displayName,
					}
				: null,
			player2: player2
				? {
						displayName: player2.displayName,
				  }
				: null,
			queuedPremoves: match.queuedPremoves ?? {},
			viewerPlayerId,
		}
	},
})

export const getMyActiveMatch = query({
	args: {},
	handler: async (ctx) => {
		const current = await getCurrentViewer(ctx)
		const viewer = current?.viewer
		if (!viewer) return null

		const [playerOneMatches, playerTwoMatches] = await Promise.all([
			ctx.db
				.query('matches')
				.withIndex('by_player1_user_id', (q) => q.eq('player1UserId', viewer._id))
				.order('desc')
				.take(MAX_ACTIVE_MATCH_SCAN),
			ctx.db
				.query('matches')
				.withIndex('by_player2_user_id', (q) => q.eq('player2UserId', viewer._id))
				.order('desc')
				.take(MAX_ACTIVE_MATCH_SCAN),
		])

		const activeMatch = [...playerOneMatches, ...playerTwoMatches]
			.filter((match) => !match.winner && match.phase !== 'gameOver')
			.sort((a, b) => {
				const aActivityAt = Math.max(a.lastMoveAt ?? 0, a.startedAt ?? 0, a.createdAt)
				const bActivityAt = Math.max(b.lastMoveAt ?? 0, b.startedAt ?? 0, b.createdAt)
				return bActivityAt - aActivityAt
			})[0]

		return activeMatch ? { matchId: activeMatch._id } : null
	},
})

export const cleanupLegacyRematchFields = internalMutation({
	args: {
		limit: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const limit = Math.max(1, Math.min(args.limit ?? 100, 500))
		const matches = await ctx.db.query('matches').collect()
		let cleaned = 0

		for (const match of matches) {
			if (cleaned >= limit) break
			if (match.rematchMatchId === undefined) continue

			const {
				_creationTime,
				_id,
				rematchMatchId,
				...replacement
			} = match
			void _creationTime
			void rematchMatchId
			await ctx.db.replace(_id, replacement)
			cleaned += 1
		}

		return { cleaned }
	},
})

export const resolveTurnTimeout = internalMutation({
	args: {
		matchId: v.id('matches'),
		expectedTurnNumber: v.number(),
		expectedCurrentPlayer: v.union(v.literal('p1'), v.literal('p2')),
		expectedLastMoveAt: v.number(),
	},
	handler: async (ctx, args) => {
		const match = await ctx.db.get(args.matchId)
		return await resolveTurnTimeoutIfNeeded(ctx, match, args)
	},
})

export const executeQueuedPremove = internalMutation({
	args: {
		matchId: v.id('matches'),
		expectedTurnNumber: v.number(),
		expectedCurrentPlayer: v.union(v.literal('p1'), v.literal('p2')),
		expectedLastMoveAt: v.number(),
	},
	handler: async (ctx, args) => {
		const match = await ctx.db.get(args.matchId)
		if (!match) return { executed: false }
		if (match.winner || match.phase !== 'idle') return { executed: false }
		if (match.turnNumber !== args.expectedTurnNumber) return { executed: false }
		if (match.currentPlayer !== args.expectedCurrentPlayer) return { executed: false }
		if (match.lastMoveAt !== args.expectedLastMoveAt) return { executed: false }

		const playerId = match.currentPlayer as PlayerId
		const state = toGameState(match)
		const premove = getExecutablePremove(state, playerId, match.queuedPremoves)
		if (!premove) {
			const existing = getQueuedPremoves(match.queuedPremoves, playerId)
			if (existing.length > 0) {
				await ctx.db.patch(match._id, {
					queuedPremoves: clearQueuedPremove(match.queuedPremoves, playerId),
				})
			}
			return { executed: false }
		}

	const now = Date.now()
	const result = applyMove(state, premove.row, premove.col)
	await persistResolvedMove(ctx, match, {
		playerId,
		now,
		result,
	})

		return {
			executed: true,
			row: premove.row,
			col: premove.col,
		}
	},
})

export const claimTurnTimeout = mutation({
	args: {
		matchId: v.id('matches'),
	},
	handler: async (ctx, args) => {
		const { viewer } = await ensureCurrentUser(ctx)

		const match = await ctx.db.get(args.matchId)
		if (!match) throw new Error('Match not found')

		const isPlayer =
			match.player1UserId === viewer._id ||
			match.player2UserId === viewer._id
		if (!isPlayer) throw new Error('Not part of this match')

		return await resolveTurnTimeoutIfNeeded(ctx, match)
	},
})

export const submitMove = mutation({
	args: {
		matchId: v.id('matches'),
		row: v.number(),
		col: v.number(),
		expectedTurnNumber: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const { viewer } = await ensureCurrentUser(ctx)

		const match = await ctx.db.get(args.matchId)
		if (!match) throw new Error('Match not found')
		if (match.phase !== 'idle' && match.phase !== 'gameOver') {
			throw new Error('Match is not active')
		}
		if (match.winner) throw new Error('Match is already finished')

		let playerId: PlayerId | null = null
		if (match.player1UserId === viewer._id) playerId = 'p1'
		if (match.player2UserId === viewer._id) playerId = 'p2'
		if (!playerId) throw new Error('Not part of this match')

		if (
			args.expectedTurnNumber !== undefined &&
			match.turnNumber !== args.expectedTurnNumber
		) {
			throw new Error('Stale move')
		}

		const turnTimedOut = await resolveTurnTimeoutIfNeeded(ctx, match)
		if (turnTimedOut.timedOut) throw new Error('Turn timed out')

		if (match.currentPlayer !== playerId) throw new Error('Not your turn')

		const state = toGameState(match)
		const result = applyMove(state, args.row, args.col)
		const now = Date.now()

		await persistResolvedMove(ctx, match, {
			playerId,
			now,
			result,
		})

		return {
			state: result.state,
			events: result.events,
		}
	},
})

export const queuePremove = mutation({
	args: {
		matchId: v.id('matches'),
		row: v.number(),
		col: v.number(),
	},
	handler: async (ctx, args) => {
		const { viewer } = await ensureCurrentUser(ctx)

		const match = await ctx.db.get(args.matchId)
		if (!match) throw new Error('Match not found')
		if (match.winner || match.phase !== 'idle') {
			throw new Error('Match is already finished')
		}

		let playerId: PlayerId | null = null
		if (match.player1UserId === viewer._id) playerId = 'p1'
		if (match.player2UserId === viewer._id) playerId = 'p2'
		if (!playerId) throw new Error('Not part of this match')
		if (match.currentPlayer === playerId) {
			throw new Error('Cannot queue premove on your turn')
		}

		const existingPremoves = getQueuedPremoves(match.queuedPremoves, playerId)
		if (existingPremoves.length >= MAX_QUEUED_PREMOVES) {
			throw new Error('Premove queue full')
		}

		const state = toGameState(match)
		if (
			!canAppendQueuedPremove(state, playerId, match.queuedPremoves, args.row, args.col)
		) {
			throw new Error('Illegal premove')
		}

		const queuedPremoves = appendQueuedPremove(match.queuedPremoves, playerId, {
			row: args.row,
			col: args.col,
			queuedAtTurn: match.turnNumber,
			queuedAtMs: Date.now(),
		})

		await ctx.db.patch(match._id, { queuedPremoves })
		return {
			queuedPremoves,
			playerId,
		}
	},
})

export const clearPremove = mutation({
	args: {
		matchId: v.id('matches'),
		row: v.optional(v.number()),
		col: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const { viewer } = await ensureCurrentUser(ctx)
		const match = await ctx.db.get(args.matchId)
		if (!match) throw new Error('Match not found')

		let playerId: PlayerId | null = null
		if (match.player1UserId === viewer._id) playerId = 'p1'
		if (match.player2UserId === viewer._id) playerId = 'p2'
		if (!playerId) throw new Error('Not part of this match')

		const queuedPremoves =
			args.row === undefined || args.col === undefined
				? clearQueuedPremove(match.queuedPremoves, playerId)
				: removeQueuedPremoveAt(match.queuedPremoves, playerId, args.row, args.col)
		await ctx.db.patch(match._id, { queuedPremoves })
		return { queuedPremoves, playerId }
	},
})

export const resignMatch = mutation({
	args: {
		matchId: v.id('matches'),
	},
	handler: async (ctx, args) => {
		const { viewer } = await ensureCurrentUser(ctx)

		const match = await ctx.db.get(args.matchId)
		if (!match) throw new Error('Match not found')
		if (match.winner || match.phase === 'gameOver') {
			return { winner: match.winner }
		}

		let resigningPlayer: PlayerId | null = null
		if (match.player1UserId === viewer._id) resigningPlayer = 'p1'
		if (match.player2UserId === viewer._id) resigningPlayer = 'p2'
		if (!resigningPlayer) throw new Error('Not part of this match')

		const winner = getOpponentPlayer(resigningPlayer)
		const now = Date.now()

		await ctx.db.patch(match._id, {
			winner,
			phase: 'gameOver',
			endedAt: now,
			lastMoveAt: now,
			lastMoveEvents: [],
		})

		return { winner }
	},
})

const ONLINE_COUNT_CAP = 512
const SITE_STATS_KEY = 'onlineCount'

/** Cron target: count users active in the presence window, write to singleton. */
export const refreshOnlineCount = internalMutation({
	args: {},
	handler: async (ctx) => {
		const now = Date.now()
		const cutoff = now - ONLINE_PRESENCE_WINDOW_MS
		const recent = await ctx.db
			.query('users')
			.withIndex('by_last_seen_at', (q) => q.gte('lastSeenAt', cutoff))
			.take(ONLINE_COUNT_CAP)
		const count = recent.length

		const existing = await ctx.db
			.query('siteStats')
		.withIndex('by_key', (q) => q.eq('key', SITE_STATS_KEY))
		.unique()
		if (existing) {
			await ctx.db.patch(existing._id, { onlineCount: count, updatedAt: now })
		} else {
			await ctx.db.insert('siteStats', {
				key: SITE_STATS_KEY,
				onlineCount: count,
				updatedAt: now,
			})
		}
	},
})

/** Cron target: mark open private rooms past their expiry as 'expired'. */
export const cleanupExpiredRooms = internalMutation({
	args: {},
	handler: async (ctx) => {
		const now = Date.now()
		const expiredRooms = await ctx.db
			.query('privateRooms')
			.withIndex('by_status', (q: any) => q.eq('status', 'open'))
			.filter((q: any) => q.lt(q.field('expiresAt'), now))
			.take(MAX_EXPIRED_ROOMS_SCAN)

		let expired = 0
		for (const room of expiredRooms) {
			await ctx.db.patch(room._id, { status: 'expired' })
			expired += 1
		}

		return { expired }
	},
})

/** Client read: returns the cached online count from the singleton. */
export const getOnlineCount = query({
	args: {},
	handler: async (ctx) => {
		const stat = await ctx.db
			.query('siteStats')
		.withIndex('by_key', (q) => q.eq('key', SITE_STATS_KEY))
		.unique()
		return stat ? { onlineCount: stat.onlineCount, updatedAt: stat.updatedAt } : { onlineCount: 0, updatedAt: 0 }
	},
})
