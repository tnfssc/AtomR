# AtomR AI Research (AI Mode)

## Objective

Add a third mode (`AI mode`) where player can choose CPU difficulty from `1` to `10`.

Constraints from product direction:

- keep it lightweight
- deterministic core gameplay
- responsive move time in browser

## Summary Recommendation

Primary recommendation: **depth-limited Minimax + alpha-beta pruning + AtomR-specific heuristic + controlled stochasticity**.

Why this is the best fit now:

- works directly with existing deterministic engine (`shared-engine.ts`)
- no model download, no GPU backend setup, no training infra
- predictable performance tuning by depth/candidate count
- easy difficulty scaling from weak to strong behavior

Secondary/fallback recommendation: **optional TensorFlow.js policy head later**, only if we want extra style variety or faster high-level move priors.

## External Research Findings

### 1) Strong baseline for this game type is minimax with alpha-beta

- AtomR community implementations repeatedly use minimax + alpha-beta.
- Move ordering / transposition tables / iterative deepening are known multipliers for alpha-beta performance.

Sources:

- example open-source minimax implementation for this ruleset
- example open-source alpha-beta bot for this ruleset
- https://www.chessprogramming.org/Alpha-Beta
- https://www.chessprogramming.org/Move_Ordering
- https://en.wikipedia.org/wiki/Alpha%E2%80%93beta_pruning

Credibility:

- chessprogramming/wiki: medium-high (well-established references for adversarial search)
- game-specific repos: medium to low (implementation quality varies)

### 2) Orb-count-only heuristic is weak in AtomR

- Multiple sources note that naive piece count can be misleading because swings happen from critical cells and chain instability.

Sources:

- general gameplay and rules overview
- independent gameplay and AI write-up

Implication:

- evaluation should include criticality, corner/edge leverage, threat/exposure around near-critical enemy cells

### 3) MCTS is viable but heavier for our constraints

- MCTS/UCT is theoretically strong for board games, but practical quality depends on rollouts and time budget.
- For this project, low-latency browser UX is more important than maximum asymptotic strength right now.

Sources:

- https://dke.maastrichtuniversity.nl/m.winands/documents/Encyclopedia_MCTS.pdf
- https://www.informs-sim.org/wsc18papers/includes/files/021.pdf
- https://www.jetir.org/papers/JETIR2004502.pdf

### 4) TensorFlow.js can help, but not free

- WebGPU/WebGL inference can be fast, but adds model loading, backend differences, and training complexity.
- AlphaZero-style self-play is compute-heavy; lightweight browser game should avoid this first.

Sources:

- https://www.tensorflow.org/js/guide/platform_environment
- https://suragnair.github.io/posts/alphazero.html
- https://deepmind.google/blog/alphazero-shedding-new-light-on-chess-shogi-and-go/

## In-Repo Experimental Results

I added a research-only experiment harness at:

- `.plans/ai-mode-experiments.test.ts`

Run command used:

```bash
pnpm exec vitest run .plans/ai-mode-experiments.test.ts
```

### Observed behavior (current prototype)

1. **Difficulty separation exists**

- sampled series showed stronger configs consistently beating weaker configs

2. **Latency scales with difficulty (good for 1..10 mapping)**

- sample per-move averages from experiment:
  - level 1: ~0 ms
  - level 7: ~4.5 ms
  - level 9: ~41.9 ms
  - level 10: ~36.5 ms

3. **Algorithm ordering in sample tests**

- greedy > random
- minimax > greedy
- higher-depth minimax > lower-depth minimax (in sample)

Note: these are small-sample engineering experiments, not formal benchmarks.

## Proposed Difficulty Mapping (1-10)

Use one policy family and scale its parameters:

- search depth
- candidate move limit
- mistake probability (intentional suboptimality)
- softmax temperature among near-best moves

Suggested profile:

- `1-2`: shallow + high randomness (human-beatable)
- `3-4`: shallow-medium + moderate randomness
- `5-6`: medium depth + limited mistakes
- `7-8`: deeper + low randomness
- `9-10`: deepest within time budget + very low randomness

## Why not full training first?

For this app stage, training-first has poor cost/benefit:

- need data pipeline + self-play infra + model lifecycle
- adds deployment complexity (model artifacts, backend fallback, warmup)
- hard to guarantee monotonic `1..10` difficulty without extra calibration

Traditional search gives fast, controllable, inspectable behavior now.

## Hybrid Option (if needed later)

If traditional search plateaus or feels repetitive:

- keep minimax as final decision layer
- add tiny TF.js policy prior to rank candidate moves
- use model only for top-K proposal, not full value replacement

This keeps inference light and preserves deterministic tactical resolution.

## Conclusion

Best path for this project: **implement AI mode using tuned minimax/alpha-beta first**, with explicit difficulty parameterization and strict per-move time budget.

If we later want richer style/personality or stronger late-game play under same latency, add a lightweight TF.js prior as a second phase.
