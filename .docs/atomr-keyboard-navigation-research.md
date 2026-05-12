# AtomR Keyboard Navigation Research

## Purpose

Figure out what keyboard navigation should feel like in AtomR, based on:

- the current AtomR codebase
- keyboard patterns used by other web games
- accessibility guidance for interactive grids
- practical UX judgment about what feels natural, not just technically compliant

## Bottom Line

AtomR should use a **single board tab stop with a spatial keyboard cursor**.

That means:

- `Tab` reaches the board once, not every playable cell
- arrow keys move a visible cursor one cell at a time
- `Enter` and `Space` place on the focused cell
- illegal cells stay navigable but inert
- the cursor should move across the full board, not only legal cells
- input should lock during cascade playback, but focus should stay stable

This is the most natural fit for AtomR because the game is about **reading board tension everywhere**, not just jumping between currently legal actions.

The wrong direction would be treating keyboard input as a speed-optimization layer that skips around the board or auto-targets only legal moves. That can be fast, but it stops feeling like "playing the board" and starts feeling like driving a form.

## What AtomR Looks Like Today

From the current code:

- `AtomRBoard.tsx` renders every cell as an `AtomRCell` with `onPlay(row, col)`.
- `AtomRCell.tsx` renders each cell as a native `button`.
- Cells are currently `disabled` when illegal or while animating.
- `useAtomRGame.ts` already blocks moves while playback is resolving.
- `GameSettings.tsx` and `ReplayPanel.tsx` already listen for some keyboard input.

### Important Current UX Implication

Because the board cells are plain buttons and illegal cells are disabled:

- keyboard users currently get native button behavior, not true board navigation
- only legal cells are reachable in the tab order
- illegal cells effectively disappear from keyboard exploration
- the board is many tab stops instead of one coherent game surface

That is workable for basic accessibility, but it is not a natural keyboard game UX.

## What Other Products Do

## Strong Cross-Genre Pattern

Across web games and grid widgets, the common pattern is:

- arrows for spatial movement
- `Enter` or `Space` for the primary action
- `Esc` to back out of overlays or modes
- a small number of secondary shortcuts for power users

This shows up repeatedly in:

- keyboard-only Minesweeper
- 2048
- Sudoku interfaces
- ARIA grid examples

The specific details vary, but the pattern is stable.

## Live Example: Keyboard-Only Minesweeper

Observed at `https://maynards.site/items/minesweeper/full/`.

Controls are extremely simple:

- arrows or `hjkl` move
- `Space` reveals
- `F` flags
- `R` resets

### Why It Feels Good

- the movement model matches the board exactly
- there is one obvious primary action key
- the legend is always visible
- the game does not ask the player to learn a special navigation mode first

### Relevant AtomR Takeaway

AtomR should copy the **clarity**, not the exact key set.

The key lesson is that a board game starts feeling natural once the keyboard model is:

1. spatial
2. minimal
3. always legible

## 2048 Pattern

The official 2048 implementation and most faithful versions rely on only one idea:

- arrow keys move the board state directly

Why that matters here:

- players already understand arrow keys as "move on the board" or "apply a directional board action"
- successful keyboard game UX is often built on **one memorable mapping**, not a large shortcut sheet

AtomR is not a directional game like 2048, so it should not copy the exact mechanic. But it should copy the restraint.

## Sudoku Pattern

Sudoku tools consistently use:

- arrows to move cell selection
- number keys for cell input
- `Space`, `Enter`, or a mode toggle for note behavior
- `Esc` to clear selection or exit a mode

Why this matters:

- Sudoku is also a read-heavy thinking game
- keyboard navigation there is about **position confidence** first, speed second
- advanced shortcuts exist, but the base model stays spatial and predictable

That is the right mental model for AtomR too.

## WAI-ARIA Grid Pattern / APG Examples

The WAI-ARIA grid guidance and examples strongly support:

- one tab stop for the composite widget
- arrow-key movement inside the widget
- roving focus as a normal pattern
- `Home`/`End` and optional `Ctrl+Home`/`Ctrl+End`

Two especially relevant observations from the APG layout grid examples:

- arrow-key navigation is useful only when the grid behaves like one coherent object
- discoverability is a real problem, so the examples add visible cues and a small first-use tutorial

### Relevant AtomR Takeaway

If AtomR adds keyboard board navigation, it should also add a small hint such as:

`Arrow keys move • Enter places`

Without that, some players will never discover the feature.

