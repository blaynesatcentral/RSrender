---
status: accepted
---

# Keep RSLog authentication session-only for v0.9

RSrender v0.9 will not persist RSLog passwords, verification codes, access tokens, refresh tokens, or account indexes. Before submission, an exact password or verification code may exist transiently only in the dedicated short-lived Auth Entry renderer described below. After one-shot submission, authentication material exists only in the non-renderer credential broker for the current application process. One account/company context is active at a time; application restart requires authentication.

User entry uses a dedicated short-lived sandboxed Auth Entry WebContents, not a document renderer or generic application bridge. It may transiently collect only the exact password or verification-code fields for one broker-issued flow and submit them once through a narrow preload capability. It receives no tokens or account/source projections, clears its fields, invalidates the capability, and is destroyed on completion, cancel, terminal failure, or crash. The main broker is the sole post-submission holder. This minimizes retention but does not claim JavaScript/process-memory zeroization or raw-minidump secrecy.

The broker may perform the documented password, two-factor verification, and token-refresh requests and attach tokens internally to authorized Source Adapter reads. It returns only sanitized source results, bounded state, and Diagnostics. A rejected refresh or repeated unauthorized response clears broker state and requires sign-in. Local sign-out clears broker memory and must be described as ending the local session, not as proven server revocation.

## Consequences

- No credential field or encrypted credential blob may exist in a Log Project, Log Template, Source Snapshot Candidate, Source Snapshot, Render Dataset, Embedded Template Representation, recovery state, recent-file record, clipboard payload, export, log, crash annotation, telemetry event, or support bundle.
- Password and two-factor code are retained only as long as the documented authentication exchange requires. Access and refresh tokens are replaced or cleared within the broker state and never returned to a renderer.
- Renderer IPC is command-shaped and cannot access Electron `safeStorage`, Windows Credential Manager, tokens, or arbitrary authentication headers.
- Document/application/recovery renderers never receive credentials. Auth Entry is separately route-scoped, nonpersistent, replay-protected, storage-cleaned, and qualified with paste/autofill, navigation, crash, and secret-canary tests.
- Structured logs/crash annotations exclude secrets. Raw dump capture/upload/support inclusion is disabled by default and requires separate firm privacy/security custody approval and canary evidence.
- Shared Windows user profiles are unsupported for secure authenticated use. Same-user hostile processes and process dumps remain residual risks while session secrets are in memory.
- Electron `safeStorage` and Windows generic Credential Manager are rejected for v0.9 persistence, not because their mechanisms failed, but because both remain readable by other processes under the same Windows user and the needed vendor/firm lifecycle policies are absent.
- Persistent credentials may be reconsidered only after supported vendor token/revoke/offboarding semantics, firm security/records/endpoint approval, exact account/tenant binding, update/uninstall cleanup, and packaged-app isolation tests are complete.

Evidence: [issue #32](https://github.com/blaynesatcentral/RSrender/issues/32), including its inert broker/redaction, Electron safeStorage, and Windows Credential Manager probes.
