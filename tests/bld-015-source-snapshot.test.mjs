import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import test from "node:test";
import { promisify } from "node:util";

import {
  createDiagnosticFact,
  createSourceExtensionManifestEntry,
  createSourceExtensionObservation,
  createSourceFieldRecord,
  createSourceFieldTestColumn,
  createSourceLookupReference,
  createSourceRecord,
  createSourceSnapshot,
  decodeSourceExtensionManifestEntry,
  decodeSourceExtensionObservation,
  decodeSourceFieldTestColumn,
  decodeSourceLookupReference,
  decodeSourceRecord,
  decodeSourceSnapshot,
  deriveSourceContextIdentity,
  deriveSourceEntityIdentity,
  deriveSourceFieldTestColumnFieldPath,
  encodeSourceExtensionManifestEntry,
  encodeSourceExtensionObservation,
  encodeSourceFieldTestColumn,
  encodeSourceLookupReference,
  encodeSourceRecord,
  encodeSourceSnapshot,
  SOURCE_EVIDENCE_BLOCKED_CAPABILITY_IDS,
  SOURCE_MAPPED_FIELD_PATHS,
  sourceSnapshotContractRevision,
  sourceSnapshotVersion,
} from "../packages/domain/dist/index.js";
import { sha256Utf8 } from "../packages/contracts/dist/index.js";
import {
  bld015ExplorationNameField,
  bld015FixtureRevision,
  bld015Header,
  bld015IterationsPerSeed,
  bld015PropertySeeds,
  bld015Snapshot,
  bld015SourceContextIdentity,
  clone,
  entityIdentity,
  lengthM,
  makeBld015SnapshotDraft,
  makeSourceField,
  makeSourceRecord,
  numberContent,
} from "./helpers/bld-015-fixtures.mjs";
import { runBld015PropertyModel } from "./helpers/bld-015-property-model.mjs";

const execFileAsync = promisify(execFile);

function assertDeepFrozen(value, seen = new Set()) {
  if (typeof value !== "object" || value === null || seen.has(value)) return;
  seen.add(value);
  assert.equal(Object.isFrozen(value), true);
  for (const item of Object.values(value)) assertDeepFrozen(item, seen);
}

function replaceField(record, replacement) {
  return record.fields.map((field) =>
    field.fieldPath === replacement.fieldPath ? replacement : field,
  );
}

function recreateRecord(record, changes = {}) {
  return makeSourceRecord({
    entityKind: record.entityKind,
    providerNativeIdentity: record.providerNativeIdentity,
    parentEntityIdentity: record.parentEntityIdentity,
    relatedEntityIdentity: record.relatedEntityIdentity,
    sourceOrder: record.sourceOrder,
    fields: record.fields,
    lookupReferences: record.lookupReferences,
    fieldTestColumns: record.fieldTestColumns,
    extensionObservations: record.extensionObservations,
    ...changes,
  });
}

function makeIntervalStratum(nativeIdentity, parentEntityIdentity, start, end, units = {}) {
  return makeSourceRecord({
    entityKind: "stratum",
    providerNativeIdentity: nativeIdentity,
    parentEntityIdentity,
    fields: [
      makeSourceField(
        "stratum",
        nativeIdentity,
        SOURCE_MAPPED_FIELD_PATHS.intervalStartDepth,
        numberContent(start),
        units.start ?? lengthM,
      ),
      makeSourceField(
        "stratum",
        nativeIdentity,
        SOURCE_MAPPED_FIELD_PATHS.intervalEndDepth,
        numberContent(end),
        units.end ?? lengthM,
      ),
      makeSourceField("stratum", nativeIdentity, SOURCE_MAPPED_FIELD_PATHS.stratumDescription, {
        kind: "value",
        value: "synthetic interval",
        originalRepresentation: "synthetic interval",
      }),
    ],
  });
}

