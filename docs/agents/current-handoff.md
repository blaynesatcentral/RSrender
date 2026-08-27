# Current agent handoff — 2026-08-26

This is the safe starting point for the next RSrender agent. Use the latest `origin/main`; do not reconstruct the application from an older local build.

## Canonical checkpoint

- Accepted production-code checkpoint: `37ca808` (`feat: add live per-edge border authoring`).
- `origin/main` contains that checkpoint and the working tree was clean when this handoff was written.
- Product-owner expanded-beta estimate: **83%**. This is a working beta checkpoint, not completion of the broader program.
- BLD-058 / [issue #101](https://github.com/blaynesatcentral/RSrender/issues/101) is product-owner accepted and closed.
- Rebuild the desktop package with `npm run studio:package:bld026`. The executable under `.tmp/bld-026-boring-log-editor/` is disposable local output and is not stored in GitHub.

## Do not resurrect the failed UX rollout

In the original clone, this local stash may exist:

```text
stash@{0}: On main: pre-recovery UX and BLD-065 work 2026-08-26
```

**Do not apply or pop that stash.** A fresh clone will not contain it. Do not cherry-pick or replay the superseded UX commits `6b3c595`, `44c109c`, `42d432d`, `89d625a`, or `c1555e0`. They caused major regressions in live RSLog import and Properties editing. Commit `7a1117d` restored the verified beta, and `37ca808` added the accepted border work on top of that recovery.

Do not reset to an old package or try to undo those historical commits individually. Start from the latest `origin/main` tree. Reimplement [BLD-059 / issue #100](https://github.com/blaynesatcentral/RSrender/issues/100) incrementally under the recovery gate in [`ux_overhaul_plan.md`](../../ux_overhaul_plan.md).

## Behaviors that must remain working

- Live, session-only RSLog authentication, Source Project catalog, Exploration selection, and in-window multi-boring replacement. Import must not close/relaunch the app or retain the prior Log Project.
- Replacement sessions advance `sessionHost.snapshot().ownerGeneration + 1`; one-Exploration and multi-Exploration Log Projects remain valid.
- Canvas/Contents/Properties selection synchronization; text/value/font editing; Undo/Redo; Save/Reopen; and PDF publication.
- Full admitted font palette and per-occurrence typography.
- Page Region and text-frame borders use per-edge color, width, and pattern. Border controls apply live: checkboxes/selects immediately, numeric/color inputs on native `change`/blur. Canvas and publication use the same scene.
- Source Original versus effective Presentation Override provenance and the existing command/history authority.
- No credentials, tokens, raw live responses, or real client data in source, fixtures, logs, screenshots, command lines, or environment variables.

## Qualification at the checkpoint

- `npm run build`: PASS.
- `npm run lint`: PASS.
- `npm run studio:package:bld026`: PASS.
- Focused BLD-058 plus protected RSLog/session regression gate: 18/18 PASS.
- Product owner confirmed the rebuilt packaged border workflow works.
- The legacy hidden BLD-026 packaged probe still exits after only `RSRENDER_PROBE_PHASE:started`; it was not claimed as passing. Treat its startup fault separately from the accepted visible workflow.

## Next work

1. Take [BLD-059 / issue #100](https://github.com/blaynesatcentral/RSrender/issues/100) one bounded presentation increment at a time, beginning with its green-baseline/recovery gate. Do not mix main-process, RSLog, scene, publication, or command-route changes into a presentation commit.
2. Run the protected packaged workflows before and after every increment. Stop and repair or remove the first regression instead of stacking more UX work over it.
3. Track direct-manipulation latency separately in [BLD-066 / issue #108](https://github.com/blaynesatcentral/RSrender/issues/108).
4. Reconcile remaining open issues against current `main`; an open issue is not evidence that its implementation is absent, and a source-only test is not product acceptance.

Keep the foundation-program umbrella issue open until its broader requirements are actually complete.
