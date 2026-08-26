# RSLog live API schema ledger

Status: first-party evidence; no credentials, tenant calls, or production-code changes  
Research date: 2026-08-25  
Scope: the public contracts for `GET /api/v1/projects`, `GET /api/v1/project/{id}`, `GET /api/v1/project/{id}/boreholes`, and `POST /api/v3/export/rsgeo/data`.

## Executive finding

The current first-party RSLog API reference documents the three project-discovery GET routes, but it does **not** publish their response bodies, response examples, envelope shapes, field nullability, ordering, or pagination rules. Those details remain unknown and must not be inferred from the adjacent project and borehole write DTOs. The same reference documents the RSGeo export much more completely: a JSON request, filter semantics, an example response envelope, column metadata, rows, schema version, authorization requirement, and error statuses. [RSLog API reference](https://www.rslogonline.com/APIDocumentation/index.html)

The live API must also remain separate from RSLog's two file-exchange contracts. The Project JSON export is PascalCase version 3 with `Properties`, `Project`, and `Boreholes`; the DataTemplate is camelCase version 1.0.0 with `properties`, `data`, and `lists`. Neither file shape establishes the live GET or RSGeo response shape. [RSLog Data Documentation](https://www.rslogonline.com/DataTemplateDocumentation)

## Evidence boundary

Only current first-party pages were used:

- [RSLog API reference](https://www.rslogonline.com/APIDocumentation/index.html), hosted by RSLog and linked as the complete API documentation from Rocscience's product guide;
- [Rocscience API Functions guide](https://www.rocscience.com/help/rslog/documentation/import/api-functions), which says RSLog APIs read and write project and borehole data and links to that reference; and
- [RSLog Data Documentation](https://www.rslogonline.com/DataTemplateDocumentation), used only to distinguish file-exchange schemas from live API schemas.

No tenant endpoint was called. No username, password, company code, access token, refresh token, or source project data was requested or used.

## Contract-confidence matrix

| Operation              | Route and method                     | Request documented | Response documented                     | Safe implementation conclusion                                                                                      |
| ---------------------- | ------------------------------------ | ------------------ | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| List projects          | `GET /api/v1/projects`               | Route only         | No                                      | Treat the positive body as unadmitted until a sanitized tenant shape ledger or vendor schema is available.          |
| Get project            | `GET /api/v1/project/{id}`           | Route only         | No                                      | `{id}` selects a project, but its wire type and the response fields/envelope are not specified in this GET section. |
| List project boreholes | `GET /api/v1/project/{id}/boreholes` | Route only         | No                                      | Treat borehole identity, display fields, collection envelope, completeness, and ordering as unadmitted.             |
| Export RSGeo data      | `POST /api/v3/export/rsgeo/data`     | Yes                | Partial example plus field/error tables | Admit only the explicitly documented envelope and validate all returned dataset and column identifiers at runtime.  |

All four operations require bearer authorization under the reference's general authentication flow. The RSGeo operation additionally states that the bearer must have `Projects.Default`. The reference does not publish endpoint-specific permission names for the three GETs. [RSLog API reference](https://www.rslogonline.com/APIDocumentation/index.html)

## `GET /api/v1/projects`

### Documented facts

- The exact published operation is `GET /api/v1/projects`, described as getting all projects.
- No request body, query parameter, example request, response schema, or example response is published for this operation.
- The Projects section separately documents fields for project create/update DTOs. It lists `Title`, `ContactId`, `ProjectStatusId`, `DataTemplateId`, `UnitSystemId`, `CoordinateSystemId`, `JobNo`, `LeadEngineer`, `SiteLocation`, coordinates/elevation, unit and coordinate-system strings, archive/lock flags, and other optional metadata. That table does not identify the GET-all response type and is not evidence that the GET returns the same fields. [RSLog API reference](https://www.rslogonline.com/APIDocumentation/index.html)

### Unknowns - not implementation authority

- Whether the top-level value is a JSON array or an envelope such as `items`, `result`, or `data`.
- The project identifier's response key, casing, type, and nullability. The broader reference uses GUID project identifiers in relationship fields and the RSGeo request, but the GET-all response itself is undocumented.
- Which human display fields are present. `Title` is the project write DTO's title field; whether the list returns `Title`, `title`, `Name`, or another projection is unknown.
- Whether archived/example/locked projects are included, filtered, or marked.
- Ordering, pagination, truncation, total count, continuation token, and server-side capacity limits.

There are no documented pagination parameters for this route. Absence of documented pagination is not proof that a single response is complete.

## `GET /api/v1/project/{id}`

### Documented facts

- The exact published operation is `GET /api/v1/project/{id}`, described as getting a project.
- The API page does not give a path-parameter table for this GET, a request example, a response schema, or a response example.
- Elsewhere on the same official page, project references such as `projectId` are GUIDs, and the RSGeo operation requires a non-empty GUID `projectId`. Treating this GET's `{id}` as a GUID is a strong consistency inference, not an explicit schema declaration in the GET section. [RSLog API reference](https://www.rslogonline.com/APIDocumentation/index.html)

### Candidate metadata, not a response contract

The adjacent project write table is useful for designing a tolerant discovery display, but it cannot be copied into a strict GET decoder. Relevant candidate fields include project title, job number, lead engineer, site location, unit-system and coordinate-system identifiers/strings, latitude/longitude, easting/northing/elevation, data-template identifier, notes, and archive/lock flags. Exact response casing, inclusion, and nullability remain unknown.

### Unknowns

- Bare object versus envelope.
- Identifier key/casing and whether relationship/display objects are expanded.
- Whether extra tags are a parsed collection or `ExtraTagJsonData` string.
- Error response body shape for missing, forbidden, or inaccessible projects.
- Revision, `ETag`, last-modified field, or other freshness token.

## `GET /api/v1/project/{id}/boreholes`

### Documented facts

- The exact published operation is `GET /api/v1/project/{id}/boreholes`, described as getting all boreholes from a project.
- The API page does not publish a path-parameter table, query parameters, request example, response schema, or response example for this operation.
- The adjacent borehole write DTO documents `Name`, `Depth`, `ProjectId`, `BoreholeStatusId`, optional elevation and coordinates, drilling dates/personnel, contractor, groundwater level, notes, hammer fields, and other metadata. It does not document the borehole GET-list projection or even an `Id` response member. [RSLog API reference](https://www.rslogonline.com/APIDocumentation/index.html)

### Unknowns - not implementation authority

- Array versus collection envelope.
- Borehole identifier key/casing/type and project relationship representation.
- Which roster display fields are present. `Name`, `Depth`, and `Elevation` are sensible candidates from the write DTO, but their presence in this response is unproven.
- Inclusion of archived/inactive or pre-planned boreholes.
- Ordering, duplicate handling, pagination, truncation, total count, and maximum cardinality.
- Whether the result is a roster projection or full borehole records.

The endpoint name says "all," but the reference publishes no completeness mechanism. RSrender should therefore bound the response, reject ambiguous envelopes, and avoid claiming completeness until the tenant qualification reconciles returned IDs with a known project roster.

## `POST /api/v3/export/rsgeo/data`

### Exact documented request

The endpoint requires `Content-Type: application/json` and a bearer token with `Projects.Default`. `projectId` is a required, non-empty GUID. `datasets` is an optional string array; `null` or omission means all datasets. `options` is optional and can contain `boreholeIds` and `sampleTypeIds`, both GUID arrays; an empty list means all boreholes or all sample types, respectively. [RSLog API reference](https://www.rslogonline.com/APIDocumentation/index.html)

The first-party example is structurally:

```json
{
  "projectId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "datasets": ["collar", "stratigraphy", "samples", "drillRuns", "boringDetails"],
  "options": {
    "boreholeIds": ["1a2b3c4d-0000-0000-0000-000000000001", "1a2b3c4d-0000-0000-0000-000000000002"],
    "sampleTypeIds": []
  }
}
```

The published dataset allowlist is `collar`, `samples`, `drillRuns`, `stratigraphy`, `boringDetails`, `piezometers`, `discontinuities`, and `labResults`. The page accidentally lists `piezometers` twice. It does not state whether an unknown dataset name is rejected or ignored.

### Documented response envelope and examples

The example response has these top-level members:

| Member                | Example shape              | Documented/example meaning                                                                           |
| --------------------- | -------------------------- | ---------------------------------------------------------------------------------------------------- |
| `exportSchemaVersion` | number (`1`)               | Version of the live export schema. Only version `1` is shown; compatibility policy is not published. |
| `generatedAt`         | UTC timestamp string       | Generation timestamp.                                                                                |
| `project`             | object                     | Contains `id`, `name`, `coordinateSystem`, `verticalDatum`, and `linearUnit` in the example.         |
| `surveyContext`       | object                     | Contains example `profile: "deviation"`.                                                             |
| `datasets`            | object keyed by dataset ID | Each shown dataset contains `columns` and `rows`.                                                    |

The example `project.coordinateSystem` contains `kind`, `name`, `longitudeColumnHeader`, and `latitudeColumnHeader`. Its example project uses `verticalDatum: "RL"` and `linearUnit: "ft"`; those are example values, not fixed enumerations.

Each shown dataset has:

```text
datasets.<datasetId>.columns[] = { id: string, header: string, dataType: string }
datasets.<datasetId>.rows[]    = object keyed by column id
```

The example's `survey` columns are `holeId` (string), `depth` (number), `trend` (number), and `plunge` (number). Its rows use those exact IDs as keys. The example's `collar` columns are `holeId` (string), `latitude` (number), `longitude` (number), `elevation` (number; header `RL`), and `depth` (number). Its rows again use those IDs as keys. [RSLog API reference](https://www.rslogonline.com/APIDocumentation/index.html)

### Documentation inconsistencies and limits

- The response example contains a `survey` dataset even though `survey` is absent from the published available-dataset list.
- The request asks for `collar`, `stratigraphy`, `samples`, `drillRuns`, and `boringDetails`, but the shown response includes only `survey` and `collar`. The page does not explain whether this is an abbreviated illustrative response.
- The page does not provide column catalogs or example rows for `samples`, `drillRuns`, `stratigraphy`, `boringDetails`, `piezometers`, `discontinuities`, or `labResults`.
- The example rows join data with the human-looking `holeId` value (`AH20-1`, etc.), while request filtering uses borehole GUIDs. The example does not publish a dataset column carrying the source borehole GUID, so GUID-to-row identity/reconciliation is unresolved.
- Column `dataType` examples are `string` and `number`; the complete type vocabulary, nullability, missing-value convention, units per column, stable ordering, and duplicate-column behavior are not documented.
- No pagination, cursor, offset, maximum row count, total count, continuation token, partial-result indicator, or truncation flag appears in the request or example response.

The documented failures are `400` for a missing body or empty `projectId`, `401` for a missing/expired bearer, `403` without `Projects.Default`, and `404` when the project does not exist in the tenant. The general table also names `500`. Response bodies for those failures are not specified.

## Completeness and pagination conclusion

No target route in this ledger publishes pagination or a completeness proof. The RSGeo request provides dataset, borehole, and sample-type filters, but no page controls. A different RSSeismic endpoint on the same page uses `SkipCount` and `MaxResultCount`; those fields cannot be transferred by inference to the four routes here. [RSLog API reference](https://www.rslogonline.com/APIDocumentation/index.html)

Consequently, a production adapter should:

1. decode discovery GET responses through a shape-observation gate until a sanctioned positive schema exists;
2. retain exact provider GUIDs once observed and never use display names as identity;
3. validate `exportSchemaVersion` before accepting RSGeo data;
4. validate dataset IDs, column IDs/types, and row keys instead of assuming a fixed table order;
5. reconcile every selected borehole GUID against exported rows through an admitted identity rule;
6. distinguish absent dataset, empty dataset, rejected schema, truncated/oversized response, and transport failure; and
7. avoid calling an unpaged response "complete" until an authorized synthetic-tenant qualification or vendor statement demonstrates completeness.

## Remaining evidence needed

A credential-safe qualification against a synthetic or explicitly approved tenant should record only a sanitized schema ledger - not source values or secrets - for:

- top-level JSON type and envelope keys for all three GET operations;
- identifier and display-field keys/casing/types;
- list totals, returned counts, ordering, and any hidden pagination headers;
- every RSGeo dataset name, column ID/header/type, row count, identity column, nullability observation, and response byte count;
- behavior for zero, one, and many projects/boreholes; and
- the relationship between borehole GUIDs used in `options.boreholeIds` and `holeId` values used in tabular rows.

Until then, only the route existence and the explicitly documented RSGeo fields above are positive contract authority.
