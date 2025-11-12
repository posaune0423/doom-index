/**
 * Doom Index Prompt Generation
 * Medieval allegorical painting with weighted elements based on market cap
 */

import type { TokenTicker, McMap } from "@/constants/token";

const MIN_WEIGHT = 0.1;
const MAX_WEIGHT = 2.0;
const DOMINANCE_EXPONENT = 2.5; // Higher exponent = stronger dominance emphasis

const clamp = (x: number, min = MIN_WEIGHT, max = MAX_WEIGHT) => Math.max(min, Math.min(max, x));

/**
 * Calculate relative dominance-based weights
 * Emphasizes differences between tokens by using relative ratios
 * and applying non-linear transformation to amplify dominance
 */
function calculateDominanceWeights(mc: McMap): Record<TokenTicker, number> {
  const tokens: TokenTicker[] = ["CO2", "ICE", "FOREST", "NUKE", "MACHINE", "PANDEMIC", "FEAR", "HOPE"];

  // Find max market cap (dominant token)
  const maxMc = Math.max(...tokens.map(t => mc[t] || 0));

  if (maxMc === 0) {
    // All zeros: return uniform minimum weights
    return tokens.reduce((acc, t) => ({ ...acc, [t]: MIN_WEIGHT }), {} as Record<TokenTicker, number>);
  }

  // Calculate relative ratios (0 to 1)
  const ratios = tokens.reduce((acc, t) => {
    const ratio = (mc[t] || 0) / maxMc;
    acc[t] = ratio;
    return acc;
  }, {} as Record<TokenTicker, number>);

  // Apply non-linear transformation to emphasize dominance
  // Higher exponent makes dominant tokens stand out more
  const transformed = tokens.reduce((acc, t) => {
    const ratio = ratios[t];
    // Apply power function: ratio^exponent
    // This makes small differences more pronounced
    const transformedRatio = Math.pow(ratio, DOMINANCE_EXPONENT);
    // Map to weight range: MIN_WEIGHT to MAX_WEIGHT
    const weight = MIN_WEIGHT + transformedRatio * (MAX_WEIGHT - MIN_WEIGHT);
    acc[t] = clamp(weight);
    return acc;
  }, {} as Record<TokenTicker, number>);

  return transformed;
}

const safeWeight = (w: number) => (w === 0 ? MIN_WEIGHT : w);

/**
 * Token phrase mapping for allegorical elements
 */
const TOKEN_PHRASE: Record<TokenTicker, string> = {
  CO2: "dense toxic smog in the sky",
  ICE: "glittering blue glaciers and cold reflections",
  FOREST: "lush emerald forests and living roots",
  NUKE: "blinding nuclear flash on the horizon",
  MACHINE: "colossal dystopian machine towers and metal grids",
  PANDEMIC: "bioluminescent spores and organic clusters",
  FEAR: "oppressive darkness with many red eyes",
  HOPE: "radiant golden divine light breaking the clouds",
};

/**
 * Fixed style elements
 */
const STYLE_BASE =
  "medieval renaissance allegorical oil painting, Bosch and Bruegel influence, chiaroscuro lighting, thick oil texture, symbolic architecture, detailed human figures, cohesive single landscape";

const NEGATIVE_PROMPT = "watermark, text, logo, oversaturated colors, low detail hands, extra limbs";

const HUMAN_ELEMENT = {
  text: "medieval figures praying, trading, recording the scene",
  weight: 1.0,
};

/**
 * Weighted fragment for prompt composition
 */
export type WeightedFragment = {
  text: string;
  weight: number;
};

/**
 * Convert market cap map to weighted fragments
 * Uses relative dominance-based weighting to emphasize differences
 * Sorted by weight (descending) for generation stability
 */
export function toWeightedFragments(mc: McMap): WeightedFragment[] {
  const tokens: TokenTicker[] = ["CO2", "ICE", "FOREST", "NUKE", "MACHINE", "PANDEMIC", "FEAR", "HOPE"];

  // Calculate dominance-based weights
  const weights = calculateDominanceWeights(mc);

  const fragments = tokens.map(ticker => ({
    text: TOKEN_PHRASE[ticker],
    weight: safeWeight(weights[ticker]),
  }));

  // Sort by weight descending
  fragments.sort((a, b) => b.weight - a.weight);

  // Add human element at the end (fixed anchor)
  fragments.push(HUMAN_ELEMENT);

  return fragments;
}

/**
 * Build SDXL-style prompt with bracket weights
 * Format: (phrase:weight)
 *
 * Template structure:
 * - Opening line with theme
 * - Weighted fragments (sorted by weight descending)
 * - Style base (fixed)
 * - Negative prompt (included in the prompt string)
 * - All elements are always included, weighted by market cap
 */
export function buildSDXLPrompt(mc: McMap): { prompt: string; negative: string } {
  const fragments = toWeightedFragments(mc);

  const weightedLines = fragments.map(f => `(${f.text}:${f.weight.toFixed(2)})`).join(",\n");

  const prompt = [
    "a grand medieval allegorical oil painting of the world, all forces visible and weighted by real-time power,",
    weightedLines + ",",
    STYLE_BASE + ",",
    `negative prompt: ${NEGATIVE_PROMPT}`,
  ].join("\n");

  return {
    prompt,
    negative: NEGATIVE_PROMPT,
  };
}

/**
 * Build generic payload for Runware or other APIs
 * Returns structured data with fragment array
 */
export function buildGenericPayload(
  mc: McMap,
  options: {
    width?: number;
    height?: number;
    steps?: number;
    cfg?: number;
    seed?: number;
  } = {},
) {
  const { width = 1024, height = 1024, steps = 30, cfg = 5.5, seed = 42 } = options;

  return {
    style: STYLE_BASE,
    negatives: NEGATIVE_PROMPT,
    fragments: toWeightedFragments(mc),
    width,
    height,
    steps,
    cfg,
    seed,
  };
}

/**
 * Build simple concatenated prompt (fallback for basic APIs)
 */
export function buildSimplePrompt(mc: McMap): { prompt: string; negative: string } {
  const fragments = toWeightedFragments(mc);

  // Create a weighted description by repeating phrases based on weight
  const weightedPhrases = fragments
    .map(f => {
      const intensity = Math.round(f.weight * 2); // 0-3 repetitions
      return Array(Math.max(1, intensity)).fill(f.text).join(", ");
    })
    .join(", ");

  const prompt = [
    "a grand medieval allegorical oil painting of the world, all forces visible and weighted by real-time power,",
    weightedPhrases + ",",
    STYLE_BASE,
  ].join(" ");

  return {
    prompt,
    negative: NEGATIVE_PROMPT,
  };
}
