# RSLog live API project-retrieval research

Status: first-party evidence record; no live tenant call and no production implementation  
Research date: 2026-08-24  
Scope: read-only retrieval of one RSLog Source Project and its Explorations for building Boring Logs in RSrender. This report does not authorize RSLog mutation and does not request, receive, inspect, or use user credentials.

## Executive answer

**Yes. RSLog now has a publicly documented live API path suitable for retrieving project data.** The vendor says its APIs let other software read and write project or borehole data; RSrender needs only the documented reads. The API reference documents bearer authentication, project discovery, a project-to-borehole roster, borehole child reads, and a live `POST /api/v3/export/rsgeo/data` operation that returns project data as tabular JSON. The export request accepts a project ID, optional borehole IDs, and an optional dataset selection; omitting `datasets` is documented to return all datasets. The documented dataset list includes collar, samples, drill runs, stratigraphy, boring details, piezometers, discontinuities, and laboratory results. [`API Functions`](https://www.rocscience.com/help/rslog/documentation/import/api-functions), [`RSLog API documentation`](https://www.rslogonline.com/APIDocumentation/index.html)

This is not the same thing as opening a previously exported JSON file. The repository's current ingress only inspects bounded local RSLog Project Data JSON and deliberately rejects every positive schema as unadmitted; it does not authenticate or call RSLog. [`rslog-project-data-ingress.ts`](../../../packages/platform-electron-main/src/rslog-project-data-ingress.ts)

The appropriate product direction is therefore a read-only **Source Adapter** that:

1. authenticates in a short-lived dedicated Auth Entry surface;
2. lists Source Projects and lets the user choose by exact provider ID;
3. retrieves the project's Exploration roster;
4. retrieves a complete source-only Source Snapshot Candidate using the documented RSGeo export and, only where required, documented `/api/v1` child reads; and
5. shows the Refresh comparison before atomically accepting the candidate.

The HTTP `POST` used by the RSGeo endpoint is observational: the vendor describes it as exposing project data and returning an export response. RSrender must still allowlist only this read operation and documented `GET` operations, never the adjacent create/update/delete routes published on the same page. [`RSLog API documentation`](https://www.rslogonline.com/APIDocumentation/index.html)

## Evidence scope and important update

Terminology note: the current first-party documentation identifies RSLog as a Rocscience product and hosts its API on Rocscience/RSLog domains. No RSLog entry was found in Bentley's public API catalog as checked on 2026-08-24. This report therefore uses the actual first-party Rocscience/RSLog sources rather than assuming a Bentley API surface. [`RSLog documentation overview`](https://www.rocscience.com/help/rslog/overview/documentation-and-theory-overview), [`Bentley developer API catalog`](https://developer.bentley.com/apis/)

Only these first-party sources were used:

- the current vendor-hosted [`RSLog API documentation`](https://www.rslogonline.com/APIDocumentation/index.html);
- the vendor's [`RSLog product documentation`](https://www.rocscience.com/help/rslog/documentation), including [`API Functions`](https://www.rocscience.com/help/rslog/documentation/import/api-functions), [`Projects`](https://www.rocscience.com/help/rslog/documentation/projects), [`Users`](https://www.rocscience.com/help/rslog/documentation/account/user-management/users), and [`Logging In`](https://www.rocscience.com/help/rslog/documentation/getting-started/logging-in);
- the vendor's [`Web Lease licensing description`](https://www.rocscience.com/plans-pricing/licensing), which states that RSLog account data can be transferred to other applications through an API; and
- the vendor's [`RSLog Data Documentation`](https://www.rslogonline.com/DataTemplateDocumentation) for the separate file-exchange formats.

No tenant API, browser session, credential, token, production response, undocumented route, or reverse-engineered application surface was used.

The public API reference changed materially after the repository's 2026-08-13 research. On 2026-08-24 it contains a documented `RSGeo Export` section for `POST /api/v3/export/rsgeo/data` and explicitly lists `labResults`. Accordingly, the older statements that the public guide has no laboratory-result route and that a validated Supplemental Source is the only publicly documented MVP route are no longer current. The older reports remain valid as dated evidence, especially for semantic and tenant-level unknowns, but their public-surface negative must not control new implementation. See [`rslog-laboratory-index-test-access.md`](rslog-laboratory-index-test-access.md) and [`rslog-read-contract-rsagent-evidence.md`](rslog-read-contract-rsagent-evidence.md).

## Authentication and authorization

The public reference documents this flow. [`RSLog API documentation`](https://www.rslogonline.com/APIDocumentation/index.html)

| Stage                   | Documented request                                                            | Documented result                                                                                                                              |
| ----------------------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Initial authentication  | `POST /api/connect/token`, form-encoded `username`, `password`, and `company` | `200` returns an access token, bearer token type, expiry field, refresh token, and scope; `202` indicates two-factor verification is required. |
| Two-factor verification | `POST /api/connect/verify`, using the same three fields plus `twoFactorCode`  | `200` returns access and refresh tokens.                                                                                                       |
| Authorized reads        | `Authorization: Bearer {access_token}`                                        | The token is attached to each authorized API request.                                                                                          |
| Refresh                 | `POST /api/connect/refresh`, form-encoded `company` and `refreshToken`        | Returns a replacement access token and refresh token; invalid refresh is documented as an authentication failure.                              |

The example token response contains `expires_in: 3600`, but the page does not state that every tenant or deployment has a fixed one-hour lifetime. The adapter should honor the returned value rather than hard-code the example.

Credentials alone may not be sufficient. The reference says API features must be enabled and the user must have the correct permissions. The RSGeo endpoint specifically requires `Projects.Default`; its documented failures distinguish missing/expired bearer token (`401`), missing permission (`403`), and a project absent from the tenant (`404`). RSLog also supports per-project user assignment, so a tenant user may have general access yet not see a particular Source Project. [`RSLog API documentation`](https://www.rslogonline.com/APIDocumentation/index.html), [`Projects`](https://www.rocscience.com/help/rslog/documentation/projects)

## Endpoint discovery and recommended read sequence

The public discovery mechanism is a human-readable static API reference. It publishes relative routes under `/api/connect`, `/api/v1`, and `/api/v3`; as checked on 2026-08-24, it does not publish or link a machine-readable OpenAPI/Swagger document. It also does not state an absolute API base URI separately from the `rslogonline.com` site hosting the reference. A reasonable cloud default is `https://www.rslogonline.com`, because that is both the documented login origin and the host publishing the relative API routes; this is an implementation inference that still needs an authorized tenant test. Self-hosted RSLog deployments need an explicitly configured and allowlisted origin. RSLog's product documentation says both cloud and on-premises deployment exist. [`RSLog API documentation`](https://www.rslogonline.com/APIDocumentation/index.html), [`Logging In`](https://www.rocscience.com/help/rslog/documentation/getting-started/logging-in), [`RSLog product documentation`](https://www.rocscience.com/help/rslog/documentation)

The minimum documented live-read sequence is:

| Step | Route                                                                        | Purpose                                                                                                                                     |
| ---- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | `POST /api/connect/token` and, when required, `POST /api/connect/verify`     | Establish the session.                                                                                                                      |
| 2    | `GET /api/v1/projects`                                                       | List Source Projects visible to the authenticated account.                                                                                  |
| 3    | `GET /api/v1/project/{id}`                                                   | Confirm the exact selected project and its metadata.                                                                                        |
| 4    | `GET /api/v1/project/{id}/boreholes`                                         | Retrieve the Exploration roster for selection and identity validation.                                                                      |
| 5    | `POST /api/v3/export/rsgeo/data`                                             | Retrieve a project-wide or selected-borehole tabular dataset. Omit `datasets` for all documented datasets or provide an explicit allowlist. |
| 6    | Documented `/api/v1` child `GET`s only when the RSGeo result is insufficient | Complete required collections while preserving per-collection success, empty, and failed states.                                            |

The vendor calls RSLog records “boreholes” or “test holes.” In RSrender these are **Explorations**; their provider IDs, not names, must establish Source Entity Identity.

## Data coverage

### Preferred aggregate read

`POST /api/v3/export/rsgeo/data` is the strongest documented aggregate candidate for log construction. It accepts:

- required `projectId`;
- optional `datasets`, with omission or `null` documented to return all datasets; and
- optional `boreholeIds` and `sampleTypeIds` filters, where an empty list means all.

The documented dataset identifiers are `collar`, `samples`, `drillRuns`, `stratigraphy`, `boringDetails`, `piezometers`, `discontinuities`, and `labResults`. Its response example includes an export schema version, generation timestamp, project identity and coordinate/unit metadata, survey context, and column-described tabular datasets. [`RSLog API documentation`](https://www.rslogonline.com/APIDocumentation/index.html)

This is broad enough to justify implementing a live adapter path, but not enough to declare full Boring Log parity without a tenant qualification. The named dataset list does not explicitly include field tests, comments, drilling groundwater, photos, or hatch artwork, and the reference gives a detailed example only for some datasets. It also contains a documentation inconsistency: `piezometers` appears twice in the available-dataset list, while the example contains a `survey` dataset that is not in that list. The adapter must validate actual returned dataset identities and schema version and fail non-silently on drift.

### Documented supplementary reads

The same public reference documents project/borehole and nested reads that can fill gaps or support targeted Refresh:

- borehole-level stratigraphies, comments, drill runs, boring details, piezometers, backfill details, and discontinuities;
- stratigraphy-level interim layers, fracture conditions, and drilling observations;
- piezometer-level pipe segments and groundwater measurements;
- individual/list reads for samples and other record families; and
- data-template-dependent lookup collections such as sample types, moisture descriptors, classifications, drill methods, and symbol-related metadata.

These are official live API surfaces, but the public reference is uneven: some sections emphasize write request bodies and do not provide complete read response schemas. A successful endpoint call is therefore not by itself semantic proof that every field needed by an RSrender binding is populated, correctly typed, or stable. [`RSLog API documentation`](https://www.rslogonline.com/APIDocumentation/index.html)

### File formats remain distinct

RSLog also documents a versioned Project JSON export and a separate DataTemplate JSON format. Those are official file-exchange formats, not proof that the live RSGeo response has the same shape. The Project JSON uses PascalCase and is documented at version 3; the DataTemplate uses camelCase and is documented at version 1.0.0. The live RSGeo example instead returns a column/row tabular envelope with its own `exportSchemaVersion`. The three inputs need separate validators and mapping contracts. [`RSLog JSON Export Format`](https://www.rslogonline.com/DataTemplateDocumentation/JsonExport), [`RSLog Data Documentation`](https://www.rslogonline.com/DataTemplateDocumentation)

## Pagination, rate limits, and freshness

No pagination contract is documented for `GET /api/v1/projects`, `GET /api/v1/project/{id}/boreholes`, the borehole child reads, or `POST /api/v3/export/rsgeo/data`. The RSGeo request offers filters but no cursor, page number, offset, or maximum-result field. A specialized RSSeismic export on the same page shows `SkipCount` and `MaxResultCount`, but that does not establish pagination behavior for RSGeo or the general reads. [`RSLog API documentation`](https://www.rslogonline.com/APIDocumentation/index.html)

No request quota, rate-limit value, `429` behavior, `Retry-After` behavior, or rate-limit response header is documented in the public reference as checked on 2026-08-24. The documented general error table covers `400`, `401`, `403`, `404`, and `500` only.

No `ETag`, `If-Modified-Since`, revision cursor, changed-since query, webhook, or streaming subscription is documented. “Live” therefore means an explicit current API retrieval, not push synchronization. RSrender should preserve its domain rule that Refresh is user-initiated and atomic.

Until the vendor or tenant test establishes limits, implementation should:

- bound response bytes, collection cardinality, duration, and concurrency locally;
- never treat truncation, timeout, throttling, or decode failure as an empty collection;
- retain the prior accepted Source Snapshot when a required collection fails; and
- use conservative transient retry/backoff behavior without claiming a vendor rate-limit contract.

## Credential and storage security implications

The documented flow necessarily handles a password, optional two-factor code, access token, and refresh token. Both tokens authorize tenant data reads; the password and verification endpoint submit the raw password again. They are secrets and must never enter a Log Project, Source Snapshot Candidate, Source Snapshot, Render Dataset, export, log, crash annotation, telemetry record, clipboard payload, recovery package, or test fixture. [`RSLog API documentation`](https://www.rslogonline.com/APIDocumentation/index.html)

The accepted architecture already resolves this correctly: authentication remains session-only; a dedicated short-lived Auth Entry renderer collects password/code once; only the non-renderer credential broker retains post-submission authentication state for the current application process; and application restart requires authentication. [`ADR 0004`](../../adr/0004-session-only-rslog-authentication.md)

Practical consequences for the future Source Adapter are:

- do not ask users to paste credentials into chat, a configuration file, command line, environment variable, issue, or support bundle;
- do not return tokens to document/application renderers;
- redact authorization headers, form bodies, company/account identifiers where sensitive, masked MFA destinations, and raw responses from logs and Diagnostics;
- keep the API origin allowlisted and reject redirects or navigation outside the configured RSLog deployment;
- clear the broker on sign-out, terminal refresh failure, repeated unauthorized response, Auth Entry crash, and application exit; and
- treat project responses as governed client Source Data even though authentication secrets are excluded.

The public reference does not document a server-side token-revocation or logout endpoint. Local sign-out can therefore promise local secret clearing only, not proven server revocation.

## Unknowns requiring tenant access or vendor confirmation

No credentials should be supplied until the application has the approved Auth Entry and credential-broker path. An authorized, non-sensitive tenant qualification still needs to resolve:

1. Whether the tenant has API features enabled and which least-privilege role has `Projects.Default` plus every required read permission.
2. Whether the authentication `company` field expects the UI's Company Code, another tenant name, or deployment-specific value. The API page says “company/tenant name,” while the login guide tells users to select a Company Code.
3. The correct absolute API base URI for the cloud tenant and any supported self-hosted deployment/discovery rules.
4. Actual response schemas, nullability, units, stable IDs, ordering, and cardinality for every RSGeo dataset, especially `labResults`, field-test/SPT columns, groundwater families, survey data, and custom-template fields.
5. Whether the RSGeo result is complete enough for every effective Boring Log binding or must be supplemented by `/api/v1` reads.
6. Pagination/truncation behavior, maximum request/response sizes, timeouts, concurrency allowance, rate limits, `429` handling, and any service-level expectations.
7. Token lifetime, refresh-token rotation/reuse semantics, MFA variants, refresh revocation, account offboarding, and supported logout/revoke behavior.
8. Whether a Viewer or purpose-created read-only role can access all required project data without adjacent mutation permissions.
9. The compatibility/support policy for `/api/v1`, `/api/v3/export/rsgeo/data`, and `exportSchemaVersion`, including deprecation notice and schema-change practice.
10. Contractual permission for RSrender's intended distribution and use. The vendor's API overview promotes connections to “in-house programs,” and its licensing page says account data may be transferred to other applications through an API, but neither statement alone settles support/licensing terms for a distributed commercial integration. [`RSLog product documentation`](https://www.rocscience.com/help/rslog/documentation), [`Rocscience licensing`](https://www.rocscience.com/plans-pricing/licensing)

## Qualification plan without credential custody

An authorized operator should run the next probe through the packaged Auth Entry flow against a synthetic or explicitly approved non-sensitive project. The probe should never commit secrets or raw client responses.

1. Confirm the absolute base URI, API enablement, and a least-privilege test user with project assignment.
2. Authenticate, including a controlled MFA case, and record only status classes and secret-free timing.
3. List projects and confirm that only assigned projects appear.
4. Select one project by exact ID, retrieve its borehole roster, and call RSGeo once with all datasets and once with a strict borehole filter.
5. Capture a sanitized schema ledger: dataset names, column IDs/types, row counts, identity/relationship fields, nullability, unit metadata, schema version, and response byte count—never source values or tokens.
6. Compare a small known fixture across the RSLog UI, API response, and generated RSLog log for samples, strata, SPT/field tests, groundwater, and laboratory values.
7. Exercise empty, forbidden, missing-project, expired-token, refresh, timeout, oversized-response, and cancellation states distinctly.
8. Ask the vendor to confirm rate limits, compatibility/deprecation policy, least-privilege permissions, revocation semantics, and intended integration support.

Only after that evidence is admitted should the live Source Adapter's positive DTOs become implementation authority. Until then, the documented route is a valid architectural target, not proof that the current tenant and every Boring Log field are qualified.
