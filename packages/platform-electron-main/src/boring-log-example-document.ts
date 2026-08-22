/** Production-owned source for the editable example bundle written beside the packaged app. */
export const boringLogExampleDocumentRevision = "bld-032-example-document-v1" as const;
export const boringLogExampleDocumentSource = `
{
  "contractVersion": 1,
  "schemaVersion": "rsrender.boring-log-layout-job.v1",
  "kind": "boring-log.layout-job",
  "jobId": "job:rsrender-example-boring-log@r1",
  "inputRevision": 1,
  "fixtureDigest": "sha256:e93e5352f12c8ea89e92dc2dcb7ae9d3762897ca734ec36eebcc37b29276b771",
  "templateDigest": "sha256:04035bdc50c92f54d54d7eb5f677b76e16259eae08fe0c7f2d76a423c46a12fb",
  "document": {
    "schemaVersion": "rsrender.boring-log-mvp-fixture.v1",
    "fixtureId": "mvp-boring-log-test-01@r3",
    "fixtureRevision": 3,
    "evidenceClass": "synthetic-coverage-only",
    "representativeClaimAllowed": false,
    "publicationEligibility": "example-dataset-only",
    "identity": {
      "boringLogId": "urn:rsrender:boring-log:test-01",
      "explorationId": "urn:rsrender:exploration:test-01",
      "pageId": "urn:rsrender:page:test-01:1"
    },
    "metadata": {
      "companyName": "Synthetic Geotechnical Services",
      "companyContactSubtitle": "4800 Innovation Way, Salem, OR 97301 · (503) 555-0142",
      "documentTitle": "BORING LOG TEST-01",
      "sheetLabel": "SHEET 1 OF 1",
      "clientName": "Northbank Community Partners",
      "projectName": "Riverside Mixed-Use Development",
      "projectNumber": "SGS-24057",
      "location": "Riverview Drive, Dayton, OR",
      "coordinates": "N 44.123456°  W 122.987654°",
      "coordinateDatum": "WGS 84",
      "groundElevationFt": 182.5,
      "elevationDatum": "NAVD 88",
      "totalDepthFt": 40,
      "completionDepthFt": 40,
      "drilledDate": "2025-05-14",
      "boringMethod": "Hollow-Stem Auger",
      "holeDiameter": "4 in",
      "rigDriller": "CME 75 · Synthetic Drilling Crew",
      "hammerType": "Automatic 140 lb",
      "hammerDrop": "30 in",
      "hammerEfficiency": "84%",
      "loggedBy": "K. Anderson, E.I.",
      "checkedBy": "M. Rivera, P.E.",
      "groundwaterSummary": "Not encountered to 40.0 ft.",
      "provenance": {
        "provenanceClass": "source",
        "sourceContextIdentity": "urn:rsrender:synthetic-context:mvp-r1",
        "sourceProjectIdentity": "urn:rsrender:synthetic-project:riverside-r1",
        "sourceEntityIdentity": "urn:rsrender:exploration:test-01",
        "sourceFieldIdentity": "metadata",
        "sourceContractRevision": "rsrender.synthetic.render-dataset.v1"
      }
    },
    "referenceDepthRange": {
      "startFt": 0,
      "endFt": 40,
      "terminalInclusive": true
    },
    "lithologyIntervals": [
      {
        "id": "stratum-01",
        "depthFromFt": 0,
        "depthToFt": 15,
        "classification": "SILT (ML)",
        "patternId": "pattern-silt-horizontal-dash",
        "materialFillToken": "materialSiltFill",
        "description": "Medium stiff, moist, brown SILT (ML); low plasticity; trace fine sand; homogeneous; no odor.",
        "transitions": [
          {
            "depthFt": 7.5,
            "text": "Becoming soft, light brown."
          },
          {
            "depthFt": 13.5,
            "text": "Trace organics."
          }
        ],
        "boundaryKind": "observed",
        "provenance": {
          "provenanceClass": "source",
          "sourceContextIdentity": "urn:rsrender:synthetic-context:mvp-r1",
          "sourceProjectIdentity": "urn:rsrender:synthetic-project:riverside-r1",
          "sourceEntityIdentity": "stratum-01",
          "sourceFieldIdentity": "stratum",
          "sourceContractRevision": "rsrender.synthetic.render-dataset.v1"
        }
      },
      {
        "id": "stratum-02",
        "depthFromFt": 15,
        "depthToFt": 30,
        "classification": "GRAVEL WITH SAND (GW)",
        "patternId": "pattern-gravel-dot-ring",
        "materialFillToken": "materialGravelFill",
        "description": "Dense, brown to gray, angular to subrounded gravel up to 1½ in; medium to coarse sand; little silt; well-graded.",
        "transitions": [
          {
            "depthFt": 22.5,
            "text": "Becoming very dense."
          }
        ],
        "boundaryKind": "gradational",
        "provenance": {
          "provenanceClass": "source",
          "sourceContextIdentity": "urn:rsrender:synthetic-context:mvp-r1",
          "sourceProjectIdentity": "urn:rsrender:synthetic-project:riverside-r1",
          "sourceEntityIdentity": "stratum-02",
          "sourceFieldIdentity": "stratum",
          "sourceContractRevision": "rsrender.synthetic.render-dataset.v1"
        }
      },
      {
        "id": "stratum-03",
        "depthFromFt": 30,
        "depthToFt": 40,
        "classification": "SILT (ML)",
        "patternId": "pattern-silt-blue-dash",
        "materialFillToken": "materialSiltFill",
        "description": "Very stiff, moist, gray with brown mottling SILT (ML); low plasticity; trace fine sand; blocky structure.",
        "transitions": [
          {
            "depthFt": 34,
            "text": "Trace fine gravel."
          }
        ],
        "boundaryKind": "observed",
        "provenance": {
          "provenanceClass": "source",
          "sourceContextIdentity": "urn:rsrender:synthetic-context:mvp-r1",
          "sourceProjectIdentity": "urn:rsrender:synthetic-project:riverside-r1",
          "sourceEntityIdentity": "stratum-03",
          "sourceFieldIdentity": "stratum",
          "sourceContractRevision": "rsrender.synthetic.render-dataset.v1"
        }
      }
    ],
    "samples": [
      {
        "id": "sample-01",
        "label": "S-1",
        "depthFt": 1.5,
        "symbol": "split-spoon",
        "recoveryPercent": 90,
        "blowIncrements": [
          {
            "blows": 2,
            "penetrationInches": 6
          },
          {
            "blows": 3,
            "penetrationInches": 6
          },
          {
            "blows": 4,
            "penetrationInches": 6
          }
        ],
        "nValue": 7,
        "refusal": false,
        "provenance": {
          "provenanceClass": "source",
          "sourceContextIdentity": "urn:rsrender:synthetic-context:mvp-r1",
          "sourceProjectIdentity": "urn:rsrender:synthetic-project:riverside-r1",
          "sourceEntityIdentity": "sample-01",
          "sourceFieldIdentity": "sample-observation",
          "sourceContractRevision": "rsrender.synthetic.render-dataset.v1"
        }
      },
      {
        "id": "sample-02",
        "label": "S-2",
        "depthFt": 4,
        "symbol": "split-spoon",
        "recoveryPercent": 85,
        "blowIncrements": [
          {
            "blows": 3,
            "penetrationInches": 6
          },
          {
            "blows": 4,
            "penetrationInches": 6
          },
          {
            "blows": 5,
            "penetrationInches": 6
          }
        ],
        "nValue": 9,
        "refusal": false,
        "provenance": {
          "provenanceClass": "source",
          "sourceContextIdentity": "urn:rsrender:synthetic-context:mvp-r1",
          "sourceProjectIdentity": "urn:rsrender:synthetic-project:riverside-r1",
          "sourceEntityIdentity": "sample-02",
          "sourceFieldIdentity": "sample-observation",
          "sourceContractRevision": "rsrender.synthetic.render-dataset.v1"
        }
      },
      {
        "id": "sample-03",
        "label": "S-3",
        "depthFt": 7,
        "symbol": "split-spoon",
        "recoveryPercent": 80,
        "blowIncrements": [
          {
            "blows": 4,
            "penetrationInches": 6
          },
          {
            "blows": 5,
            "penetrationInches": 6
          },
          {
            "blows": 6,
            "penetrationInches": 6
          }
        ],
        "nValue": 11,
        "refusal": false,
        "provenance": {
          "provenanceClass": "source",
          "sourceContextIdentity": "urn:rsrender:synthetic-context:mvp-r1",
          "sourceProjectIdentity": "urn:rsrender:synthetic-project:riverside-r1",
          "sourceEntityIdentity": "sample-03",
          "sourceFieldIdentity": "sample-observation",
          "sourceContractRevision": "rsrender.synthetic.render-dataset.v1"
        }
      },
      {
        "id": "sample-04",
        "label": "S-4",
        "depthFt": 9.8,
        "symbol": "split-spoon",
        "recoveryPercent": 95,
        "blowIncrements": [
          {
            "blows": 6,
            "penetrationInches": 6
          },
          {
            "blows": 8,
            "penetrationInches": 6
          },
          {
            "blows": 10,
            "penetrationInches": 6
          }
        ],
        "nValue": 18,
        "refusal": false,
        "provenance": {
          "provenanceClass": "source",
          "sourceContextIdentity": "urn:rsrender:synthetic-context:mvp-r1",
          "sourceProjectIdentity": "urn:rsrender:synthetic-project:riverside-r1",
          "sourceEntityIdentity": "sample-04",
          "sourceFieldIdentity": "sample-observation",
          "sourceContractRevision": "rsrender.synthetic.render-dataset.v1"
        }
      },
      {
        "id": "sample-05",
        "label": "S-5",
        "depthFt": 15.8,
        "symbol": "split-spoon",
        "recoveryPercent": 95,
        "blowIncrements": [
          {
            "blows": 7,
            "penetrationInches": 6
          },
          {
            "blows": 9,
            "penetrationInches": 6
          },
          {
            "blows": 12,
            "penetrationInches": 6
          }
        ],
        "nValue": 21,
        "refusal": false,
        "provenance": {
          "provenanceClass": "source",
          "sourceContextIdentity": "urn:rsrender:synthetic-context:mvp-r1",
          "sourceProjectIdentity": "urn:rsrender:synthetic-project:riverside-r1",
          "sourceEntityIdentity": "sample-05",
          "sourceFieldIdentity": "sample-observation",
          "sourceContractRevision": "rsrender.synthetic.render-dataset.v1"
        }
      },
      {
        "id": "sample-06",
        "label": "S-6",
        "depthFt": 18.8,
        "symbol": "split-spoon",
        "recoveryPercent": 90,
        "blowIncrements": [
          {
            "blows": 16,
            "penetrationInches": 6
          },
          {
            "blows": 50,
            "penetrationInches": 4
          }
        ],
        "nValue": null,
        "refusal": true,
        "provenance": {
          "provenanceClass": "source",
          "sourceContextIdentity": "urn:rsrender:synthetic-context:mvp-r1",
          "sourceProjectIdentity": "urn:rsrender:synthetic-project:riverside-r1",
          "sourceEntityIdentity": "sample-06",
          "sourceFieldIdentity": "sample-observation",
          "sourceContractRevision": "rsrender.synthetic.render-dataset.v1"
        }
      },
      {
        "id": "sample-07",
        "label": "S-7",
        "depthFt": 22,
        "symbol": "split-spoon",
        "recoveryPercent": 85,
        "blowIncrements": [
          {
            "blows": 20,
            "penetrationInches": 6
          },
          {
            "blows": 28,
            "penetrationInches": 6
          },
          {
            "blows": 32,
            "penetrationInches": 6
          }
        ],
        "nValue": 60,
        "refusal": false,
        "provenance": {
          "provenanceClass": "source",
          "sourceContextIdentity": "urn:rsrender:synthetic-context:mvp-r1",
          "sourceProjectIdentity": "urn:rsrender:synthetic-project:riverside-r1",
          "sourceEntityIdentity": "sample-07",
          "sourceFieldIdentity": "sample-observation",
          "sourceContractRevision": "rsrender.synthetic.render-dataset.v1"
        }
      },
      {
        "id": "sample-08",
        "label": "S-8",
        "depthFt": 25,
        "symbol": "split-spoon",
        "recoveryPercent": 85,
        "blowIncrements": [
          {
            "blows": 18,
            "penetrationInches": 6
          },
          {
            "blows": 28,
            "penetrationInches": 6
          },
          {
            "blows": 34,
            "penetrationInches": 6
          }
        ],
        "nValue": 62,
        "refusal": false,
        "provenance": {
          "provenanceClass": "source",
          "sourceContextIdentity": "urn:rsrender:synthetic-context:mvp-r1",
          "sourceProjectIdentity": "urn:rsrender:synthetic-project:riverside-r1",
          "sourceEntityIdentity": "sample-08",
          "sourceFieldIdentity": "sample-observation",
          "sourceContractRevision": "rsrender.synthetic.render-dataset.v1"
        }
      },
      {
        "id": "sample-09",
        "label": "S-9",
        "depthFt": 31.2,
        "symbol": "split-spoon",
        "recoveryPercent": 80,
        "blowIncrements": [
          {
            "blows": 12,
            "penetrationInches": 6
          },
          {
            "blows": 50,
            "penetrationInches": 2
          }
        ],
        "nValue": null,
        "refusal": true,
        "provenance": {
          "provenanceClass": "source",
          "sourceContextIdentity": "urn:rsrender:synthetic-context:mvp-r1",
          "sourceProjectIdentity": "urn:rsrender:synthetic-project:riverside-r1",
          "sourceEntityIdentity": "sample-09",
          "sourceFieldIdentity": "sample-observation",
          "sourceContractRevision": "rsrender.synthetic.render-dataset.v1"
        }
      },
      {
        "id": "sample-10",
        "label": "S-10",
        "depthFt": 34.5,
        "symbol": "split-spoon",
        "recoveryPercent": 95,
        "blowIncrements": [
          {
            "blows": 7,
            "penetrationInches": 6
          },
          {
            "blows": 10,
            "penetrationInches": 6
          },
          {
            "blows": 13,
            "penetrationInches": 6
          }
        ],
        "nValue": 23,
        "refusal": false,
        "provenance": {
          "provenanceClass": "source",
          "sourceContextIdentity": "urn:rsrender:synthetic-context:mvp-r1",
          "sourceProjectIdentity": "urn:rsrender:synthetic-project:riverside-r1",
          "sourceEntityIdentity": "sample-10",
          "sourceFieldIdentity": "sample-observation",
          "sourceContractRevision": "rsrender.synthetic.render-dataset.v1"
        }
      }
    ],
    "dataTrack": {
      "id": "track-penetration-moisture",
      "depthRange": {
        "startFt": 0,
        "endFt": 40
      },
      "axes": [
        {
          "id": "axis-n-value",
          "quantity": "spt-n-value",
          "unit": "blows-per-foot",
          "minimum": 0,
          "maximum": 70
        },
        {
          "id": "axis-water-percent",
          "quantity": "water-content-percent",
          "unit": "percent",
          "minimum": 0,
          "maximum": 100
        }
      ],
      "layers": [
        {
          "id": "layer-n-value",
          "kind": "numeric-polyline",
          "axisId": "axis-n-value",
          "glyph": "filled-square",
          "values": [
            [
              "sample-01",
              7
            ],
            [
              "sample-02",
              9
            ],
            [
              "sample-03",
              11
            ],
            [
              "sample-04",
              18
            ],
            [
              "sample-05",
              21
            ],
            [
              "sample-07",
              60
            ],
            [
              "sample-08",
              62
            ],
            [
              "sample-10",
              23
            ]
          ],
          "provenance": {
            "provenanceClass": "source",
            "sourceContextIdentity": "urn:rsrender:synthetic-context:mvp-r1",
            "sourceProjectIdentity": "urn:rsrender:synthetic-project:riverside-r1",
            "sourceEntityIdentity": "track-penetration-moisture",
            "sourceFieldIdentity": "spt-n-values",
            "sourceContractRevision": "rsrender.synthetic.render-dataset.v1"
          }
        },
        {
          "id": "layer-moisture",
          "kind": "numeric-polyline",
          "axisId": "axis-water-percent",
          "glyph": "open-triangle",
          "values": [
            [
              "sample-01",
              18
            ],
            [
              "sample-02",
              26
            ],
            [
              "sample-03",
              32
            ],
            [
              "sample-04",
              49
            ],
            [
              "sample-05",
              86
            ],
            [
              "sample-09",
              37
            ],
            [
              "sample-10",
              49
            ]
          ],
          "provenance": {
            "provenanceClass": "source",
            "sourceContextIdentity": "urn:rsrender:synthetic-context:mvp-r1",
            "sourceProjectIdentity": "urn:rsrender:synthetic-project:riverside-r1",
            "sourceEntityIdentity": "track-penetration-moisture",
            "sourceFieldIdentity": "moisture-content",
            "sourceContractRevision": "rsrender.synthetic.render-dataset.v1"
          }
        },
        {
          "id": "layer-plasticity-range",
          "kind": "numeric-range",
          "axisId": "axis-water-percent",
          "glyph": "open-circle-range",
          "values": [
            [
              "sample-01",
              38,
              18
            ],
            [
              "sample-02",
              48,
              26
            ],
            [
              "sample-03",
              55,
              32
            ],
            [
              "sample-05",
              69,
              86
            ],
            [
              "sample-09",
              55,
              37
            ],
            [
              "sample-10",
              76,
              49
            ]
          ],
          "provenance": {
            "provenanceClass": "source",
            "sourceContextIdentity": "urn:rsrender:synthetic-context:mvp-r1",
            "sourceProjectIdentity": "urn:rsrender:synthetic-project:riverside-r1",
            "sourceEntityIdentity": "track-penetration-moisture",
            "sourceFieldIdentity": "plastic-limit-liquid-limit",
            "sourceContractRevision": "rsrender.synthetic.render-dataset.v1"
          }
        }
      ]
    },
    "remarks": [
      {
        "id": "remark-01",
        "depthFromFt": 0,
        "depthToFt": 5,
        "text": "Surface: grass cover. Topsoil 0–6 in. No groundwater encountered."
      },
      {
        "id": "remark-02",
        "depthFromFt": 8,
        "depthToFt": 16,
        "text": "Boring dry to 15.0 ft."
      },
      {
        "id": "remark-03",
        "depthFromFt": 15,
        "depthToFt": 20,
        "text": "Gravelly soils begin at 15 ft."
      },
      {
        "id": "remark-04",
        "depthFromFt": 18,
        "depthToFt": 25,
        "text": "No caving observed. Boring stable."
      },
      {
        "id": "remark-05",
        "depthFromFt": 22.5,
        "depthToFt": 29,
        "text": "Very dense layer from 22.5 to 28.5 ft."
      },
      {
        "id": "remark-06",
        "depthFromFt": 30,
        "depthToFt": 35,
        "text": "Slight dampness at 34 ft."
      },
      {
        "id": "remark-07",
        "depthFromFt": 35,
        "depthToFt": 40,
        "text": "Boring terminated at 40.0 ft. Target depth reached."
      }
    ],
    "legend": [
      {
        "id": "legend-split-spoon",
        "label": "Split spoon (SPT)",
        "symbol": "split-spoon"
      },
      {
        "id": "legend-silt",
        "label": "SILT (ML)",
        "symbol": "pattern-silt-horizontal-dash"
      },
      {
        "id": "legend-gravel",
        "label": "GRAVEL WITH SAND (GW)",
        "symbol": "pattern-gravel-dot-ring"
      },
      {
        "id": "legend-observed",
        "label": "Observed contact",
        "symbol": "solid-line"
      },
      {
        "id": "legend-gradational",
        "label": "Gradational",
        "symbol": "dashed-line"
      },
      {
        "id": "legend-n",
        "label": "N, blows/ft",
        "symbol": "filled-square-line"
      },
      {
        "id": "legend-water",
        "label": "Water content, %",
        "symbol": "open-triangle-line"
      },
      {
        "id": "legend-plll",
        "label": "Plastic range PL–LL",
        "symbol": "open-circle-range"
      },
      {
        "id": "legend-refusal",
        "label": "Sampler refusal",
        "symbol": "filled-down-triangle"
      },
      {
        "id": "legend-groundwater",
        "label": "Groundwater",
        "symbol": "open-down-triangle"
      }
    ],
    "notes": [
      "Elevations use an assumed datum of 100.00 ft.",
      "Boring location field-surveyed on 2025-05-14.",
      "No groundwater encountered while drilling to 40.0 ft.",
      "SPT generally follows ASTM D1586.",
      "N sums the final two 6-in. increments.",
      "Soil classification generally follows ASTM D2488.",
      "Boundaries are approximate; transitions may vary.",
      "This log applies only at this location and time."
    ],
    "approval": {
      "heading": "REVIEWED & APPROVED",
      "sealPlaceholder": "ENGINEER'S SEAL",
      "reviewerName": "J. M. Carter, P.E.",
      "reviewedDate": "2025-05-20"
    }
  },
  "template": {
    "schemaVersion": "rsrender.boring-log-mvp-template.v1",
    "templateId": "mvp-template-reference-shaped@r2",
    "templateRevision": 2,
    "physicalUnits": "mpt",
    "page": {
      "widthMpt": 612000,
      "heightMpt": 792000,
      "orientation": "portrait"
    },
    "regions": [
      {
        "id": "region-header",
        "role": "header",
        "xMpt": 15000,
        "yMpt": 14000,
        "widthMpt": 582000,
        "heightMpt": 86000
      },
      {
        "id": "region-depth-body",
        "role": "depth-body",
        "xMpt": 15000,
        "yMpt": 104000,
        "widthMpt": 582000,
        "heightMpt": 568000
      },
      {
        "id": "region-footer",
        "role": "footer",
        "xMpt": 15000,
        "yMpt": 680000,
        "widthMpt": 582000,
        "heightMpt": 98000
      }
    ],
    "depthTransform": {
      "regionId": "region-depth-body",
      "depthStartFt": 0,
      "depthEndFt": 40,
      "yStartMpt": 129000,
      "yEndMpt": 608000,
      "mptPerFoot": 11975
    },
    "columns": [
      {
        "id": "column-elevation",
        "role": "elevation-ruler",
        "xMpt": 15000,
        "widthMpt": 28000
      },
      {
        "id": "column-depth",
        "role": "depth-ruler",
        "xMpt": 43000,
        "widthMpt": 28000
      },
      {
        "id": "column-lithology",
        "role": "lithology-pattern",
        "xMpt": 71000,
        "widthMpt": 32000
      },
      {
        "id": "column-description",
        "role": "material-description",
        "xMpt": 103000,
        "widthMpt": 142000
      },
      {
        "id": "column-sample",
        "role": "sample",
        "xMpt": 245000,
        "widthMpt": 40000
      },
      {
        "id": "column-recovery",
        "role": "recovery",
        "xMpt": 285000,
        "widthMpt": 30000
      },
      {
        "id": "column-blows",
        "role": "blows",
        "xMpt": 315000,
        "widthMpt": 35000
      },
      {
        "id": "column-n-value",
        "role": "n-value",
        "xMpt": 350000,
        "widthMpt": 30000
      },
      {
        "id": "column-data-track",
        "role": "penetration-moisture-plasticity",
        "xMpt": 380000,
        "widthMpt": 145000
      },
      {
        "id": "column-remarks",
        "role": "remarks",
        "xMpt": 525000,
        "widthMpt": 72000
      }
    ],
    "styles": [
      {
        "id": "style-title",
        "fontFamilyId": "font.logical.rsrender-sans",
        "fontSizeMpt": 16000,
        "fontWeight": 700,
        "lineHeightMpt": 20000,
        "color": "#17202a"
      },
      {
        "id": "style-company",
        "fontFamilyId": "font.logical.rsrender-sans",
        "fontSizeMpt": 13000,
        "fontWeight": 700,
        "lineHeightMpt": 16250,
        "color": "#17202a"
      },
      {
        "id": "style-heading",
        "fontFamilyId": "font.logical.rsrender-sans",
        "fontSizeMpt": 7500,
        "fontWeight": 700,
        "lineHeightMpt": 9375,
        "color": "#17202a"
      },
      {
        "id": "style-body",
        "fontFamilyId": "font.logical.rsrender-sans",
        "fontSizeMpt": 7500,
        "fontWeight": 400,
        "lineHeightMpt": 9375,
        "color": "#17202a"
      },
      {
        "id": "style-small",
        "fontFamilyId": "font.logical.rsrender-sans",
        "fontSizeMpt": 6250,
        "fontWeight": 400,
        "lineHeightMpt": 7813,
        "color": "#17202a"
      }
    ],
    "hierarchy": {
      "id": "page-root",
      "role": "page",
      "children": [
        {
          "id": "region-header",
          "role": "header",
          "children": [
            "header-company",
            "header-title",
            "header-sheet",
            "header-project-metadata"
          ]
        },
        {
          "id": "region-depth-body",
          "role": "depth-body",
          "children": [
            "column-elevation",
            "column-depth",
            "column-lithology",
            "column-description",
            "column-sample",
            "column-recovery",
            "column-blows",
            "column-n-value",
            "column-data-track",
            "column-remarks"
          ]
        },
        {
          "id": "region-footer",
          "role": "footer",
          "children": [
            "footer-legend",
            "footer-notes",
            "footer-approval"
          ]
        }
      ]
    },
    "bindings": [
      {
        "elementId": "header-company",
        "path": "metadata.companyName",
        "styleId": "style-company"
      },
      {
        "elementId": "header-title",
        "path": "metadata.documentTitle",
        "styleId": "style-title"
      },
      {
        "elementId": "header-sheet",
        "path": "metadata.sheetLabel",
        "styleId": "style-small"
      },
      {
        "elementId": "header-project-metadata",
        "path": "metadata",
        "styleId": "style-small"
      },
      {
        "elementId": "column-elevation",
        "path": "metadata.groundElevationFt",
        "styleId": "style-small"
      },
      {
        "elementId": "column-depth",
        "path": "referenceDepthRange",
        "styleId": "style-small"
      },
      {
        "elementId": "column-lithology",
        "path": "lithologyIntervals",
        "styleId": "style-body"
      },
      {
        "elementId": "column-description",
        "path": "lithologyIntervals",
        "styleId": "style-body"
      },
      {
        "elementId": "column-sample",
        "path": "samples",
        "styleId": "style-body"
      },
      {
        "elementId": "column-recovery",
        "path": "samples.recoveryPercent",
        "styleId": "style-body"
      },
      {
        "elementId": "column-blows",
        "path": "samples.blowIncrements",
        "styleId": "style-body"
      },
      {
        "elementId": "column-n-value",
        "path": "samples.nValue",
        "styleId": "style-body"
      },
      {
        "elementId": "column-data-track",
        "path": "dataTrack",
        "styleId": "style-small"
      },
      {
        "elementId": "column-remarks",
        "path": "remarks",
        "styleId": "style-body"
      },
      {
        "elementId": "footer-legend",
        "path": "legend",
        "styleId": "style-small"
      },
      {
        "elementId": "footer-notes",
        "path": "notes",
        "styleId": "style-small"
      },
      {
        "elementId": "footer-approval",
        "path": "approval",
        "styleId": "style-small"
      }
    ],
    "visualTokens": {
      "pageFill": "#ffffff",
      "ink": "#17202a",
      "secondaryInk": "#52606d",
      "rule": "#7b8794",
      "lightRule": "#d8dee6",
      "materialSiltFill": "#edf4f3",
      "materialGravelFill": "#f6efe7",
      "nTrack": "#17202a",
      "moistureTrack": "#16736b",
      "plasticityTrack": "#55728d",
      "lithologySiltFill": "#edf4f3",
      "lithologyGravelFill": "#f6efe7",
      "selection": "#2f6f9f"
    }
  }
}

`;
