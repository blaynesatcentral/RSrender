# Minimum endpoint, workload, and performance-validation envelope

**Status:** Product-owner approved recommended baseline for GitHub #41 on 2026-08-14  
**Applies to:** #30, #42, and the performance/resource portions of #26  
**Evidence boundary:** Approved conservative design envelope and test policy; not representative-user research, measured performance, or a claim that DOM/SVG passes

## Decision

RSrender v0.9 targets the minimum endpoint profile below. The current controlled Windows host is an approved equivalent for initial #30/#42 measurement because it meets or exceeds the observed CPU/RAM/display class. A conforming firm endpoint may replace it if the same sanitized profile and test plan are retained.

Any information obtained through an authorized, read-only RSLog source is eligible for explicit binding and rendering. Therefore performance fixtures are open-content: they include typed supported facts and inert unknown-field envelopes, long text, repeated/custom fields, and dense dynamic bindings. This does not authorize undocumented access, source mutation, default placement of every field, executable content, or authentication material.

## Minimum supported endpoint profile

| Axis | Approved minimum |
|---|---|
| Operating system | Supported Windows 11 x64 release with current security updates |
| CPU | 4 physical cores / 8 logical processors or better; modern x64 mobile/business CPU class |
| Memory | 16 GiB installed; benchmark begins with at least 8 GiB available |
| GPU | DirectX 12-capable integrated GPU or better with Chromium hardware acceleration enabled; no discrete GPU requirement |
| Storage | Local SSD with at least 10 GiB free for application, temporary export, recovery, and benchmark artifacts |
| Display | 1920 × 1080 physical or equivalent; 100–150% Windows display scale supported; primary benchmark at 125%, yielding no more than about 1536 × 864 logical pixels |
| Input | Keyboard and two-button pointing device with wheel/precision scrolling |
| Power | AC power or equivalent non-throttled performance profile during measurements |
| Runtime | Pinned packaged Electron/Chromium build with production security switches; development tools closed except approved instrumentation |

Privacy-safe observation of the initial equivalent host: Windows 11 x64; Intel Core i7-1265U class; 12 logical processors; approximately 16 GiB RAM; 1920 × 1080-equivalent display at 125% scale. Hostname, user, serial, asset, network, and office identifiers are excluded. GPU conformance must be asserted by the benchmark preflight without recording a device identifier.

## Approved synthetic workload envelopes

The values are conservative design targets, not claims about observed firm percentiles. Each larger envelope includes every smaller semantic edge case. “Active page” means the currently interactive page; document totals include non-visible pages that remain addressable in Contents, Diagnostics, undo, and export planning.

| Axis | Minimum | Typical | Large supported | Adversarial bounded |
|---|---:|---:|---:|---:|
| Pages per project | 5 | 20 | 100 | 250 |
| Simultaneously open projects/templates | 1 | 3 | 5 | 10 |
| Active-page graphic/text/data primitives | 250 | 1,000 | 2,500 | 10,000 |
| Total document primitives | 1,000 | 5,000 | 25,000 | 100,000 |
| Contents nodes | 150 | 1,000 | 5,000 | 20,000 |
| Maximum group nesting | 6 | 10 | 16 | 32 |
| Active text frames | 20 | 100 | 500 | 2,000 |
| Total bound text characters | 20,000 | 250,000 | 1,000,000 | 5,000,000 |
| Longest single bound text value | 2,000 | 10,000 | 100,000 | 1,000,000 |
| Distinct authorized source-field bindings | 50 | 250 | 1,000 | 5,000 |
| Guides / snap candidates on active page | 25 / 500 | 50 / 2,500 | 200 / 10,000 | 1,000 / 50,000 |
| Data Tracks / ordered Data Layers | 2 / 6 | 4 / 12 | 10 / 40 | 20 / 100 |
| Active-page point/range glyphs | 2,000 | 10,000 | 50,000 | 500,000 |
| Embedded raster/vector/font/hatch assets | 5 | 25 | 100 | 500 |
| Total decoded asset budget | 25 MiB | 100 MiB | 500 MiB | 1 GiB |
| Undoable commands retained in session | 100 | 1,000 | 10,000 | 50,000 |

Minimum, Typical, and Large are intended supported envelopes. Adversarial is a stress/rejection envelope: it must remain bounded, cancellable, diagnosable, and non-corrupting, but continuous 60 Hz manipulation is not required.

Fixtures remain independently synthetic and use #16 semantics. They include long descriptions/comments, unknown authorized fields, nested groups, visibility/lock inheritance, first/continuation/last variants, manual depth breaks, shared axes, interval fragments, missing/null/zero/unavailable values, hatches represented by licensed synthetic assets or neutral fallbacks, and every explicit overflow policy.

## Predeclared interaction budgets