## A Useful Warning From Chess / Lichess Discussions

Chess discussions around keyboard input show a different lesson:

- keyboard controls that optimize raw speed can become controversial or feel unnatural
- specialized input schemes are often great for experts but confusing for everyone else

Relevant AtomR takeaway:

- do not design the default keyboard model to beat the mouse
- design it to feel like the same game, just through another input device

This argues against making the default experience depend on coordinate typing, legal-cell skipping, or highly compressed command syntax.

## What Will Feel Natural In AtomR

## Core UX Principle

The keyboard cursor in AtomR should behave like a **board-reading cursor**, not like a filtered "submit a legal move" picker.

That means the player must be able to:

- inspect any cell
- understand ownership and threat states everywhere
- attempt a move where they are focused
- get immediate feedback if the move is illegal

This matters because AtomR is tactical. Enemy cells are not background noise. They are part of the decision surface.

## Recommendation: Traverse All Cells

Arrow keys should move through **all cells**, including illegal ones.

### Why This Is Better Than Skipping To Legal Cells

- it preserves the board's spatial map
- it lets players inspect dangerous enemy clusters
- it avoids surprising jumps
- it keeps hot-seat play readable when turns change

If focus skipped only to legal cells:

- enemy cells would be invisible to keyboard exploration
- the cursor path would feel discontinuous
- the board would stop behaving like a board

## Recommendation: Illegal Cells Stay Focusable

Illegal cells should not be removed from keyboard focus.

They should:

- receive focus
- clearly look unavailable for activation
- reject `Enter`/`Space` with a small visual and spoken response

Example feedback:

- brief shake or edge flash
- status text or live-region message: `Illegal move: enemy-owned cell`

This is a major implementation detail because native `disabled` buttons cannot be focused.

So if AtomR adopts proper board navigation, it likely should stop using `disabled` for normal illegal-state handling and use custom guards plus `aria-disabled` instead.

## Product Decision: Wraparound Navigation

Wraparound should be **enabled**.

So:

- right edge + `ArrowRight` moves to the first column of the same row
- left edge + `ArrowLeft` moves to the last column of the same row
- bottom edge + `ArrowDown` moves to the top row of the same column
- top edge + `ArrowUp` moves to the bottom row of the same column

Why this can work for AtomR:

- it makes keyboard traversal faster on larger boards
- it reduces dead-end key presses
- it keeps long keyboard scans fluid during tactical review
- the board is still visually fixed, so wrap can become learnable if the focus ring is strong

### UX Risk

Wraparound is less literal than board-edge stopping, so it can feel surprising at first.

To keep it natural:

- the focus ring has to remain extremely obvious
- the movement must be instant and consistent
- the board hint should mention wrap behavior at least once

Example hint copy:

`Arrow keys move • edges wrap • Enter places`

### Implementation Rule

Wrap only along the axis being moved.

So:

- horizontal movement wraps within the same row
- vertical movement wraps within the same column

Do not do list-style next-cell wrapping like "last cell of row jumps to first cell of next row" for right-arrow movement. That would feel like a document grid, not a game board.

## Recommendation: Cursor Stability Across Turns

Do not auto-jump the cursor to a legal move when the turn changes.

Keep the cursor where it is unless the player moves it.

Why:

- the board should not feel like it is wrestling control away from the player
- hot-seat players need continuity while reading the result of the last move
- the same location may matter tactically even if it is illegal now

## Recommended Interaction Model

## Board Entry

- `Tab` moves to the board as one tab stop
- the first focus target should be the remembered cursor position
- if there is no remembered position yet, use a predictable default

Good default order:

1. last focused cell
2. last move cell
3. top-left cell

Top-left is more predictable than a "smart" heuristic.

## Movement

- `ArrowUp` / `ArrowDown` / `ArrowLeft` / `ArrowRight`: move one cell
- `Home`: first cell in current row
- `End`: last cell in current row
- `Ctrl+Home`: top-left corner
- `Ctrl+End`: bottom-right corner

With wraparound enabled:

- `ArrowLeft` from column `0` moves to the last column of the same row
- `ArrowRight` from the last column moves to column `0` of the same row
- `ArrowUp` from row `0` moves to the last row of the same column
- `ArrowDown` from the last row moves to row `0` of the same column

Optional desktop alias later:

- `WASD`

I would treat `WASD` as optional polish, not the primary design.

## Held Navigation / Repeat Timing

Held movement should use a **custom repeat profile**, not raw browser key repeat.

Why:

