import {
	type FocusEventHandler,
	type KeyboardEventHandler,
	type MutableRefObject,
	type KeyboardEvent as ReactKeyboardEvent,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import { isLegalMove } from "../engine";
import type { GameState, LastMove, Position } from "../types";

const INITIAL_REPEAT_DELAY_MS = 180;
const BLOCKED_FEEDBACK_MS = 180;
const STATUS_MESSAGE_MS = 1200;

type ArrowKey = "ArrowUp" | "ArrowDown" | "ArrowLeft" | "ArrowRight";

type UseBoardKeyboardNavigationOptions = {
	state: GameState;
	lastMove?: LastMove | null;
	enabled: boolean;
	canPlay: boolean;
	isAnimating: boolean;
	onPlay: (row: number, col: number) => void;
	cellRefs: MutableRefObject<Array<HTMLButtonElement | null>>;
};

function getCellIndex(row: number, col: number, cols: number) {
	return row * cols + col;
}

function getPositionKey(row: number, col: number) {
	return `${row}:${col}`;
}

function getInitialFocusedPosition(
	rows: number,
	cols: number,
	lastMove?: LastMove | null,
): Position {
	if (
		lastMove &&
		lastMove.row >= 0 &&
		lastMove.row < rows &&
		lastMove.col >= 0 &&
		lastMove.col < cols
	) {
		return { row: lastMove.row, col: lastMove.col };
	}

	return { row: 0, col: 0 };
}

function getWrappedArrowPosition(
	position: Position,
	key: ArrowKey,
	rows: number,
	cols: number,
): Position {
	switch (key) {
		case "ArrowUp":
			return { row: (position.row - 1 + rows) % rows, col: position.col };
		case "ArrowDown":
			return { row: (position.row + 1) % rows, col: position.col };
		case "ArrowLeft":
			return { row: position.row, col: (position.col - 1 + cols) % cols };
		case "ArrowRight":
			return { row: position.row, col: (position.col + 1) % cols };
	}
	return position;
}

function getRepeatIntervalMs(elapsedMs: number) {
	if (elapsedMs >= 900) return 40;
	if (elapsedMs >= 350) return 60;
	return 90;
}

export function useBoardKeyboardNavigation({
	state,
	lastMove,
	enabled,
	canPlay,
	isAnimating,
	onPlay,
	cellRefs,
}: UseBoardKeyboardNavigationOptions) {
	const repeatTimerRef = useRef<number | null>(null);
	const repeatKeyRef = useRef<ArrowKey | null>(null);
	const repeatStartedAtRef = useRef(0);
	const blockedTimerRef = useRef<number | null>(null);
	const statusTimerRef = useRef<number | null>(null);
	const announceTimerRef = useRef<number | null>(null);
	const focusedPositionRef = useRef(
		getInitialFocusedPosition(state.rows, state.cols, lastMove),
	);
	const [focusedPosition, setFocusedPosition] = useState<Position>(() =>
		getInitialFocusedPosition(state.rows, state.cols, lastMove),
	);
	const [hasFocusWithin, setHasFocusWithin] = useState(false);
	const [blockedCellKey, setBlockedCellKey] = useState<string | null>(null);
	const [transientStatus, setTransientStatus] = useState<string | null>(null);
	const [liveMessage, setLiveMessage] = useState("");

	const clearRepeat = useCallback(() => {
		if (repeatTimerRef.current !== null) {
			window.clearTimeout(repeatTimerRef.current);
			repeatTimerRef.current = null;
		}
		repeatKeyRef.current = null;
	}, []);

	const announceMessage = useCallback((message: string) => {
		if (announceTimerRef.current !== null) {
			window.clearTimeout(announceTimerRef.current);
		}
		setLiveMessage("");
		announceTimerRef.current = window.setTimeout(() => {
			setLiveMessage(message);
			announceTimerRef.current = null;
		}, 0);
	}, []);

	const showTransientMessage = useCallback((message: string) => {
		if (statusTimerRef.current !== null) {
			window.clearTimeout(statusTimerRef.current);
		}
		setTransientStatus(message);
		statusTimerRef.current = window.setTimeout(() => {
			setTransientStatus(null);
			statusTimerRef.current = null;
		}, STATUS_MESSAGE_MS);
	}, []);

	const focusPosition = useCallback(
		(position: Position) => {
			focusedPositionRef.current = position;
			setFocusedPosition(position);
			cellRefs.current[
				getCellIndex(position.row, position.col, state.cols)
			]?.focus();
		},
		[cellRefs, state.cols],
	);

	const pulseBlockedCell = useCallback(
		(row: number, col: number, message: string) => {
			if (blockedTimerRef.current !== null) {
				window.clearTimeout(blockedTimerRef.current);
			}
			setBlockedCellKey(getPositionKey(row, col));
			blockedTimerRef.current = window.setTimeout(() => {
				setBlockedCellKey(null);
				blockedTimerRef.current = null;
			}, BLOCKED_FEEDBACK_MS);
			showTransientMessage(message);
			announceMessage(message);
		},
		[announceMessage, showTransientMessage],
	);

	const attemptPlay = useCallback(
		(row: number, col: number) => {
			if (isAnimating) {
				pulseBlockedCell(row, col, "Resolving...");
				return;
			}

			if (!canPlay) {
				pulseBlockedCell(row, col, "Move unavailable right now.");
				return;
			}

			if (!isLegalMove(state, row, col)) {
				pulseBlockedCell(
					row,
					col,
					"Illegal move. Choose an empty or owned cell.",
				);
				return;
			}

			onPlay(row, col);
		},
		[canPlay, isAnimating, onPlay, pulseBlockedCell, state],
	);

	const moveFocusByArrow = useCallback(
		(key: ArrowKey) => {
			focusPosition(
				getWrappedArrowPosition(
					focusedPositionRef.current,
					key,
					state.rows,
					state.cols,
				),
			);
		},
		[focusPosition, state.cols, state.rows],
	);

	const startArrowRepeat = useCallback(
		(key: ArrowKey) => {
			clearRepeat();
			repeatKeyRef.current = key;
			repeatStartedAtRef.current = performance.now();

			const tick = () => {
				const activeKey = repeatKeyRef.current;
				if (!activeKey) return;

				moveFocusByArrow(activeKey);
				repeatTimerRef.current = window.setTimeout(
					tick,
					getRepeatIntervalMs(performance.now() - repeatStartedAtRef.current),
				);
			};

			repeatTimerRef.current = window.setTimeout(tick, INITIAL_REPEAT_DELAY_MS);
		},
		[clearRepeat, moveFocusByArrow],
	);

	const handleCellFocus = useCallback((row: number, col: number) => {
		const next = { row, col };
		focusedPositionRef.current = next;
		setFocusedPosition(next);
	}, []);

	const handleCellClick = useCallback(
		(row: number, col: number) => {
			if (!enabled && !canPlay) return;
			handleCellFocus(row, col);
			attemptPlay(row, col);
		},
		[attemptPlay, canPlay, enabled, handleCellFocus],
	);

	const handleCellKeyDown: KeyboardEventHandler<HTMLButtonElement> =
		useCallback(
			(event: ReactKeyboardEvent<HTMLButtonElement>) => {
				if (!enabled) return;

				switch (event.key) {
					case "ArrowUp":
					case "ArrowDown":
					case "ArrowLeft":
					case "ArrowRight": {
						event.preventDefault();
						const key = event.key as ArrowKey;
						if (event.repeat && repeatKeyRef.current === key) return;
						moveFocusByArrow(key);
						startArrowRepeat(key);
						return;
					}
					case "Home": {
						event.preventDefault();
						clearRepeat();
						focusPosition(
							event.ctrlKey
								? { row: 0, col: 0 }
								: { row: focusedPositionRef.current.row, col: 0 },
						);
						return;
					}
					case "End": {
						event.preventDefault();
						clearRepeat();
						focusPosition(
							event.ctrlKey
								? { row: state.rows - 1, col: state.cols - 1 }
								: {
										row: focusedPositionRef.current.row,
										col: state.cols - 1,
									},
						);
						return;
					}
					case "Enter":
					case " ": {
						event.preventDefault();
						clearRepeat();
						attemptPlay(
							focusedPositionRef.current.row,
							focusedPositionRef.current.col,
						);
					}
				}
			},
			[
				attemptPlay,
				clearRepeat,
				enabled,
				focusPosition,
				moveFocusByArrow,
				startArrowRepeat,
				state.cols,
				state.rows,
			],
		);

	const handleBoardFocusCapture = useCallback(() => {
		setHasFocusWithin(true);
	}, []);

	const handleBoardBlurCapture: FocusEventHandler<HTMLDivElement> = useCallback(
		(event) => {
			if (
				event.relatedTarget instanceof Node &&
				event.currentTarget.contains(event.relatedTarget)
			)
				return;

			setHasFocusWithin(false);
			clearRepeat();
		},
		[clearRepeat],
	);

	useEffect(() => {
		focusedPositionRef.current = focusedPosition;
	}, [focusedPosition]);

	useEffect(() => {
		setFocusedPosition((current) => {
			const next = {
				row: ((current.row % state.rows) + state.rows) % state.rows,
				col: ((current.col % state.cols) + state.cols) % state.cols,
			};
			focusedPositionRef.current = next;
			return next;
		});
	}, [state.cols, state.rows]);

	useEffect(() => {
		if (!enabled || !hasFocusWithin) return;
		cellRefs.current[
			getCellIndex(focusedPosition.row, focusedPosition.col, state.cols)
		]?.focus();
	}, [
		cellRefs,
		enabled,
		focusedPosition.col,
		focusedPosition.row,
		hasFocusWithin,
		state.cols,
	]);

	useEffect(() => {
		if (!isAnimating) return;
		clearRepeat();
		announceMessage("Resolving...");
	}, [announceMessage, clearRepeat, isAnimating]);

	useEffect(() => {
		if (canPlay) return;
		clearRepeat();
	}, [canPlay, clearRepeat]);

	useEffect(() => {
		function handleWindowKeyUp(event: KeyboardEvent) {
			if (event.key === repeatKeyRef.current) {
				clearRepeat();
			}
		}

		function handleWindowBlur() {
			clearRepeat();
		}

		window.addEventListener("keyup", handleWindowKeyUp);
		window.addEventListener("blur", handleWindowBlur);

		return () => {
			window.removeEventListener("keyup", handleWindowKeyUp);
			window.removeEventListener("blur", handleWindowBlur);
		};
	}, [clearRepeat]);

	useEffect(() => {
		return () => {
			clearRepeat();
			if (blockedTimerRef.current !== null) {
				window.clearTimeout(blockedTimerRef.current);
			}
			if (statusTimerRef.current !== null) {
				window.clearTimeout(statusTimerRef.current);
			}
			if (announceTimerRef.current !== null) {
				window.clearTimeout(announceTimerRef.current);
			}
		};
	}, [clearRepeat]);

	return {
		focusedPosition,
		blockedCellKey,
		statusLabel:
			transientStatus ??
			(isAnimating ? "Resolving..." : "Arrow keys wrap • Enter places"),
		liveMessage,
		handleCellFocus,
		handleCellClick,
		handleCellKeyDown,
		handleBoardFocusCapture,
		handleBoardBlurCapture,
	};
}
