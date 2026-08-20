import {
  createSourceExtensionManifestEntry,
  createSourceExtensionObservation,
  createSourceFieldRecord,
  createSourceFieldTestColumn,
  createSourceRecord,
  createSourceSnapshot,
  deriveSourceContextIdentity,
  deriveSourceEntityIdentity,
  deriveSourceExtensionManifestEntryIdentity,
  deriveSourceFieldIdentity,
  deriveSourceFieldTestColumnFieldPath,
  SOURCE_MAPPED_FIELD_PATHS,
} from "../../packages/domain/dist/index.js";
import { sha256Utf8 } from "../../packages/contracts/dist/index.js";

export const bld015FixtureId = "FX-01";
export const bld015FixtureRevision = "FX-01:bld-015-source-original@r1";
export const bld015OracleRevision = "bld-015-source-snapshot-oracle-v1";
export const bld015GeneratorRevision = "bld-015-source-snapshot-generator-v1";
export const bld015PropertySeeds = Object.freeze([0x1500_0001, 0x1500_0002, 0x1500_0003]);
export const bld015IterationsPerSeed = 1_000;

export const bld015Header = Object.freeze({
  sourceProjectIdentity: "urn:test:bld-015:source-project:project-1",
  candidateIdentity: "urn:test:bld-015:candidate:accepted-r1",
  acceptedAtUtc: "2026-08-19T20:00:00.000Z",
  adapterId: "synthetic.read-only-adapter",
  adapterContractVersion: 1,
  providerOrganizationIdentity: "urn:test:bld-015:provider-organization:synthetic-org",
  providerAccountScopeIdentity: "urn:test:bld-015:provider-account:synthetic-account",
  mappingContractId: "synthetic.bld-015.mapping",
  mappingContractVersion: 1,
});

function accepted(result) {
  if (!result.accepted) throw new Error(result.code);
  return result.value;
}

export function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export const bld015SourceContextIdentity = accepted(
  deriveSourceContextIdentity({
    adapterId: bld015Header.adapterId,
    providerOrganizationIdentity: bld015Header.providerOrganizationIdentity,
    providerAccountScopeIdentity: bld015Header.providerAccountScopeIdentity,
    sourceProjectIdentity: bld015Header.sourceProjectIdentity,
  }),
);

export function entityIdentity(entityKind, providerNativeIdentity) {
  return accepted(
    deriveSourceEntityIdentity({
      sourceContextIdentity: bld015SourceContextIdentity,
      entityKind,
      providerNativeIdentity,
    }),
  );
}

function defaultUnit() {
  return { state: "not-applicable" };
}

function sourceValue(entityIdentityValue, fieldPath, content, unit = defaultUnit(), options = {}) {
  const sourceFieldIdentity = accepted(
    deriveSourceFieldIdentity({
      sourceEntityIdentity: entityIdentityValue,
      fieldPath,
    }),
  );
  return {
    recordVersion: 1,
    content,
    association: options.association ?? { state: "not-applicable" },
    finality: options.finality ?? { state: "not-applicable" },
    eligibility: options.eligibility ?? { state: "eligible", reasonCodes: [] },
    unit,
    provenance: {
      provenanceClass: "source",
      sourceContextIdentity: bld015SourceContextIdentity,
      entityIdentity: entityIdentityValue,
      fieldIdentity: sourceFieldIdentity,
      adapterId: bld015Header.adapterId,
      adapterContractVersion: bld015Header.adapterContractVersion,
      retrievedAtUtc: "2026-08-19T19:59:00.000Z",
      mappingRuleId: options.mappingRuleId ?? `synthetic.${fieldPath}`,
      mappingRuleVersion: 1,
      basisCodes: [],
      transformations: [],
    },
  };
}

export function makeSourceField(
  entityKind,
  providerNativeIdentity,
  fieldPath,
  content,
  unit,
  options,
) {
  const sourceEntityIdentity = entityIdentity(entityKind, providerNativeIdentity);
  return accepted(
    createSourceFieldRecord({
      fieldVersion: 1,
      sourceContextIdentity: bld015SourceContextIdentity,
      sourceEntityIdentity,
      fieldPath,
      value: sourceValue(sourceEntityIdentity, fieldPath, content, unit, options),
    }),
  );
}

export function stringContent(value) {
  return value.length === 0
    ? { kind: "empty-string" }
    : { kind: "value", value, originalRepresentation: value };
}

export function numberContent(value) {
  return value === 0
    ? { kind: "zero", value: 0, originalRepresentation: "0" }
    : { kind: "value", value, originalRepresentation: String(value) };
}

export const lengthM = Object.freeze({ state: "specified", quantity: "length", symbol: "m" });

export function makeSourceRecord({
  entityKind,
  providerNativeIdentity,
  parentEntityIdentity = null,
  relatedEntityIdentity = null,
  sourceOrder = null,
  fields,
  lookupReferences = [],
  fieldTestColumns = [],
  extensionObservations = [],
}) {
  return accepted(
    createSourceRecord({
      recordVersion: 1,
      entityKind,
      sourceContextIdentity: bld015SourceContextIdentity,
      providerNativeIdentity,
      parentEntityIdentity,
      relatedEntityIdentity,
      sourceOrder,
      fields,
      lookupReferences,
      fieldTestColumns,
      extensionObservations,
    }),
  );
}

