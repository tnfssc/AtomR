import { PLAYER_COLORS, PLAYER_NAMES } from "../constants";
import type { GameState, PlayerId } from "../types";

type GameOverlayProps = {
	state: GameState;
	onReset: () => void;
	resetLabel?: string;
	resetPending?: boolean;
	playerNames?: Partial<Record<PlayerId, string>>;
};

export default function GameOverlay({
	state,
	onReset,
	resetLabel = "play again",
	resetPending = false,
	playerNames,
}: GameOverlayProps) {
	if (!state.winner && !state.isDraw) {
		return null;
	}

	const winnerColor = state.winner
		? PLAYER_COLORS[state.winner]
		: "rgba(255,255,255,0.82)";
	const winnerName = state.winner
		? (playerNames?.[state.winner] ?? PLAYER_NAMES[state.winner])
		: "Draw";
	const resultLabel = state.winner ? "wins" : "unstable loop";

	return (
		<div
			className="absolute inset-0 z-20 flex items-center justify-center rounded-[calc(1rem-1px)]"
			style={{
				background: "rgba(7,7,11,0.82)",
				backdropFilter: "blur(10px)",
			}}
		>
			<div className="flex flex-col items-center gap-6 px-8 py-10 text-center">
				{/* Winner label */}
				<span
					className="text-[10px] font-semibold uppercase tracking-[0.55em]"
					style={{
						fontFamily: "'Oxanium', sans-serif",
						color: "rgba(255,255,255,0.25)",
					}}
				>
					game over
				</span>

				{/* Big winner name */}
				<div className="flex flex-col items-center gap-1">
					<span
						className="text-6xl font-extrabold leading-none tracking-tighter sm:text-7xl"
						style={{
							fontFamily: "'Oxanium', sans-serif",
							color: winnerColor,
							textShadow: `0 0 40px ${winnerColor}55`,
						}}
					>
						{winnerName}
					</span>
					<span
						className="text-sm font-medium uppercase tracking-[0.5em]"
						style={{
							fontFamily: "'Oxanium', sans-serif",
							color: state.winner
								? `color-mix(in srgb, ${winnerColor} 70%, rgba(255,255,255,0.3))`
								: "rgba(255,255,255,0.38)",
						}}
					>
						{resultLabel}
					</span>
				</div>

				{/* Rematch button */}
				<button
					type="button"
					onClick={onReset}
					disabled={resetPending}
					className="mt-2 rounded-full px-8 py-3 text-sm font-bold uppercase tracking-[0.25em] transition-transform duration-150 hover:scale-[1.04] active:scale-[0.97] disabled:opacity-60 disabled:scale-100 disabled:cursor-not-allowed"
					style={{
						fontFamily: "'Oxanium', sans-serif",
						backgroundColor: winnerColor,
						color: "#07070b",
						boxShadow: `0 0 24px ${winnerColor}44`,
					}}
				>
					{resetPending ? "…" : resetLabel}
				</button>
			</div>
		</div>
	);
}
