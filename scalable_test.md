# Scalable, mouse-safe RSrender computer-use testing

## Purpose

Run four parallel visual usability workers against immutable packaged RSrender builds without moving the host mouse, stealing keyboard input, duplicating test work, or leaving stale Electron/Node processes behind.

This is a setup and operating plan. The scalable harness is not yet implemented by this file.

## Safety invariant

Routine workers must inject input into an Electron window through Playwright/Chromium or an equivalent window-scoped API. They must never use the host desktop cursor.

Do **not** use `tooling/bld-052-coordinate-driver.ps1` for unattended parallel testing. It intentionally uses Windows desktop coordinates and can move the real cursor. Also prohibit host-side PyAutoGUI, AutoHotkey, `SetCursorPos`, and similar global input tools.

Use only synthetic RSrender projects. Do not give usability workers RSLog credentials, client data, unrestricted network access, or authority to modify source code.

## Recommended topology

```text
One coordinator process
  |-- Worker 1 -> isolated RSrender process/profile -> screenshots + actions
  |-- Worker 2 -> isolated RSrender process/profile -> screenshots + actions
  |-- Worker 3 -> isolated RSrender process/profile -> screenshots + actions
  `-- Worker 4 -> isolated RSrender process/profile -> screenshots + actions

Coordinator -> deduplicated findings -> reproduction queue -> coding tickets
```

The workers are image-driven. Each Luna receives a screenshot and returns a bounded action such as click, drag, scroll, type, or keypress. The driver translates that action into window-local Electron/Chromium input. DOM information may be retained for diagnostics, but it must not be exposed to a worker when the run is designated `computer-use-only`.

Keep one Windows VM for periodic native qualification only. It is needed for behavior that a Chromium-level driver cannot faithfully prove: installer behavior, native file dialogs, Windows chrome, physical touchpad gestures, monitor/DPI transitions, and host accessibility integration.

## Why this topology

- [Playwright Electron](https://playwright.dev/docs/api/class-electron) can launch and control Electron applications, take screenshots, click, type, and access application windows without moving the physical cursor.
- [Electron webContents](https://www.electronjs.org/docs/latest/api/web-contents) supports captured/offscreen frames and window-scoped input events.
- [AgentDesk](https://github.com/agentsea/agentdesk), [Anthropic's computer-use demo](https://github.com/anthropics/anthropic-quickstarts/tree/main/computer-use-demo), and [E2B Desktop](https://github.com/e2b-dev/desktop) provide disposable Linux desktop environments. They are useful if RSrender gains a qualified Linux build, but they do not prove Windows packaging behavior.
- [Windows Agent Arena](https://github.com/microsoft/WindowsAgentArena) is a useful reference for scalable Windows-agent orchestration, but its full Windows VM approach is heavier than RSrender needs for every test.

## Host baseline

Recommended machine:

- Windows 11 Pro with 64 GB RAM;
- 12 or more logical CPU cores;
- 100 GB free SSD space for repository, package copies, traces, and the occasional VM;
- hardware virtualization enabled for the native-qualification VM;
- stable network access to the selected model provider; and
- Git, GitHub CLI, and the repository-pinned toolchain.

RSrender currently pins:

- Node `24.18.1`;
- npm `11.16.0`; and
- Electron `43.4.0`.

Confirm these pins from `package.json` and `.node-version` after pulling; do not assume this document remains authoritative if those files change.

## Dependency boundary

Playwright is not currently an admitted RSrender dependency. Do not run `npm install playwright` inside this repository merely to prepare the test machine.

Use one of these paths:

1. **External harness first:** install the controller under a separate directory such as `C:\RSrender-test-grid`, record its lockfile and exact dependency versions, and point it at an immutable packaged RSrender build.
2. **Repository-integrated harness later:** open a dedicated GitHub coding/dependency-admission ticket, follow `docs/agents/issue-tracker.md` and the existing dependency-admission process, then commit the qualified harness and lock changes.

The external harness may produce candidate usability evidence, but release evidence must still satisfy RSrender's repository qualification and provenance requirements.

## Machine setup

1. Clone or update RSrender and verify that the worktree contains only intended changes.
2. Install the exact Node/npm versions pinned by the repository.
3. Restore dependencies using the repository's approved bootstrap process. Do not bypass lifecycle-script or dependency-admission checks.
4. Run the current root verification command:

   ```powershell
   npm run verify
   ```

5. Produce the current authoritative packaged Studio build using the script named in `package.json` and the active coding ticket. Do not assume an older `bld-*` package script is the current product build.
6. Record the packaged executable path, SHA-256, package revision, fixture digest, and test-harness revision before assigning work.
7. Copy or mount the package read-only for the workers. Every worker in a batch must use the same bytes.

## Worker isolation

Each worker needs:

- a unique worker identity (`worker-01` through `worker-04`);
- a unique RSrender profile directory supplied through the supported `--rsrender-bld025-profile=<path>` argument;
- a unique temporary, download, screenshot, and publication directory;
- a fresh synthetic project restored before every scenario;
- a fixed viewport and scale factor for its assigned scenario;
- a maximum action count and wall-clock timeout;
- an exact process-tree/job boundary; and
- cleanup verification reporting zero remaining worker-owned processes.

RSrender uses a single-instance lock. The harness must prove that separate profile roots allow four concurrent packaged instances before parallel work is enabled. If they do not, use four separately isolated app environments or change the test seam through a reviewed coding ticket; do not disable the production single-instance authority casually.

Never share a writable project, profile, export destination, or fixture directory between workers.

## Non-overlapping worker lanes

Assign stable lanes so four workers improve coverage instead of repeating the same happy path.

### Worker 1: Canvas and responsive interaction

- window growth and shrinkage;
- ribbon overflow and text scaling;
- pane splitters and horizontal/vertical scrolling;
- canvas pan, wheel/touchpad-equivalent zoom, fit, and selection;
- element drag, resize, snapping, and handles; and
- small, medium, wide, and high-DPI viewport matrices.

### Worker 2: Authoring and Properties

- right-click selection and Properties opening;
- fonts, sizes, wrapping, alignment, color, and placement;
- lithology fill and hatch defaults;
- graph symbols, lines, points, and legend synchronization;
- header/footer/column geometry; and
- Apply, Undo, Redo, reopen, and default propagation.

### Worker 3: Data and project lifecycle

- New, Open, Save, Save As, Close, dirty prompts, and recovery;
- synthetic RSLog import and controlled API-adapter fixtures;
- all-boring navigation and selection;
- top elevation, total depth, units, and project metadata;
- attribute-table viewing, sorting, editing, and validation; and
- malformed, incomplete, large, and conflicting synthetic inputs.

### Worker 4: Publication and robustness

- single-log and all-log PDF packages;
- ordering, page setup, margins, page sizes, and mixed packages;
- output-path, overwrite, cancellation, and failure recovery;
- normalized PDF structure and visual inspection;
- keyboard-only navigation and basic accessibility; and
- repeated open/edit/export/close cycles and resource cleanup.

Rotate lanes periodically, but never assign two active workers the same scenario lease.

## Coordinator contract

Only the coordinator assigns work and files findings. Workers do not edit code or open GitHub issues directly.

Every scenario lease contains:

```json
{
  "scenarioId": "authoring.text.wrap-and-resize",
  "workerId": "worker-02",
  "buildSha256": "sha256:<packaged executable digest>",
  "fixtureSha256": "sha256:<synthetic project digest>",
  "viewport": { "width": 1440, "height": 900, "scaleFactor": 1 },
  "maxActions": 80,
  "timeoutSeconds": 300,
  "computerUseOnly": true
}
```

Maintain a single coordinator-owned queue with these states:

```text
pending -> leased -> completed
                  -> expired -> pending
                  -> failed -> reproduction
