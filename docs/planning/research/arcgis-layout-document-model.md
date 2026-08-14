# ArcGIS Pro layout document, page, Contents, and layer model

Status: research evidence for Wayfinder ticket #2  
Researched: 2026-08-13  
Benchmark: ArcGIS Pro 3.7 where current documentation is available; ArcGIS Pro 3.6 official help and tutorials where the 3.7 help is not yet indexed  
Method: clean-room study of public first-party Esri documentation, tutorials, API references, and accessibility reports. No Esri code, file reverse engineering, proprietary assets, branding, or trade dress were used.

## Executive findings

ArcGIS Pro does not model a layout as a self-contained multi-page drawing document. A project (`.aprx`) owns zero or more separately named, single-page layouts. Each layout owns a physical page and an ordered hierarchy of layout elements. A map frame is one such element and references a separately owned map or scene, whose own ordered layer tree is exposed beneath the map frame. Map-series pages are generated states of one layout: one page is shown at a time, static elements are shared across every generated page, and an edit to the layout applies across the series. [Esri's ArcPy Layout reference](https://pro.arcgis.com/en/pro-app/3.6/arcpy/mapping/layout-class.htm) explicitly calls the layout single-page; [Map series](https://pro.arcgis.com/en/pro-app/3.6/help/layouts/map-series.htm) and [Refresh a map series](https://pro.arcgis.com/en/pro-app/3.6/help/layouts/refresh-map-series.htm) document the generated-page behavior.

The active view determines the meaning of the Contents pane. For a layout view, it is primarily an element hierarchy and drawing-order controller; it can additionally expose layers inside map frames. For a map view, it is a richer layer-management surface with separate views for drawing order, data source, selection, editing, snapping, and labeling. The Catalog pane is distinct: it exposes project-level items and connections, including layouts and maps, whether or not their views are open. [Layout and the Contents pane](https://pro.arcgis.com/en/pro-app/latest/help/layouts/layout-contents-pane.htm), [Contents pane](https://pro.arcgis.com/en/pro-app/3.3/help/mapping/map-authoring/contents-pane.htm), and [Use the Catalog pane](https://pro.arcgis.com/en/pro-app/3.3/help/projects/the-project-pane.htm) jointly establish these scopes.

For RSrender, the transferable product pattern is therefore not a single all-purpose tree. The benchmark supports separate project/source navigation and an active-page Contents hierarchy, with stable identity, explicit ownership, top-item-is-front ordering, nested groups, persistent local visibility and lock state, contextual property editing, and derived/effective state. RSrender must depart from ArcGIS Pro's page model because a Boring Log needs independently diagnosable Reference Depth Ranges, Template Variants, and page-local override state across a visible multi-page sequence.

## Evidence labels and limits

- **Documented** means an official Esri source states the behavior directly.
- **Demonstrated** means an official Esri tutorial gives an observable workflow or screen behavior.
- **Inferred** means the conclusion combines documented facts but is not itself stated as a product contract. It is called out explicitly.
- “Current” official help pages are versioned dynamically. This note records the version displayed or indexed at research time. API pages are used as public behavioral evidence, not as an implementation recipe.
- No licensed ArcGIS Pro session was available in this task. Behaviors that would require direct observation—focus announcements for individual layout tree controls, exact drop indicators for every reparenting case, local child checkbox appearance while an ancestor is hidden, and maximum UI nesting depth—remain verification gaps.

## Atomic capability matrix

Priority uses **adopt**, **adapt**, **defer**, or **reject** for RSrender's destination.

### Project, document, and page ownership

| ID | ArcGIS Pro atomic capability | Evidence and status | Edge or persistence behavior | RSrender treatment |
|---|---|---|---|---|
| DM-01 | A project is the top-level persisted work artifact and contains maps, layouts, reports, and connections. | **Documented.** [Projects in ArcGIS Pro](https://pro.arcgis.com/en/pro-app/3.3/help/projects/what-is-a-project.htm) describes stored items and connections; [Save a project](https://pro.arcgis.com/en/pro-app/3.3/help/projects/save-a-project.htm) lists layouts and open/active views among saved information. | Referenced data itself is generally not stored in the project; connections are. Broken external resources are possible. | **Adapt.** A Log Project is top-level, but embeds Source Snapshots and required assets instead of emulating GIS connections. |
| DM-02 | A project may contain multiple independently named layouts. | **Documented.** [Layout—ArcPy](https://pro.arcgis.com/en/pro-app/3.6/arcpy/mapping/layout-class.htm) states a project can contain multiple layouts and exposes `listLayouts`. | Unique names are recommended for scripting, not guaranteed as identity. | **Adapt.** A Log Project contains a Log Set and Template Assignments; names are labels, stable IDs are identity. |
| DM-03 | A layout is a single physical page. | **Documented.** [Layout—ArcPy](https://pro.arcgis.com/en/pro-app/3.6/arcpy/mapping/layout-class.htm) calls it a “single-page layout.” [Layouts in ArcGIS Pro](https://pro.arcgis.com/en/pro-app/3.6/help/layouts/layouts-in-arcgis-pro.htm) describes elements on a virtual print page. | Multi-page output is achieved through a map series, not multiple independently composed pages within one layout. | **Reject literal model; adapt concepts.** A Boring Log must yield multiple page instances with independent Reference Depth Ranges and Template Variant roles. |
| DM-04 | Layout creation supports ANSI, Architectural, and ISO presets, a custom size, or a printer-derived size and margins. | **Documented.** [Add a layout to a project](https://pro.arcgis.com/en/pro-app/latest/help/layouts/add-a-layout-to-your-project.htm). | Documented maximum is 3,600 by 3,600 inches. | **Adopt concept.** Common presets plus validated custom physical dimensions; use actual chosen PDF-engine bounds rather than Esri's limit. |
| DM-05 | A layout owns page units, width, height, orientation, metadata, map-series settings, and color-management settings. | **Documented.** [Set up a layout](https://pro.arcgis.com/en/pro-app/latest/help/layouts/page-setup.htm); [Layout—ArcPy](https://pro.arcgis.com/en/pro-app/3.6/arcpy/mapping/layout-class.htm). | Changing page units also changes ruler and element size/position display units. Page resize may resize elements proportionally or leave them unchanged in the API. | **Adapt.** Physical canonical geometry with user-facing units; resizing behavior must be an explicit command, never implicit. Color management is deferred research. |
| DM-06 | A layout has stable identity distinct from its mutable name. | **Documented API evidence.** [Layout—ArcPy](https://pro.arcgis.com/en/pro-app/3.6/arcpy/mapping/layout-class.htm) documents a read-only URI that does not change after renaming. | The stable URI supports references even when the display name changes. | **Adopt.** Every Log Template, Template Variant, page instance, container, and element needs stable IDs independent of user names. |
| DM-07 | A layout contains dynamic and static elements. | **Documented.** [Work with layout elements](https://pro.arcgis.com/en/pro-app/3.3/help/layouts/work-with-layout-elements.htm) defines dynamic elements as updating with data or map extent and static elements as unchanged. | The common ownership and editing mechanism remains the same for both. | **Adopt and deepen.** Bound and static content share one scene hierarchy; bindings and Diagnostics are explicit. |
| DM-08 | A layout can be exported or printed at its page size; layout view is intended as WYSIWYG for the same output size. | **Documented.** [Layouts in ArcGIS Pro](https://pro.arcgis.com/en/pro-app/3.6/help/layouts/layouts-in-arcgis-pro.htm). | The promise is conditioned on printing/exporting to the same page size. | **Adopt as acceptance contract.** Canvas and PDF must derive from one page scene with physical-unit fidelity. |
| DM-09 | A map series generates multiple pages from one layout and shows one generated page at a time. | **Documented.** [Map series](https://pro.arcgis.com/en/pro-app/3.6/help/layouts/map-series.htm); [Search and navigate a map series](https://pro.arcgis.com/en/pro-app/3.6/help/layouts/search-and-navigate-map-series.htm). | Pages can be searched/navigated by name or number, but are not separately composed layouts. | **Adapt.** Keep deterministic generated pages, but show a continuous sequence and attach explicit per-page Reference Depth Range state. |
| DM-10 | Static layout elements are shared across map-series pages; dynamic elements update by current page. | **Documented.** [Map series](https://pro.arcgis.com/en/pro-app/3.6/help/layouts/map-series.htm). | [Refresh a map series](https://pro.arcgis.com/en/pro-app/3.6/help/layouts/refresh-map-series.htm) says any layout-element edit applies to all pages because there is one layout. | **Adapt.** Template Variant content is shared; project-local page overrides must be explicit and visibly marked. |
| DM-11 | Map-series definitions can be disabled without losing their settings, or removed and lose those settings. | **Documented.** [Map series](https://pro.arcgis.com/en/pro-app/3.6/help/layouts/map-series.htm). | Disabled state preserves configuration. | **Adopt principle.** Temporarily disabling generated content or a binding should preserve configuration separately from deletion. |
| DM-12 | Closing a view does not delete its project item. | **Demonstrated.** [Introducing ArcGIS Pro](https://doc.esri.com/en/arcgis-pro/latest/get-started/introducing-arcgis-pro.html) closes a map view, then reopens the still-present map from Catalog; deletion is a separate command. | View lifetime and document-item lifetime are separate. | **Adopt.** Closing a project tab/view must not mean deleting a Log Project, Template Variant, or page configuration. |
| DM-13 | One ArcGIS Pro instance opens one project; multiple projects require multiple application instances. | **Documented.** [Open a project](https://pro.arcgis.com/en/pro-app/3.6/help/projects/open-a-project.htm) says opening another project replaces the current one and multiple projects require multiple instances. | Opening a replacement project prompts first if the current project has unsaved changes. | **Adapt.** RSrender's settled model uses multiple Log Project tabs in one primary window, with isolated dirty and undo state. |

### Catalog and active Contents surfaces

| ID | ArcGIS Pro atomic capability | Evidence and status | Edge or persistence behavior | RSrender treatment |
|---|---|---|---|---|
| CT-01 | Catalog exposes project-level items in a type-organized tree. | **Documented.** [Use the Catalog pane](https://pro.arcgis.com/en/pro-app/3.3/help/projects/the-project-pane.htm). | Maps, layouts, connections, and other project resources can be found even when their views are closed. | **Adapt.** Explorations and Template Assignments belong in a project/source surface, separate from active-page Contents. |
| CT-02 | Contents is scoped to the active view. | **Documented and demonstrated.** [Layout and the Contents pane](https://pro.arcgis.com/en/pro-app/latest/help/layouts/layout-contents-pane.htm); [Introducing ArcGIS Pro](https://doc.esri.com/en/arcgis-pro/latest/get-started/introducing-arcgis-pro.html). | Switching active map/layout views changes what Contents represents. | **Adopt.** Contents represents the active Template Variant/page, with an unmistakable scope label. |
| CT-03 | A layout Contents root lists every layout element and layers nested within maps/scenes on the layout. | **Documented.** [Layout and the Contents pane](https://pro.arcgis.com/en/pro-app/latest/help/layouts/layout-contents-pane.htm). | Map frame subitems and ordinary layout elements coexist but have different ownership and operations. | **Adapt.** One hierarchy may expose semantic subitems, but each row must state type/ownership and prohibit invalid reparenting. |
| CT-04 | Layout Contents can switch projections: drawing order, element type, map-frame association, and map-series pages. | **Documented.** [Layout and the Contents pane](https://pro.arcgis.com/en/pro-app/latest/help/layouts/layout-contents-pane.htm). | The projections are alternate views, not mutations. Element-type view alphabetizes type categories; map-frame view excludes unassociated text/graphics. | **Defer alternate projections.** MVP requires canonical hierarchy, search/filter, and page navigation. Add type/binding/diagnostic projections only if user research justifies them. |
| CT-05 | Search filters layout elements by name; a single type filter can further limit visible rows without deleting elements. | **Documented.** [Layout and the Contents pane](https://pro.arcgis.com/en/pro-app/latest/help/layouts/layout-contents-pane.htm). | Only one type filter can apply at a time; “All” restores the full list. | **Adopt and improve.** Search by meaningful name/binding and allow clear, discoverable filters; filtered-out state must never imply deletion. |
| CT-06 | Right-clicking one or more selected elements exposes contextual commands. | **Documented.** [Layout and the Contents pane](https://pro.arcgis.com/en/pro-app/latest/help/layouts/layout-contents-pane.htm). | Available actions depend on selection and type. | **Adopt.** Essential actions must also exist outside context menus for discoverability and accessibility. |
| CT-07 | Catalog supports search, hover metadata, multiple selection, item-path copy, create/import, and explicit refresh. | **Documented.** [Use the catalog pane, catalog view, and browse dialog box](https://pro.arcgis.com/en/pro-app/2.6/help/projects/the-project-pane.htm). | External changes may not appear until refresh. | **Adapt.** Explorations pane needs search/filter/multiselect and deliberate Refresh; do not use path-centric metaphors for source records. |
| CT-08 | Project items such as layouts can be renamed, duplicated, copied between open projects, or deleted separately from closing views. | **Documented.** [Rename project items](https://pro.arcgis.com/en/pro-app/3.3/help/projects/rename-project-items.htm), [Copy and move items](https://pro.arcgis.com/en/pro-app/3.3/help/projects/copy-and-paste-project-items.htm), and [Introducing ArcGIS Pro](https://doc.esri.com/en/arcgis-pro/latest/get-started/introducing-arcgis-pro.html). | Items stored in a project can be copied between projects but not moved between them; deleting is explicit. | **Adapt.** Templates/elements can be copied with dependencies; Template Assignment and artifact deletion require distinct explicit commands. |
| CT-09 | A context selection exposes type-specific ribbon tabs and an Element pane; multi-selection exposes only common properties. | **Documented.** [Work with layout elements](https://pro.arcgis.com/en/pro-app/3.3/help/layouts/work-with-layout-elements.htm). | Common properties can be changed across selected elements. | **Adopt.** Properties shows common editable properties, mixed values, and exclusions; do not rely on a ribbon as the only route. |
| CT-10 | Activating a map frame changes the interaction mode from page-layout editing to map interaction and makes the rest of the layout unavailable until deactivation. | **Documented.** [Work with a map on a layout](https://pro.arcgis.com/en/pro-app/3.6/help/layouts/work-with-a-map-on-a-layout.htm). | Layout and embedded-content selection scopes are deliberately separated. | **Adapt principle.** Editing rich semantic internals may enter a clearly labeled focused mode, but routine Log Column formatting should not hide the surrounding page. |

### Element hierarchy, groups, and render order

| ID | ArcGIS Pro atomic capability | Evidence and status | Edge or persistence behavior | RSrender treatment |
|---|---|---|---|---|
| HR-01 | Drawing-order list is front-to-back: top rows render above lower rows. | **Documented.** [Layout and the Contents pane](https://pro.arcgis.com/en/pro-app/latest/help/layouts/layout-contents-pane.htm). | This ordering is the default layout Contents projection. | **Adopt exactly as an interaction rule.** Tree order and render order must not disagree within a container. |
| HR-02 | One or more selected elements can be dragged up/down to reorder. | **Documented.** [Layout and the Contents pane](https://pro.arcgis.com/en/pro-app/latest/help/layouts/layout-contents-pane.htm). | Certain subitems such as legend items and table fields are also reorderable. | **Adopt.** Show exact insertion/reparent target; validate semantic containers before commit. |
| HR-03 | Four discrete ordering commands exist: Bring To Front, Bring Forward, Send Backward, Send To Back. | **Documented.** [Layout and the Contents pane](https://pro.arcgis.com/en/pro-app/latest/help/layouts/layout-contents-pane.htm). | For a child of a group, these operate only inside the group; they do not ungroup/reparent it. | **Adopt.** Ordering commands are container-local and undoable; moving across a container is a distinct operation. |
| HR-04 | Ctrl-drag duplicates an element while moving it in the list; Copy/Paste is also available. | **Documented.** [Layout and the Contents pane](https://pro.arcgis.com/en/pro-app/latest/help/layouts/layout-contents-pane.htm). | Duplicate placement remains in the hierarchy/drawing-order interaction. | **Adopt concept.** Preserve styles, bindings, assets, and new stable IDs, with destination validation. |
| HR-05 | Selected elements can be grouped and a selected group can be ungrouped. | **Documented.** [Layout and the Contents pane](https://pro.arcgis.com/en/pro-app/latest/help/layouts/layout-contents-pane.htm). | A group can be moved, resized, or locked as a unit. | **Adopt.** A Group is a transformable container, distinct from Page Region, Log Column, Data Track, and Template Component. |
| HR-06 | Layout groups can nest. | **Documented API evidence.** [GroupElement](https://pro.arcgis.com/en/pro-app/latest/arcpy/mapping/groupelement-class.htm) states groups can be created inside groups. | Elements grouped together must initially be siblings at the same hierarchy level. Empty groups cannot be created through that API. | **Adopt nesting with a practical UI limit.** Require valid same-container selection for grouping; decide separately whether empty organizational groups are useful. |
| HR-07 | Group transforms affect all descendants. | **Documented.** [Work with layout elements](https://pro.arcgis.com/en/pro-app/3.6/help/layouts/work-with-layout-elements.htm) says changing a group's size scales its elements. | A multi-selection not grouped is treated item-by-item for numeric position, rather than as a temporary group. | **Adapt carefully.** Group transforms are composite; multi-edit semantics remain explicit and must avoid accidental distortion of semantic elements. |
| HR-08 | Layout subitems have domain-specific child order, not merely a flat z-list. | **Documented.** [Layout and the Contents pane](https://pro.arcgis.com/en/pro-app/latest/help/layouts/layout-contents-pane.htm) identifies map layers, legend items, and table fields as reorderable subitems. [Introducing ArcGIS Pro](https://doc.esri.com/en/arcgis-pro/latest/get-started/introducing-arcgis-pro.html) demonstrates a legend-item drag with a thin insertion line and live legend update. | Parent type constrains allowed child meaning. | **Adopt.** Data Layers, axes, Log Column items, and semantic subparts need typed containment and domain-specific reordering. |
| HR-09 | Map layers themselves use top-row-is-front drawing order. | **Documented.** [Layers](https://pro.arcgis.com/en/pro-app/3.6/help/mapping/layer-properties/layers.htm) and [Contents pane](https://pro.arcgis.com/en/pro-app/3.3/help/mapping/map-authoring/contents-pane.htm). | Lower rows draw first/below higher rows. | **Adopt for Data Layers.** One ordering convention throughout the product prevents mental inversion. |
| HR-10 | Group layers contain heterogeneous sublayers and tables, and can themselves be nested by moving content into parent groups. | **Documented.** [Work with group layers](https://pro.arcgis.com/en/pro-app/3.3/help/mapping/layer-properties/work-with-group-layers.htm) describes drag-into-group, ungroup-to-parent, and heterogeneous members. Nested layer groups are also implied by “parent group layer.” | Tables remain at the bottom because they do not draw. Ungroup moves sublayers to the parent and tables to Standalone Tables. | **Adapt.** Support nested semantic groups, but avoid invisible/nonrendering items in the render-order tree unless their role is explicit. |
| HR-11 | Map group layers have checkbox mode (many visible) and radio mode (at most one visible). | **Documented.** [Work with group layers](https://pro.arcgis.com/en/pro-app/3.3/help/mapping/layer-properties/work-with-group-layers.htm). | Returning from radio to checkbox can leave some layers off. | **Defer.** Mutually exclusive variants might later help alternative Data Layers, but MVP does not need a generic radio-group layer mode. |

### Visibility, locking, and effective state

| ID | ArcGIS Pro atomic capability | Evidence and status | Edge or persistence behavior | RSrender treatment |
|---|---|---|---|---|
| VL-01 | Every layout element has a visibility checkbox in Contents. | **Documented.** [Layout and the Contents pane](https://pro.arcgis.com/en/pro-app/latest/help/layouts/layout-contents-pane.htm). | Ctrl-click checks/unchecks all simultaneously; the display settings persist with the project. | **Adopt.** Persist local visibility per element; bulk changes are one undo transaction. |
| VL-02 | Visibility can be toggled for selected layout elements with Spacebar. | **Documented.** [Keyboard shortcuts for working on the layout](https://pro.arcgis.com/en/pro-app/3.5/help/layouts/keyboard-shortcuts-for-layouts.htm). | The shortcut depends on layout-view focus and selection. | **Adopt.** Provide keyboard-visible state changes and accessible announcements. |
| VL-03 | Layout locking prevents canvas selection, movement, and interactive resize, while allowing tree selection and Element-pane edits. | **Documented.** [Layout and the Contents pane](https://pro.arcgis.com/en/pro-app/latest/help/layouts/layout-contents-pane.htm) and [Work with layout elements](https://pro.arcgis.com/en/pro-app/3.2/help/layouts/work-with-layout-elements.htm). | Lock is not total immutability; property edits remain possible. | **Adopt with RSrender's settled rule.** Locked elements remain inspectable from Contents, with permitted property review and explicit unlock. |
| VL-04 | Grouping permits locking a group as a unit. | **Documented.** [Layout and the Contents pane](https://pro.arcgis.com/en/pro-app/latest/help/layouts/layout-contents-pane.htm). | Direct documentation does not specify whether descendant local lock flags are overwritten or merely made effectively locked. | **Adapt and make explicit.** Parent lock contributes to Effective Lock State and never overwrites child-local state. |
| VL-05 | Hiding a map group layer hides all sublayers; group display properties override sublayer properties while sublayers retain most properties. | **Documented.** [Work with group layers](https://pro.arcgis.com/en/pro-app/3.3/help/mapping/layer-properties/work-with-group-layers.htm). | Transparency, blending, visibility range, and visibility at the group can affect all descendants. | **Adopt the effective-state concept.** Effective Visibility is ancestor local visibility AND descendant local visibility; retain child-local distinctions. |
| VL-06 | A checked layer may still not draw because its scale range excludes the current scale, and Contents visually distinguishes that case. | **Documented.** [Contents pane](https://pro.arcgis.com/en/pro-app/3.3/help/mapping/map-authoring/contents-pane.htm) and [Display layers at certain scales](https://pro.arcgis.com/en/pro-app/3.3/help/mapping/layer-properties/display-layers-at-certain-scales.htm). | Local “on” and effective “currently drawn” are separate states. | **Adopt principle.** Contents must distinguish local visibility from suppressed-by-parent, binding policy, Template Variant, page range, or Diagnostic state. |
| VL-07 | Map Contents separates visibility, selectability, editability, snapping participation, and labeling into different state views. | **Documented.** [Contents pane](https://pro.arcgis.com/en/pro-app/3.3/help/mapping/map-authoring/contents-pane.htm). | A layer can be visible yet nonselectable/noneditable/nonsnappable; not all layer types support every state. | **Adapt.** Do not overload visibility or lock. Selection eligibility, Effective Lock State, binding availability, export inclusion, and warnings are distinct attributes. |
| VL-08 | A map's group layer can impose effects and visibility range across descendants without destroying their individual properties. | **Documented.** [Work with group layers](https://pro.arcgis.com/en/pro-app/3.3/help/mapping/layer-properties/work-with-group-layers.htm). | Ancestor presentation state composes with child state. | **Defer generalized inherited styling.** MVP needs inherited visibility/lock and group transforms; broad compositing inheritance requires renderer research. |
| VL-09 | PDF export may optionally include non-visible map layers while retaining their visibility status. | **Documented.** [Export to PDF](https://pro.arcgis.com/en/pro-app/3.6/help/sharing/overview/pdf-export.htm). | Unchecked layers can remain optional PDF layers if explicitly requested. | **Reject for MVP.** Hidden RSrender elements do not enter the authoritative publication unless a later explicit layered-PDF feature is designed. |

### Map/frame/layer reference model

| ID | ArcGIS Pro atomic capability | Evidence and status | Edge or persistence behavior | RSrender treatment |
|---|---|---|---|---|
| RF-01 | A map frame is a layout-owned container that points to any map/scene in the project or to no map. | **Documented.** [Work with a map on a layout](https://pro.arcgis.com/en/pro-app/3.6/help/layouts/work-with-a-map-on-a-layout.htm). | Empty frames can later be populated. | **Adapt.** A Log Column or Data Track owns a typed binding to Render Dataset content; an unbound semantic element remains editable with Example Dataset support. |
| RF-02 | Multiple map frames can exist on a layout and more than one frame may reference the same map. | **Documented.** [Layouts in ArcGIS Pro](https://pro.arcgis.com/en/pro-app/3.6/help/layouts/layouts-in-arcgis-pro.htm) and [Migrating from arcpy.mapping](https://pro.arcgis.com/en/pro-app/latest/arcpy/mapping/migratingfrom10xarcpymapping.htm). | Frame geometry/extent is separate from the referenced map/layer model. | **Adopt separation.** Multiple rendered views can bind to the same source records without duplicating Source Data. |
| RF-03 | Layout Contents can expose layers belonging to contained maps/scenes. | **Documented.** [Layout and the Contents pane](https://pro.arcgis.com/en/pro-app/latest/help/layouts/layout-contents-pane.htm). | The embedded tree blends referenced-model children with layout-owned elements. | **Adapt cautiously.** Show Data Layers under their owning Data Track; source fields may appear in a field browser, not masquerade as layout-owned elements. |
| RF-04 | Map layers reference data sources rather than owning source data. | **Documented.** [Layers](https://pro.arcgis.com/en/pro-app/3.6/help/mapping/layer-properties/layers.htm); [Save project SDK reference](https://pro.arcgis.com/en/pro-app/latest/sdk/api-reference/topic9203.html). | Missing/moved data breaks drawing while layer configuration remains. | **Adapt with stronger portability.** Source Snapshot and assets are packaged; missing bindings/assets produce Diagnostics rather than silent broken drawing. |
| RF-05 | Layout surrounds can depend on a map frame and update when its referenced map changes. | **Documented.** [Layout files](https://pro.arcgis.com/en/pro-app/3.6/help/layouts/layout-files.htm) documents legends/north arrows around empty frames updating after a map is assigned. | Table/chart auto-selection can be ambiguous and may require manual correction. | **Adopt typed dependencies, reject heuristic rebinding.** Dependents update live, but ambiguous target selection must produce an explicit choice/Diagnostic. |
| RF-06 | A map and its frame have separate view state: changing the frame's map or extent changes rendered content without changing frame layout geometry. | **Demonstrated.** [Get started with ArcGIS Pro](https://learn.arcgis.com/en/projects/get-started-with-arcgis-pro/) changes the frame's map and then its extent; [Work with a map on a layout](https://pro.arcgis.com/en/pro-app/3.6/help/layouts/work-with-a-map-on-a-layout.htm) defines activation. | Layout and map extents are independent. | **Adopt concept.** Element geometry is separate from binding/render parameters such as Reference Depth Range and axis range. |

### Persistence, sharing, and failure edges

| ID | ArcGIS Pro atomic capability | Evidence and status | Edge or persistence behavior | RSrender treatment |
|---|---|---|---|---|
| PS-01 | Saving a project persists project-owned items, resource connections, available styles, and open/active view state. | **Documented.** [Save a project](https://pro.arcgis.com/en/pro-app/3.3/help/projects/save-a-project.htm). | Layout visibility settings and drawing order persist with project saves. | **Adopt selectively.** Persist document state; store workspace view state separately so zoom/pane state does not dirty the Log Project. |
| PS-02 | Project save replaces the existing project representation and can fail for missing path, full disk, write error, read-only project, or another process using the file. | **Documented API behavior.** [SaveAsync](https://pro.arcgis.com/en/pro-app/latest/sdk/api-reference/topic9203.html). | Simultaneous use can prevent saving. | **Adopt failure taxonomy; improve durability.** Atomic writes, validation, clear actionable failures, and no corruption of prior good file. |
| PS-03 | Timed project backups can preserve some or all unsaved changes and prompt recovery after unexpected shutdown. | **Documented.** [Save a project](https://pro.arcgis.com/en/pro-app/3.3/help/projects/save-a-project.htm). | Backup is a separate copy; normal manual save remains available. | **Adopt.** Separate integrity-checked Recovery Candidates; recover/discard/compare deliberately; never overwrite the Authoritative File as recovery. |
| PS-04 | A `.pagx` layout file is an external reusable layout artifact containing page, elements, and referenced maps/layers, but not underlying data. | **Documented.** [Save a layout file](https://pro.arcgis.com/en/pro-app/3.5/help/sharing/overview/save-a-layout-file.htm) and [Layout files](https://pro.arcgis.com/en/pro-app/3.6/help/layouts/layout-files.htm). | It can carry empty frames or references; populated layouts break if data paths are inaccessible. | **Adapt.** A Log Template is reusable and carries its Example Dataset/assets; a Log Project carries one accepted Source Snapshot, validated Supplemental Sources, Embedded Template Representations, and required assets. Normal reopening never depends on fragile external paths. |
| PS-05 | Importing a layout file creates a project layout; later editing the source file's metadata does not update the imported layout/gallery entry. | **Documented.** [Add a layout to a project](https://pro.arcgis.com/en/pro-app/latest/help/layouts/add-a-layout-to-your-project.htm). | Import is copy-like, not live linked revision propagation. | **Partially reject.** RSrender keeps a stable-ID Template Assignment and the current Embedded Template Representation needed for offline continuity. Project-local edits do not silently alter the assigned Log Template, and missing or changed library content is never silently substituted; exact export severity remains an open product decision. |
| PS-06 | Importing a layout normally copies referenced maps; “Reuse existing maps” avoids duplicates where matches exist. | **Documented.** [Add a layout to a project](https://pro.arcgis.com/en/pro-app/latest/help/layouts/add-a-layout-to-your-project.htm). | Any nonmatching map is still copied. | **Adapt.** Pasting/importing copies required styles/assets, while stable IDs and explicit mapping prevent accidental duplicate or misbound semantic content. |
| PS-07 | Layout files saved in newer product generations are not backward compatible with pre-2.0 versions; projects are forward-compatible to later releases. | **Documented.** [Save a layout file](https://pro.arcgis.com/en/pro-app/3.5/help/sharing/overview/save-a-layout-file.htm) and [Save a project](https://pro.arcgis.com/en/pro-app/3.3/help/projects/save-a-project.htm). | Some old-version edge cases drop unsupported content, such as tables in group layers when opened before 2.9. | **Adopt explicit versioning/migrations, improve safety.** Back up before migration and reject unknown newer content rather than dropping it. |
| PS-08 | Cloud-sync folders are not generally supported for projects unless specifically documented. | **Documented caution.** [Save a project](https://pro.arcgis.com/en/pro-app/3.3/help/projects/save-a-project.htm). | Concurrent/sync semantics can undermine save reliability. | **Research prerequisite.** Test Windows local, network-share, and synchronized-folder behavior before promising support. |
| PS-09 | Layout display state and map drawing order persist only when the project is saved. | **Documented.** [Layout and the Contents pane](https://pro.arcgis.com/en/pro-app/latest/help/layouts/layout-contents-pane.htm); [Contents pane](https://pro.arcgis.com/en/pro-app/3.3/help/mapping/map-authoring/contents-pane.htm). | The map Contents documentation warns that prior drawing order cannot be recovered in-session in that workflow. | **Improve.** Every hierarchy mutation is undoable, dirty state is explicit, and saved state is deterministic. |
| PS-10 | The project has an explicit dirty state, and replacing an open project prompts when unsaved changes exist. | **Documented.** [Project—ArcGIS Pro SDK](https://pro.arcgis.com/en/pro-app/latest/sdk/api-reference/topic9189.html) exposes `IsDirty`; [Open a project](https://pro.arcgis.com/en/pro-app/3.6/help/projects/open-a-project.htm) documents the save prompt. | Backup creation can be conditioned on unsaved changes. | **Adapt and deepen.** Track dirty state independently for each Log Project and edited Log Template; close/open prompts enumerate every dirty artifact. |
| PS-11 | A second opener of a network-hosted project receives read-only status; layouts can still be changed in memory but require Save As to preserve those changes. | **Documented.** [Open a project](https://pro.arcgis.com/en/pro-app/3.6/help/projects/open-a-project.htm). | Read-only state is indicated in the title bar and a message bar. | **Adopt the safety behavior.** Detect write/lock status early, make it persistent and non-color-only in UI, and offer deliberate Save As without pretending the original was saved. |
| PS-12 | Recovery compares timestamps and asks whether to open backup, original, or cancel; choosing the backup deletes ArcGIS Pro's original project file. | **Documented.** [Open a project](https://pro.arcgis.com/en/pro-app/3.6/help/projects/open-a-project.htm). | Recovery is offered only when the backup is newer. | **Adapt more conservatively.** Offer recover/discard/compare and preserve both representations until the user confirms save or discard. |

### Keyboard and accessibility implications

| ID | ArcGIS Pro atomic capability or limitation | Evidence and status | RSrender requirement derived from it |
|---|---|---|---|
| AX-01 | Panes and hierarchical lists are keyboard navigable using Tab, arrows, plus/minus, and expansion shortcuts; Space toggles layer visibility. | **Documented.** [Use ArcGIS Pro with a keyboard](https://pro.arcgis.com/en/pro-app/3.6/get-started/keyboard-shortcuts.htm) and [ArcGIS Pro keyboard shortcuts](https://pro.arcgis.com/en/pro-app/3.3/get-started/arcgis-pro-keyboard-shortcuts.htm). | Contents must implement a conventional accessible tree: explicit focus, arrow traversal, expand/collapse, multiselect, state toggle, rename, reorder commands, and return-to-canvas behavior. |
| AX-02 | Layout operations include keyboard select all/deselect, visibility toggle, delete, clipboard, group/ungroup, and precise nudges. | **Documented.** [Keyboard shortcuts for working on the layout](https://pro.arcgis.com/en/pro-app/3.5/help/layouts/keyboard-shortcuts-for-layouts.htm). | Each core tree/canvas mutation requires a non-pointer path and a meaningful undo label. |
| AX-03 | Some drag-dependent layout tasks require Windows Mouse Keys; Esri does not claim full native keyboard equivalence. | **Documented.** [Use ArcGIS Pro with a keyboard](https://pro.arcgis.com/en/pro-app/3.6/get-started/keyboard-shortcuts.htm). | RSrender should exceed the benchmark: create/resize/reorder/reparent must have direct keyboard/numeric commands, not require OS pointer emulation. |
| AX-04 | Esri states screen-reader support including JAWS and NVDA, subject to the visual nature of GIS. | **Documented.** [Accessibility in ArcGIS Pro](https://pro.arcgis.com/en/pro-app/3.6/get-started/overview-of-accessibility.htm). | Contents and Properties must be the complete semantic representation of the visual scene, not a secondary convenience. |
| AX-05 | ArcGIS Pro 3.7's June 2026 ACR rates keyboard operation “Partially Supports” because some controls cannot be navigated or operated by keyboard alone. | **Documented evaluated limitation.** [ArcGIS Pro 3.7 Accessibility Conformance Report](https://www.esri.com/content/dam/esrisites/en-us/media/legal/vpats/arcgis-pro-37-vpat.pdf), WCAG 2.1.1, p. 18. | Do not treat ArcGIS behavior as the accessibility ceiling. Maintain a keyboard-only acceptance suite for every critical document workflow. |
| AX-06 | The 3.7 ACR reports some controls do not expose appropriate name, role, or state; some values/actions/focus changes are not fully available to assistive technology. | **Documented evaluated limitation.** [ArcGIS Pro 3.7 Accessibility Conformance Report](https://www.esri.com/content/dam/esrisites/en-us/media/legal/vpats/arcgis-pro-37-vpat.pdf), pp. 43–46 and 66–70. | Every Contents row must expose name, semantic type, hierarchy level, expanded/selected state, local and effective visibility/lock, binding/Diagnostic status, and available actions. Changes must announce. |
| AX-07 | Tagged PDF reading order follows layout drawing order; map frames, pictures, and chart frames can have alt text. | **Documented.** [Export to PDF](https://pro.arcgis.com/en/pro-app/3.6/help/sharing/overview/pdf-export.htm). | Visual z-order and publication reading order are different user intents. RSrender should not conflate them; define explicit accessible reading order or validate a deliberate mapping. |
| AX-08 | ArcGIS Pro supports scaling, reduced motion, contrast themes, and color filters, but contrast themes do not change maps/layouts. | **Documented.** [Visual modes of operation](https://pro.arcgis.com/en/pro-app/3.6/get-started/visual-mode-of-operation.htm). | Scale application chrome independently of physical document zoom; use non-color-only tree state; honor reduced motion; keep printed design user-controlled with separate contrast Diagnostics. |

## Derived reference model for RSrender

The sources support the following clean-room ownership model. This is an **RSrender inference and recommendation**, not an assertion about Esri internals:

```text
Log Project
├─ Log Set
│  ├─ exploration order and groups
│  └─ Template Assignments
├─ Source Snapshot
├─ Supplemental Sources
├─ Embedded Template Representations
├─ Presentation Overrides
├─ derived Render Dataset (not retained source truth)
└─ workspace/document state

Log Template (current referenced artifact)
├─ stable template ID
├─ page geometry and physical units
├─ Example Dataset(s)
├─ Template Variants
│  ├─ Header Page Region
│  ├─ Depth Body Page Region
│  │  ├─ Log Columns
│  │  ├─ Data Tracks
│  │  │  └─ ordered Data Layers
│  │  ├─ nested Groups
│  │  └─ graphics/text
│  └─ Footer Page Region
├─ Named Styles
└─ embedded assets

Generated Boring Log page instance
├─ exploration identity
├─ Template Variant role
├─ Reference Depth Range
├─ explicit page-local override markers
└─ derived render scene and Diagnostics
```

Key consequences:

1. **Separate ownership from presentation.** A Contents row must know whether it is template-owned, project-local, generated, or referenced. ArcGIS Pro's map-frame/layer split shows why a visually nested child is not necessarily owned by its visible parent.
2. **Use stable IDs everywhere.** Names are user labels and may repeat; relationships, overrides, suppressions, clipboard imports, and future MCP commands bind to stable IDs.
3. **Make container-local order canonical.** Top row renders in front inside each container. Bring/send commands never silently reparent.
4. **Keep local state and effective state distinct.** An ancestor can make a descendant effectively hidden or locked without erasing the descendant's local setting.
5. **Make generated pages first-class enough for boring logs.** Unlike ArcGIS map-series pages, each needs inspectable Reference Depth Range, coverage Diagnostics, Template Variant role, and deliberate project-local overrides.
6. **Avoid one overloaded catalog tree.** Explorations/assignments and active-page rendering hierarchy are different tasks and need different panes, consistent with the settled Explorations/Contents/Properties model.
7. **Expose semantic subtrees without flattening them.** Data Layers can be reordered under a Data Track, but axes and source bindings are typed children/properties, not arbitrary graphics.
8. **Treat accessibility structure as product structure.** The tree and Properties pane must enable the entire workflow when the canvas cannot convey it.

## Behavior rules ready for specification synthesis

These rules are evidence-backed adaptations and can be promoted into the UX/domain specifications without further product invention:

- The Contents root always names its active Template Variant/page scope.
- Within a container, row order is front-to-back and matches render order.
- Dragging shows whether the operation is reorder, reparent, or invalid before drop.
- Bring/Send operations remain within the current container.
- Group creates a new parent around selected siblings; Ungroup promotes children to the group's parent without changing their relative order.
- Local visibility and local lock are persisted separately from Effective Visibility and Effective Lock State.
- A hidden ancestor does not clear child visibility settings; a locked ancestor does not clear child lock settings.
- Locked elements are not canvas-selectable or transformable but remain tree-selectable for inspection and unlocking.
- Hidden elements are not canvas-selectable; tree metadata remains available.
- Search/filter never removes or mutates elements and always indicates that a filtered view is active.
- Every rendered object has a stable ID and user-facing name; rename never changes references.
- Closing a page/project view is distinct from deleting an artifact or hierarchy node.
- The accessibility tree exposes type, parent, position among siblings, local/effective states, selection, lock, binding, Diagnostic, and actions.
- Visual draw order must not silently define publication reading order; the latter needs a specified, testable policy.

## Known ArcGIS edge cases and negative lessons

- **One-layout-many-pages is shared composition, not per-page composition.** In a map series, changing an element on one page changes all pages. RSrender needs explicit page-local override semantics to prevent accidental global changes.
- **A local “visible” checkbox does not guarantee current rendering.** Scale ranges and ancestors can suppress output. RSrender must show why something is effectively absent.
- **Referenced content can break.** A `.pagx` file carries paths rather than data. RSrender's self-contained packages and Diagnostics should avoid this fragility.
- **Typed child lists behave differently.** Maps, legends, and table frames have reorderable children with separate domain semantics. RSrender must validate containment rather than treating the tree as arbitrary folders.
- **Backward compatibility can lose unsupported content.** Esri documents tables being dropped when newer group-layer content is opened in an older release. RSrender must reject unknown content instead of silently deleting it.
- **Visual z-order can become assistive reading order.** ArcGIS tagged PDF does this, but that coupling may produce poor reading order. RSrender needs an explicit decision.
- **The mature benchmark still has keyboard/assistive-technology gaps.** The ArcGIS Pro 3.7 ACR explicitly identifies them; clean-room parity should not replicate them.

## Unresolved verification and follow-on questions

These are not product-decision blockers for this ticket, but should be assigned to later interaction research/prototypes:

1. Observe ArcGIS Pro 3.7 directly with nested layout groups to record exact selection, expansion, child visibility, and lock icon behavior when ancestors are hidden/locked.
2. Verify whether the layout UI permits arbitrary nested group creation at all depths and how it handles reparenting across levels; public API evidence confirms nesting but not a UI depth contract.
3. Test screen-reader announcements for Contents rows, drag/reorder alternatives, lock/visibility controls, group states, and the transition into activated embedded content.
4. Decide an RSrender publication reading-order model independent of render order, then test tagged PDF support in candidate PDF backends.
5. Prototype atomic package saves and recovery on local disks, company network paths, and supported synchronized folders.
6. Specify behavior when a template-owned element and a project-local page override appear in the same Contents hierarchy, including names, badges, ordering, and reset commands.

## Primary-source index

Sources were accessed 2026-08-13 unless otherwise noted.

- [ArcGIS Pro 3.7 Accessibility Conformance Report](https://www.esri.com/content/dam/esrisites/en-us/media/legal/vpats/arcgis-pro-37-vpat.pdf) — Esri, report dated 2026-06-01 and updated 2026-07-02; accessibility test evidence.
- [Accessibility in ArcGIS Pro 3.6](https://pro.arcgis.com/en/pro-app/3.6/get-started/overview-of-accessibility.htm) — official help.
- [Add a layout to a project](https://pro.arcgis.com/en/pro-app/latest/help/layouts/add-a-layout-to-your-project.htm) — current official help.
- [ArcGIS Pro keyboard shortcuts](https://pro.arcgis.com/en/pro-app/3.3/get-started/arcgis-pro-keyboard-shortcuts.htm) — versioned official help.
- [Contents pane](https://pro.arcgis.com/en/pro-app/3.3/help/mapping/map-authoring/contents-pane.htm) — versioned official help.
- [Copy and move items](https://pro.arcgis.com/en/pro-app/3.3/help/projects/copy-and-paste-project-items.htm) — versioned official help.
- [Export to PDF](https://pro.arcgis.com/en/pro-app/3.6/help/sharing/overview/pdf-export.htm) — versioned official help.
- [Get started with ArcGIS Pro](https://learn.arcgis.com/en/projects/get-started-with-arcgis-pro/) — official Esri tutorial.
- [GroupElement—ArcPy](https://pro.arcgis.com/en/pro-app/latest/arcpy/mapping/groupelement-class.htm) — current public API reference.
- [Introducing ArcGIS Pro](https://doc.esri.com/en/arcgis-pro/latest/get-started/introducing-arcgis-pro.html) — current official tutorial mirror.
- [Keyboard shortcuts for working on the layout](https://pro.arcgis.com/en/pro-app/3.5/help/layouts/keyboard-shortcuts-for-layouts.htm) — versioned official help.
- [Layout and the Contents pane](https://pro.arcgis.com/en/pro-app/latest/help/layouts/layout-contents-pane.htm) — current official help.
- [Layout—ArcPy](https://pro.arcgis.com/en/pro-app/3.6/arcpy/mapping/layout-class.htm) — versioned public API reference.
- [Layout—ArcGIS Pro SDK](https://pro.arcgis.com/en/pro-app/latest/sdk/api-reference/topic11085.html) — ArcGIS Pro 3.6 public API reference, published 2025.
- [Layout files](https://pro.arcgis.com/en/pro-app/3.6/help/layouts/layout-files.htm) — versioned official help.
- [Layouts in ArcGIS Pro](https://pro.arcgis.com/en/pro-app/3.6/help/layouts/layouts-in-arcgis-pro.htm) — versioned official help.
- [Layers](https://pro.arcgis.com/en/pro-app/3.6/help/mapping/layer-properties/layers.htm) — versioned official help.
- [Map series](https://pro.arcgis.com/en/pro-app/3.6/help/layouts/map-series.htm) — versioned official help.
- [Migrating from arcpy.mapping to ArcGIS Pro](https://pro.arcgis.com/en/pro-app/latest/arcpy/mapping/migratingfrom10xarcpymapping.htm) — current official API guidance.
- [Projects in ArcGIS Pro](https://pro.arcgis.com/en/pro-app/3.3/help/projects/what-is-a-project.htm) — versioned official help.
- [Project—ArcGIS Pro SDK](https://pro.arcgis.com/en/pro-app/latest/sdk/api-reference/topic9189.html) — ArcGIS Pro 3.6 public API reference, published 2025.
- [Open a project](https://pro.arcgis.com/en/pro-app/3.6/help/projects/open-a-project.htm) — versioned official help.
- [Refresh a map series](https://pro.arcgis.com/en/pro-app/3.6/help/layouts/refresh-map-series.htm) — versioned official help.
- [Rename project items](https://pro.arcgis.com/en/pro-app/3.3/help/projects/rename-project-items.htm) — versioned official help.
- [Save a layout file](https://pro.arcgis.com/en/pro-app/3.5/help/sharing/overview/save-a-layout-file.htm) — versioned official help.
- [Save a project](https://pro.arcgis.com/en/pro-app/3.3/help/projects/save-a-project.htm) — versioned official help.
- [SaveAsync—ArcGIS Pro SDK](https://pro.arcgis.com/en/pro-app/latest/sdk/api-reference/topic9203.html) — public API reference.
- [Search and navigate a map series](https://pro.arcgis.com/en/pro-app/3.6/help/layouts/search-and-navigate-map-series.htm) — versioned official help.
- [Set up a layout](https://pro.arcgis.com/en/pro-app/latest/help/layouts/page-setup.htm) — current official help; embedded videos identify ArcGIS Pro 3.2/3.3 behavior.
- [Use ArcGIS Pro with a keyboard](https://pro.arcgis.com/en/pro-app/3.6/get-started/keyboard-shortcuts.htm) — versioned official help.
- [Use the Catalog pane](https://pro.arcgis.com/en/pro-app/3.3/help/projects/the-project-pane.htm) — versioned official help.
- [Visual modes of operation](https://pro.arcgis.com/en/pro-app/3.6/get-started/visual-mode-of-operation.htm) — versioned official help.
- [Work with a map on a layout](https://pro.arcgis.com/en/pro-app/3.6/help/layouts/work-with-a-map-on-a-layout.htm) — versioned official help.
- [Work with group layers](https://pro.arcgis.com/en/pro-app/3.3/help/mapping/layer-properties/work-with-group-layers.htm) — versioned official help.
- [Work with layout elements](https://pro.arcgis.com/en/pro-app/3.6/help/layouts/work-with-layout-elements.htm) — versioned official help.