test("BLD-015 fixed Snapshot preserves source original, identities, provenance, and blocked inventory", () => {
  assert.equal(sourceSnapshotContractRevision, "bld-015-source-snapshot-v1");
  assert.equal(sourceSnapshotVersion, 1);
  assert.equal(bld015FixtureRevision, "FX-01:bld-015-source-original@r1");
  assert.equal(bld015ExplorationNameField.value.content.value, "SYNTHETIC-EXPLORATION-001");
  assert.equal(bld015ExplorationNameField.value.provenance.provenanceClass, "source");
  assert.equal(
    bld015ExplorationNameField.value.provenance.entityIdentity,
    bld015Snapshot.explorations[0].sourceEntityIdentity,
  );
  assert.equal(
    bld015ExplorationNameField.value.provenance.fieldIdentity,
    bld015ExplorationNameField.sourceFieldIdentity,
  );
  assert.deepEqual(
    bld015Snapshot.blockedCapabilities.map((item) => item.capabilityId),
    SOURCE_EVIDENCE_BLOCKED_CAPABILITY_IDS,
  );
  for (const capability of bld015Snapshot.blockedCapabilities) {
    assert.deepEqual(
      [capability.disposition, capability.positiveRecordCount, capability.authorityIssue],
      ["source-evidence-blocked", 0, "#43"],
    );
  }
  assert.equal(JSON.stringify(bld015Snapshot).includes("WTP-4"), false);
  assert.equal(JSON.stringify(bld015Snapshot).includes("central-engineering"), false);
  assertDeepFrozen(bld015Snapshot);
});

test("every public admitted component and the full Snapshot round-trip canonically", () => {
  const components = [
    [
      bld015Snapshot.extensionManifest[0],
      encodeSourceExtensionManifestEntry,
      decodeSourceExtensionManifestEntry,
    ],
    [
      bld015Snapshot.explorations[0].extensionObservations[0],
      encodeSourceExtensionObservation,
      decodeSourceExtensionObservation,
    ],
    [
      bld015Snapshot.fieldTests[0].fieldTestColumns[0],
      encodeSourceFieldTestColumn,
      decodeSourceFieldTestColumn,
    ],
    [
      bld015Snapshot.strata[0].lookupReferences[0],
      encodeSourceLookupReference,
      decodeSourceLookupReference,
    ],
    [bld015Snapshot.samples[0], encodeSourceRecord, decodeSourceRecord],
    [bld015Snapshot, encodeSourceSnapshot, decodeSourceSnapshot],
  ];
  for (const [value, encode, decode] of components) {
    const encoded = encode(value);
    assert.equal(encoded.accepted, true);
    const decoded = decode(JSON.parse(encoded.canonicalJson));
    assert.equal(decoded.accepted, true);
    assert.deepEqual(decoded.value, value);
    assertDeepFrozen(decoded.value);
  }
});

test("Source Context identity is exact across adapter, organization, account scope, and project", () => {
  const base = deriveSourceContextIdentity({
    adapterId: bld015Header.adapterId,
    providerOrganizationIdentity: bld015Header.providerOrganizationIdentity,
    providerAccountScopeIdentity: bld015Header.providerAccountScopeIdentity,
    sourceProjectIdentity: bld015Header.sourceProjectIdentity,
  });
  const otherAccount = deriveSourceContextIdentity({
    adapterId: bld015Header.adapterId,
    providerOrganizationIdentity: bld015Header.providerOrganizationIdentity,
    providerAccountScopeIdentity: "urn:test:bld-015:provider-account:other-synthetic-account",
    sourceProjectIdentity: bld015Header.sourceProjectIdentity,
  });
  assert.equal(base.accepted, true);
  assert.equal(otherAccount.accepted, true);
  assert.notEqual(base.value, otherAccount.value);
  assert.equal(base.value, bld015SourceContextIdentity);
  assert.deepEqual(
    createSourceSnapshot({
      ...makeBld015SnapshotDraft(),
      providerAccountScopeIdentity: "urn:test:bld-015:provider-account:other-synthetic-account",
    }),
    { accepted: false, code: "SOURCE_SNAPSHOT_IDENTITY_MISMATCH" },
  );
});

