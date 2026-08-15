import {
  contractTypeManifest,
  type ContractTypeManifest,
} from "../../../packages/contracts/src/runtime-contract.js";

const driftedManifest = {
  ...contractTypeManifest,
  "command:example.noop": {
    ...contractTypeManifest["command:example.noop"],
    payload: "nonempty-string",
  },
} satisfies ContractTypeManifest;

void driftedManifest;
