# AtomR Playability Research

## Purpose

Research-backed guidance for turning current AtomR prototype into playable, readable, modern game.

This document supports implementation plan in `.plans/atomr-playability-roadmap.md`.

## High-Level Conclusions

Best path is not "add more features" first. Best path is:

1. remove unrelated app chrome from `/play`
2. improve board readability and threat visibility
3. animate cascades to explain causality
4. strengthen turn/winner feedback
5. tune phone layout and tap ergonomics

Core rule from research:

- state must be understandable at glance
- motion must explain, not decorate
- color alone is not enough

## 1. Immersive Route Shell

### Research Summary

For dedicated play screens in React/TanStack apps, cleanest pattern is route-aware layout separation rather than sprinkling ad hoc conditions across many components.

Recommended approaches from TanStack/React routing guidance:

- pathless or dedicated layout route for game screen
- route-aware conditional rendering in root shell if layout split is overkill
- route-level metadata for title/description
- viewport-safe full-screen layout using modern mobile viewport units

### Practical Recommendations

- Hide header/footer on `/play`.
- Keep root shell responsible for this decision. Do not let game route manually hide global UI via DOM hacks.
- Set route title to `AtomR`.
- Use one dedicated main landmark for game route.
- Prefer `100dvh` with `100vh` fallback for height.
- Add `viewport-fit=cover` support and safe-area padding where needed.
- Prevent scroll bounce on game screen with `overscroll-behavior: none` where appropriate.

### Why It Matters

Current shell breaks immersion and competes with game for attention. Research consistently favors minimal route chrome for dedicated high-focus experiences.

## 2. Board Readability

### Research Summary

Digital board and strategy game guidance converges on one rule: each cell should answer its important questions immediately.

For this game, each cell must clearly communicate:

- owner
- orb count
- critical status
- whether it is playable now

Board should carry decision-critical information. Secondary explanation should live outside board.

### Practical Recommendations

- Increase visual contrast between empty, owned, critical, and illegal cells.
- Use stronger in-cell ownership treatment, not only orb color.
- Keep decorative styling minimal around board itself.
- Make orb arrangements consistent and centered for `1`, `2`, `3`.
- Preserve readable contrast on black background.
- Keep tactical cues on board, explanatory text in HUD or help sheet.

### Good UI Hierarchy

1. ownership
2. critical / danger
3. legal interactivity
4. hover / active flourish

If this order is reversed, board looks flashy but becomes harder to play.

## 3. Legal Move Indication

### Research Summary

Board-game UI examples and move-highlighting patterns show that legal actions should feel obvious and illegal actions should feel inert.

Text-only explanation is weaker than direct board affordance.

### Practical Recommendations

- Make enemy-owned cells feel unavailable on your turn.
- Use direct visual move hints on playable cells:
  - subtle ring
  - inset glow
  - faint tint
- Keep selected/pressed state visually distinct from generally legal state.
- Use contrast-safe highlight styles that remain visible across both player colors.
- Keep cell tap targets effectively at least `44 x 44pt`; `48 x 48dp` is even better.

### Product Decision

Because AtomR has many legal cells at once, always-on legal highlighting should be subtle, not loud. Strong highlighting should be reserved for hover/press/current target.

## 4. Critical And Threat State Indication

### Research Summary

Strategy-game UX guidance strongly supports surfacing danger states with more than color. Threat readability drives tactical decision-making.

For this game, near-capacity cells are core strategy information, not optional flavor.

### Practical Recommendations

- Mark `capacity - 1` cells with extra cue beyond owner color.
- Differentiate:
  - self critical
  - enemy critical
  - threatened owned cell next to enemy critical
- Use shape/pattern/border treatment, not hue only.
- Keep threat cue stronger than hover cue.
- Use escalating intensity:
  - stable
  - critical
  - chain-threat / very dangerous

### Best Candidate Visuals

- self critical: soft player-color glow + stronger border
- enemy critical: sharper warning ring / denser outline
- threatened cell: subtle secondary ring or edge accent

### Warning

Too many animated danger markers become noise. Start with static visual hierarchy first.

## 5. Turn And Winner Feedback

### Research Summary

Turn-based interfaces should never make players infer the current state from the board alone. Persistent explicit turn state is better.

Winner state should replace active-turn messaging, not compete with it.

### Practical Recommendations

- Reserve fixed HUD area for turn state.
- Use both text and player identity color/icon for current turn.
- During animation, replace turn text with `Resolving...`.
- At game end, stop interaction and show explicit winner overlay.
- Reuse winning player color/icon in result state.

### Implication For Current UI

Current heading is directionally right, but too thin. It needs stronger separation between:

- turn
- resolving
- winner

