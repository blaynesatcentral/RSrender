# ArcGIS layout-authoring baseline for the August 2026 feedback

Status: decision-ready research note  
Researched: 2026-08-22  
Benchmark: current ArcGIS Pro documentation and first-party Esri tutorials, with archived ArcMap 10.8 documentation only where it clarifies mature desktop-publishing interaction  
Method: clean-room review of public first-party Esri sources. No ArcGIS code, proprietary assets, branding, or trade dress were used.

## Executive finding

The feedback describes baseline desktop layout-authoring behavior, not speculative polish. ArcGIS Pro directly documents project Open/Save, a persisted project containing layouts, element selection on the page and in Contents, type-specific contextual tabs, a property pane, text styling, direct movement and resizing, exact position and size fields, grouping, snapping, guides, keyboard editing, undo/redo, and map-series navigation. Esri's own tutorials make users drag, resize, align, style, right-click, and save as normal parts of producing a layout. [Save a project](https://doc.esri.com/en/arcgis-pro/latest/help/projects/save-a-project.html), [Work with layout elements](https://doc.esri.com/en/arcgis-pro/latest/help/layouts/work-with-layout-elements.html), [Make a layout](https://pro.arcgis.com/en/pro-app/latest/get-started/add-maps-to-a-layout.htm), [Arrange a layout](https://learn.arcgis.com/en/projects/arrange-a-layout/)

