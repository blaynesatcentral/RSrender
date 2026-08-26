import assert from "node:assert/strict";
import test from "node:test";

import {
  dynamicTextCatalogSchemaVersion,
  parseDynamicTextTemplate,
  resolveDynamicText,
  validateDynamicTextCatalog,
} from "../packages/contracts/dist/index.js";

const projectNameProvenance = Object.freeze({
  provenanceClass: "source",
  sourceContextIdentity: "source-context:synthetic",
  sourceProjectIdentity: "source-project:synthetic",
  sourceEntityIdentity: "project:synthetic",
  sourceFieldIdentity: "project.name",
  sourceContractRevision: "synthetic-source-v1",
});

function catalog() {
  return {
    schemaVersion: dynamicTextCatalogSchemaVersion,
    definitions: [
      {
        identifier: "boring_name",
        label: "Boring name",
        description: "Current exploration display name",
        category: "Exploration",
        valueKind: "text",
        missingValuePolicy: "error",
        providerMappingKey: "rslog.exploration.name",
        order: 20,
      },
      {
        identifier: "project_name",
        label: "Project name",
        description: "Current Source Project display name",
        category: "Project",
        valueKind: "text",
        missingValuePolicy: "error",
        providerMappingKey: "rslog.project.name",
        order: 10,
      },
      {
        identifier: "optional_note",
        label: "Optional note",
        description: "Optional document-authored footer note",
        category: "Document",
        valueKind: "text",
        missingValuePolicy: "empty",
        providerMappingKey: null,
        order: 30,
      },
    ],
  };
}

test("BLD-056 admits a bounded deterministic variable catalog with inert provider mapping keys", () => {
  const result = validateDynamicTextCatalog(catalog());
  assert.equal(result.accepted, true, result.code);
  assert.deepEqual(
    result.value.definitions.map(({ identifier }) => identifier),
    ["project_name", "boring_name", "optional_note"],
  );

  const executableLookingMapping = catalog();
  executableLookingMapping.definitions[0].providerMappingKey = "project.constructor()";
  assert.equal(validateDynamicTextCatalog(executableLookingMapping).accepted, false);

  const duplicate = catalog();
  duplicate.definitions[1].identifier = "boring_name";
  assert.equal(
    validateDynamicTextCatalog(duplicate).code,
    "DYNAMIC_TEXT_CATALOG_DUPLICATE_IDENTIFIER",
  );

  const unstableIdentifier = catalog();
  unstableIdentifier.definitions[0].identifier = "BoringName";
  assert.equal(validateDynamicTextCatalog(unstableIdentifier).accepted, false);
});

test("BLD-056 parses only inert @lower_snake_case tokens and @@ literal escapes", () => {
  const result = parseDynamicTextTemplate("@project_name / @boring_name / @@draft");
  assert.equal(result.accepted, true, result.code);
  assert.deepEqual(
    result.value.map((token) =>
      token.kind === "variable"
        ? [token.kind, token.identifier, token.sourceStartUtf16, token.sourceEndUtf16]
        : [token.kind, token.text, token.sourceStartUtf16, token.sourceEndUtf16],
    ),
    [
      ["variable", "project_name", 0, 13],
      ["literal", " / ", 13, 16],
      ["variable", "boring_name", 16, 28],
      ["literal", " / @draft", 28, 38],
    ],
  );

  assert.equal(parseDynamicTextTemplate("@ProjectName").code, "BINDING_TOKEN_MALFORMED");
  assert.equal(parseDynamicTextTemplate("@project__name").accepted, false);
  assert.equal(parseDynamicTextTemplate("@").accepted, false);

  const expression = parseDynamicTextTemplate("@project_name.constructor()");
  assert.equal(expression.accepted, true);
  assert.deepEqual(
    expression.value.map(({ kind }) => kind),
    ["variable", "literal"],
  );
});

