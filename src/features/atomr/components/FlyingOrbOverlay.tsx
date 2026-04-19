import { PLAYER_COLORS } from "../constants";
import type { ActiveExplosion } from "../useAtomRGame";

type FlyingOrbOverlayProps = {
	activeExplosions: ActiveExplosion[];
	cellSize: number;
};

export default function FlyingOrbOverlay({
	activeExplosions,
	cellSize,
}: FlyingOrbOverlayProps) {
	if (activeExplosions.length === 0 || cellSize <= 0) return null;

	const orbs = activeExplosions.flatMap((explosion) =>
		explosion.affected.map((target) => {
			const deltaCol = target.col - explosion.col;
			const deltaRow = target.row - explosion.row;
			const launchDistance = cellSize * 0.18;
			const startX =
				(explosion.col + 0.5) * cellSize + deltaCol * launchDistance;
			const startY =
				(explosion.row + 0.5) * cellSize + deltaRow * launchDistance;

			return {
				key: `fly-${explosion.animKey}-${explosion.row}-${explosion.col}-${target.row}-${target.col}`,
				startX,
				startY,
				dx: deltaCol * (cellSize - launchDistance),
				dy: deltaRow * (cellSize - launchDistance),
				color: PLAYER_COLORS[explosion.player],
			};
		}),
	);

	return (
		<div className="absolute inset-0 pointer-events-none overflow-hidden">
			{orbs.map((orb) => (
				<span
					key={orb.key}
					className="cr-orb-fly absolute rounded-full"
					style={
						{
							left: `${orb.startX}px`,
							top: `${orb.startY}px`,
							width: `${Math.max(8, cellSize * 0.24)}px`,
							height: `${Math.max(8, cellSize * 0.24)}px`,
							backgroundColor: orb.color,
							boxShadow: `0 0 10px ${orb.color}bb, 0 0 20px ${orb.color}44`,
							"--fly-dx": `${orb.dx}px`,
							"--fly-dy": `${orb.dy}px`,
						} as React.CSSProperties
					}
				/>
			))}
		</div>
	);
}