## 6. Motion And Cascade Playback

### Research Summary

Motion works best when it explains cause and effect. Cascades in deterministic games should show propagation order, not explode into noisy simultaneous effects.

Research-backed interaction timing guidance points toward:

- micro feedback around `100ms`
- readable state-change animations around `200ms` to `300ms`
- stagger between cascade steps around `50ms` to `150ms`
- total sequence ideally under about `1.5s` to `2s`

Ease guidance:

- use ease-out for most state transitions
- reserve bounce/elastic only for celebratory moments, if at all

### Practical Recommendations

- Keep engine state instant and authoritative.
- Replay events in UI only.
- Lock input during playback.
- Show source placement first, then explosion/capture sequence.
- Use one primary effect per event type.
- Avoid stacking pulse + shake + particles + glow at once.

### Recommended Timing For This Game

- placement pulse: `90ms` to `120ms`
- explode step: `180ms` to `240ms`
- inter-step stagger: `60ms` to `100ms`
- capture flash: `120ms` to `180ms`
- winner reveal after final step: `150ms` to `250ms`

### Input Lock Guidance

Recommended pattern:

- `isAnimating` or playback phase flag in hook
- board blocks new clicks while animating
- subtle status cue tells player board is resolving

### Reduced-Motion Consideration

Need reduced-motion path eventually:

- skip staggered playback
- use instant state changes with minimal fade

## 7. Mobile Layout And Tap Ergonomics

### Research Summary

Mobile guidance from Material and Apple converges on comfortable tap targets and clear hierarchy.

Useful benchmarks:

- touch targets at least `48 x 48dp` on Material
- iOS commonly recommends `44 x 44pt`
- around `8dp` spacing between targets helps usability

### Practical Recommendations

- ensure cells are comfortably tappable on narrow phones
- reserve enough vertical space for HUD without pushing board offscreen
- do not rely on hover-only cues
- keep important status text larger on handheld layouts
- avoid tiny labels below about `11pt`; primary status should be larger

### Layout Guidance For This Game

- board centered and width-constrained by viewport
- controls above or below board, not wrapped awkwardly beside it on phone
- rules/help should open as sheet or overlay, not consume permanent board space

## 8. Accessibility Guidance Relevant To This Game

### Research Summary

Important state should never rely on color alone. This matters directly here because ownership, legal states, threats, turn, and winner all currently lean heavily on color.

### Practical Recommendations

- pair color with borders, rings, labels, or patterns
- test board in grayscale
- verify contrast on black background meets strong readability standards
- keep winner/turn status text high contrast
- provide explicit labels for screen readers where feasible

### Direct Application

- ownership: orb color + cell tint/border
- critical: color + ring
- illegal: dimming + disabled semantics
- winner: overlay text + color identity

## Recommended Implementation Heuristics

### Visual Heuristic

Every cell should visually encode:

- owner
- urgency
- interactability

in that order.

### Motion Heuristic

Every animation should answer one question:

- what triggered this
- where did effect propagate
- when is turn over

If animation does not improve that, cut it.

### Mobile Heuristic

If board only feels good on desktop, product is not done.

## Strongest Recommendations To Apply First

1. Hide global shell on `/play`.
2. Add static critical/threat visuals before animation work.
3. Build playback system around existing engine events.
4. Add `Resolving...` state and input lock.
5. Add winner overlay and rematch flow.

## Suggested Next Research Follow-Up

Optional deeper research later:

- compare atomr implementations visually for best orb arrangements
- review reduced-motion UX patterns for tactical games
- study sound design patterns for small deterministic games

## Sources

- TanStack Router routing concepts: `https://tanstack.com/router/v1/docs/routing/routing-concepts`
- TanStack Router document head management: `https://tanstack.com/router/v1/docs/guide/document-head-management`
- TanStack Start SEO guidance: `https://tanstack.com/start/v0/docs/framework/react/guide/seo`
- MDN viewport meta: `https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/meta/name/viewport`
- MDN Fullscreen API: `https://developer.mozilla.org/en-US/docs/Web/API/Fullscreen_API`
- Material touch target guidance: `https://m3.material.io/foundations/designing/structure`
- NN/g animation duration guidance: `https://www.nngroup.com/articles/animation-duration/`
- web.dev easing guidance: `https://web.dev/articles/choosing-the-right-easing`
- UX in board game design: `https://uxdesign.cc/ux-in-board-game-design-97bfcdb1d581`
- Board game UX guide: `https://www.productic.net/maia/ultimate-guide-to-ux-in-board-game-design-for-engaging-experiences/`
- Accessible color contrast article: `https://developerux.com/2025/07/28/best-practices-for-accessible-color-contrast-in-ux/`
