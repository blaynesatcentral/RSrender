import assert from "node:assert/strict";
import test from "node:test";

import {
  evaluateFontPublicationEligibility,
  fontCatalogSchemaVersion,
  resolveExactFontFace,
  validateFontCatalog,
} from "../packages/contracts/dist/index.js";

const digest = (character) => `sha256:${character.repeat(64)}`;

function clone(value) {
  return globalThis.structuredClone(value);
}

function rights(overrides = {}) {
  return {
    commercialUse: "permitted",
    embedding: "permitted",
    subsetting: "permitted",
    redistribution: "permitted",
    buyerTransfer: "permitted",
    ...overrides,
  };
}

function availableFace(overrides = {}) {
  return {
    faceId: "font.face.rsrender-sans.regular",
    familyId: "font.family.rsrender-sans",
    style: "normal",
    weight: 400,
    sourceClass: "application-shipped",
    byteDigest: digest("1"),
    metricsDigest: digest("2"),
    glyphCoverageDigest: digest("3"),
    rights: rights(),
    availability: { state: "available", blockingDiagnostic: null },
    ...overrides,
  };
}

function catalog() {
  return {
    contractVersion: 1,
    schemaVersion: fontCatalogSchemaVersion,
    kind: "font-catalog",
    catalogId: "font.catalog.rsrender-qualified",
    catalogRevision: 1,
    families: [
      {
        familyId: "font.family.rsrender-sans",
        familyName: "RSrender Sans",
        faceIds: [
          "font.face.rsrender-sans.regular",
          "font.face.rsrender-sans.bold",
          "font.face.rsrender-sans.italic",
        ],
      },
      {
        familyId: "font.family.local-engineering",
        familyName: "Local Engineering",
        faceIds: ["font.face.local-engineering.regular"],
      },
    ],
    faces: [
      availableFace(),
      availableFace({
        faceId: "font.face.rsrender-sans.bold",
        weight: 700,
        byteDigest: digest("4"),
        metricsDigest: digest("5"),
      }),
      availableFace({
        faceId: "font.face.rsrender-sans.italic",
        style: "italic",
        byteDigest: digest("6"),
        metricsDigest: digest("7"),
      }),
      availableFace({
        faceId: "font.face.local-engineering.regular",
        familyId: "font.family.local-engineering",
        sourceClass: "local-installed",
        byteDigest: digest("8"),
        metricsDigest: digest("9"),
        glyphCoverageDigest: digest("a"),
        rights: rights({ redistribution: "prohibited", buyerTransfer: "prohibited" }),
        availability: {
          state: "unavailable",
          blockingDiagnostic: {
            code: "FONT_BYTES_UNAVAILABLE",
            reason: "The exact admitted local font bytes are not installed on this endpoint.",
          },
        },
      }),
    ],
  };
}

test("BLD-042 accepts a closed exact-face catalog and returns deeply detached immutable data", () => {
  const input = catalog();
  const result = validateFontCatalog(input);
  assert.equal(result.accepted, true, JSON.stringify(result));
  assert.deepEqual(result.value, input);
  assert.notEqual(result.value, input);
  assert.notEqual(result.value.families, input.families);
  assert.notEqual(result.value.families[0].faceIds, input.families[0].faceIds);
  assert.notEqual(result.value.faces[0].rights, input.faces[0].rights);
  assert.equal(Object.isFrozen(result.value), true);
  assert.equal(Object.isFrozen(result.value.families), true);
  assert.equal(Object.isFrozen(result.value.families[0].faceIds), true);
  assert.equal(Object.isFrozen(result.value.faces[0].availability), true);

  input.faces[0].weight = 500;
  input.faces[0].rights.embedding = "prohibited";
  assert.equal(result.value.faces[0].weight, 400);
  assert.equal(result.value.faces[0].rights.embedding, "permitted");
});

test("BLD-042 rejects extra, missing, malformed, unqualified digest, and unavailable-without-reason inputs", () => {
  const extra = catalog();
  extra.faces[0].postscriptName = "Forbidden-Extra-Authority";
  assert.equal(validateFontCatalog(extra).code, "FONT_CATALOG_EXTRA_FIELD");

  const missing = catalog();
  delete missing.faces[0].metricsDigest;
  assert.equal(validateFontCatalog(missing).code, "FONT_CATALOG_MISSING_FIELD");

  const digestDrift = catalog();
  digestDrift.faces[0].byteDigest = "1".repeat(64);
  assert.equal(validateFontCatalog(digestDrift).code, "FONT_CATALOG_WRONG_TYPE");

  const missingReason = catalog();
  missingReason.faces[3].availability.blockingDiagnostic = null;
  assert.equal(validateFontCatalog(missingReason).code, "FONT_CATALOG_MALFORMED");

  const getter = catalog();
  Object.defineProperty(getter.faces[0], "weight", { enumerable: true, get: () => 400 });
  assert.equal(validateFontCatalog(getter).code, "FONT_CATALOG_MALFORMED");
});

