import {
  canonicalizeJson,
  contractPrimitivesRevision,
  defineOpaqueIdentityCodec,
  physicalLengthToMpt,
  sha256CanonicalJson,
} from "../../../packages/contracts/dist/index.js";

const explorationIdentity = defineOpaqueIdentityCodec("ExplorationIdentity").parse(
  "urn:rsrender:fixture:fx-01:exploration:000001",
);
const value = {
  contractRevision: contractPrimitivesRevision,
  explorationIdentity,
  page: { heightMpt: physicalLengthToMpt(11, "in"), widthMpt: physicalLengthToMpt(8.5, "in") },
  states: [null, false, true, 0, "synthetic"],
};

console.log(
  JSON.stringify({
    contractRevision: value.contractRevision,
    canonical: canonicalizeJson(value),
    digest: sha256CanonicalJson(value),
    unitMpt: physicalLengthToMpt(25.4, "mm"),
  }),
);