test("graph rejects duplicate, wrong-kind, missing-parent, and disallowed mapped-field records", () => {
  const draft = makeBld015SnapshotDraft();
  assert.deepEqual(
    createSourceSnapshot({ ...draft, samples: [draft.samples[0], draft.samples[0]] }),
    {
      accepted: false,
      code: "SOURCE_SNAPSHOT_DUPLICATE_IDENTITY",
    },
  );
  assert.deepEqual(createSourceSnapshot({ ...draft, strata: [draft.samples[0]] }), {
    accepted: false,
    code: "SOURCE_SNAPSHOT_WRONG_KIND",
  });
  const missingParent = recreateRecord(draft.samples[0], {
    parentEntityIdentity: entityIdentity("exploration", "urn:test:bld-015:exploration:missing"),
  });
  assert.deepEqual(createSourceSnapshot({ ...draft, samples: [missingParent] }), {
    accepted: false,
    code: "SOURCE_SNAPSHOT_MISSING_PARENT",
  });
  const extraField = makeSourceField(
    "sample",
    draft.samples[0].providerNativeIdentity,
    "mapped:/inventedField",
    { kind: "value", value: "invented", originalRepresentation: "invented" },
  );
  assert.deepEqual(
    createSourceRecord({
      recordVersion: 1,
      entityKind: "sample",
      sourceContextIdentity: bld015SourceContextIdentity,
      providerNativeIdentity: draft.samples[0].providerNativeIdentity,
      parentEntityIdentity: draft.samples[0].parentEntityIdentity,
      relatedEntityIdentity: null,
      sourceOrder: null,
      fields: [...draft.samples[0].fields, extraField],
      lookupReferences: [],
      fieldTestColumns: [],
      extensionObservations: [],
    }),
    { accepted: false, code: "SOURCE_SNAPSHOT_INVALID_VALUE" },
  );
});

test("opaque provider-native identities preserve exact lexical form without numeric coercion", () => {
  const zeroPrefixed = deriveSourceEntityIdentity({
    sourceContextIdentity: bld015SourceContextIdentity,
    entityKind: "sample",
    providerNativeIdentity: "01",
  });
  const numericLooking = deriveSourceEntityIdentity({
    sourceContextIdentity: bld015SourceContextIdentity,
    entityKind: "sample",
    providerNativeIdentity: "1",
  });
  assert.equal(zeroPrefixed.accepted, true);
  assert.equal(numericLooking.accepted, true);
  assert.notEqual(zeroPrefixed.value, numericLooking.value);
});

test("unresolved lookup retains exact family/native identity and derives a non-silent Diagnostic", () => {
  const draft = makeBld015SnapshotDraft();
  const missingNative = "urn:test:bld-015:lookup:unresolved-01";
  const missingIdentity = entityIdentity("lookup", missingNative);
  const reference = createSourceLookupReference({
    referenceVersion: 1,
    sourceContextIdentity: bld015SourceContextIdentity,
    lookupFamily: "soil-symbol",
    providerNativeLookupIdentity: missingNative,
    lookupEntityIdentity: missingIdentity,
  });
  assert.equal(reference.accepted, true);
  const stratum = recreateRecord(draft.strata[0], {
    lookupReferences: [reference.value],
  });
  const result = createSourceSnapshot({ ...draft, strata: [stratum] });
  assert.equal(result.accepted, true);
  assert.equal(
    result.value.strata[0].lookupReferences[0].providerNativeLookupIdentity,
    missingNative,
  );
  assert.equal(
    result.value.diagnostics.some((item) => item.code === "SOURCE_LOOKUP_UNRESOLVED"),
    true,
  );
});

test("invalid intervals are retained with exact derived Diagnostics and never repaired", () => {
  const draft = makeBld015SnapshotDraft();
  const stratum = draft.strata[0];
  const native = stratum.providerNativeIdentity;
  const reversed = recreateRecord(stratum, {
    fields: replaceField(
      stratum,
      makeSourceField(
        "stratum",
        native,
        SOURCE_MAPPED_FIELD_PATHS.intervalStartDepth,
        numberContent(21),
        lengthM,
      ),
    ),
  });
  const result = createSourceSnapshot({ ...draft, strata: [reversed] });
  assert.equal(result.accepted, true);
  assert.equal(
    result.value.strata[0].fields.find(
      (field) => field.fieldPath === SOURCE_MAPPED_FIELD_PATHS.intervalStartDepth,
    ).value.content.value,
    21,
  );
  assert.deepEqual(result.value.diagnostics.map((diagnostic) => diagnostic.code).sort(), [
    "SOURCE_INTERVAL_OUT_OF_EXPLORATION",
    "SOURCE_INTERVAL_REVERSED",
  ]);

  const secondNative = "urn:test:bld-015:stratum:overlap";
  const overlap = makeSourceRecord({
    entityKind: "stratum",
    providerNativeIdentity: secondNative,
    parentEntityIdentity: stratum.parentEntityIdentity,
    fields: [
      makeSourceField(
        "stratum",
        secondNative,
        SOURCE_MAPPED_FIELD_PATHS.intervalStartDepth,
        numberContent(5),
        lengthM,
      ),
      makeSourceField(
        "stratum",
        secondNative,
        SOURCE_MAPPED_FIELD_PATHS.intervalEndDepth,
        numberContent(15),
        lengthM,
      ),
      makeSourceField("stratum", secondNative, SOURCE_MAPPED_FIELD_PATHS.stratumDescription, {
        kind: "value",
        value: "overlap",
        originalRepresentation: "overlap",
      }),
    ],
  });
  const overlapResult = createSourceSnapshot({ ...draft, strata: [overlap, stratum] });
  assert.equal(overlapResult.accepted, true);
  assert.equal(
    overlapResult.value.diagnostics.some((item) => item.code === "SOURCE_STRATA_OVERLAP"),
    true,
  );
});

