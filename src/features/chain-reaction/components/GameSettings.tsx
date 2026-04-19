import { useEffect, useState } from "react";
import { getRecommendedSize } from "#/features/chain-reaction/utils/recommendedSize";

type GameSettingsProps = {
	open: boolean;
	rows: number;
	cols: number;
	playerCount?: number;
	playerCountLocked?: boolean;
	difficulty?: number;
	difficultyLabel?: string;
	onApply: (
		rows: number,
		cols: number,
		difficulty?: number,
		playerCount?: number,
	) => void;
	onClose: () => void;
};

export default function GameSettings({
	open,
	rows,
	cols,
	playerCount,
	playerCountLocked = true,
	difficulty,
	difficultyLabel,
	onApply,
	onClose,
}: GameSettingsProps) {
	const [localRows, setLocalRows] = useState(rows);
	const [localCols, setLocalCols] = useState(cols);
	const [localPlayerCount, setLocalPlayerCount] = useState(playerCount ?? 2);
	const [localDifficulty, setLocalDifficulty] = useState(difficulty ?? 5);

	// Sync local state when modal opens
	useEffect(() => {
		if (open) {
			setLocalRows(rows);
			setLocalCols(cols);
			setLocalPlayerCount(playerCount ?? 2);
			setLocalDifficulty(difficulty ?? 5);
		}
	}, [open, rows, cols, playerCount, difficulty]);

	// Escape key to dismiss
	useEffect(() => {
		if (!open) return;
		function handleKeyDown(e: KeyboardEvent) {
			if (e.key === "Escape") onClose();
		}
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [open, onClose]);

	if (!open) return null;

	const labelStyle: React.CSSProperties = {
		fontFamily: "'Oxanium', sans-serif",
		fontSize: "10px",
		color: "rgba(255,255,255,0.3)",
		textTransform: "uppercase",
		letterSpacing: "0.25em",
	};

	const valueStyle: React.CSSProperties = {
		fontFamily: "'JetBrains Mono', monospace",
		fontSize: "20px",
		fontWeight: 600,
		color: "rgba(255,255,255,0.88)",
	};

	return (
		<>
			{/* Backdrop — button so Biome a11y rules are satisfied */}
			<button
				type="button"
				aria-label="Close settings"
				className="fixed inset-0 z-50"
				style={{
					background: "rgba(7,7,11,0.82)",
					backdropFilter: "blur(10px)",
					cursor: "default",
				}}
				onClick={onClose}
			/>

			{/* Dialog panel */}
			<div
				role="dialog"
				aria-modal="true"
				aria-label="Game settings"
				className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
			>
				<div
					className="relative mx-4 w-full max-w-xs rounded-2xl p-6 flex flex-col gap-5 pointer-events-auto"
					style={{
						background: "#0d0d1a",
						border: "1px solid rgba(255,255,255,0.07)",
						boxShadow: "0 32px 80px rgba(0,0,0,0.75)",
					}}
				>
					{/* Header */}
					<div className="flex items-center justify-between">
						<span style={labelStyle}>settings</span>
						<button
							type="button"
							onClick={onClose}
							aria-label="Close settings"
							className="transition-opacity hover:opacity-60 active:scale-95"
							style={{
								fontFamily: "'JetBrains Mono', monospace",
								fontSize: "18px",
								lineHeight: 1,
								color: "rgba(255,255,255,0.25)",
							}}
						>
							×
						</button>
					</div>

					{/* Rows */}
					<div className="flex flex-col gap-2">
						<div className="flex items-center justify-between">
							<span style={labelStyle}>rows</span>
							<span style={valueStyle}>{localRows}</span>
						</div>
						<input
							type="range"
							min={3}
							max={16}
							value={localRows}
							onChange={(e) => setLocalRows(Number(e.target.value))}
							className="settings-slider w-full cursor-pointer appearance-none rounded-full"
							style={{ accentColor: "oklch(0.72 0.19 23)", height: "4px" }}
						/>
						<div
							className="flex justify-between"
							style={{
								fontFamily: "'JetBrains Mono', monospace",
								fontSize: "8px",
								color: "rgba(255,255,255,0.15)",
							}}
						>
							<span>3</span>
							<span>16</span>
						</div>
					</div>

					{/* Cols */}
					<div className="flex flex-col gap-2">
						<div className="flex items-center justify-between">
							<span style={labelStyle}>columns</span>
							<span style={valueStyle}>{localCols}</span>
						</div>
						<input
							type="range"
							min={3}
							max={16}
							value={localCols}
							onChange={(e) => setLocalCols(Number(e.target.value))}
							className="settings-slider w-full cursor-pointer appearance-none rounded-full"
							style={{ accentColor: "oklch(0.72 0.19 23)", height: "4px" }}
						/>
						<div
							className="flex justify-between"
							style={{
								fontFamily: "'JetBrains Mono', monospace",
								fontSize: "8px",
								color: "rgba(255,255,255,0.15)",
							}}
						>
							<span>3</span>
							<span>16</span>
						</div>
					</div>

					{playerCount !== undefined ? (
						playerCountLocked ? (
							<div
								className="flex items-center justify-between"
								style={{ opacity: 0.32 }}
							>
								<span style={labelStyle}>players</span>
								<div className="flex items-center gap-2">
									<span style={valueStyle}>{localPlayerCount}</span>
									<span
										style={{
											fontFamily: "'Oxanium', sans-serif",
											fontSize: "8px",
											color: "rgba(255,255,255,0.4)",
											textTransform: "uppercase",
											letterSpacing: "0.2em",
										}}
									>
										only
									</span>
								</div>
							</div>
						) : (
							<div className="flex flex-col gap-2">
								<div className="flex items-center justify-between">
									<span style={labelStyle}>players</span>
									<span style={valueStyle}>{localPlayerCount}</span>
								</div>
								<input
									type="range"
									min={2}
									max={8}
									value={localPlayerCount}
									onChange={(e) => setLocalPlayerCount(Number(e.target.value))}
									className="settings-slider w-full cursor-pointer appearance-none rounded-full"
									style={{
										accentColor: "rgba(255,255,255,0.7)",
										height: "4px",
									}}
								/>
								<div
									className="flex justify-between"
									style={{
										fontFamily: "'JetBrains Mono', monospace",
										fontSize: "8px",
										color: "rgba(255,255,255,0.15)",
									}}
								>
									<span>2</span>
									<span>8</span>
								</div>
							</div>
						)
					) : null}

					{difficulty !== undefined ? (
						<div className="flex flex-col gap-2">
							<div className="flex items-center justify-between">
								<span style={labelStyle}>cpu difficulty</span>
								<div className="flex items-center gap-2">
									<span style={valueStyle}>{localDifficulty}</span>
									{difficultyLabel ? (
										<span
											style={{
												fontFamily: "'Oxanium', sans-serif",
												fontSize: "8px",
												color: "rgba(255,255,255,0.4)",
												textTransform: "uppercase",
												letterSpacing: "0.2em",
											}}
										>
											{difficultyLabel}
										</span>
									) : null}
								</div>
							</div>
							<input
								type="range"
								min={1}
								max={10}
								value={localDifficulty}
								onChange={(e) => setLocalDifficulty(Number(e.target.value))}
								className="settings-slider w-full cursor-pointer appearance-none rounded-full"
								style={{ accentColor: "oklch(0.78 0.16 210)", height: "4px" }}
							/>
							<div
								className="flex justify-between"
								style={{
									fontFamily: "'JetBrains Mono', monospace",
									fontSize: "8px",
									color: "rgba(255,255,255,0.15)",
								}}
							>
								<span>1</span>
								<span>10</span>
							</div>
						</div>
					) : null}

					{/* Recommended size */}
					<button
						type="button"
						onClick={() => {
							const rec = getRecommendedSize();
							setLocalRows(rec.rows);
							setLocalCols(rec.cols);
						}}
						className="transition-opacity hover:opacity-70 active:scale-95"
						style={{
							fontFamily: "'Oxanium', sans-serif",
							fontSize: "9px",
							color: "rgba(255,255,255,0.2)",
							textTransform: "uppercase",
							letterSpacing: "0.3em",
							textAlign: "center",
						}}
					>
						use recommended size
					</button>

					{/* Apply */}
					<button
						type="button"
						onClick={() => {
							onApply(localRows, localCols, localDifficulty, localPlayerCount);
							onClose();
						}}
						className="rounded-full py-3 transition-transform hover:scale-[1.02] active:scale-[0.97]"
						style={{
							fontFamily: "'Oxanium', sans-serif",
							fontSize: "11px",
							fontWeight: 700,
							textTransform: "uppercase",
							letterSpacing: "0.3em",
							backgroundColor: "oklch(0.72 0.19 23)",
							color: "#07070b",
							boxShadow: "0 0 24px oklch(0.72 0.19 23 / 0.28)",
						}}
					>
						apply &amp; reset
					</button>
				</div>
			</div>
		</>
	);
}