- OS key repeat varies too much across players
- browser repeat can feel either sticky or too fast
- AtomR needs a tuned cadence that supports both precise single moves and fast board traversal

## Desired Feel

The feel should be:

- single taps are exact and never double-move accidentally
- the first held repeat waits long enough to confirm intent
- after that, movement accelerates smoothly
- top speed is fast enough to cross the board quickly without becoming unreadable

It should feel closer to polished d-pad movement than to text-caret repeat.

## Recommended Repeat Profile

Recommended starting values:

- initial move on keydown: immediate
- hold delay before repeat starts: `170ms` to `200ms`
- early repeat interval: `85ms` to `95ms`
- after about `350ms` of hold time, accelerate to `55ms` to `65ms`
- after about `900ms` of hold time, cap at `35ms` to `45ms`

Recommended first-pass tuning target:

- hold delay: `180ms`
- repeat interval stage 1: `90ms`
- repeat interval stage 2: `60ms`
- repeat interval stage 3: `40ms`

## Why This Profile Should Feel Natural

- `180ms` gives enough time to distinguish a tap from a hold
- `90ms` feels responsive without racing past nearby cells
- `60ms` makes medium-distance travel feel fluid
- `40ms` is fast enough to sweep the board but still trackable with a strong focus ring

Faster than this starts to feel slippery. Slower than this starts to feel like the keyboard is lagging.

## Important Repeat Behavior Rules

- accelerate by elapsed hold time, not by counting repeated DOM `keydown` events
- stop repeat immediately on keyup
- if focus leaves the board, cancel repeat immediately
- if resolution starts, cancel repeat immediately
- do not let repeat continue while a modal is open

## Suggested Movement Audio / Visual Support

If movement still feels hard to track at fast repeat speeds, prefer subtle support rather than slowing it down too much:

- one crisp focus transition per move
- optional tiny tick sound later
- no large animation on cursor movement

The cursor should move cleanly, not theatrically.

## Action

- `Enter`: place orb on focused cell if legal
- `Space`: same as `Enter`

Both should work. Users expect focused buttons and game cells to respond to either.

## Overlays And Escape

- `Esc` closes settings or replay when those panels are open
- focus returns to the element that opened the panel
- winner overlay should put focus directly on the main CTA, likely `play again`

## During Resolution

- keep board focus stable
- block activation while cascades play
- expose resolving state visibly and to assistive tech

Examples:

- HUD says `Resolving...`
- board container uses `aria-busy="true"`
- activation keys do nothing until playback finishes

Do not queue moves during playback. In AtomR, the full result of the current move changes the meaning of the next one.

## Focus And Visual Design Guidance

The keyboard focus indicator must be visually distinct from:

- hover state
- critical-cell ring
- last-move ring
- suggestion ring

This is important because AtomR already uses several overlays and glows.

Good focus candidates:

- bright high-contrast outline
- corner brackets
- strong white or cyan ring that is not reused elsewhere

Bad focus candidates:

- subtle tint only
- the same style already used for legal hover
- a ring color that can blend with player ownership colors

## Pointer And Keyboard Must Stay In Sync

If a player clicks a cell:

- that cell should become the keyboard cursor position

If a player uses the keyboard:

- the same visual state should update

This is important for players who mix mouse and keyboard.

## Discovery: Add A Tiny First-Use Hint

This should be explicit.

Recommended small hint near the board or HUD:

`Arrow keys move • Enter places`

Even better:

- show it when the board first receives keyboard focus
- let it fade after first successful move
- keep a `?` help affordance somewhere for recall

Without this, many players will never know the feature exists.

## Accessibility / Semantics Recommendation

## Roving `tabindex` Is The Better Fit

For AtomR, roving `tabindex` is a better fit than `aria-activedescendant`.

Why:

- every cell already exists in the DOM
- the board is not virtualized
- the focused cell should scroll into view automatically if needed
- cell-level focus styling is straightforward
- click and keyboard synchronization are simpler

## Important ARIA Caution

The APG guidance also makes one thing clear:

- a `grid` role is a promise

So AtomR should either:

1. fully implement board keyboard behavior as a proper composite widget
2. or stay with native button semantics and avoid half-implemented grid roles

Bad ARIA will be worse than no ARIA.

## Practical Semantic Direction

Two reasonable paths:

### Path A: Minimal, native-first

- keep cells as buttons
- implement roving `tabindex`
- keep good `aria-label`s on cells
- add live-region status messaging

