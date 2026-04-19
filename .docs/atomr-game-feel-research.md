# AtomR Game Feel Research

## Goal

Find practical ways to make simple deterministic board game feel polished, tactile, and satisfying without turning it into noisy arcade UI.

## Main Conclusion

Game feel here should come from:

- fast clear input feedback
- readable chain playback
- stronger turn transitions
- restrained sound
- optional light haptics
- visible reward hierarchy

Not from:

- constant particles
- heavy screen shake
- long animations
- loud repeated sounds
- haptics on every tiny event

## 1. Feedback Hierarchy

Best pattern from research: feedback intensity should match action importance.

Use three levels:

### Low intensity

- hover or touch-down
- legal target focus
- subtle cell press-in or glow

Good range:

- `80ms` to `120ms`

### Medium intensity

- confirmed placement
- turn change
- capture event

Good range:

- `120ms` to `220ms`

### High intensity

- big cascade peak
- winner reveal

Good range:

- `180ms` to `300ms`

Rule:

- most actions should stay in low or medium intensity
- high intensity should be rare so it still feels special

## 2. Recommended Motion For This Game

### Placement

- quick press-in on tap
- small pulse when orb lands
- no bounce needed

Timing:

- press-in: `90ms`
- place settle: `120ms` to `160ms`

### Capture

- short color flash on captured cell
- then settle into new owner state

Timing:

- `120ms` to `180ms`

### Explosion / cascade step

- one primary effect only: pulse or burst ring
- propagate in deterministic order

Timing:

- step duration: `180ms` to `240ms`
- inter-step stagger: `60ms` to `100ms`

### Turn transition

- fade status from old player to new player
- shift board emphasis color cleanly

Timing:

- `120ms` to `180ms`

### Winner reveal

- stop input
- overlay fade in
- brief accent pulse on winning color

Timing:

- `180ms` to `260ms`

## 3. Sound Design Guidance

Best approach: very short UI/game sounds, not music-first polish.

Recommended event sounds:

- tap / select: dry click
- placement: soft pop
- capture: slightly deeper pop
- turn change: quiet tick or chime
- winner: short rising chord or bright confirmation tone

Rules:

- clips under `150ms` for routine events
- avoid overlapping repeated sounds in big cascades
- use one tonal family so sounds feel related
- keep mute toggle from day one once audio exists

Important warning from real product feedback:

- repeated strong haptics or repeated loud sounds on every move become annoying fast

## 4. Haptics Guidance

Good for mobile, but only if subtle and optional.

Recommended patterns:

- placement: `10ms` to `20ms` light tap
- capture: `30ms` to `50ms`
- winner: short stronger confirmation

Rules:

- do not vibrate on every cascade step
- do not vibrate on opponent activity continuously
- provide settings toggle
- if web vibration API is unavailable, skip gracefully

## 5. Reward And Tension Loop

Game should feel good because tension is visible before reward happens.

Best loop:

1. player scans danger
2. player commits move
3. board confirms input instantly
4. cascade explains result
5. turn or win state lands clearly

Product implication:

- critical-state cues matter as much as animation
- anticipation is part of feel, not separate from feel

## 6. What To Avoid

### Over-juicing

- screen shake on every explosion
- heavy bounce on every orb
- large glow on all legal cells
- confetti-like particles during normal play

### Friction

- long forced animations
- blocking overlays that hide board mid-cascade
- noisy sound stacks
- unexplained turn transitions

### Inconsistency

- some actions have feedback, others do not
- same effect means different things in different places

## 7. Best Low-Cost Feel Wins

Highest impact for least complexity:

1. better cell press state
2. readable critical/threat visuals
3. short cascade playback with input lock
4. stronger turn transition
5. winner overlay
6. optional very subtle sound later

## 8. Skills Found Via `/find-skills`

### Strong recommendations

#### `anthropics/skills@frontend-design`

- installs: `214.1K`
- repo stars: `113K+`
- best trusted skill for pushing UI quality, layout, polish, and visual hierarchy

Install:

```bash
npx skills add anthropics/skills@frontend-design -g -y
```

Link:

- `https://skills.sh/anthropics/skills/frontend-design`

#### `leonxlnx/taste-skill@design-taste-frontend`

- installs: `8.4K`
- repo stars: `7.7K+`
- useful for avoiding generic safe-looking frontend output and pushing stronger taste

Install:

```bash
npx skills add leonxlnx/taste-skill@design-taste-frontend -g -y
```

Link:

- `https://skills.sh/leonxlnx/taste-skill/design-taste-frontend`

### Useful but weaker confidence

#### `omer-metin/skills-for-antigravity@game-ui-design`

- installs: `671`
- repo stars: `51`
- relevant domain match, but lower trust signal than options above

#### `thebushidocollective/han@storybook-story-writing`

- installs: `350`
- repo stars: `130`
- useful for iterating component states in Storybook once board cell components become richer

## 9. Recommended Use Of Skills For This Project

If goal is better feel, best combo is:

1. `anthropics/skills@frontend-design`
2. `leonxlnx/taste-skill@design-taste-frontend`
3. `sergiodxa/agent-skills@frontend-accessibility-best-practices`
4. `thebushidocollective/han@storybook-story-writing`

Why:

- design skill improves structure and polish
- taste skill prevents bland output
- accessibility skill keeps state cues usable
- Storybook skill helps iterate board/cell states cleanly

## Sources

- Game feel PDF by Steve Swink: `https://gamifique.files.wordpress.com/2011/11/2-game-feel.pdf`
- Juice article: `https://www.bloodmooninteractive.com/articles/juice.html`
- MDN Web game audio: `https://developer.mozilla.org/en-US/docs/Games/Techniques/Audio_for_Web_Games`
- MDN Vibration API: `https://developer.mozilla.org/en-US/docs/Web/API/Vibration_API`
- Android haptics principles: `https://developer.android.com/develop/ui/views/haptics/haptics-principles`
- Apple haptics guidance: `https://developer.apple.com/design/human-interface-guidelines/playing-haptics`
- MDN animation performance: `https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/Animation_performance_and_frame_rate`
