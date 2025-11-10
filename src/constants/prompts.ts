export const PROMPT_TEMPLATES = {
  default: {
    id: "default",
    basePrompt:
      "Square surreal oil painting in a baroque gold frame, dark museum lighting. Depict the current state of the world.",
    negativePrompt: "low quality, bad anatomy, disfigured, text artifacts",
  },
  experimental: {
    id: "experimental",
    basePrompt:
      "Abstract expressionist painting, dynamic brushstrokes, vibrant colors, deep textures, reflecting global data trends.",
    negativePrompt: "monochromatic, dull, flat, realistic, text, signature",
  },
} as const;

export type PromptTemplateKey = keyof typeof PROMPT_TEMPLATES;

/**
 * Get the active prompt template
 * Can be configured via environment variable
 */
export const getActivePromptTemplate = (): (typeof PROMPT_TEMPLATES)[PromptTemplateKey] => {
  const templateKey = (process.env.PROMPT_TEMPLATE || "default") as PromptTemplateKey;
  return PROMPT_TEMPLATES[templateKey] || PROMPT_TEMPLATES.default;
};
