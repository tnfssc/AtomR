import { Link } from "@tanstack/react-router";
import { Home, RotateCcw, SlidersHorizontal } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { getActivePlayerOrder, PLAYER_COLORS } from "../constants";
import type { GameState, PlayerId } from "../types";

const REEL_TRANSITION_MS = 380;
const HUD_BUTTON_CLASS_NAME =
	"flex h-11 w-11 items-center justify-center rounded-full transition-transform duration-150 hover:scale-[1.02] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#07070b] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100 disabled:active:scale-100 min-[480px]:w-auto min-[480px]:gap-2 min-[480px]:px-3";
const HUD_BUTTON_STYLE: React.CSSProperties = {
	background: "rgba(255,255,255,0.02)",
	color: "rgba(255,255,255,0.66)",
	fontFamily: "'Oxanium', sans-serif",
	fontSize: "10px",
	fontWeight: 700,
	letterSpacing: "0.22em",
	textTransform: "uppercase",
};

type GameHudProps = {
	state: GameState;
	onSettingsOpen: () => void;
	onUndo?: () => void;
	undoDisabled?: boolean;
};

function getPlayersInRotation(state: GameState): PlayerId[] {
	const activePlayers = getActivePlayerOrder(state.playerCount).filter(
		(playerId) => !(state.eliminated[playerId] ?? false),
	);

	if (activePlayers.length > 0) return activePlayers;
	if (state.winner) return [state.winner];
	return [state.currentPlayer];
}

function getWrappedPlayer(
	players: PlayerId[],
	index: number,
	offset: number,
): PlayerId {
	const length = players.length;
	const wrappedIndex = (index + offset + length * 8) % length;
	return players[wrappedIndex] ?? players[0] ?? "p1";
}

function getVisibleWindow(
	players: PlayerId[],
	index: number,
): [PlayerId, PlayerId, PlayerId] {
	return [
		getWrappedPlayer(players, index, -1),
		getWrappedPlayer(players, index, 0),
		getWrappedPlayer(players, index, 1),
	];
}

function getAnimatedStrip(
	players: PlayerId[],
	index: number,
	direction: -1 | 1,
): [PlayerId, PlayerId, PlayerId, PlayerId] {
	return direction === 1
		? [
				getWrappedPlayer(players, index, -1),
				getWrappedPlayer(players, index, 0),
				getWrappedPlayer(players, index, 1),
				getWrappedPlayer(players, index, 2),
			]
		: [
				getWrappedPlayer(players, index, -2),
				getWrappedPlayer(players, index, -1),
				getWrappedPlayer(players, index, 0),
				getWrappedPlayer(players, index, 1),
			];
}

function ReelOrb({ playerId }: { playerId: PlayerId }) {
	const color = PLAYER_COLORS[playerId];

	return (
		<div
			className="flex h-[42px] w-full items-center justify-center rounded-[16px] sm:h-[48px] sm:rounded-[18px]"
			style={{
				background: `linear-gradient(180deg, color-mix(in srgb, ${color} 10%, rgba(255,255,255,0.03)), rgba(255,255,255,0.015))`,
				boxShadow: `inset 0 1px 0 ${color}0d, 0 8px 24px rgba(0,0,0,0.18)`,
			}}
		>
			<span
				className="block h-5 w-5 rounded-full sm:h-6 sm:w-6"
				style={{
					backgroundColor: color,
					boxShadow: `0 0 14px ${color}4f`,
				}}
			/>
		</div>
	);
}