### Path B: Full grid semantics

- board container gets `role="grid"`
- rows and cells are represented semantically
- focus still lands on the button inside each cell
- grid navigation follows APG conventions

Path A is smaller. Path B is semantically richer. Path B is only worth it if the full structure is implemented correctly.

## Recommended Cell Announcement Model

Each cell should expose more than owner color.

Good spoken label shape:

`B4, red, 2 orbs, critical, legal`

or:

`C2, empty, legal`

or:

`E5, blue, 3 orbs, illegal for current player`

This will make keyboard play much more understandable.

## Shortcuts I Would Not Make Core

I would avoid making these part of the default design:

- direct coordinate typing
- auto-jump between legal moves only
- large gamer shortcut sets
- mode-heavy selection systems

Why:

- they optimize speed more than comprehension
- they raise the learning cost
- they make the board feel less spatial
- they are harder to document and test

## Small Optional Power Features For Later

These are reasonable later, but not necessary for v1:

- `?` opens shortcut help
- `u` undo in local/training where undo exists
- legal-move cycling shortcut for large boards
- optional `WASD` alias

If legal-move cycling is added later, it should be an optional accelerator, not the default navigation model.

## Implementation Notes Specific To This Repo

Likely touch points:

- `src/features/atomr/components/AtomRBoard.tsx`
- `src/features/atomr/components/AtomRCell.tsx`
- `src/features/atomr/components/GameHud.tsx`
- `src/features/atomr/components/GameSettings.tsx`
- `src/features/atomr/components/ReplayPanel.tsx`
- `src/features/atomr/useAtomRGame.ts`

Key repo-specific implications:

- the board needs one managed focus model instead of many native tab stops
- illegal/animating states probably need `aria-disabled` + guarded handlers instead of `disabled`
- settings/replay shortcuts should be scoped carefully so they do not steal keys from unrelated focused controls
- replay already has keyboard behavior, but it is window-level today and should eventually be focus-aware

## Suggested V1 Spec

If implementing this soon, this is the spec I would ship first:

1. Board is one tab stop.
2. Arrow keys move a visible cursor across every cell.
3. `Enter` and `Space` attempt a placement.
4. Illegal moves keep focus in place and give small feedback.
5. Arrow movement wraps within row/column edges.
6. Held arrows accelerate with tuned repeat timing.
7. `Home`, `End`, `Ctrl+Home`, `Ctrl+End` supported.
8. Cursor position persists while moving between HUD and board.
9. Pointer clicks move the keyboard cursor.
10. During cascade playback, activation is locked and status says `Resolving...`.
11. Tiny first-use hint explains controls.

That would already feel natural.

## Validation I Would Want After Implementation

Manual checks:

1. Can a first-time player discover the board controls without reading docs?
2. Does the focus ring remain obvious during critical-state visuals, captures, and explosions?
3. Does hot-seat turn handoff feel stable rather than jumpy?
4. Does an illegal move feel informative instead of broken?
5. Does focus survive settings open/close, replay open/close, and game-over overlay transitions?
6. Can a keyboard user inspect enemy cells as easily as friendly ones?

## Research Limitations

I was able to inspect the current codebase and test external live examples.

I was not able to boot AtomR locally in this workspace because frontend dependencies are not installed yet, so I could not run in-browser local UX tests against the repo build itself.

## Sources

- WAI-ARIA APG Grid Pattern: `https://www.w3.org/WAI/ARIA/apg/patterns/grid/`
- WAI-ARIA APG Keyboard Interface Guidance: `https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/`
- WAI-ARIA APG Layout Grid Examples: `https://www.w3.org/WAI/ARIA/apg/patterns/grid/examples/layout-grids/`
- MDN ARIA Grid Role: `https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/grid_role`
- MDN Keyboard-Navigable JavaScript Widgets: `https://developer.mozilla.org/en-US/docs/Web/Accessibility/Keyboard-navigable_JavaScript_widgets`
- Keyboard-only Minesweeper: `https://maynards.site/items/minesweeper/full/`
- Official 2048: `https://mgarciaisaia.github.io/2048/`
- Sudoku Variants shortcuts reference: `https://sudokuvariants.com/help/shortcuts`
- Lichess keyboard shortcuts discussion: `https://lichess.org/forum/general-chess-discussion/keyboard-shortcuts`
- Chess discussion on speed-optimized keyboard input tradeoffs: `https://chess.stackexchange.com/questions/35358/why-is-lichess-keyboard-input-opposed`
