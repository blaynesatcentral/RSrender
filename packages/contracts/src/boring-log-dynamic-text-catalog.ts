import {
  dynamicTextCatalogSchemaVersion,
  type DynamicTextCatalog,
  type DynamicTextValueKind,
  type DynamicTextVariableDefinition,
} from "./dynamic-text-contract.js";

export const boringLogDynamicTextCatalogRevision =
  "bld-056-boring-log-dynamic-text-catalog-v1" as const;

type DefinitionInput = Readonly<{
  readonly identifier: string;
  readonly label: string;
  readonly description: string;
  readonly category: string;
  readonly valueKind: DynamicTextValueKind;
  readonly providerMappingKey: string | null;
}>;

const definitionInputs: readonly DefinitionInput[] = Object.freeze([
  {
    identifier: "project_name",
    label: "Project name",
    description: "Current Source Project display name",
    category: "Project",
    valueKind: "text",
    providerMappingKey: "rslog.project.name",
  },
  {
    identifier: "project_number",
    label: "Project number",
    description: "Current Source Project number",
    category: "Project",
    valueKind: "text",
    providerMappingKey: "rslog.project.number",
  },
  {
    identifier: "client_name",
    label: "Client name",
    description: "Client associated with the current Source Project",
    category: "Project",
    valueKind: "text",
    providerMappingKey: "rslog.project.client_name",
  },
  {
    identifier: "project_location",
    label: "Project location",
    description: "Location recorded for the current Source Project",
    category: "Project",
    valueKind: "text",
    providerMappingKey: "rslog.project.location",
  },
  {
    identifier: "boring_name",
    label: "Boring name",
    description: "Current Exploration display name",
    category: "Exploration",
    valueKind: "text",
    providerMappingKey: "rslog.exploration.name",
  },
  {
    identifier: "exploration_id",
    label: "Exploration ID",
    description: "Stable identity of the current Exploration",
    category: "Exploration",
    valueKind: "text",
    providerMappingKey: "rslog.exploration.id",
  },
  {
    identifier: "coordinates",
    label: "Coordinates",
    description: "Formatted coordinates of the current Exploration",
    category: "Exploration",
    valueKind: "text",
    providerMappingKey: "rslog.exploration.coordinates",
  },
  {
    identifier: "coordinate_datum",
    label: "Coordinate datum",
    description: "Coordinate reference datum",
    category: "Exploration",
    valueKind: "text",
    providerMappingKey: "rslog.exploration.coordinate_datum",
  },
  {
    identifier: "ground_elevation_ft",
    label: "Ground elevation (ft)",
    description: "Ground elevation in feet",
    category: "Exploration",
    valueKind: "number",
    providerMappingKey: "rslog.exploration.ground_elevation_ft",
  },
  {
    identifier: "elevation_datum",
    label: "Elevation datum",
    description: "Vertical datum used by ground elevation",
    category: "Exploration",
    valueKind: "text",
    providerMappingKey: "rslog.exploration.elevation_datum",
  },
  {
    identifier: "total_depth_ft",
    label: "Total depth (ft)",
    description: "Total depth of the current Exploration in feet",
    category: "Exploration",
    valueKind: "number",
    providerMappingKey: "rslog.exploration.total_depth_ft",
  },
  {
    identifier: "completion_depth_ft",
    label: "Completion depth (ft)",
    description: "Completion depth of the current Exploration in feet",
    category: "Exploration",
    valueKind: "number",
    providerMappingKey: "rslog.exploration.completion_depth_ft",
  },
  {
    identifier: "drilled_date",
    label: "Drilled date",
    description: "Formatted drilling date",
    category: "Drilling",
    valueKind: "date",
    providerMappingKey: "rslog.exploration.drilled_date",
  },
  {
    identifier: "boring_method",
    label: "Boring method",
    description: "Boring or drilling method",
    category: "Drilling",
    valueKind: "text",
    providerMappingKey: "rslog.exploration.boring_method",
  },
  {
    identifier: "hole_diameter",
    label: "Hole diameter",
    description: "Formatted hole diameter",
    category: "Drilling",
    valueKind: "text",
    providerMappingKey: "rslog.exploration.hole_diameter",
  },
  {
    identifier: "rig_driller",
    label: "Rig and driller",
    description: "Drill rig and driller description",
    category: "Drilling",
    valueKind: "text",
    providerMappingKey: "rslog.exploration.rig_driller",
  },
  {
    identifier: "hammer_type",
    label: "Hammer type",
    description: "SPT hammer type",
    category: "Drilling",
    valueKind: "text",
    providerMappingKey: "rslog.exploration.hammer_type",
  },
  {
    identifier: "hammer_drop",
    label: "Hammer drop",
    description: "Formatted hammer drop",
    category: "Drilling",
    valueKind: "text",
    providerMappingKey: "rslog.exploration.hammer_drop",
  },
  {
    identifier: "hammer_efficiency",
    label: "Hammer efficiency",
    description: "Formatted hammer efficiency",
    category: "Drilling",
    valueKind: "text",
    providerMappingKey: "rslog.exploration.hammer_efficiency",
  },
  {
    identifier: "logged_by",
    label: "Logged by",
    description: "Person who logged the current Exploration",
    category: "Review",
    valueKind: "text",
    providerMappingKey: "rslog.exploration.logged_by",
  },
  {
    identifier: "checked_by",
    label: "Checked by",
    description: "Person who checked the current Exploration",
    category: "Review",
    valueKind: "text",
    providerMappingKey: "rslog.exploration.checked_by",
  },
  {
    identifier: "groundwater_summary",
    label: "Groundwater summary",
    description: "Groundwater summary for the current Exploration",
    category: "Exploration",
    valueKind: "text",
    providerMappingKey: "rslog.exploration.groundwater_summary",
  },
  {
    identifier: "company_name",
    label: "Company name",
    description: "Company name displayed by the Log Template",
    category: "Template",
    valueKind: "text",
    providerMappingKey: null,
  },
  {
    identifier: "company_contact",
    label: "Company contact",
    description: "Company contact line displayed by the Log Template",
    category: "Template",
    valueKind: "text",
    providerMappingKey: null,
  },
  {
    identifier: "sheet_label",
    label: "Sheet label",
    description: "Current sheet label",
    category: "Publication",
    valueKind: "text",
    providerMappingKey: null,
  },
]);

const definitions: readonly DynamicTextVariableDefinition[] = Object.freeze(
  definitionInputs.map((definition, index) =>
    Object.freeze({
      ...definition,
      missingValuePolicy: "error" as const,
      order: (index + 1) * 10,
    }),
  ),
);

/** Discoverable, inert Dynamic Text variables admitted for the boring-log authoring surface. */
export const boringLogDynamicTextCatalog: DynamicTextCatalog = Object.freeze({
  schemaVersion: dynamicTextCatalogSchemaVersion,
  definitions,
});