test("negative, gap, zero-length, unit mismatch, null/absent end, and bounds vectors stay exact", () => {
  const draft = makeBld015SnapshotDraft();
  const parent = draft.explorations[0].sourceEntityIdentity;
  const cases = [
    {
      records: [makeIntervalStratum("urn:test:bld-015:stratum:negative", parent, -1, 5)],
      required: ["SOURCE_INTERVAL_NEGATIVE"],
      forbidden: [],
    },
    {
      records: [makeIntervalStratum("urn:test:bld-015:stratum:zero", parent, 5, 5)],
      required: ["SOURCE_INTERVAL_ZERO_LENGTH"],
      forbidden: [],
    },
    {
      records: [makeIntervalStratum("urn:test:bld-015:stratum:outside", parent, 19, 21)],
      required: ["SOURCE_INTERVAL_OUT_OF_EXPLORATION"],
      forbidden: [],
    },
    {
      records: [
        makeIntervalStratum("urn:test:bld-015:stratum:gap-a", parent, 0, 5),
        makeIntervalStratum("urn:test:bld-015:stratum:gap-b", parent, 10, 20),
      ],
      required: ["SOURCE_STRATA_GAP"],
      forbidden: [],
    },
    {
      records: [
        makeIntervalStratum("urn:test:bld-015:stratum:m-gap-a", parent, 0, 5),
        makeIntervalStratum("urn:test:bld-015:stratum:cm-interleaved", parent, 0, 20, {
          start: { state: "specified", quantity: "length", symbol: "cm" },
          end: { state: "specified", quantity: "length", symbol: "cm" },
        }),
        makeIntervalStratum("urn:test:bld-015:stratum:m-overlap-and-gap", parent, 7, 12),
        makeIntervalStratum("urn:test:bld-015:stratum:m-overlap", parent, 10, 20),
      ],
      required: ["SOURCE_STRATA_GAP", "SOURCE_STRATA_OVERLAP"],
      forbidden: [],
    },
    {
      records: [
        makeIntervalStratum("urn:test:bld-015:stratum:unit-mismatch", parent, 10, 5, {
          end: { state: "specified", quantity: "length", symbol: "cm" },
        }),
      ],
      required: ["SOURCE_INTERVAL_UNIT_INVALID"],
      forbidden: ["SOURCE_INTERVAL_REVERSED"],
    },
  ];
  for (const [vectorIndex, vector] of cases.entries()) {
    const result = createSourceSnapshot({ ...draft, strata: vector.records, comments: [] });
    assert.equal(result.accepted, true, JSON.stringify({ vectorIndex, result }));
    const codes = result.value.diagnostics.map((item) => item.code);
    for (const code of vector.required) assert.equal(codes.includes(code), true, code);
    for (const code of vector.forbidden) assert.equal(codes.includes(code), false, code);
  }

  const sample = draft.samples[0];
  const endPath = SOURCE_MAPPED_FIELD_PATHS.intervalEndDepth;
  const absentEnd = makeSourceField(
    "sample",
    sample.providerNativeIdentity,
    endPath,
    { kind: "absent" },
    lengthM,
    { eligibility: { state: "blocked", reasonCodes: ["content"] } },
  );
  for (const sampleRecord of [
    sample,
    recreateRecord(sample, { fields: replaceField(sample, absentEnd) }),
  ]) {
    const result = createSourceSnapshot({ ...draft, samples: [sampleRecord] });
    assert.equal(result.accepted, true);
    assert.equal(
      result.value.diagnostics.some((item) => item.code === "SOURCE_INTERVAL_END_INVALID"),
      false,
    );
  }
});