export function makeBld015SnapshotDraft(overrides = {}) {
  const projectNative = bld015Header.sourceProjectIdentity;
  const explorationNative = "urn:test:bld-015:exploration:synthetic-001";
  const stratumNative = "urn:test:bld-015:stratum:1";
  const sampleNative = "urn:test:bld-015:sample:1";
  const fieldTestNative = "urn:test:bld-015:field-test:1";
  const commentNative = "urn:test:bld-015:comment:1";
  const groundwaterNative = "urn:test:bld-015:groundwater:1";
  const lookupNative = "urn:test:bld-015:lookup:uscs-sm";

  const projectEntity = entityIdentity("source-project", projectNative);
  const explorationEntity = entityIdentity("exploration", explorationNative);
  const stratumEntity = entityIdentity("stratum", stratumNative);
  const sampleEntity = entityIdentity("sample", sampleNative);
  const fieldTestEntity = entityIdentity("field-test", fieldTestNative);
  const lookupEntity = entityIdentity("lookup", lookupNative);

  const extensionEntry = accepted(
    createSourceExtensionManifestEntry({
      manifestVersion: 1,
      entityKind: "exploration",
      fieldPath: "extension:/authorized/customLabel",
      expectedJsonKind: "string",
      declaration: "contract",
    }),
  );
  const extensionFieldPath = extensionEntry.fieldPath;
  const extensionObservation = accepted(
    createSourceExtensionObservation({
      observationVersion: 1,
      sourceContextIdentity: bld015SourceContextIdentity,
      sourceEntityIdentity: explorationEntity,
      manifestEntryIdentity: accepted(
        deriveSourceExtensionManifestEntryIdentity({
          entityKind: "exploration",
          fieldPath: extensionFieldPath,
        }),
      ),
      fieldPath: extensionFieldPath,
      jsonKind: "string",
      content: { kind: "present-value", value: "inert authorized content" },
      value: sourceValue(
        explorationEntity,
        extensionFieldPath,
        stringContent("inert authorized content"),
      ),
    }),
  );

  const project = makeSourceRecord({
    entityKind: "source-project",
    providerNativeIdentity: projectNative,
    fields: [
      makeSourceField(
        "source-project",
        projectNative,
        SOURCE_MAPPED_FIELD_PATHS.projectName,
        stringContent("SYNTHETIC SOURCE PROJECT 001"),
      ),
    ],
  });
  const exploration = makeSourceRecord({
    entityKind: "exploration",
    providerNativeIdentity: explorationNative,
    parentEntityIdentity: projectEntity,
    sourceOrder: 0,
    fields: [
      makeSourceField(
        "exploration",
        explorationNative,
        SOURCE_MAPPED_FIELD_PATHS.explorationName,
        stringContent("SYNTHETIC-EXPLORATION-001"),
      ),
      makeSourceField(
        "exploration",
        explorationNative,
        SOURCE_MAPPED_FIELD_PATHS.explorationTotalDepth,
        numberContent(20),
        lengthM,
      ),
    ],
    extensionObservations: [extensionObservation],
  });
  const lookup = makeSourceRecord({
    entityKind: "lookup",
    providerNativeIdentity: lookupNative,
    parentEntityIdentity: projectEntity,
    fields: [
      makeSourceField(
        "lookup",
        lookupNative,
        SOURCE_MAPPED_FIELD_PATHS.lookupFamily,
        stringContent("soil-symbol"),
      ),
      makeSourceField(
        "lookup",
        lookupNative,
        SOURCE_MAPPED_FIELD_PATHS.lookupName,
        stringContent("Silty sand"),
      ),
    ],
  });
  const lookupReference = {
    referenceVersion: 1,
    sourceContextIdentity: bld015SourceContextIdentity,
    lookupFamily: "soil-symbol",
    providerNativeLookupIdentity: lookupNative,
    lookupEntityIdentity: lookupEntity,
  };
  const stratum = makeSourceRecord({
    entityKind: "stratum",
    providerNativeIdentity: stratumNative,
    parentEntityIdentity: explorationEntity,
    sourceOrder: null,
    fields: [
      makeSourceField(
        "stratum",
        stratumNative,
        SOURCE_MAPPED_FIELD_PATHS.intervalStartDepth,
        numberContent(0),
        lengthM,
      ),
      makeSourceField(
        "stratum",
        stratumNative,
        SOURCE_MAPPED_FIELD_PATHS.intervalEndDepth,
        numberContent(20),
        lengthM,
      ),
      makeSourceField(
        "stratum",
        stratumNative,
        SOURCE_MAPPED_FIELD_PATHS.stratumDescription,
        stringContent("Synthetic silty sand"),
      ),
      makeSourceField(
        "stratum",
        stratumNative,
        SOURCE_MAPPED_FIELD_PATHS.stratumSymbolLookup,
        stringContent(lookupNative),
        undefined,
        { association: { state: "resolved", targetIdentity: lookupEntity } },
      ),
    ],
    lookupReferences: [lookupReference],
  });
  const sample = makeSourceRecord({
    entityKind: "sample",
    providerNativeIdentity: sampleNative,
    parentEntityIdentity: explorationEntity,
    sourceOrder: 1,
    fields: [
      makeSourceField(
        "sample",
        sampleNative,
        SOURCE_MAPPED_FIELD_PATHS.intervalStartDepth,
        numberContent(5),
        lengthM,
      ),
      makeSourceField(
        "sample",
        sampleNative,
        SOURCE_MAPPED_FIELD_PATHS.intervalEndDepth,
        { kind: "null" },
        lengthM,
        { eligibility: { state: "blocked", reasonCodes: ["content"] } },
      ),
      makeSourceField(
        "sample",
        sampleNative,
        SOURCE_MAPPED_FIELD_PATHS.sampleNumber,
        stringContent("S-1"),
      ),
    ],
  });
  const columnIdentity = "urn:test:bld-015:field-test-column:n-value";
  const columnPath = accepted(deriveSourceFieldTestColumnFieldPath({ columnIdentity }));
  const columnValue = makeSourceField(
    "field-test",
    fieldTestNative,
    columnPath,
    numberContent(12),
    { state: "specified", quantity: "count", symbol: "blows" },
  );
  const fieldTestColumn = accepted(
    createSourceFieldTestColumn({
      columnVersion: 1,
      sourceContextIdentity: bld015SourceContextIdentity,
      fieldTestEntityIdentity: fieldTestEntity,
      columnIdentity,
      columnName: "Source-supplied N",
      unitSymbol: "blows",
      sourceOrder: 0,
      rawStructuredRepresentation: '{"value":12}',
      rawDigest: sha256Utf8('{"value":12}'),
      parserState: "parsed",
      value: columnValue,
    }),
  );
  const fieldTest = makeSourceRecord({
    entityKind: "field-test",
    providerNativeIdentity: fieldTestNative,
    parentEntityIdentity: explorationEntity,
    relatedEntityIdentity: sampleEntity,
    fields: [
      makeSourceField(
        "field-test",
        fieldTestNative,
        SOURCE_MAPPED_FIELD_PATHS.fieldTestType,
        stringContent("SPT"),
      ),
    ],
    fieldTestColumns: [fieldTestColumn],
  });
  const comment = makeSourceRecord({
    entityKind: "comment",
    providerNativeIdentity: commentNative,
    parentEntityIdentity: explorationEntity,
    relatedEntityIdentity: stratumEntity,
    fields: [
      makeSourceField(
        "comment",
        commentNative,
        SOURCE_MAPPED_FIELD_PATHS.commentText,
        stringContent("Synthetic source comment"),
      ),
    ],
  });
  const groundwater = makeSourceRecord({
    entityKind: "open-hole-groundwater-observation",
    providerNativeIdentity: groundwaterNative,
    parentEntityIdentity: explorationEntity,
    fields: [
      makeSourceField(
        "open-hole-groundwater-observation",
        groundwaterNative,
        SOURCE_MAPPED_FIELD_PATHS.groundwaterObservationKind,
        stringContent("during-drilling"),
      ),
      makeSourceField(
        "open-hole-groundwater-observation",
        groundwaterNative,
        SOURCE_MAPPED_FIELD_PATHS.groundwaterObservationStatus,
        stringContent("measured"),
      ),
      makeSourceField(
        "open-hole-groundwater-observation",
        groundwaterNative,
        SOURCE_MAPPED_FIELD_PATHS.groundwaterDepth,
        numberContent(3.5),
        lengthM,
      ),
      makeSourceField(
        "open-hole-groundwater-observation",
        groundwaterNative,
        SOURCE_MAPPED_FIELD_PATHS.groundwaterElevation,
        { kind: "not-available", statusCode: "not-derived" },
        lengthM,
        { eligibility: { state: "blocked", reasonCodes: ["content"] } },
      ),
    ],
  });

  return {
    snapshotVersion: 1,
    sourceContextIdentity: bld015SourceContextIdentity,
    ...bld015Header,
    sourceProject: project,
    explorations: [exploration],
    strata: [stratum],
    samples: [sample],
    fieldTests: [fieldTest],
    comments: [comment],
    openHoleGroundwaterObservations: [groundwater],
    lookups: [lookup],
    extensionManifest: [extensionEntry],
    sourceDiagnostics: [],
    ...overrides,
  };
}

export function makeBld015Snapshot(overrides = {}) {
  return accepted(createSourceSnapshot(makeBld015SnapshotDraft(overrides)));
}

export const bld015Snapshot = makeBld015Snapshot();
export const bld015ExplorationNameField = bld015Snapshot.explorations[0].fields.find(
  (field) => field.fieldPath === SOURCE_MAPPED_FIELD_PATHS.explorationName,
);