All latency is input-event or command-dispatch to the first presentation containing the correct state. Correctness is mandatory; meeting latency while dropping, merging, or misordering committed commands is failure.

| Operation class | Typical envelope | Large supported envelope |
|---|---|---|
| Continuous drag/resize/rotate/nudge preview | p50 ≤ 8 ms; p95 ≤ 16.7 ms; p99 ≤ 33.3 ms; max ≤ 100 ms | p50 ≤ 16.7 ms; p95 ≤ 33.3 ms; p99 ≤ 50 ms; max ≤ 150 ms |
| Selection, Key Element change, snapping/guide evaluation | p95 ≤ 33.3 ms; p99 ≤ 50 ms | p95 ≤ 50 ms; p99 ≤ 100 ms |
| Tree reorder/reparent, visibility/lock, mixed-property commit, Undo/Redo | p95 ≤ 50 ms; p99 ≤ 100 ms | p95 ≤ 100 ms; p99 ≤ 200 ms |
| Text measurement/repaint after one edit | p95 ≤ 50 ms; p99 ≤ 100 ms | p95 ≤ 100 ms; p99 ≤ 250 ms |
| Initial page projection after selection | ≤ 500 ms with feedback by 100 ms | ≤ 2 s with feedback by 100 ms and cancellation enabled |
| Cancellation acknowledgement | ≤ 250 ms | ≤ 500 ms |

Additional budgets:

- no incorrect snap, lost committed command, duplicate undo command, stale selection, or focus loss in any measured iteration;
- no task longer than 50 ms during Typical continuous manipulation and no task longer than 100 ms during Large continuous manipulation;
- Typical single-project working-set increase ≤ 750 MiB; Large single-project increase ≤ 1.5 GiB; five Large open documents ≤ 3 GiB total application working set;
- after 20 open/edit/close cycles, retained memory growth is ≤ the larger of 5% or 50 MiB once garbage collection and renderer teardown settle;
- background parse/export work must not make an unrelated Typical document miss the continuous-interaction p95 budget;
- Adversarial input must reject, simplify, virtualize, or process with visible progress before it exhausts the endpoint or blocks cancellation.

These budgets are acceptance candidates. A missed budget rejects the tested projection/configuration; it does not authorize weakening the budget after viewing results. A proposed budget change requires a new recorded product-owner decision with the failed evidence attached.

## Measurement protocol

1. Pin OS build family, Electron/Chromium version, harness hash, hardware-profile code, display scale, viewport, acceleration state, power state, and fixture hashes.
2. Start from a fresh application process for each of three sessions per envelope.
3. Run five unrecorded warm-up iterations per action.
4. Record at least 50 discrete iterations per action per session. For continuous gestures, record at least ten five-second traces per session.
5. Exercise pointer, keyboard, exact-property, tree, and undo paths over the same renderer-neutral commands and geometry.
6. Report p50/p95/p99/max, long-task counts, working set/heap, retained growth, correctness, cancellation, and every typed failure.
7. Run the full protocol at 125% display scale. Repeat correctness and p95 smoke checks at 100%, 150%, and 200%.
8. Retain failures; never discard an outlier unless a predeclared harness-invalidity rule applies and the exclusion is reported.
9. Compare a bounded non-DOM projection only if DOM/SVG misses a predeclared budget after correctness-preserving profiling and one bounded optimization pass.

## Authority, capture, and retention

The product owner accepts the recommended profile, workload envelopes, budgets, repetition plan, and approved-equivalent route for internal v0.9 planning.

- Only synthetic fixtures and privacy-safe aggregate metrics enter the repository.
- Raw performance traces remain in the controlled local evidence workspace for 30 days after an approved sanitized synthesis, then are deleted unless a documented defect still requires them.
- Sanitized summaries, harness/source hashes, exact runtime versions, and accepted/rejected decisions may be retained with the project.
- Disable production credentials, RSLog sessions, client artifacts, crash-upload telemetry, and unrestricted dumps during measurement.
- Do not record usernames, hostnames, serial/asset identifiers, network details, internal paths, security-policy details, or employee scheduling.
- A matching current or firm-provided endpoint is authorized for disposable synthetic testing. Destructive storage, signing, authentication, and assistive-technology work still requires its owning ticket's separate authority.

## #41 closure statement

- Endpoint owner/function: product owner authorizes the recommended minimum and approved-equivalent route for disposable synthetic tests.
- Endpoint profile: complete.
- Repeatable access: available on a matching controlled Windows endpoint.
- Workload-density envelope: approved conservative design envelope; explicitly not representative-user evidence.
- Performance/UX acceptance: budgets and repetitions approved before #30/#42 results.
- Evidence capture and retention: approved as specified above.
- Remaining blockers: none for #41. #30 and #42 must still run and may fail; their outcomes are not implied by this approval.