test("groundwater status semantics and Field Test raw digest fail closed", () => {
  const draft = makeBld015SnapshotDraft();
  const groundwater = draft.openHoleGroundwaterObservations[0];
  const status = makeSourceField(
    groundwater.entityKind,
    groundwater.providerNativeIdentity,
    SOURCE_MAPPED_FIELD_PATHS.groundwaterObservationStatus,
    { kind: "value", value: "dry", originalRepresentation: "dry" },
  );
  assert.deepEqual(
    createSourceRecord({
      recordVersion: 1,
      entityKind: groundwater.entityKind,
      sourceContextIdentity: groundwater.sourceContextIdentity,
      providerNativeIdentity: groundwater.providerNativeIdentity,
      parentEntityIdentity: groundwater.parentEntityIdentity,
      relatedEntityIdentity: null,
      sourceOrder: null,
      fields: replaceField(groundwater, status),
      lookupReferences: [],
      fieldTestColumns: [],
      extensionObservations: [],
    }),
    { accepted: false, code: "SOURCE_SNAPSHOT_INVALID_VALUE" },
  );
  const column = clone(draft.fieldTests[0].fieldTestColumns[0]);
  column.rawDigest = `sha256:${"0".repeat(64)}`;
  assert.deepEqual(decodeSourceFieldTestColumn(column), {
    accepted: false,
    code: "SOURCE_SNAPSHOT_DIGEST_MISMATCH",
  });
});

test("Field Test columns are plural, identity-ordered, source-supplied, and contain no fallback formula", () => {
  const draft = makeBld015SnapshotDraft();
  const fieldTest = draft.fieldTests[0];
  const secondIdentity = "urn:test:bld-015:field-test-column:raw-second-column";
  const secondPath = deriveSourceFieldTestColumnFieldPath({ columnIdentity: secondIdentity });
  assert.equal(secondPath.accepted, true);
  const secondValue = makeSourceField(
    "field-test",
    fieldTest.providerNativeIdentity,
    secondPath.value,
    numberContent(4),
    { state: "specified", quantity: "count", symbol: "blows" },
  );
  const secondColumn = createSourceFieldTestColumn({
    columnVersion: 1,
    sourceContextIdentity: bld015SourceContextIdentity,
    fieldTestEntityIdentity: fieldTest.sourceEntityIdentity,
    columnIdentity: secondIdentity,
    columnName: "Source raw second column",
    unitSymbol: "blows",
    sourceOrder: 1,
    rawStructuredRepresentation: '{"value":4}',
    rawDigest: sha256Utf8('{"value":4}'),
    parserState: "parsed",
    value: secondValue,
  });
  assert.equal(secondColumn.accepted, true);
  const plural = recreateRecord(fieldTest, {
    fieldTestColumns: [secondColumn.value, fieldTest.fieldTestColumns[0]],
  });
  assert.deepEqual(
    plural.fieldTestColumns.map((column) => column.sourceOrder),
    [0, 1],
  );
  assert.equal(new Set(plural.fieldTestColumns.map((column) => column.columnIdentity)).size, 2);
  const encoded = encodeSourceRecord(plural);
  assert.equal(encoded.accepted, true);
  assert.equal(encoded.canonicalJson.includes("N60"), false);
  assert.equal(encoded.canonicalJson.includes("blowCounts"), false);
  assert.equal(encoded.canonicalJson.includes("formula"), false);
  assert.equal(encoded.canonicalJson.includes("fallback"), false);
});

test("evidence-blocked positive families remain structurally absent with exact zero counts", () => {
  for (const field of [
    "piezometerWellSeries",
    "drillingDetails",
    "drillRuns",
    "interimVariations",
    "laboratoryFacts",
    "vendorHatchBinaries",
    "sampleBlowCountsMapping",
  ]) {
    assert.equal(Object.hasOwn(bld015Snapshot, field), false);
  }
  assert.equal(bld015Snapshot.blockedCapabilities.length, 6);
  assert.equal(
    bld015Snapshot.blockedCapabilities.every((item) => item.positiveRecordCount === 0),
    true,
  );
});