```

Use a lease expiry so a crashed worker cannot permanently own a scenario. The coordinator is the only writer to queue state, which avoids concurrent file corruption.

## Finding and deduplication contract

A worker finding is incomplete unless it includes:

- build, fixture, worker, scenario, and viewport identities;
- starting state and bounded reproduction actions;
- expected and observed behavior in plain language;
- screenshot before failure and at failure;
- action transcript with timestamps;
- severity and affected workflow;
- whether the failure reproduced after a clean reset; and
- worker process-cleanup result.

Compute a candidate duplicate fingerprint from normalized:

```text
build family + surface + selected semantic item + action + observed failure code/class
```

The coordinator groups matching fingerprints, then runs one clean reproduction before creating or updating a GitHub ticket. Multiple independent reproductions increase confidence but do not create duplicate issues.

## Batch lifecycle

1. Package and hash one candidate build.
2. Stop any prior worker-owned Electron/Node process trees.
3. Restore four clean synthetic profiles and fixtures.
4. Start one coordinator and four bounded workers.
5. Run distinct leased scenarios.
6. Reproduce and deduplicate failures.
7. Stop all workers and verify exact process-tree cleanup.
8. Archive the batch manifest, transcripts, screenshots, and summary.
9. Implement fixes through normal BLD tickets and command/history/domain boundaries.
10. Package a new immutable build and run targeted regression before exploratory testing resumes.

Do not let workers test a moving development directory. A batch is invalid if package bytes change while it is running.

## Resource limits

Start conservatively:

- four Electron workers maximum;
- one coordinator/model-adapter process;
- one packaging or verification process at a time;
- 300-second default scenario timeout;
- 80-action default limit;
- screenshot retention at state changes and failures rather than every animation frame; and
- no VM running during the lightweight four-worker batch unless native qualification is scheduled.

Measure real peak working set before raising concurrency. Four Electron workers should be materially lighter than four Windows VMs, but process and GPU memory must be observed rather than assumed.

The supervisor must terminate only processes it started. Record parent PID, child PIDs, executable path, start time, and worker identity. Never kill all `node.exe` or all Electron processes by name because unrelated user processes may be present.

## Native-qualification VM

Use one Windows VM for a smaller scheduled suite, not the main four-worker loop.

Suggested allocation on a 64 GB host:

- 8–12 GB dynamic RAM;
- 4 virtual CPU cores;
- dynamically expanding 60 GB disk; and
- synthetic data with restricted networking.

Run native qualification before a significant packaged milestone and after changes to windowing, file dialogs, touchpad handling, DPI behavior, installers, signing, or accessibility integration. Input injection must execute inside the guest VM.

## Ready-to-run acceptance checklist

The scalable loop is ready only when all are true:

- [ ] Four packaged RSrender instances run concurrently with isolated profiles.
- [ ] A worker can screenshot, click, right-click, drag, scroll, type, and press keys without moving the host cursor.
- [ ] Minimizing or backgrounding the controller does not steal host focus.
- [ ] Workers receive screenshots only in `computer-use-only` runs.
- [ ] Scenario leases prevent overlapping work.
- [ ] Duplicate reports converge into one reproduction record.
- [ ] A crashed or timed-out worker is reclaimed automatically.
- [ ] Every batch ends with zero worker-owned Electron/Node processes.
- [ ] No cleanup operation targets processes the harness did not start.
- [ ] Synthetic fixtures reset deterministically.
- [ ] Build and fixture digests appear in every report.
- [ ] The separate native VM suite still covers OS-specific gaps.

## Initial proof before unattended use

Perform a supervised ten-minute trial with one worker while actively using another application on the host. Confirm that the host pointer and keyboard remain unaffected. Then repeat with two workers, and finally four. Stop immediately if any worker changes host focus or pointer position; that indicates a global-input path is still active.

Do not call the refinement loop operational until this proof and the process-cleanup checklist pass.
