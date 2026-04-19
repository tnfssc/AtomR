# AtomR UI v2 — Tactical Grid

## Aesthetic Direction

**"Tactical Grid"** — dark near-black (#07070b) background, high-contrast player colors, geometric game font, glowing orbs on a subtly lit grid.

## Visual Language

| Element | Value |
|---|---|
| Background | `#07070b` (off-black) |
| Cell background | `#141427` |
| Grid lines | `rgba(255,255,255,0.10)` gap bg |
| P1 color | Coral `#ff6b6b` |
| P2 color | Cyan `#4ecdc4` |
| Game font | `Oxanium` (Google Fonts) |
| Monospace | `JetBrains Mono` (Google Fonts) |
| Ambient glow | Radial gradient at top/bottom shifting with active player |

## Board Layout

- **Orientation**: 9 rows × 6 cols (portrait) via `useAtomRGame(9, 6)`
- **Sizing**: `h-[100dvh]` on `main` + `flex-1 min-h-0` on board container + `h-full` chain through board wrappers + `gridTemplateRows: repeat(9, minmax(0, 1fr))`
- **Cells**: No `aspect-square` — cells fill available grid space (slightly taller than wide on mobile, ~73×62px on 390px wide screen)
- **Board border**: 1px gradient border via `p-px` wrapper with `linear-gradient(135deg, color55, color18, color38)`

## Cell Rendering

- **Background tint**: `color-mix(in srgb, ownerColor 10%, #141427)` for owned cells
- **Exploding**: `color-mix(in srgb, ownerColor 20%, #07070b)`
- **Capturing**: `color-mix(in srgb, ownerColor 12%, #07070b)`
- **Critical ring**: `cr-critical-ring` CSS class with pulsing `box-shadow` via `@keyframes cr-critical-pulse`
- **Explosion ring**: `cr-explode-ring` CSS class with radial flash animation

## Orb Rendering

- Absolutely positioned `<span>` elements within cells
- `width: 30%`, `aspectRatio: "1 / 1"` (NOT `height: 30%` — cells are non-square)
- `borderRadius: "50%"`, `backgroundColor: color`, `boxShadow: glow`
- Positions defined in `ORB_LAYOUTS`:
  - 1 orb: centered `{ x: 50, y: 50 }`
  - 2 orbs: side-by-side `{ x: 33, y: 50 }, { x: 67, y: 50 }`
  - 3 orbs: triangle `{ x: 50, y: 30 }, { x: 27, y: 67 }, { x: 73, y: 67 }`
- Count/capacity label: bottom-right, `JetBrains Mono`, `clamp(6px, 1.4vw, 9px)`

## HUD

- 3-column flex: `P1 chip | center controls | P2 chip`
- Center: `RESET` button top, VS/WIN/`···` status below, `CHAIN` label
- Status: `"···"` during resolution, `"WIN"` in winner color when game over, `"VS"` otherwise
- Active player: bright color + pulsing dot indicator; inactive: dimmed to `opacity-0.18`

## Winner Overlay

- `absolute inset-0 z-20` on board container — covers board only, HUD remains visible
- `backdrop-filter: blur(10px)`, `background: rgba(7,7,11,0.82)`
- Layout: `GAME OVER` (faint) → big player name in winner color with glow `textShadow` → `WINS` → `PLAY AGAIN` pill button
- Button: `backgroundColor: winnerColor`, `color: #07070b`, `boxShadow: glow`

## Key Fixes Made During Polish

1. **Dead space**: Changed `main` from `min-h-[100dvh]` to `h-[100dvh]` so `h-full` chain works in children
2. **Oval orbs**: Used `aspectRatio: "1 / 1"` instead of `height: "30%"` — non-square cells caused oval orbs with explicit height percentage
3. **Grid fill**: Added `gridTemplateRows: repeat(${state.rows}, minmax(0, 1fr))` + `h-full` to board, removed `aspect-square` from cells
