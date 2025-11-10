export const TOKEN_TICKERS = ["CO2", "ICE", "FOREST", "NUKE", "MACHINE", "PANDEMIC", "FEAR", "HOPE"] as const;

export type TokenTicker = (typeof TOKEN_TICKERS)[number];

export type VisualParamKey =
  | "fogDensity"
  | "skyTint"
  | "reflectivity"
  | "blueBalance"
  | "vegetationDensity"
  | "organicPattern"
  | "radiationGlow"
  | "debrisIntensity"
  | "mechanicalPattern"
  | "metallicRatio"
  | "fractalDensity"
  | "bioluminescence"
  | "shadowDepth"
  | "redHighlight"
  | "lightIntensity"
  | "warmHue";

export type TokenNormalizationWindow = {
  min: number;
  max: number;
};

export type TokenConfig = {
  ticker: TokenTicker;
  address: string;
  supply: number;
  axes: [VisualParamKey, VisualParamKey];
  normalization: TokenNormalizationWindow;
};

const DEFAULT_NORMALIZATION: TokenNormalizationWindow = { min: 0, max: 2_000_000_000 };

export const TOKENS: TokenConfig[] = [
  {
    ticker: "CO2",
    address: "Co2VNT9n1YF3S7E6k9pLxY3Fj5MNt9aB1z3k6pX1",
    supply: 1_000_000_000,
    axes: ["fogDensity", "skyTint"],
    normalization: DEFAULT_NORMALIZATION,
  },
  {
    ticker: "ICE",
    address: "Ice4B7n9Qw2Drv18Lp5vWq3ZrF8nSd2Hg7cP1uLx",
    supply: 900_000_000,
    axes: ["reflectivity", "blueBalance"],
    normalization: DEFAULT_NORMALIZATION,
  },
  {
    ticker: "FOREST",
    address: "For3st6nLm9Px1Qa7Vz5Rt2Yw4Bc8Nd1Ms0Gh5Jk",
    supply: 1_200_000_000,
    axes: ["vegetationDensity", "organicPattern"],
    normalization: DEFAULT_NORMALIZATION,
  },
  {
    ticker: "NUKE",
    address: "NuK3zX1Lm8Pq5Rs7Tu4Vw9Yb2Ce6Df3Gh1Jk0Lm",
    supply: 750_000_000,
    axes: ["radiationGlow", "debrisIntensity"],
    normalization: DEFAULT_NORMALIZATION,
  },
  {
    ticker: "MACHINE",
    address: "MacH1nE6Zw3Qv9Lp4Ns7Ty2Ui5Od8Fg1Ha0Jk2Lq",
    supply: 1_400_000_000,
    axes: ["mechanicalPattern", "metallicRatio"],
    normalization: DEFAULT_NORMALIZATION,
  },
  {
    ticker: "PANDEMIC",
    address: "PanDm1c7Zv4Qx8Lt5Nr2Uy9Io3Pe6Fs1Gd0Jh3Km",
    supply: 680_000_000,
    axes: ["fractalDensity", "bioluminescence"],
    normalization: DEFAULT_NORMALIZATION,
  },
  {
    ticker: "FEAR",
    address: "FeAr2m6Nx5Qv8Lp1Os7Tu4Yi9Pa3Se6Fd0Gh2Jk",
    supply: 820_000_000,
    axes: ["shadowDepth", "redHighlight"],
    normalization: DEFAULT_NORMALIZATION,
  },
  {
    ticker: "HOPE",
    address: "HopE1k5Nz8Qw3Ld6Ps9Tu4Yi2Oo7Rr5Fg1Ha0Jm",
    supply: 1_100_000_000,
    axes: ["lightIntensity", "warmHue"],
    normalization: DEFAULT_NORMALIZATION,
  },
];

export const TOKEN_CONFIG_MAP: Record<TokenTicker, TokenConfig> = TOKENS.reduce(
  (acc, token) => {
    acc[token.ticker] = token;
    return acc;
  },
  {} as Record<TokenTicker, TokenConfig>,
);

export const TOKEN_AXIS_MAP: Record<TokenTicker, TokenConfig["axes"]> = TOKEN_TICKERS.reduce(
  (acc, ticker) => {
    acc[ticker] = TOKEN_CONFIG_MAP[ticker].axes;
    return acc;
  },
  {} as Record<TokenTicker, TokenConfig["axes"]>,
);

export type McMap = Record<TokenTicker, number>;
export type NormalizedMcMap = Record<TokenTicker, number>;
export type McMapRounded = McMap;