test("extensions distinguish nullable actual kind and reject runtime-absent or over-depth values", () => {
  const draft = makeBld015SnapshotDraft();
  const exploration = draft.explorations[0];
  const observation = exploration.extensionObservations[0];
  const absent = createSourceExtensionObservation({
    observationVersion: 1,
    sourceContextIdentity: observation.sourceContextIdentity,
    sourceEntityIdentity: observation.sourceEntityIdentity,
    manifestEntryIdentity: observation.manifestEntryIdentity,
    fieldPath: observation.fieldPath,
    jsonKind: "string",
    content: { kind: "absent" },
    value: {
      ...observation.value,
      content: { kind: "absent" },
      eligibility: { state: "blocked", reasonCodes: ["content"] },
    },
  });
  assert.equal(absent.accepted, true);
  const runtimeManifest = createSourceExtensionManifestEntry({
    manifestVersion: 1,
    entityKind: "exploration",
    fieldPath: observation.fieldPath,
    expectedJsonKind: "string",
    declaration: "runtime-present",
  });
  assert.equal(runtimeManifest.accepted, true);
  const runtimeAbsent = createSourceExtensionObservation({
    observationVersion: 1,
    sourceContextIdentity: observation.sourceContextIdentity,
    sourceEntityIdentity: observation.sourceEntityIdentity,
    manifestEntryIdentity: runtimeManifest.value.manifestEntryIdentity,
    fieldPath: observation.fieldPath,
    jsonKind: "string",
    content: { kind: "absent" },
    value: absent.value.value,
  });
  assert.equal(runtimeAbsent.accepted, true);
  const runtimeExploration = recreateRecord(exploration, {
    extensionObservations: [runtimeAbsent.value],
  });
  assert.deepEqual(
    createSourceSnapshot({
      ...draft,
      explorations: [runtimeExploration],
      extensionManifest: [runtimeManifest.value],
    }),
    { accepted: false, code: "SOURCE_SNAPSHOT_INVALID_VALUE" },
  );

  const presentNull = createSourceExtensionObservation({
    observationVersion: 1,
    sourceContextIdentity: observation.sourceContextIdentity,
    sourceEntityIdentity: observation.sourceEntityIdentity,
    manifestEntryIdentity: observation.manifestEntryIdentity,
    fieldPath: observation.fieldPath,
    jsonKind: "null",
    content: { kind: "present-null" },
    value: {
      ...observation.value,
      content: { kind: "null" },
      eligibility: { state: "blocked", reasonCodes: ["content"] },
    },
  });
  assert.equal(presentNull.accepted, true);
  assert.equal(
    createSourceSnapshot({
      ...draft,
      explorations: [recreateRecord(exploration, { extensionObservations: [presentNull.value] })],
    }).accepted,
    true,
  );

  let nested = "leaf";
  for (let index = 0; index < 10; index += 1) nested = { nested };
  const hostileDepth = createSourceExtensionObservation({
    observationVersion: 1,
    sourceContextIdentity: observation.sourceContextIdentity,
    sourceEntityIdentity: observation.sourceEntityIdentity,
    manifestEntryIdentity: observation.manifestEntryIdentity,
    fieldPath: observation.fieldPath,
    jsonKind: "object",
    content: { kind: "present-value", value: nested },
    value: observation.value,
  });
  assert.deepEqual(hostileDepth, {
    accepted: false,
    code: "SOURCE_SNAPSHOT_EXTENSION_LIMIT",
  });
});

test("acceptance timestamp changes custody metadata without changing logical digest or identity", () => {
  const first = createSourceSnapshot(makeBld015SnapshotDraft());
  const later = createSourceSnapshot(
    makeBld015SnapshotDraft({ acceptedAtUtc: "2026-08-19T21:00:00.000Z" }),
  );
  assert.equal(first.accepted, true);
  assert.equal(later.accepted, true);
  assert.notEqual(first.value.acceptedAtUtc, later.value.acceptedAtUtc);
  assert.equal(first.value.logicalDigest, later.value.logicalDigest);
  assert.equal(first.value.snapshotIdentity, later.value.snapshotIdentity);
  assert.notEqual(
    encodeSourceSnapshot(first.value).digest,
    encodeSourceSnapshot(later.value).digest,
  );
});

