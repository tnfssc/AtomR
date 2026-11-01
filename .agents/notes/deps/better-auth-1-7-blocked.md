---
name: better-auth 1.7 blocked by @convex-dev/better-auth
description: Why better-auth stays on 1.6.x despite 1.7.7 fixing critical advisories.
---

better-auth 1.7 removed the `better-auth/plugins/oidc-provider` export. Every `@convex-dev/better-auth`
release through 0.12.6 (2026-10-26) imports it from its `convex()` plugin and declares
`better-auth >=1.6.11 <1.7.0`, so `vite build` fails with better-auth 1.7.7.

Fixes for GHSA-965c-763c-88jm (critical), GHSA-r4xp-prcw-77qf, GHSA-q84f-53jg-9ppm and GHSA-44jh-23m7-hpcf
exist only in 1.7.x (no 1.6 backport as of 2026-11-01). Bump better-auth once `@convex-dev/better-auth`
ships 1.7 support.
