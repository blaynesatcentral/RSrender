import { canonicalizeJson, sha256CanonicalJson } from "../../packages/contracts/dist/index.js";
import {
  createInMemoryApplicationService,
  createProjectionReplica,
} from "../../packages/application/dist/index.js";
import {
  collect,
  defaultCapacities,
  initialTemplate,
  makeCommand,
  makeQuery,
  makeSubscription,
} from "./bld-010-fixtures.mjs";

const initialized = createInMemoryApplicationService({
  aggregate: initialTemplate(),
  ownerGeneration: 7,
  capacities: defaultCapacities,
});
if (!initialized.accepted) throw new Error(initialized.code);
const service = initialized.service;
const before = await service.query(makeQuery());
if (before.kind !== "synthetic.template.projection.result") throw new Error(before.reason);
const command = makeCommand();
const committed = await service.execute(command);
const replayed = await service.execute({
  payload: { newContentDigest: command.payload.newContentDigest },
  expectedWorkingRevision: command.expectedWorkingRevision,
  ownerGeneration: command.ownerGeneration,
  documentId: command.documentId,
  commandId: command.commandId,
  requestId: command.requestId,
  kind: command.kind,
  scope: command.scope,
  messageType: command.messageType,
  contractVersion: command.contractVersion,
});
const events = await collect(service.subscribe(makeSubscription()));
const after = await service.query(makeQuery({ requestId: "urn:test:bld-010:request:query:2" }));
if (after.kind !== "synthetic.template.projection.result") throw new Error(after.reason);
const replicaResult = createProjectionReplica(after);
if (!replicaResult.accepted) throw new Error(replicaResult.code);
const replica = replicaResult.state;
const transcript = {
  before,
  committed,
  replaySameObject: committed === replayed,
  events,
  after,
  replica,
  snapshot: service.inspect(),
};
process.stdout.write(
  canonicalizeJson({ digest: sha256CanonicalJson(transcript), transcript }) + "\n",
);
