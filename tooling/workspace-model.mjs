export const packageNames = Object.freeze([
  "contracts",
  "domain",
  "application",
  "scene",
  "package-contract",
  "source-contract",
  "platform-electron-main",
  "platform-zipjs",
  "layout-host",
  "renderer-ui",
  "test-support",
]);

export const internalImportRules = Object.freeze({
  contracts: [],
  domain: ["contracts"],
  application: ["contracts", "domain"],
  scene: ["contracts", "domain", "application"],
  "package-contract": ["contracts", "domain"],
  "source-contract": ["contracts", "domain"],
  "platform-electron-main": [
    "contracts",
    "domain",
    "application",
    "scene",
    "package-contract",
    "source-contract",
    "platform-zipjs",
  ],
  "platform-zipjs": ["contracts", "package-contract"],
  "layout-host": ["contracts", "scene"],
  "renderer-ui": ["contracts", "application", "scene"],
  "test-support": packageNames.filter((name) => name !== "test-support"),
});

export const purePackages = Object.freeze([
  "contracts",
  "domain",
  "application",
  "scene",
  "package-contract",
  "source-contract",
]);