test("BLD-042 rejects broken family membership, duplicate IDs, ambiguous real faces, and noncanonical face order", () => {
  const broken = catalog();
  broken.families[0].faceIds[0] = "font.face.missing";
  assert.equal(validateFontCatalog(broken).code, "FONT_CATALOG_BROKEN_REFERENCE");

  const duplicateId = catalog();
  duplicateId.faces[1].faceId = duplicateId.faces[0].faceId;
  assert.equal(validateFontCatalog(duplicateId).code, "FONT_CATALOG_DUPLICATE_IDENTITY");

  const fauxAmbiguity = catalog();
  fauxAmbiguity.faces[1].weight = 400;
  assert.equal(validateFontCatalog(fauxAmbiguity).code, "FONT_CATALOG_DUPLICATE_FACE");

  const reordered = catalog();
  [reordered.families[0].faceIds[0], reordered.families[0].faceIds[1]] = [
    reordered.families[0].faceIds[1],
    reordered.families[0].faceIds[0],
  ];
  assert.equal(validateFontCatalog(reordered).code, "FONT_CATALOG_NONCANONICAL_ORDER");
});

test("BLD-042 resolves only an exact admitted available face without fallback or faux styling", () => {
  const validated = validateFontCatalog(catalog());
  assert.equal(validated.accepted, true);

  const bold = resolveExactFontFace(validated.value, "font.family.rsrender-sans", "normal", 700);
  assert.equal(bold.accepted, true);
  assert.equal(bold.face.faceId, "font.face.rsrender-sans.bold");
  assert.notEqual(bold.face, validated.value.faces[1]);
  assert.equal(Object.isFrozen(bold.face), true);

  const noFauxBoldItalic = resolveExactFontFace(
    validated.value,
    "font.family.rsrender-sans",
    "italic",
    700,
  );
  assert.deepEqual(noFauxBoldItalic, {
    accepted: false,
    code: "FONT_FACE_NOT_FOUND",
    diagnostic: {
      code: "FONT_FACE_NOT_FOUND",
      reason:
        "No admitted exact italic weight 700 face exists for family font.family.rsrender-sans.",
    },
  });

  const unavailable = resolveExactFontFace(
    validated.value,
    "font.family.local-engineering",
    "normal",
    400,
  );
  assert.equal(unavailable.accepted, false);
  assert.equal(unavailable.code, "FONT_FACE_UNAVAILABLE");
  assert.equal(unavailable.diagnostic.code, "FONT_BYTES_UNAVAILABLE");
});

test("BLD-042 blocks publication on availability, commercial-use, embedding, and required-subsetting rights", () => {
  const base = availableFace();
  assert.deepEqual(evaluateFontPublicationEligibility(base, { requireSubsetting: true }), {
    accepted: true,
    faceId: base.faceId,
    byteDigest: base.byteDigest,
    metricsDigest: base.metricsDigest,
    glyphCoverageDigest: base.glyphCoverageDigest,
  });

  const unavailable = clone(base);
  unavailable.availability = {
    state: "unavailable",
    blockingDiagnostic: { code: "FONT_FACE_UNAVAILABLE", reason: "Exact face is unavailable." },
  };
  assert.equal(
    evaluateFontPublicationEligibility(unavailable, { requireSubsetting: false }).code,
    "FONT_PUBLICATION_FACE_UNAVAILABLE",
  );

  for (const [field, disposition, expected] of [
    ["commercialUse", "unverified", "FONT_PUBLICATION_COMMERCIAL_USE_NOT_PERMITTED"],
    ["embedding", "prohibited", "FONT_PUBLICATION_EMBEDDING_NOT_PERMITTED"],
  ]) {
    const face = clone(base);
    face.rights[field] = disposition;
    assert.equal(
      evaluateFontPublicationEligibility(face, { requireSubsetting: false }).code,
      expected,
    );
  }

  const noSubset = clone(base);
  noSubset.rights.subsetting = "prohibited";
  assert.equal(
    evaluateFontPublicationEligibility(noSubset, { requireSubsetting: false }).accepted,
    true,
  );
  assert.equal(
    evaluateFontPublicationEligibility(noSubset, { requireSubsetting: true }).code,
    "FONT_PUBLICATION_SUBSETTING_NOT_PERMITTED",
  );

  const localOnlyTransfer = clone(base);
  localOnlyTransfer.rights.redistribution = "prohibited";
  localOnlyTransfer.rights.buyerTransfer = "unverified";
  assert.equal(
    evaluateFontPublicationEligibility(localOnlyTransfer, { requireSubsetting: false }).accepted,
    true,
  );
});