test("hostile prototypes, accessors, symbols, sparse arrays, and caller-derived fields reject without getters", () => {
  const draft = makeBld015SnapshotDraft();
  let getterRuns = 0;
  const accessor = { ...draft };
  Object.defineProperty(accessor, "sourceProject", {
    enumerable: true,
    get() {
      getterRuns += 1;
      throw new Error("private");
    },
  });
  assert.deepEqual(createSourceSnapshot(accessor), {
    accepted: false,
    code: "SOURCE_SNAPSHOT_MALFORMED",
  });
  const symbol = { ...draft, [Symbol("private")]: "private" };
  assert.equal(createSourceSnapshot(symbol).code, "SOURCE_SNAPSHOT_EXTRA_FIELD");
  const inherited = Object.assign(Object.create({ private: true }), draft);
  assert.equal(createSourceSnapshot(inherited).code, "SOURCE_SNAPSHOT_MALFORMED");
  const sparse = { ...draft, comments: [] };
  sparse.comments.length = 1;
  assert.equal(createSourceSnapshot(sparse).code, "SOURCE_SNAPSHOT_MALFORMED");
  const field = draft.sourceProject.fields[0];
  assert.deepEqual(
    createSourceFieldRecord({
      fieldVersion: field.fieldVersion,
      sourceContextIdentity: field.sourceContextIdentity,
      sourceEntityIdentity: field.sourceEntityIdentity,
      fieldPath: field.fieldPath,
      value: field.value,
      sourceFieldIdentity: field.sourceFieldIdentity,
    }),
    { accepted: false, code: "SOURCE_SNAPSHOT_EXTRA_FIELD" },
  );
  assert.equal(getterRuns, 0);
});

test("source Diagnostic scope and duplicate identities reject without silent deduplication", () => {
  const draft = makeBld015SnapshotDraft();
  const diagnostic = createDiagnosticFact({
    factVersion: 1,
    code: "SOURCE_SYNTHETIC_NOTICE",
    category: "source",
    affected: {
      identityKind: "source.entity",
      identity: draft.explorations[0].sourceEntityIdentity,
    },
    cause: { causeKey: "source.synthetic.notice", evidenceClass: "synthetic.source" },
    consequence: "ignored",
    input: { revision: draft.candidateIdentity, digest: draft.explorations[0].logicalDigest },
    remediationActionIds: ["inspect.source"],
  });
  assert.equal(diagnostic.accepted, true);
  assert.deepEqual(
    createSourceSnapshot({ ...draft, sourceDiagnostics: [diagnostic.value, diagnostic.value] }),
    { accepted: false, code: "SOURCE_SNAPSHOT_DIAGNOSTIC_MISMATCH" },
  );
  const outOfScope = clone(diagnostic.value);
  outOfScope.affected.identity = "urn:test:bld-015:unrelated-private-identity";
  assert.equal(
    createSourceSnapshot({ ...draft, sourceDiagnostics: [outOfScope] }).code,
    "SOURCE_SNAPSHOT_DIAGNOSTIC_MISMATCH",
  );
});

test("three recorded seeds execute 1,000 cases for every required invariant", () => {
  for (const seed of bld015PropertySeeds) {
    const run = runBld015PropertyModel(seed, bld015IterationsPerSeed);
    assert.deepEqual(run.failures, []);
    assert.equal(run.identityCases, 1_000);
    assert.equal(run.parentCardinalityCases, 1_000);
    assert.equal(run.immutabilityCases, 1_000);
    assert.equal(run.orderingCases, 1_000);
    assert.equal(run.canonicalDigestCases, 1_000);
  }
});

test("three fresh pinned processes each repeat the full property model twice exactly", async () => {
  const outputs = [];
  const runs = await Promise.all(
    Array.from({ length: 3 }, () =>
      execFileAsync(process.execPath, ["tests/helpers/run-bld-015-vectors.mjs"], {
        cwd: process.cwd(),
        encoding: "utf8",
        env: { ...process.env, LANG: "en-US", LC_ALL: "en-US", TZ: "UTC" },
        maxBuffer: 8 * 1024 * 1024,
        timeout: 240_000,
      }),
    ),
  );
  for (const run of runs) {
    assert.equal(run.stderr, "");
    const output = JSON.parse(run.stdout);
    assert.equal(output.result, "PASS");
    assert.equal(output.nodeExecutableIdentity, "node@24.18.1");
    assert.equal(
      output.nodeExecutableDigest,
      "sha256:ac51903c4c111815d52280b1fdcc8da067cbb37e2fe1a765097b85c3292c8582",
    );
    assert.equal(output.locale, "en-US");
    assert.equal(output.timeZone, "UTC");
    assert.equal(output.repetitions.length, 2);
    assert.equal(output.identicalRepetitions, true);
    outputs.push(output.processTranscriptDigest);
  }
  assert.equal(new Set(outputs).size, 1);
});
