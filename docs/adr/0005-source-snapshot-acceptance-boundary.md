---
status: accepted
---

# Separate Source Adapter candidates, accepted Snapshots, and Render Dataset assembly

A Source Adapter returns one immutable, source-only Source Snapshot Candidate containing the complete Refresh Plan result, collection envelopes, normalized records, provenance, Diagnostics, eligibility, and logical digest. Deliberate acceptance atomically replaces the Log Project's Source Snapshot. A separate pure assembler derives an immutable Render Dataset from exactly one accepted Snapshot, admitted Supplemental Sources, Presentation Overrides, explicit Source Resolution Decisions, and a versioned projection contract.

## Consequences

- A source-only projection may exist as a private adapter stage but is not the public acceptance boundary.
- A partial Render Dataset before candidate acceptance is rejected.
- Required collection failure rejects the whole candidate. Optional failure may be accepted only when unbound and explicitly acknowledged; it stays failed and never borrows prior records.
- Snapshot, Supplemental Source, Override, and derived provenance remain distinct through assembly and publication.
- Refresh diff/review is non-mutating; cancel or failure leaves the accepted Snapshot unchanged.
- Unknown authorized fields may be retained inertly and bound deliberately through safe generic or typed formatters, but receive no default placement and never execute.
- Positive vendor shapes that lack authorized evidence remain typed blocked capabilities rather than invented DTOs.

Evidence: GitHub issues [#8](https://github.com/blaynesatcentral/RSrender/issues/8), [#9](https://github.com/blaynesatcentral/RSrender/issues/9), [#19](https://github.com/blaynesatcentral/RSrender/issues/19), and [#21](https://github.com/blaynesatcentral/RSrender/issues/21).
