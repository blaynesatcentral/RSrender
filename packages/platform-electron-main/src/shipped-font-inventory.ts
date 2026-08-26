export type ShippedFontStyle = "normal" | "italic";

export interface ShippedFontFace {
  readonly faceId: string;
  readonly familyId: string;
  readonly cssFamilyName: string;
  readonly style: ShippedFontStyle;
  readonly weight: 400 | 700;
  readonly fileName: string;
  readonly bundled: boolean;
  readonly byteDigest: `sha256:${string}`;
  readonly metricsDigest: `sha256:${string}`;
  readonly glyphCoverageDigest: `sha256:${string}`;
  readonly routeFileName: string;
}

const sourceFaces = [
  [
    "source-sans-3",
    "font.logical.source-sans-3",
    "Source Sans 3",
    "normal",
    400,
    "SourceSans3-Regular.ttf",
    "4644c81b86ec9caaa76b634889968ed3c4f4f52f054855933acc7c2b21e53b0f",
    "2387db3a64fc3cd324980511ae2d462199145ced109dc98696252f0341af2e5a",
    "17255866c4345cda8ec99c1d1af0381d252acbefa9232e239bf5cd44bf0080f3",
    "source-sans-3-regular.ttf",
  ],
  [
    "source-sans-3",
    "font.logical.source-sans-3",
    "Source Sans 3",
    "italic",
    400,
    "SourceSans3-It.ttf",
    "192afd78f0f54a3c69eaf02d43f4d9a821e9d6110e41d3d25d61a7385cd580e4",
    "ebb3c4b13c82822206fd2bb7bae0b90aa62bb53806956cf827801dd6d83aaaba",
    "1d80a9f1ba522ed2bde2f9503863bb810270e4e707b715081a0cec021362dc72",
    "source-sans-3-italic.ttf",
  ],
  [
    "source-sans-3",
    "font.logical.source-sans-3",
    "Source Sans 3",
    "normal",
    700,
    "SourceSans3-Bold.ttf",
    "9214b9d95e4231c609802815c2646c98174e2102d0d37f88978a7f8e71006e6a",
    "9717e94165e6a128a85ae6a37d5ac176a93d7d268d66f3c2090849e375fdf5cb",
    "17255866c4345cda8ec99c1d1af0381d252acbefa9232e239bf5cd44bf0080f3",
    "source-sans-3-bold.ttf",
  ],
  [
    "source-sans-3",
    "font.logical.source-sans-3",
    "Source Sans 3",
    "italic",
    700,
    "SourceSans3-BoldIt.ttf",
    "7978291fc1bf314db887e0366853b33c5cf2e964c7b95cfb9ce403a6ec46a842",
    "1a69b92985aef0257f4d6dc82142cbd1b3c18193d1d23cdb4b516185fd019c83",
    "1d80a9f1ba522ed2bde2f9503863bb810270e4e707b715081a0cec021362dc72",
    "source-sans-3-bold-italic.ttf",
  ],
  [
    "source-serif-4",
    "font.logical.source-serif-4",
    "Source Serif 4",
    "normal",
    400,
    "SourceSerif4-Regular.ttf",
    "e5a4ee6a3d87bb9024796be390c6771e2a0eb1883dae25effaf57ca01668e24b",
    "1ea41a7cc2da7043c82d8b1aa7cefcfa1619c8876ddf3fdc6a652a40a29eb46f",
    "8043c882e8a1f0227ab12325c2ad62de866cbf11fbe107eba260b2dfe9d02a44",
    "source-serif-4-regular.ttf",
  ],
  [
    "source-serif-4",
    "font.logical.source-serif-4",
    "Source Serif 4",
    "italic",
    400,
    "SourceSerif4-It.ttf",
    "9d2950a8f1da66e21502c35d646a1d2148e79f9ea43fd2158cf02f5232e7f430",
    "1de0977bc59fc0ade8e8d89d6c3c6ccb7b53375968b8f6b27cdab2d12f510709",
    "a0d49a4491302495ef564a1e32d12f2e4ad8c70579e523a89e635ab8abd33015",
    "source-serif-4-italic.ttf",
  ],
  [
    "source-serif-4",
    "font.logical.source-serif-4",
    "Source Serif 4",
    "normal",
    700,
    "SourceSerif4-Bold.ttf",
    "7cf4f4e1ad74f45058d5bc61716b82560442fbdcd9d3654d2dea96bf6c683d86",
    "bfef5fa1f22c30334c4c2bb59bdc1dd374a81685781f8738019f44ef83f3c1cd",
    "8043c882e8a1f0227ab12325c2ad62de866cbf11fbe107eba260b2dfe9d02a44",
    "source-serif-4-bold.ttf",
  ],
  [
    "source-serif-4",
    "font.logical.source-serif-4",
    "Source Serif 4",
    "italic",
    700,
    "SourceSerif4-BoldIt.ttf",
    "7b215b37f8873f5579f3f8d2ded3ca7c588e2f435cd996605ebfc5befe2cd5eb",
    "f057826173c7df47881637f459ea87cbb8af6836053dff0dc83921ad50772890",
    "a0d49a4491302495ef564a1e32d12f2e4ad8c70579e523a89e635ab8abd33015",
    "source-serif-4-bold-italic.ttf",
  ],
  [
    "source-code-pro",
    "font.logical.source-code-pro",
    "Source Code Pro",
    "normal",
    400,
    "SourceCodePro-Regular.ttf",
    "74bd80d3e42a08517cd7e1108ba3d86f2da29ac0f3065be95e0357956ab9db37",
    "ecb78dd8cfd026909f83fdfa4a55c30ccb815d62f10fb39b8c81877c3d728690",
    "7d6d5d594ae2a69ae9b07d818b3a8918bd4aeb684b7cbe4012ade887d1188792",
    "source-code-pro-regular.ttf",
  ],
  [
    "source-code-pro",
    "font.logical.source-code-pro",
    "Source Code Pro",
    "italic",
    400,
    "SourceCodePro-It.ttf",
    "9c9e0f4d016210a3c5bdfba5262637c5b26ddff4ccc382ebbc781de5961d0042",
    "2795aa1610d4a8ec5d8a82013d94f4cf187411a93eb45182bf6b883e1feecb68",
    "1334d815308d03369673535422d4c0aa99388b4bf9104ac32f6e8417933631f5",
    "source-code-pro-italic.ttf",
  ],
  [
    "source-code-pro",
    "font.logical.source-code-pro",
    "Source Code Pro",
    "normal",
    700,
    "SourceCodePro-Bold.ttf",
    "b2095e0d657e6d28dc32444a9dacabab0c9241d0bf39d96371756cc9bdbc3a5f",
    "5a3cb1dcaac10ccbe8bf9dac29fffc88209c5788a8851fa40853dbf6e4ae0077",
    "7d6d5d594ae2a69ae9b07d818b3a8918bd4aeb684b7cbe4012ade887d1188792",
    "source-code-pro-bold.ttf",
  ],
  [
    "source-code-pro",
    "font.logical.source-code-pro",
    "Source Code Pro",
    "italic",
    700,
    "SourceCodePro-BoldIt.ttf",
    "1b49d9304012bf8db9e5dd4104183d5c122c445d0570a2259125f71977595b90",
    "0cf7562d40b754f623e41d1918aa52a3daeaebe07eb023bea1cf1cc503814b0d",
    "1334d815308d03369673535422d4c0aa99388b4bf9104ac32f6e8417933631f5",
    "source-code-pro-bold-italic.ttf",
  ],
] as const;

export const bundledSourceFontFaces: readonly ShippedFontFace[] = Object.freeze(
  sourceFaces.map(
    ([
      familySlug,
      familyId,
      cssFamilyName,
      style,
      weight,
      fileName,
      byte,
      metrics,
      glyphs,
      routeFileName,
    ]) =>
      Object.freeze({
        faceId: `font.face.${familySlug}.${style === "italic" ? (weight === 700 ? "bold-italic" : "italic") : weight === 700 ? "bold" : "regular"}`,
        familyId,
        cssFamilyName,
        style,
        weight,
        fileName,
        bundled: true,
        byteDigest: `sha256:${byte}`,
        metricsDigest: `sha256:${metrics}`,
        glyphCoverageDigest: `sha256:${glyphs}`,
        routeFileName,
      }),
  ),
);

export function resolveBundledSourceFontFace(
  familyId: string,
  style: ShippedFontStyle,
  weight: number,
): ShippedFontFace | undefined {
  return bundledSourceFontFaces.find(
    (face) => face.familyId === familyId && face.style === style && face.weight === weight,
  );
}
