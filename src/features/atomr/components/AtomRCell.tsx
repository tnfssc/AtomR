import type { KeyboardEventHandler, Ref } from "react";
import { PLAYER_COLORS } from "../constants";
import { isCellCritical } from "../selectors";
import type { Cell, GameState, PlayerId, Position } from "../types";

type AtomRCellProps = {
	state: GameState;
	cell: Cell;
	position: Position;
	activeColor: string;
	isLegal: boolean;
	canActivate: boolean;
	isAnimating: boolean;
	isExploding: boolean;
	isCapturing: boolean;
	isBlockedFeedback: boolean;
	isLastMove: boolean;
	isSuggested: boolean;
	suggestedPlayer?: PlayerId | null;
	tabIndex?: number;
	descriptionId?: string;
	buttonRef?: Ref<HTMLButtonElement>;
	onFocus?: () => void;
	onClick: () => void;
	onKeyDown?: KeyboardEventHandler<HTMLButtonElement>;
};

// Orb positions as percentages of cell dimensions
const ORB_LAYOUTS: Record<number, Array<{ x: number; y: number }>> = {
	1: [{ x: 50, y: 50 }],
	2: [
		{ x: 33, y: 50 },
		{ x: 67, y: 50 },
	],
	3: [
		{ x: 50, y: 30 },
		{ x: 27, y: 67 },
		{ x: 73, y: 67 },
	],
	4: [
		{ x: 35, y: 35 },
		{ x: 65, y: 35 },
		{ x: 35, y: 65 },
		{ x: 65, y: 65 },
	],
};

function OrbDisplay({
	count,
	color,
	isExploding,
	isCritical,
}: {
	count: number;
	color: string;
	isExploding: boolean;
	isCritical: boolean;
}) {
	const positions = ORB_LAYOUTS[Math.min(count, 4)] ?? ORB_LAYOUTS[4];
	return (
		<>
			{positions.map((pos, i) => {
				const delayMs = isExploding ? 0 : i * 18;
				let animation: string;
				if (isExploding) {
					animation =
						"cr-orb-burst 0.16s cubic-bezier(0.22, 1, 0.36, 1) forwards";
				} else if (isCritical) {
					animation = `cr-orb-pop 0.22s ${delayMs}ms cubic-bezier(0.22, 1, 0.36, 1) both, cr-orb-critical 0.78s ${220 + delayMs}ms ease-in-out infinite`;
				} else {
					animation = `cr-orb-pop 0.22s ${delayMs}ms cubic-bezier(0.22, 1, 0.36, 1) both`;
				}
				return (
					<span
						// key includes count + exploding state so remount triggers animation replay
						// biome-ignore lint/suspicious/noArrayIndexKey: intentional — positional, see above
						key={`${i}-${count}-${isExploding ? "ex" : "idle"}`}
						className="absolute rounded-full"
						style={{
							left: `${pos.x}%`,
							top: `${pos.y}%`,
							width: count >= 4 ? "25%" : "30%",
							aspectRatio: "1 / 1",
							backgroundColor: color,
							boxShadow: isCritical
								? `0 0 8px ${color}cc, 0 0 20px ${color}88`
								: `0 0 5px ${color}bb, 0 0 12px ${color}66`,
							animation,
							willChange: "transform, opacity",
						}}
					/>
				);
			})}
		</>
	);
}