test("BLD-056 resolves exact measurement text while retaining original and effective provenance", () => {
  const overrideProvenance = {
    provenanceClass: "effective-override",
    original: projectNameProvenance,
    overrideIdentity: "override:project-name:1",
    overrideRevision: 1,
    transformation: "replace-display-value",
  };
  const values = [
    {
      identifier: "project_name",
      original: { text: "Source project", provenance: projectNameProvenance },
      effective: { text: "Display project", provenance: overrideProvenance },
    },
    {
      identifier: "boring_name",
      original: {
        text: "B-12",
        provenance: {
          ...projectNameProvenance,
          sourceEntityIdentity: "exploration:synthetic-b12",
          sourceFieldIdentity: "exploration.name",
        },
      },
      effective: {
        text: "B-12",
        provenance: {
          ...projectNameProvenance,
          sourceEntityIdentity: "exploration:synthetic-b12",
          sourceFieldIdentity: "exploration.name",
        },
      },
    },
  ];
  const before = structuredClone(values);
  const result = resolveDynamicText(
    "@project_name — @boring_name — @project_name",
    catalog(),
    values,
  );
  assert.equal(result.accepted, true, result.code);
  assert.deepEqual(
    result,
    resolveDynamicText("@project_name — @boring_name — @project_name", catalog(), values),
  );
  assert.equal(result.value.measurementText, "Display project — B-12 — Display project");
  assert.equal(result.value.diagnostics.length, 0);
  assert.deepEqual(
    result.value.occurrences.map(({ resolvedStartUtf16, resolvedEndUtf16 }) => [
      resolvedStartUtf16,
      resolvedEndUtf16,
    ]),
    [
      [0, 15],
      [18, 22],
      [25, 40],
    ],
  );
  assert.equal(result.value.occurrences[0].original.text, "Source project");
  assert.equal(result.value.occurrences[0].effective.text, "Display project");
  assert.equal(
    result.value.occurrences[0].effective.provenance.original.sourceFieldIdentity,
    "project.name",
  );
  assert.deepEqual(values, before, "resolution must not mutate source or effective values");
});

test("BLD-056 keeps missing required tokens visible and applies only declared empty policy", () => {
  const result = resolveDynamicText("@project_name|@optional_note|@not_admitted", catalog(), []);
  assert.equal(result.accepted, true, result.code);
  assert.equal(result.value.measurementText, "@project_name||@not_admitted");
  assert.deepEqual(
    result.value.occurrences.map(({ identifier, substitution }) => [identifier, substitution]),
    [
      ["project_name", "unresolved-token"],
      ["optional_note", "empty-by-policy"],
      ["not_admitted", "unresolved-token"],
    ],
  );
  assert.deepEqual(
    result.value.diagnostics.map(({ code, variableIdentifier }) => [code, variableIdentifier]),
    [
      ["BINDING_TARGET_MISSING", "project_name"],
      ["BINDING_TARGET_MISSING", "not_admitted"],
    ],
  );

  const mismatchedOverride = [
    {
      identifier: "project_name",
      original: { text: "Source project", provenance: projectNameProvenance },
      effective: {
        text: "Wrong target",
        provenance: {
          provenanceClass: "effective-override",
          original: { ...projectNameProvenance, sourceFieldIdentity: "other.field" },
          overrideIdentity: "override:wrong-target",
          overrideRevision: 1,
          transformation: "replace-display-value",
        },
      },
    },
  ];
  assert.equal(
    resolveDynamicText("@project_name", catalog(), mismatchedOverride).code,
    "DYNAMIC_TEXT_VALUE_MALFORMED",
  );

  assert.equal(
    resolveDynamicText("plain text", catalog(), [
      {
        identifier: "unadmitted_value",
        original: { text: "hidden", provenance: projectNameProvenance },
        effective: { text: "hidden", provenance: projectNameProvenance },
      },
    ]).code,
    "DYNAMIC_TEXT_VALUE_IDENTIFIER_NOT_IN_CATALOG",
  );
});