The important qualification is object granularity. ArcGIS Pro treats added text and graphics as selectable layout elements, but it does **not** make every value painted inside a table frame an independent layout element; Esri explicitly says individual table-frame cells cannot be formatted. Therefore, a description rendered at 15 ft BGS will only support the requested selection, right-click formatting, movement, and resizing if RSrender gives that rendered description a stable, selectable scene identity instead of painting the entire Log Column as one monolithic object. [Work with layout elements](https://doc.esri.com/en/arcgis-pro/latest/help/layouts/work-with-layout-elements.html), [Add and modify table frames](https://doc.esri.com/en/arcgis-pro/latest/help/layouts/add-and-modify-table-frames.html)

ArcGIS also does not define a depth-aware **Log Column**, a selectable **Exploration** or **Boring Log**, or semantic **Page Regions**. Its table frames, map-series navigation, element groups, and report subsections are useful analogies, not proof of the required boring-log semantics. Those behaviors must be specified deliberately in RSrender.

## Evidence labels

- **Documented**: the official help states the behavior.
- **Demonstrated**: a first-party Esri tutorial instructs the user to perform the behavior.
- **Not established**: the reviewed official material does not support the more specific boring-log claim. This is a research boundary, not proof that no Esri build has ever exhibited a similar interaction.
- **RSrender requirement**: a product conclusion derived from the evidence and the feedback; it is not represented as an ArcGIS contract.

## Feedback-to-capability ledger

### 1. A Log Project must open, save, reopen, and preserve authored work

**ArcGIS precedent — documented.** `Ctrl+O` opens a project and `Ctrl+S` saves it. A saved `.aprx` updates project-owned items including maps and layouts and also records which views are open and active. Save Project As creates a new project file; recovery backups can retain unsaved project changes after an unexpected shutdown. Opening supports recent projects, browsing, file-system launch, read-only handling, and a prompt to save an already open dirty project. [ArcGIS Pro keyboard shortcuts](https://doc.esri.com/en/arcgis-pro/latest/get-started/arcgis-pro-keyboard-shortcuts.html), [Save a project](https://doc.esri.com/en/arcgis-pro/latest/help/projects/save-a-project.html), [Open a project](https://doc.esri.com/en/arcgis-pro/latest/help/projects/open-a-project.html)

ArcMap's historical equivalent is an `.mxd` document: saving retains the map document while layers continue to reference external data. This corroborates the long-established GIS desktop expectation that an authored composition is a reopenable document. [Saving a map](https://desktop.arcgis.com/en/arcmap/latest/map/working-with-arcmap/saving-a-map.htm)

**RSrender requirement.** File > New/Open/Open Recent/Save/Save As/Save a Copy and dirty Close/Quit prompts are release-blocking. A verified Save must persist the Log Project's selected Explorations, Template Assignments, embedded template state, Presentation Overrides, Freeform Annotations, authored element hierarchy, exact geometry, text styling, guide/template aids that are document-owned, and publication settings. Reopening must reconstruct the same authoritative document state. This aligns with ADR 0001's verified-save transaction and ADR 0002's document ownership; ArcGIS's simple save behavior is a UX benchmark, not a durability implementation recipe.

### 2. “Save my preferences” needs three explicit scopes

**ArcGIS precedent — documented.** Project Save persists project content and some view state. Selected layout elements can be saved as reusable style items. Complete layouts can be saved/imported as layout files. Some layout options, such as the color applied to all guides, are application options across projects. A table-frame field's Save as Default command applies only to later fields in that table frame, not to new table frames. [Save a project](https://doc.esri.com/en/arcgis-pro/latest/help/projects/save-a-project.html), [Save layout elements in a style](https://doc.esri.com/en/arcgis-pro/latest/help/layouts/save-layout-elements-in-styles.html), [Add a layout to a project](https://doc.esri.com/en/arcgis-pro/latest/help/layouts/add-a-layout-to-your-project.html), [Customize layout options](https://doc.esri.com/en/arcgis-pro/latest/help/layouts/layout-options.html), [Add and modify table-frame fields](https://doc.esri.com/en/arcgis-pro/latest/help/layouts/add-and-modify-table-frame-fields.html)

**RSrender requirement.** Do not expose one ambiguous “preferences” bucket:

1. **Log Project state**: per-project selection, composition, per-Exploration overrides, and publication settings; saved by Save.
2. **Log Template/style defaults**: reusable fonts, frame styles, Log Column defaults, Page Region sizes, and named styles; saved only by explicit template/style commands.
3. **Application/workspace preferences**: pane positions, canvas zoom, recent files, guide color, snap defaults, and accessibility settings; saved outside the Log Project and must not dirty it.

The UI must state the scope of “Apply to this block,” “Set as style default,” “Apply to this template,” and “Apply to all selected blocks.”

### 3. A rendered description must be an individually selectable object

**ArcGIS precedent — documented.** Every object added to an ArcGIS Pro layout is a layout element visible in Contents. A user can select an element on the layout or in Contents; the active selection controls the contextual tab and Element pane. Contents also supports searching/filtering, visibility, locking, grouping, and drawing order. [Work with layout elements](https://doc.esri.com/en/arcgis-pro/latest/help/layouts/work-with-layout-elements.html), [Layout and the Contents pane](https://doc.esri.com/en/arcgis-pro/latest/help/layouts/layout-contents-pane.html)

ArcMap documents the mature pointer model more explicitly: click selects an individual graphic, drag a rectangle selects several, Shift adds/removes items, and selected graphics display handles. [An overview of working with graphics](https://desktop.arcgis.com/en/arcmap/latest/map/page-layouts/an-overview-of-working-with-graphics.htm)

**Not established.** An ArcGIS table frame does not make an individual cell independently formattable. Esri says cells cannot be formatted individually. Selecting a table-frame field is supported, but that is a whole field/column configuration, not one value at one row/depth. [Add and modify table frames](https://doc.esri.com/en/arcgis-pro/latest/help/layouts/add-and-modify-table-frames.html), [Add and modify table-frame fields](https://doc.esri.com/en/arcgis-pro/latest/help/layouts/add-and-modify-table-frame-fields.html)

**RSrender requirement.** A visible description such as “individual description at 15-ft BGS” needs a stable selectable identity tied to the exact Exploration, source record/binding, depth interval or point, page-plan occurrence, and owning Log Column. Canvas hit testing and Contents must select the same object. The selection outline must expose its text frame, not the entire Log Column. Formatting changes are presentation changes; they must not mutate read-only Source Data. If text content itself is changed, that is a separately marked Display Value Override, not ordinary formatting.

### 4. Right-click must focus a persistent Properties pane

**ArcGIS precedent — documented.** Right-clicking selected elements on the canvas or in Contents opens context commands for alignment, distribution, grouping, ordering, and nudging. The general help guarantees Contents > Properties opens the Element pane, which then follows the currently selected Contents element. The text help additionally documents right-clicking rectangle text either on the layout or in Contents and choosing Properties. [Work with layout elements](https://doc.esri.com/en/arcgis-pro/latest/help/layouts/work-with-layout-elements.html), [Edit text](https://doc.esri.com/en/arcgis-pro/latest/help/layouts/text.html)

**RSrender requirement.** Right-click > Properties on any selectable RSrender canvas object—text block, graphic, Log Column, Data Track, Page Region, group, header/footer element—must select the object and show its properties in the right Properties pane. The pane stays open and follows selection. Double-click may enter inline text editing, but it must not be the only route to formatting. Essential commands must also exist outside the context menu for keyboard and touch users.

### 5. Text formatting must include both basic and professional properties

**ArcGIS precedent — documented.** Selecting a text element exposes font family, font size, and color on the contextual Text tab; the Element pane exposes the full text-symbol surface. Official properties include font family/style, variable-font variations, point size, fill/outline, underline, strikethrough, case, superscript/subscript, horizontal alignment including full justification, vertical alignment, X/Y offsets, rotation, word spacing, letter spacing, letter width, line spacing, margins, block progression, and language. [Edit text](https://doc.esri.com/en/arcgis-pro/latest/help/layouts/text.html), [Text symbol properties](https://doc.esri.com/en/arcgis-pro/latest/help/mapping/layer-properties/text-symbol-properties.html)

ArcGIS Pro also supports inline editing: double-click a text element, edit or select part of the string, apply formatting from the Text tab, commit with `Ctrl+Enter` or `F2`, or cancel with `Esc`. [Edit text](https://doc.esri.com/en/arcgis-pro/latest/help/layouts/text.html)

**RSrender requirement.** The first release of per-text-block Properties must include at least:

- font family, available style/weight, size, color, bold, italic, underline, and strikethrough;
- horizontal alignment/justification and vertical alignment;
- X/Y, width, height, Position Anchor, rotation, and lock state;
- frame padding/margins, line spacing, paragraph spacing, letter spacing, and word spacing;
- wrapping, overflow/fitting policy, minimum font size, and an explicit clipped/overflow Diagnostic;
- text-frame background, border, and opacity where the element type supports them;
- apply scope and style inheritance/override status.

### 6. Text wrapping and resize behavior depend on element type in ArcGIS

**ArcGIS precedent — documented.** Rectangle and polygon text preserve authored font size and wrap; straight text does not automatically wrap and changes its font size when resized. Rectangle text offers None/overflow, Adjust Font Size, Adjust Width, and Adjust Height fitting strategies. Text can also flow through multiple internal columns with configurable gaps and margins. [Add graphics and text in a layout](https://doc.esri.com/en/arcgis-pro/latest/help/layouts/add-and-modify-graphics-and-text.html), [Edit text](https://doc.esri.com/en/arcgis-pro/latest/help/layouts/text.html)

**RSrender requirement.** Depth-description blocks should behave like framed rectangle text by default: width and height are real geometry; dragging a side handle changes reflow width; dragging a top/bottom handle changes available height; authored font size remains stable unless a deliberate shrink policy is active. Wrap, clip, shrink-to-minimum, grow width, grow height, and semantic continuation must be explicit policies. Resizing must never silently omit Source Data.

### 7. Canvas movement, resizing, exact geometry, and rotation are baseline

**ArcGIS precedent — documented and demonstrated.** Esri states layout elements can be selected, moved, and resized on the layout. Its tutorials instruct users to drag elements, drag selection edges/handles to resize legends and other items, snap items to guides, and use Undo after an accidental resize. Exact controls expose a nine-point anchor, X/Y, width, height, aspect-ratio lock, and rotation. Groups can be resized or rotated while preserving relative positions. [Layouts in ArcGIS Pro](https://doc.esri.com/en/arcgis-pro/latest/help/layouts/layouts-in-arcgis-pro.html), [Work with layout elements](https://doc.esri.com/en/arcgis-pro/latest/help/layouts/work-with-layout-elements.html), [Make a layout](https://pro.arcgis.com/en/pro-app/latest/get-started/add-maps-to-a-layout.htm), [Arrange a layout](https://learn.arcgis.com/en/projects/arrange-a-layout/)

ArcMap explicitly documents selection handles and moving/rotating/ordering graphics, corroborating the expected direct-manipulation vocabulary. [An overview of working with graphics](https://desktop.arcgis.com/en/arcmap/latest/map/page-layouts/an-overview-of-working-with-graphics.htm), [Moving, rotating, and ordering graphics](https://desktop.arcgis.com/en/arcmap/latest/map/page-layouts/moving-rotating-and-ordering-graphics.htm)

**Not established.** Current ArcGIS Pro help does not specify handle count and geometry, free-rotation handle shape/pivot, high-DPI hit areas, overlap hit cycling, drag threshold, or Shift/Alt modifier semantics. Rotation is documented as a property and as a group capability, but the exact direct-rotation gesture is not a safe emulation fact.

**RSrender requirement.** Every freely placeable element needs drag move, visible resize handles, a numeric geometry equivalent, cancelable live preview, and one undo transaction per drag. Text blocks and graphics need rotation only where semantically valid. Log Columns and Page Regions need constrained handles described below, not unconstrained graphic scaling.

### 8. Guides, snapping, and precise arrangement are baseline

**ArcGIS precedent — documented.** Layout rulers can be shown, use page units, and receive guides from a ruler context menu. Guides can be positioned numerically, dragged along the ruler, hidden without deletion, and excluded from export/print. During create, move, or resize, elements can snap independently to persistent guides, peer-element smart guides at edges/centers, page boundaries, and printer margins. Spacebar temporarily disables snapping. [Set up a layout](https://doc.esri.com/en/arcgis-pro/latest/help/layouts/page-setup.html)

ArcGIS also exposes align left/center/right/top/middle/bottom, horizontal/vertical distribution, make same size/width/height, align/fit to page margins, four drawing-order commands, grouping, and ungrouping on contextual and context menus. [Work with layout elements](https://doc.esri.com/en/arcgis-pro/latest/help/layouts/work-with-layout-elements.html)

**RSrender requirement.** Canvas interaction needs rulers, persistent nonprinting guides, smart guides, page/margin/element snapping, visible snap targets, and independent toggles. Add domain-specific snap targets for Page Region boundaries, Log Column boundaries, text baselines, depth ticks, and Data Track axes; these additions are not established ArcGIS snap classes.

### 9. Log Column resizing is a product-specific constrained layout behavior

**Closest ArcGIS precedent — documented.** Table-frame fields can be added/removed/reordered in Contents, selected individually or in subsets, assigned explicit widths in page units, set to auto width, and given word wrapping. Resizing the entire table frame expands or compresses fields under its fitting strategy. [Add and modify table-frame fields](https://doc.esri.com/en/arcgis-pro/latest/help/layouts/add-and-modify-table-frame-fields.html), [Add and modify table frames](https://doc.esri.com/en/arcgis-pro/latest/help/layouts/add-and-modify-table-frames.html)

**Not established.** The sources do not document dragging an internal table-field divider on the layout. They do not establish adjacent-field conservation, minimum Log Column widths, depth-aware content reflow, shared boundaries, or behavior when a resized Log Column contains interval data. A table field is not a Log Column.

**RSrender requirement.** A selected Log Column needs:

- right-click > Properties with X, width, minimum width, role, style, binding, visibility, lock, and overflow rules;
- draggable left/right boundary handles with the active boundary visibly highlighted;
- a declared resize mode: resize one column and move later columns, or resize the adjacent pair while preserving total body width;
- live width readout, snap targets, min/max constraints, `Esc` cancellation, and one undo item;
- deterministic reflow, repagination, and Diagnostics after commit;
- a numeric and keyboard route to the identical result.

### 10. Header and footer resizing is supported by ArcGIS reports, not ordinary layouts

**ArcGIS precedent — documented and demonstrated.** ArcGIS Pro reports define Report Header, Page Header, Details, Page Footer, Report Footer, and optional Group Header/Footer subsections. Subsections and their elements can be repositioned/resized; subsection height can be typed or changed directly with the Select tool. Esri's report tutorial instructs dragging the bottom-center resize handle of a selected subsection. A subsection cannot be made shorter than its lowest contained element. [Report structure](https://doc.esri.com/en/arcgis-pro/latest/help/reports/report-structure.html), [Create and modify a report tutorial](https://doc.esri.com/en/arcgis-pro/latest/help/reports/tutorial-create-and-modify-a-report.html)

Ordinary ArcGIS layouts also support Groups, which move, resize, rotate, hide, or lock contained elements as a unit. [Work with layout elements](https://doc.esri.com/en/arcgis-pro/latest/help/layouts/work-with-layout-elements.html)

**Not established.** ArcGIS layout elements do not establish semantic Header/Depth Body/Footer regions. A report subsection's width is shared and its repetition rules are report-specific. A generic element Group also does not define depth-body consequences when its height changes.

**RSrender requirement.** Header and Footer Page Regions must be first-class selectable objects with visible horizontal resize boundaries and exact height fields. Dragging a boundary must update the Depth Body's remaining height, constrain contained elements, apply Layout Pins, recompute Reference Depth Ranges/page count, and report conflicts. Nested header/footer elements remain individually selectable; selecting the region must not make every child lose its identity.

### 11. Switching among Boring Logs should adapt map-series navigation

**ArcGIS precedent — documented.** A map series shows one generated page at a time. Users can navigate through a Contents page list, search, previous/next/first/last arrows, or a page-number text box; pages are identified by name and number. [Search and navigate a map series](https://doc.esri.com/en/arcgis-pro/latest/help/layouts/search-and-navigate-map-series.html), [Layout and the Contents pane](https://doc.esri.com/en/arcgis-pro/latest/help/layouts/layout-contents-pane.html)

ArcGIS Pro can also keep several map and layout views open and switch the active view; `Ctrl+Tab`/`Alt+F7` provide keyboard switching among views and panes. [Use ArcGIS Pro with a keyboard](https://doc.esri.com/en/arcgis-pro/latest/get-started/keyboard-shortcuts.html), [Save a project](https://doc.esri.com/en/arcgis-pro/latest/help/projects/save-a-project.html)

**Not established.** Esri does not document a map-series page dropdown. A map-series page is not an Exploration, and static layout edits apply to the shared layout rather than creating a per-page design. This cannot be copied literally for per-Exploration Presentation Overrides.

**RSrender requirement.** Provide an always-visible, searchable Exploration/Boring Log selector in the canvas toolbar, implemented as a combo/dropdown with Exploration ID/name, current ordinal, and warning/override indicators. Add Previous/Next shortcuts and first/last navigation. Switching changes the preview and selection scope without refreshing Source Data. Preserve the current Exploration as workspace view state; do not make mere navigation dirty the Log Project.

### 12. Undo/redo, clipboard, grouping, deletion, and keyboard alternatives are baseline

**ArcGIS precedent — documented.** Global shortcuts include `Ctrl+Z` Undo, `Ctrl+Y` or `Ctrl+Shift+Z` Redo, `Ctrl+C/X/V`, Delete, `Ctrl+G`, and `Ctrl+Shift+G`. Layout shortcuts add select all/deselect all, Ctrl-drag copy, visibility toggle, and coarse/fine nudging. Bare arrows pan the page in current ArcGIS Pro, while nudge requires a modifier. [ArcGIS Pro keyboard shortcuts](https://doc.esri.com/en/arcgis-pro/latest/get-started/arcgis-pro-keyboard-shortcuts.html), [Keyboard shortcuts for working on the layout](https://doc.esri.com/en/arcgis-pro/latest/help/layouts/keyboard-shortcuts-for-layouts.html)

**RSrender requirement.** All geometry and property changes must be commands with Undo/Redo. One continuous drag, resize, rotation, divider drag, or repeated property typing sequence should coalesce into a comprehensible history item. Clipboard, duplication, delete, group/ungroup, arrange, reorder, and nudge must work from menus and keyboard. Shortcut distances and arrow-key behavior are an RSrender decision; Esri's fixed point increments are precedent for capability, not a required value.

### 13. Contextual tabs and menus complement Properties; they do not replace it

**ArcGIS precedent — documented.** Selecting an element produces a type-specific contextual ribbon tab; a multi-selection produces a generic Element tab containing properties common to all selected items. The contextual surface provides common text/symbol, arrangement, and size/position controls, while the Element pane contains all properties. Context menus duplicate high-frequency arrangement commands. [Work with layout elements](https://doc.esri.com/en/arcgis-pro/latest/help/layouts/work-with-layout-elements.html)

**RSrender requirement.** Selection should drive three synchronized surfaces:

1. the on-canvas selection outline and direct-manipulation handles;
2. a compact contextual toolbar/menu for high-frequency actions;
3. the persistent right Properties pane for the full typed property set and exact values.

For mixed selection, show only truly common properties and mixed-value state. Locked or semantically constrained elements must show why an unavailable command is disabled.

## Exact behavior package appropriate to emulate

The following is the minimum coherent package supported by the research:

1. Click a visible element or its Contents row to create one shared selection.
2. Right-click the selected element and choose Properties; the right pane follows subsequent selection.
3. Double-click text for inline editing; `Esc` cancels and an explicit commit gesture accepts.
4. Drag the element interior to move; drag visible frame handles to resize; show exact X/Y/W/H and provide numeric editing.
5. Use a Position Anchor to define which point remains fixed during exact position/size changes.
6. Snap during creation, movement, and resizing; show the snap target; allow temporary bypass.
7. Provide align, distribute, same-size, group/ungroup, order, lock, hide, copy, delete, nudge, Undo, and Redo.
8. Expose text font/style/size/color, alignment, spacing, padding, wrapping, overflow/fitting, and frame styling.
9. Persist document-owned changes through Save and restore them through Open; separate reusable template/style defaults and application preferences.
10. Provide list/search and previous/next navigation among Explorations, while keeping current preview selection separate from source retrieval and document edits.

## ArcGIS boundaries that must not be overstated

1. ArcGIS does not establish that a value painted inside a complex container is independently selectable. Table cells are the counterexample.
2. ArcGIS does not establish a depth-aware Log Column or draggable canvas divider between semantic log columns.
3. ArcGIS layout docs do not establish Header/Depth Body/Footer Page Regions. Report subsections are the closest first-party precedent.
4. Map-series navigation is list/search/arrows/page-number entry, not a documented dropdown, and map-series pages share one layout.
5. The current Pro help does not define exact resize-handle count, rotation-handle mechanics, hit testing among overlaps, modifier precedence, snap threshold, or drag undo boundaries.
6. ArcGIS project Save, reusable styles/layout files, element-local defaults, and application options have different scopes. “Save my preferences” therefore requires explicit RSrender scope semantics.
7. ArcGIS allows a locked element to remain editable in its Element pane. RSrender must decide and document whether lock blocks all mutations or only direct canvas transformations.
8. ArcGIS table fitting strategies may drop content that does not fit and show overflow. RSrender cannot silently drop depth-bound Source Data; it needs deterministic overflow Diagnostics and publication gating.

## Specification-ready acceptance outcomes

These are RSrender outcomes derived from the feedback and official benchmark:

1. After Save, close, and Open, the selected Log Project reopens with authored layout hierarchy, element geometry, text styling, Presentation Overrides, Template Assignments, and publication settings intact.
2. Clicking the description rendered at 15 ft BGS selects exactly that block on canvas and its corresponding Contents row; it does not select the whole Log Column.
3. Right-click > Properties opens/focuses the right pane; changing font, size, alignment, padding, or wrap updates the canvas and dirty state and is undoable.
4. Dragging the selected text block moves it; dragging side/corner handles changes its frame geometry and reflows text according to the selected policy; exact X/Y/W/H remain available.
5. Dragging a Log Column boundary respects minimum widths, previews affected columns, snaps, cancels with `Esc`, commits once, and recomputes content/Diagnostics.
6. Right-clicking a Log Column exposes its typed properties and the affected resize mode; it never exposes table-cell language that misrepresents the domain.
7. Dragging a Header/Footer boundary changes the Page Region height, applies pins/constraints, recalculates Depth Body/page planning, and reports conflicts without losing child-element identity.
8. The Exploration selector supports search/dropdown and previous/next navigation and makes the currently previewed Boring Log unmistakable.
9. Undo/Redo covers property edits, text edits, movement, element resize, Log Column divider resize, Page Region resize, group/order/visibility changes, and deletion.
10. Saving a Log Project, saving defaults to a Log Template/style, and saving application preferences are separate named operations with visible scope.

## Primary source index

All sources are first-party Esri publications accessed 2026-08-22.

| Source                                                                                                                                                         | Evidence used                                                                                                                   |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| [Open a project](https://doc.esri.com/en/arcgis-pro/latest/help/projects/open-a-project.html)                                                                  | Open/recent/browse/file-system/read-only/recovery and dirty-project prompt behavior.                                            |
| [Save a project](https://doc.esri.com/en/arcgis-pro/latest/help/projects/save-a-project.html)                                                                  | Saved project contents, open/active view persistence, Save As, and recovery backup.                                             |
| [Work with layout elements](https://doc.esri.com/en/arcgis-pro/latest/help/layouts/work-with-layout-elements.html)                                             | Selection, contextual tabs, context menus, Properties pane, arrangement, grouping, anchors, exact geometry, and rotation.       |
| [Layout and the Contents pane](https://doc.esri.com/en/arcgis-pro/latest/help/layouts/layout-contents-pane.html)                                               | Element hierarchy, lock, visibility persistence, ordering, filter/search, and map-series pages.                                 |
| [Edit text](https://doc.esri.com/en/arcgis-pro/latest/help/layouts/text.html)                                                                                  | Text properties, inline edit, fitting strategies, wrapping-related behavior, and canvas/Contents Properties for rectangle text. |
| [Add graphics and text in a layout](https://doc.esri.com/en/arcgis-pro/latest/help/layouts/add-and-modify-graphics-and-text.html)                              | Text geometry types and which types wrap or scale.                                                                              |
| [Text symbol properties](https://doc.esri.com/en/arcgis-pro/latest/help/mapping/layer-properties/text-symbol-properties.html)                                  | Complete font, alignment, position, rotation, spacing, margin, and internationalization property inventory.                     |
| [Set up a layout](https://doc.esri.com/en/arcgis-pro/latest/help/layouts/page-setup.html)                                                                      | Rulers, persistent guides, dragging guides, page units, four snap classes, and temporary snap bypass.                           |
| [Keyboard shortcuts for working on the layout](https://doc.esri.com/en/arcgis-pro/latest/help/layouts/keyboard-shortcuts-for-layouts.html)                     | Selection, clipboard, group/ungroup, visibility, nudge, text, and navigation shortcuts.                                         |
| [ArcGIS Pro keyboard shortcuts](https://doc.esri.com/en/arcgis-pro/latest/get-started/arcgis-pro-keyboard-shortcuts.html)                                      | Open, Save, Undo/Redo, clipboard, delete, group, and command search.                                                            |
| [Use ArcGIS Pro with a keyboard](https://doc.esri.com/en/arcgis-pro/latest/get-started/keyboard-shortcuts.html)                                                | Keyboard switching among open views and panes.                                                                                  |
| [Search and navigate a map series](https://doc.esri.com/en/arcgis-pro/latest/help/layouts/search-and-navigate-map-series.html)                                 | One-page-at-a-time model, page list/search, arrows, and page-number navigation.                                                 |
| [Add and modify table frames](https://doc.esri.com/en/arcgis-pro/latest/help/layouts/add-and-modify-table-frames.html)                                         | Frame resize/fitting, overflow, header styling, and prohibition on individual cell formatting.                                  |
| [Add and modify table-frame fields](https://doc.esri.com/en/arcgis-pro/latest/help/layouts/add-and-modify-table-frame-fields.html)                             | Individual field selection, explicit/automatic width, wrap, field order, and heading/data symbols.                              |
| [Report structure](https://doc.esri.com/en/arcgis-pro/latest/help/reports/report-structure.html)                                                               | Report/page/group headers and footers, subsection sizing, repetition, constraints, and columns.                                 |
| [Create and modify a report tutorial](https://doc.esri.com/en/arcgis-pro/latest/help/reports/tutorial-create-and-modify-a-report.html)                         | Direct resize handle on a subsection and right-click Properties on a report element.                                            |
| [Save layout elements in a style](https://doc.esri.com/en/arcgis-pro/latest/help/layouts/save-layout-elements-in-styles.html)                                  | Reusable style persistence.                                                                                                     |
| [Customize layout options](https://doc.esri.com/en/arcgis-pro/latest/help/layouts/layout-options.html)                                                         | Application-scoped layout options.                                                                                              |
| [Make a layout](https://pro.arcgis.com/en/pro-app/latest/get-started/add-maps-to-a-layout.htm)                                                                 | Tutorial demonstration of drag, resize, snapping, smart guides, Undo, and Save.                                                 |
| [Arrange a layout](https://learn.arcgis.com/en/projects/arrange-a-layout/)                                                                                     | Tutorial demonstration of frame resizing, property-pane selection, fitting strategy, type styling, and child-item properties.   |
| [Finish and export a layout](https://learn.arcgis.com/en/projects/finish-and-export-a-layout/)                                                                 | Tutorial demonstration of right-click Properties, page/element resize, grouping, alignment, styles, and export workflow.        |
| [ArcMap graphics overview](https://desktop.arcgis.com/en/arcmap/latest/map/page-layouts/an-overview-of-working-with-graphics.htm)                              | Historical desktop precedent for click/marquee selection, handles, dominant selection, arrange, and order.                      |
| [Moving, rotating, and ordering graphics](https://desktop.arcgis.com/en/arcmap/latest/map/page-layouts/moving-rotating-and-ordering-graphics.htm)              | Historical direct move/rotate/order precedent.                                                                                  |
| [Changing text font, color, or size](https://desktop.arcgis.com/en/arcmap/latest/map/working-with-text/adding-new-text-to-a-map-changing-the-font-color-o.htm) | Historical right-click text Properties and direct font/color/size editing.                                                      |

## Research disposition

The official-source pass is complete for the feedback in scope. It supports treating save/load, per-element selection, text Properties, direct movement/resizing, precision aids, keyboard commands, and Exploration navigation as core authoring work. It also establishes three implementation-sensitive departures: RSrender must materialize a depth description as an independently selectable object, invent a constrained Log Column divider contract, and implement Page Region resizing with boring-log pagination/depth semantics rather than treating ArcGIS table frames or report subsections as literal models.