function TurnReel({
	players,
	currentPlayer,
	isResolving,
	isWinnerLocked,
}: {
	players: PlayerId[];
	currentPlayer: PlayerId;
	isResolving: boolean;
	isWinnerLocked: boolean;
}) {
	const currentIndex = Math.max(0, players.indexOf(currentPlayer));
	const [displayIndex, setDisplayIndex] = useState(currentIndex);
	const [animation, setAnimation] = useState<{
		direction: -1 | 1;
		fromIndex: number;
		phase: "idle" | "running";
		toIndex: number;
	} | null>(null);
	const timerRef = useRef<number | null>(null);
	const frameRef = useRef<number | null>(null);

	useEffect(() => {
		return () => {
			if (timerRef.current !== null) {
				window.clearTimeout(timerRef.current);
				timerRef.current = null;
			}
			if (frameRef.current !== null) {
				window.cancelAnimationFrame(frameRef.current);
				frameRef.current = null;
			}
		};
	}, []);

	useEffect(() => {
		if (timerRef.current !== null) {
			window.clearTimeout(timerRef.current);
			timerRef.current = null;
		}
		if (frameRef.current !== null) {
			window.cancelAnimationFrame(frameRef.current);
			frameRef.current = null;
		}

		if (players.length <= 1 || isResolving || isWinnerLocked) {
			setDisplayIndex(currentIndex);
			setAnimation(null);
			return;
		}

		if (currentIndex === displayIndex) {
			setAnimation(null);
			return;
		}

		const nextIndex = (displayIndex + 1) % players.length;
		const previousIndex = (displayIndex - 1 + players.length) % players.length;
		const direction =
			currentIndex === nextIndex
				? 1
				: currentIndex === previousIndex
					? -1
					: null;

		if (direction === null) {
			setDisplayIndex(currentIndex);
			setAnimation(null);
			return;
		}

		setAnimation({
			direction,
			fromIndex: displayIndex,
			phase: "idle",
			toIndex: currentIndex,
		});
		frameRef.current = window.requestAnimationFrame(() => {
			setAnimation((current) =>
				current ? { ...current, phase: "running" } : current,
			);
			frameRef.current = null;
		});

		timerRef.current = window.setTimeout(() => {
			setDisplayIndex(currentIndex);
			setAnimation(null);
			timerRef.current = null;
		}, REEL_TRANSITION_MS);
	}, [currentIndex, displayIndex, isResolving, isWinnerLocked, players.length]);

	const settledWindow = getVisibleWindow(players, displayIndex);
	const animatedStrip = animation
		? getAnimatedStrip(players, animation.fromIndex, animation.direction)
		: null;
	const trackTransform = animation
		? animation.direction === 1
			? animation.phase === "running"
				? "translateX(-25%)"
				: "translateX(0%)"
			: animation.phase === "running"
				? "translateX(0%)"
				: "translateX(-25%)"
		: "translateX(0%)";

	return (
		<div className="relative w-full min-w-0 overflow-hidden rounded-[18px] sm:rounded-[22px]">
			<div
				className="pointer-events-none absolute inset-y-0 left-0 z-10 w-4 sm:w-6"
				style={{
					background:
						"linear-gradient(90deg, rgba(7,7,11,0.95), rgba(7,7,11,0))",
				}}
			/>
			<div
				className="pointer-events-none absolute inset-y-0 right-0 z-10 w-4 sm:w-6"
				style={{
					background:
						"linear-gradient(270deg, rgba(7,7,11,0.95), rgba(7,7,11,0))",
				}}
			/>
			{animation && animatedStrip ? (
				<div
					className="grid w-[133.333%] grid-cols-4 gap-1.5 px-0.5 py-0.5 sm:gap-2 sm:px-1 sm:py-1"
					style={{
						transform: trackTransform,
						transition: `transform ${REEL_TRANSITION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
					}}
				>
					{animatedStrip.map((playerId, slotIndex) => (
						<div
							// biome-ignore lint/suspicious/noArrayIndexKey: fixed four-slot animation strip
							key={`${playerId}-${slotIndex}`}
						>
							<ReelOrb playerId={playerId} />
						</div>
					))}
				</div>
			) : (
				<div className="grid grid-cols-3 gap-1.5 px-0.5 py-0.5 sm:gap-2 sm:px-1 sm:py-1">
					{settledWindow.map((playerId, slotIndex) => (
						<div
							// biome-ignore lint/suspicious/noArrayIndexKey: fixed three-slot reel
							key={`${playerId}-${slotIndex}`}
						>
							<ReelOrb playerId={playerId} />
						</div>
					))}
				</div>
			)}
		</div>
	);
}

export default function GameHud({
	state,
	onSettingsOpen,
	onUndo,
	undoDisabled = false,
}: GameHudProps) {
	const playersInRotation = getPlayersInRotation(state);
	const reelPlayer = state.winner ?? state.currentPlayer;
	const isResolving = state.phase === "resolving";
	const isWinnerLocked = Boolean(state.winner || state.isDraw);

	return (
		<div
			className="w-full rounded-[22px] px-1.5 py-1.5 sm:rounded-[24px] sm:px-2 sm:py-2"
			style={{
				background:
					"linear-gradient(180deg, rgba(10,10,16,0.92), rgba(7,7,11,0.82))",
				boxShadow: "0 16px 48px rgba(0,0,0,0.18)",
			}}
		>
			<div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 sm:gap-3">
				<Link
					to="/play"
					aria-label="Home"
					className={`${HUD_BUTTON_CLASS_NAME} no-underline`}
					style={HUD_BUTTON_STYLE}
				>
					<Home size={14} strokeWidth={2} />
					<span className="hidden min-[480px]:inline">home</span>
				</Link>

				<div className="flex min-w-0 items-center">
					<TurnReel
						players={playersInRotation}
						currentPlayer={reelPlayer}
						isResolving={isResolving}
						isWinnerLocked={isWinnerLocked}
					/>
				</div>

				<div className="flex items-center gap-2">
					{onUndo ? (
						<button
							type="button"
							onClick={onUndo}
							disabled={undoDisabled}
							aria-label="Undo previous turn"
							className={HUD_BUTTON_CLASS_NAME}
							style={HUD_BUTTON_STYLE}
						>
							<RotateCcw size={14} strokeWidth={2} />
							<span className="hidden min-[480px]:inline">undo</span>
						</button>
					) : null}
					<button
						type="button"
						onClick={onSettingsOpen}
						aria-label="Board settings"
						className={HUD_BUTTON_CLASS_NAME}
						style={HUD_BUTTON_STYLE}
					>
						<SlidersHorizontal size={14} strokeWidth={2} />
						<span className="hidden min-[480px]:inline">board</span>
					</button>
				</div>
			</div>
		</div>
	);
}
