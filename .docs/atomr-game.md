# AtomR Android Game

## Summary

AtomR is turn-based strategy board game originally developed for Android by Buddy-Matt Entertainment. Goal: control board by eliminating every other player's orbs.

Game often described as deterministic combinatorial game of perfect information. No hidden state. No randomness. Strong position can flip fast because one explosion can convert large part of board.

## Core Rules

- Board is rectangular grid. Common board size is `9 x 6`.
- Game supports `2` to `8` players.
- Each player owns color.
- Player may place orb only in empty cell or cell already owned by same player.
- Each cell has critical mass equal to count of orthogonal neighbors:
  - Corner cell: `2`
  - Edge cell: `3`
  - Inner cell: `4`
- When orb count in cell reaches critical mass, cell explodes.
- Explosion sends `1` orb to each orthogonal neighbor.
- Neighbor cells hit by explosion convert to exploding player's color.
- Explosions can trigger more explosions in the same turn.
- Player loses after all their orbs removed from board.
- Winner is last player with orbs remaining.

## Exact Move Lifecycle

One turn appears to work like this:

1. Active player chooses `1` cell.
2. Move is legal only if cell is empty or already owned by active player.
3. Add `1` orb to that cell.
4. If cell now reaches critical mass, resolve explosion immediately.
5. Explosion resolution continues until every cell is stable.
6. Only after board is stable does turn end and next player begin.

Important consequence: player does not get partial control mid-turn. Whole move includes all follow-up explosions caused by initial placement.

## Cell Capacity And Trigger Condition

- Capacity equals count of orthogonal neighbors.
- Corner capacity: `2`
- Edge capacity: `3`
- Inner capacity: `4`
- Cell is "critical" when it is `1` orb short of exploding.
- Explosion trigger happens when added orb makes count equal to capacity.

Equivalent examples:

- Corner with `1` orb is critical. Adding `1` more explodes it.
- Edge with `2` orbs is critical. Adding `1` more explodes it.
- Inner cell with `3` orbs is critical. Adding `1` more explodes it.

## Exact Explosion Behavior

When cell explodes:

- Exploding cell loses exactly its capacity worth of orbs.
- Each orthogonal neighbor gets `1` orb.
- Every affected neighbor becomes owned by exploding player.
- If neighbor was enemy-owned, all orbs in that neighbor flip to exploding player's color.
- If any neighbor now reaches capacity, it also explodes.
- Process repeats until no cell is at or above capacity.

For standard rules, exploding cell usually drops to `0` because it loses exactly as many orbs as it had at trigger point.

## Ownership Semantics

- Empty cell has no owner.
- Non-empty cell has exactly one owner.
- Mixed ownership does not exist.
- Any orb added by explosion to enemy cell converts whole cell, not only newly added orb.
- Therefore ownership flips are cell-wide, not orb-by-orb.

## Turn Order

- Players act in fixed rotation.
- One legal placement per turn.
- No pass rule found in core game summaries.
- No random events during turn resolution.
- Next turn starts only after chain fully resolves.

## Elimination And Win Conditions

Reliable shared rule across sources:

- Player is eliminated when they have no orbs left on board.
- Game ends when only one player remains with any orbs.
- Winner is surviving player.

Implementation-safe interpretation:

- Check elimination after full chain resolution, not halfway through animation.
- Check win after elimination updates from resolved board state.
- Skip eliminated players in future turn rotation.

## Ambiguous Rule: First-Round Elimination

One practical ambiguity exists in many unofficial writeups: if player has not yet placed first orb, they technically have `0` orbs already.

Most plain-language summaries do not describe special protection. But real implementations commonly need one of these interpretations:

1. Elimination immunity until player has completed first turn.
2. Elimination only checked after all players have placed at least one orb.

For product implementation, one of those protections is strongly recommended. Otherwise players after first player could be considered eliminated before first move.

## Resolution Model For Implementation

Useful deterministic model:

- Apply placement.
- Queue newly unstable cells.
- While queue non-empty:
  - Pop unstable cell.
  - Distribute `1` orb to each orthogonal neighbor.
  - Convert each hit neighbor to current chain owner.
  - Clear exploding cell by subtracting capacity.
  - Enqueue any neighbors that became unstable.
- After queue empty, recompute per-player orb totals.
- Mark eliminated players.
- If one active player remains, declare winner.
- Else advance turn pointer to next non-eliminated player.

## Edge Cases To Decide Explicitly In Product Spec

If building own version, lock these down early:

- First-round elimination immunity: yes or no
- Board sizes allowed beyond classic default
- Max players supported in UI and color system
- Explosion animation order when multiple cells become unstable at once
- Whether restart preserves player order/colors
- Whether draw is impossible by construction or needs explicit handling

## Likely Invariants

- Every non-empty cell has single owner.
- Illegal move never changes board.
- Stable board means every cell orb count is strictly less than capacity.
- Total orb count can change during explosion sequence because one placement can create multiple surviving orbs after conversions and follow-up reactions.
- After resolution, board state is deterministic from prior state plus chosen move.

## Product Implications For This Repo

## Why Game Feels Good

- Simple rules. Deep tactics.
- Board has visible tension because near-critical cells become threats.
- Comebacks common. Big swing can happen in one move.
- Positioning matters more than raw orb count.

## Strategy Notes

- Corners strongest long-term anchors because critical mass is only `2`.
- Edges strong because they need only `3`.
- Inner cells unstable but powerful for offensive chain setups.
- Cells at `critical mass - 1` are danger zones and opportunity zones.
- Greedy orb-count play can lose to better chain setup.
- Late game often decided by who controls critical cells and who exposes unstable clusters.

## Product Implications For This Repo

If this repo is building inspired or derivative version of AtomR, core product should likely support:

- Configurable board size
- `2` to `8` players or at least solid `2` player mode first
- Clear visual ownership per cell
- Critical-state preview so players see imminent explosions
- Deterministic chain-resolution animation order
- Elimination and win detection rules
- Local multiplayer first; AI or online later

More specifically, game engine should expose:

- Legal move check: `isCellEmpty || isOwnedByCurrentPlayer`
- Cell capacity by position
- Stable/critical/unstable state helpers
- Full move resolver returning final board after all explosions
- Player status tracker: active, eliminated, winner
- Configurable first-round elimination guard

## Good UX Details

- Show orb count in each cell clearly.
- Make near-critical cells visually tense.
- Animate propagation step-by-step so ownership changes stay readable.
- Prevent illegal move taps on enemy-owned stable cells.
- After chain resolves, pause briefly before next turn.

## Scope Advice

Good v1:

- `2` players
- `9 x 6` board
- Local hot-seat play
- Clean animations
- Restart game
- Win screen

Good v2:

- More player counts
- Board size options
- Undo for local game
- AI opponent
- Online multiplayer

## Sources

- Original Android release listing
- Rules overview and tactics summary
- University project write-up covering rules and AI approach
- Independent gameplay and AI summary