export default function AtomRCell({
	state,
	cell,
	position,
	activeColor,
	isLegal,
	canActivate,
	isAnimating,
	isExploding,
	isCapturing,
	isBlockedFeedback,
	isLastMove,
	isSuggested,
	suggestedPlayer,
	tabIndex = -1,
	descriptionId,
	buttonRef,
	onFocus,
	onClick,
	onKeyDown,
}: AtomRCellProps) {
	const ownerColor = cell.owner ? PLAYER_COLORS[cell.owner] : null;
	const suggestionColor = suggestedPlayer
		? PLAYER_COLORS[suggestedPlayer]
		: null;
	const critical = isCellCritical(state, cell, position.row, position.col);
	const cellCoordinate = `${String.fromCharCode(65 + position.col)}${position.row + 1}`;
	const availability = isAnimating
		? "resolving"
		: isLegal
			? "legal"
			: "illegal";

	// Background tint
	let bgColor = "#141427";
	if (isExploding && ownerColor)
		bgColor = `color-mix(in srgb, ${ownerColor} 20%, #07070b)`;
	else if (isCapturing && ownerColor)
		bgColor = `color-mix(in srgb, ${ownerColor} 12%, #07070b)`;
	else if (ownerColor && cell.count > 0)
		bgColor = `color-mix(in srgb, ${ownerColor} 10%, #141427)`;

	return (
		<button
			ref={buttonRef}
			type="button"
			onClick={onClick}
			onFocus={onFocus}
			onKeyDown={onKeyDown}
			tabIndex={tabIndex}
			className="group relative cursor-pointer focus-visible:outline-none"
			aria-disabled={!canActivate}
			aria-describedby={descriptionId}
			aria-label={
				cell.owner
					? `${cellCoordinate}, ${cell.owner} cell with ${cell.count} orb${cell.count === 1 ? "" : "s"}, ${critical ? "critical, " : ""}${availability}`
					: `${cellCoordinate}, empty cell, ${availability}`
			}
		>
			{/* Main cell face */}
			<span
				className="absolute inset-0 transition-colors duration-200"
				style={{
					backgroundColor: bgColor,
					boxShadow:
						!cell.owner || cell.count === 0
							? "inset 0 0 0 1px rgba(255,255,255,0.04)"
							: "none",
				}}
			>
				{/* Inner ring — critical pulse */}
				<span
					className={[
						"absolute inset-[2px] rounded-[2px] pointer-events-none",
						critical && ownerColor ? "cr-critical-ring" : "",
					].join(" ")}
					style={
						{
							"--cr-critical-shadow-lo": `inset 0 0 0 1px ${ownerColor ?? "transparent"}, 0 0 8px ${ownerColor ?? "transparent"}66`,
							"--cr-critical-shadow-hi": `inset 0 0 0 2px ${ownerColor ?? "transparent"}, 0 0 22px ${ownerColor ?? "transparent"}aa`,
							boxShadow:
								critical && ownerColor
									? `inset 0 0 0 1px ${ownerColor}, 0 0 10px ${ownerColor}77`
									: isCapturing
										? `inset 0 0 0 1px ${activeColor}88`
										: "none",
						} as React.CSSProperties
					}
				/>

				<span
					className="pointer-events-none absolute inset-[1px] rounded-[3px] opacity-0 transition-opacity duration-100 group-focus-visible:opacity-100"
					style={{
						boxShadow:
							"inset 0 0 0 2px rgba(255,255,255,0.92), 0 0 0 1px rgba(255,255,255,0.12), 0 0 18px rgba(255,255,255,0.24)",
					}}
				/>

				{isBlockedFeedback ? (
					<span
						className="pointer-events-none absolute inset-[3px] rounded-[2px]"
						style={{
							boxShadow: "inset 0 0 0 2px rgba(255,255,255,0.9)",
							animation:
								"cr-capture-ripple 0.18s cubic-bezier(0.22, 1, 0.36, 1)",
						}}
					/>
				) : null}

				{isLastMove && (
					<span
						className="absolute inset-[5px] rounded-[4px] pointer-events-none"
						style={{
							boxShadow:
								"inset 0 0 0 1px rgba(255,255,255,0.72), 0 0 0 1px rgba(255,255,255,0.1)",
						}}
					/>
				)}

				{isSuggested && suggestionColor && (
					<span
						className="absolute inset-[6px] rounded-[4px] border border-dashed pointer-events-none"
						style={{
							borderColor: `${suggestionColor}99`,
							boxShadow: `0 0 0 1px ${suggestionColor}22, inset 0 0 14px ${suggestionColor}12`,
						}}
					/>
				)}

				{/* Capture ripple — expanding ring when orb lands */}
				{isCapturing && ownerColor && (
					<span
						className="cr-capture-ripple absolute inset-[3px] rounded-[1px] pointer-events-none"
						style={{
							border: `1.5px solid ${ownerColor}cc`,
							backgroundColor: "transparent",
						}}
					/>
				)}

				{/* Orbs */}
				{cell.owner && cell.count > 0 && ownerColor && (
					<OrbDisplay
						count={cell.count}
						color={ownerColor}
						isExploding={isExploding}
						isCritical={critical}
					/>
				)}
				{/* Hover glow overlay — legal, non-animating only */}
				{canActivate && (
					<span
						className="absolute inset-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100 pointer-events-none"
						style={{
							backgroundColor: `${activeColor}1a`,
							boxShadow: `inset 0 0 0 1px ${activeColor}55`,
						}}
					/>
				)}
			</span>
		</button>
	);
}
