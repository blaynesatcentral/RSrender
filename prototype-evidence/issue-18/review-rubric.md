# Issue #18 review rubric

This is a review aid for the disposable interaction prototype. It is not application code.

## Required observable cases

| Concern | Evidence expected | Rejection signal |
|---|---|---|
| Contents hierarchy | Local and effective visibility/lock are both legible; render order is container-local | A hidden/locked ancestor produces unexplained child behavior |
| Reorder/reparent | Pointer and keyboard paths share one explicit command boundary and announce the result | Pointer-only behavior or ambiguous drop destination |
| Selection | Click, Shift-toggle, and Key Element designation are distinct and visible | Reference item changes silently during alignment |
| Precision editing | Pointer move/resize, keyboard nudge/resize, exact properties, snapping/guides, and rotation expose predictable state | Different surfaces mutate incompatible geometry models |
| Mixed properties | Multi-selection distinguishes shared from mixed values and makes the edit scope explicit | Blank controls masquerade as empty values |
| Undo | One user intent maps to one reversible command, including reorder/reparent and alignment | Partial undo or hidden selection/document side effects |
| Accessibility | Stable focus order, semantic names/states, keyboard completion, and a usable announcement channel | Canvas pixels are the only representation of editable content |
| Performance | Repeatable synthetic batch sizes and measured interaction timing with stated host/browser | An unmeasured “feels fast” conclusion |

The final decision must separate observed behavior from simulated behavior and identify which stack assumption survived or failed. Visual resemblance to ArcGIS Pro is not a criterion.
