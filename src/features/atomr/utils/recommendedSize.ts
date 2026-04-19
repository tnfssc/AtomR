/**
 * Computes a board size that fills the available viewport with ~60–90px square cells.
 * Called only on the client (requires window).
 */
export function getRecommendedSize(): { rows: number; cols: number } {
	const availW = window.innerWidth - 24;
	const availH = window.innerHeight - 160;
	const cellTarget = Math.max(
		50,
		Math.min(90, Math.floor(Math.min(availW, availH) / 10)),
	);
	return {
		cols: Math.max(4, Math.min(16, Math.round(availW / cellTarget))),
		rows: Math.max(3, Math.min(12, Math.round(availH / cellTarget))),
	};
}
