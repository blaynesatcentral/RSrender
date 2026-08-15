# BLD-006 empty packaged Electron shell verification

Status: **PASS for the bounded BLD-006 empty-shell baseline**  
Date: 2026-08-14  
Issue: [GitHub #50](https://github.com/blaynesatcentral/RSrender/issues/50)  
Machine-readable evidence: `artifacts/bld-006-empty-shell-evidence.json`

## Scope and trace

This evidence qualifies one packaged Electron `43.4.0` main process with one inert,
sandboxed renderer and no application capability. It traces to product invariants
`PI-16` and `PI-20`, ADRs 0007 and 0008, and only the empty-shell harness seam of
acceptance strategy `P06`.

The shell contains no document/Application Core state, preload, IPC channel, file or
path command, source/auth/credential adapter, package/layout/PDF/publication command,
product UI, production data, or app-supplied asset. Its renderer is a static in-memory
page with a deny-all content security policy.

## Qualified package

| Axis                        | Observed value                                                     |
| --------------------------- | ------------------------------------------------------------------ |
| Electron                    | `43.4.0`                                                           |
| Chromium                    | `150.0.7871.224`                                                   |
| Packaged Node.js            | `24.18.1`                                                          |
| Packager                    | `20.0.4`                                                           |
| Platform                    | Windows x64, sanitized                                             |
| Package                     | ASAR, one inert renderer, no app-supplied icon                     |
| Electron ZIP SHA-256        | `ef0709cfa719739acce73de6f9b684304baf38c6454376638a70d34a7cecffe0` |
| Packaged executable SHA-256 | `bab31519ee1bc5b490caf7844e2b1dbcd4f7bb49a13039103952ab381c02ade4` |
| Packaged `app.asar` SHA-256 | `19eebbec6a4fcabee04f6712f2625f4d97b40442141db52a7bf49aa221cb1b7f` |
| Production lock SHA-256     | `d88d3e88092ec275d5757592531b5fb57a912c593abb836663007d602064c1af` |
| Packaging profile SHA-256   | `7da491abd5523f22f952cec9570e04e14b43f53d0a1ddb1cd4b2fa2883fb13c6` |

Electron Packager normally edits Windows executable resources. On this managed host,
that edit produced a binary whose Chromium child processes could not start. The
packaging hook therefore restores the exact admitted Electron executable after
Packager constructs the application directory and ASAR. BLD-006 consequently makes
no claim about application metadata, icon resources, signing, or distributability;
the executable digest above is the exact admitted Electron runtime digest.

## Effective renderer boundary

The packaged runtime reported the following effective preferences:

- `sandbox: true`, `contextIsolation: true`, and `nodeIntegration: false`;
- Node integration disabled in workers and subframes;
- `webSecurity: true`, insecure content and experimental features disabled;
- DevTools and `<webview>` disabled;
- safe dialogs enabled and navigation by drag-and-drop disabled;
- no preload path, zero IPC channels, and zero renderer capabilities; and
- a memory-only, nonpersistent session with network, downloads, permissions, new
  windows, and navigation away from the exact shell URL denied.

The static page's content security policy sets `default-src`, scripts, styles,
images, connections, media, fonts, frames, children, workers, objects, base URIs,
and form actions to `none`.

## Packaged observations

The final authoritative packaged run passed **16/16** assertions:

| Observation                                                  | Result   |
| ------------------------------------------------------------ | -------- |
| Packaged runtime and exact Electron version                  | **PASS** |
| Effective sandbox/context-isolation/no-Node preferences      | **PASS** |
| No preload                                                   | **PASS** |
| No Node/Electron/IPC/application globals                     | **PASS** |
| Inert static renderer                                        | **PASS** |
| No renderer capability or IPC channel                        | **PASS** |
| Navigation away from the shell denied                        | **PASS** |
| New-window/popup attempt denied                              | **PASS** |
| Permission request denied                                    | **PASS** |
| Renderer network attempt denied and did not complete         | **PASS** |
| Session is nonpersistent and cache-disabled                  | **PASS** |
| Exactly one inert window renderer                            | **PASS** |
| In-process window and renderer teardown                      | **PASS** |
| Packaged process exits successfully                          | **PASS** |
| Zero matching processes before and after; profile removed    | **PASS** |
| Exact binary, versions, and packaging configuration recorded | **PASS** |

The network probe is accepted only because its remote request did not complete; no
source-only inference is used as runtime evidence. The before/after exact-executable
inventory was `0 -> 0`, exit code was `0`, and the dedicated shell profile was removed.

The GUI-host execution required approval to launch Chromium child processes outside
the automation filesystem/process sandbox. The identical package could not launch
those children inside that outer host sandbox. This is an environmental gate, not a
reason to weaken the Electron sandbox or any shell preference.

## Privacy and retained evidence

The JSON evidence is classified `SYNTHETIC_LOCAL`. It retains no stdout, stderr,
hostname, username, absolute host path, production/client data, credential, or
proprietary asset. It records the exact source, lock, package, configuration, and
binary digests needed to relate the observed run to this implementation.

Earlier developmental failed runs were overwritten and are not acceptance evidence.
Only the final `PASS` manifest named above is authoritative for this evidence cut.

## Commands and repository gates

```text
npm run build
npm run shell:package
npm run shell:test:packaged
npm run shell:verify
npm run lint
npm run format:check
npm run typecheck
npm test
npm run architecture:check
npm run package:check
npm run dependency:verify-admission
```

The final packaged probe passed `16/16`; root tests passed `30/30`; lint, formatting,
TypeScript, architecture boundaries, package boundaries, and dependency admission all
passed. Dependency admission observed the same 156 identities admitted by BLD-001.
The root integration owner also ran the pinned-runtime `npm run verify` successfully
at this evidence cut.

## Bounded conclusion and nonclaims

BLD-006's empty packaged security shell is closure-ready. This is not a complete
`P06`, issue #37, packaged-security, or release-security pass. Renderer crash/rebind,
utility-process and native-decoder containment, Electron fuses, application metadata,
signing, installer/update behavior, release packaging, commercial approval, and all
product capabilities remain unproved and belong to later tickets.

Rerun this evidence after any change to the Electron or packaging pin, lockfile,
packaging profile, main-process entry point, renderer page, protocol/session policy,
web preferences, preload/IPC/capability surface, CSP, denial handlers, teardown logic,
or packaged-probe runner.
